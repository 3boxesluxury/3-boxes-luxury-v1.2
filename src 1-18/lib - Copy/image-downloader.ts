/**
 * Image Downloader Utility
 *
 * Downloads external images from partner portals (Nykaa, Myntra, Amazon, etc.)
 * and saves them locally to /public/images/products/external/
 *
 * This solves the problem of:
 * 1. Hotlink protection on external sites
 * 2. CORS restrictions blocking image loading
 * 3. Time-limited/expiring image URLs
 * 4. Relative URLs that don't work on our domain
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const EXTERNAL_IMAGES_DIR = join(process.cwd(), 'public', 'images', 'products', 'external');

// Ensure the external images directory exists
function ensureDir() {
  if (!existsSync(EXTERNAL_IMAGES_DIR)) {
    mkdirSync(EXTERNAL_IMAGES_DIR, { recursive: true });
  }
}

/**
 * Download an image from a URL and save it locally.
 * Returns the local path (relative to /public) that can be used as an image src.
 */
export async function downloadImage(
  imageUrl: string,
  platform?: string
): Promise<string | null> {
  try {
    // Skip if already a local path
    if (imageUrl.startsWith('/') || imageUrl.startsWith('/images/')) {
      return imageUrl;
    }

    // Skip data URIs
    if (imageUrl.startsWith('data:')) {
      return null;
    }

    // Build a proper URL
    let url = imageUrl;

    // Handle protocol-relative URLs (//images.example.com/...)
    if (url.startsWith('//')) {
      url = `https:${url}`;
    }

    // Handle relative URLs with a platform base
    if (!url.startsWith('http') && platform) {
      const platformBases: Record<string, string> = {
        myntra: 'https://assets.myntassets.com',
        nykaa: 'https://images-static.nykaa.com',
        amazon: 'https://images-eu.ssl-images-amazon.com',
        flipkart: 'https://rukminim1.flixcart.com',
        caratlane: 'https://www.caratlane.com',
        tanishq: 'https://www.tanishq.co.in',
        bluestone: 'https://www.bluestone.com',
        voylla: 'https://www.voylla.com',
      };
      const base = platformBases[platform];
      if (base) {
        url = url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
      } else {
        return null; // Can't resolve relative URL without a base
      }
    }

    if (!url.startsWith('http')) {
      return null; // Can't download non-HTTP URLs
    }

    // Generate a unique filename
    const ext = getImageExtension(url);
    const filename = `${platform || 'ext'}-${randomUUID().slice(0, 8)}${ext}`;
    const localPath = `/images/products/external/${filename}`;
    const fullPath = join(EXTERNAL_IMAGES_DIR, filename);

    // Download the image
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': getReferer(platform),
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      console.warn(`Image download failed: ${response.status} for ${url}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/') && !contentType.startsWith('application/octet-stream')) {
      console.warn(`Non-image content type: ${contentType} for ${url}`);
      return null;
    }

    // Limit size to 5MB
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
    if (contentLength > 5 * 1024 * 1024) {
      console.warn(`Image too large: ${contentLength} bytes for ${url}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.length < 100) {
      console.warn(`Image too small (likely blank/error): ${buffer.length} bytes for ${url}`);
      return null;
    }

    ensureDir();
    writeFileSync(fullPath, buffer);

    return localPath;
  } catch (err) {
    console.warn(`Image download error for ${imageUrl}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Download multiple images in parallel (with concurrency limit).
 * Returns an array of local paths (null for failed downloads).
 */
export async function downloadImages(
  imageUrls: string[],
  platform?: string,
  maxConcurrency: number = 3
): Promise<string[]> {
  const results: string[] = [];

  // Process in batches to avoid overwhelming the server
  for (let i = 0; i < imageUrls.length; i += maxConcurrency) {
    const batch = imageUrls.slice(i, i + maxConcurrency);
    const batchResults = await Promise.all(
      batch.map((url) => downloadImage(url, platform))
    );

    for (const result of batchResults) {
      if (result) {
        results.push(result);
      }
    }
  }

  return results;
}

/**
 * Process images from a scraped product:
 * 1. Download external images to local storage
 * 2. Filter out invalid/empty URLs
 * 3. Return local paths that will work on our portal
 */
export async function processProductImages(
  images: string[],
  platform?: string
): Promise<string[]> {
  if (!images || images.length === 0) {
    return [];
  }

  // Filter out empty/invalid URLs
  const validUrls = images.filter((url) => {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (trimmed === '' || trimmed === '#' || trimmed === 'null' || trimmed === 'undefined') return false;
    return true;
  });

  if (validUrls.length === 0) {
    return [];
  }

  // Try downloading each image
  const localPaths = await downloadImages(validUrls, platform);

  // If all downloads failed, keep the original external URLs as fallback
  // (they might work with the image proxy route)
  if (localPaths.length === 0 && validUrls.length > 0) {
    console.warn(`All image downloads failed for platform ${platform}, keeping original URLs as fallback`);
    return validUrls.map(url => {
      // Ensure absolute URLs
      if (url.startsWith('//')) return `https:${url}`;
      return url;
    });
  }

  return localPaths;
}

// Helper: Extract file extension from URL
function getImageExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.(jpg|jpeg|png|webp|gif|svg|avif)/i);
    if (match) {
      return `.${match[1].toLowerCase()}`;
    }
  } catch {
    // URL parsing failed, check the raw string
    const match = url.match(/\.(jpg|jpeg|png|webp|gif|svg|avif)/i);
    if (match) {
      return `.${match[1].toLowerCase()}`;
    }
  }
  return '.jpg'; // Default to jpg
}

// Helper: Get Referer header for platform-specific requests
function getReferer(platform?: string): string {
  if (!platform) return 'https://www.google.com/';

  const referers: Record<string, string> = {
    myntra: 'https://www.myntra.com/',
    nykaa: 'https://www.nykaa.com/',
    amazon: 'https://www.amazon.in/',
    flipkart: 'https://www.flipkart.com/',
    caratlane: 'https://www.caratlane.com/',
    tanishq: 'https://www.tanishq.co.in/',
    bluestone: 'https://www.bluestone.com/',
    voylla: 'https://www.voylla.com/',
  };

  return referers[platform] || 'https://www.google.com/';
}
