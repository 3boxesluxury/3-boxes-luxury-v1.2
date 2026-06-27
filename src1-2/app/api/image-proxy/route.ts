import { NextRequest, NextResponse } from 'next/server';

/**
 * Image Proxy API Route
 *
 * Proxies external image URLs to bypass CORS restrictions and hotlink protection.
 * Used as a runtime fallback when images couldn't be downloaded during import.
 *
 * Usage: /api/image-proxy?url=https://external-site.com/image.jpg&platform=nykaa
 */

// Cache for proxied images (simple in-memory cache)
const imageCache = new Map<string, { data: Buffer; contentType: string; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 100;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let imageUrl = searchParams.get('url');
  const platform = searchParams.get('platform') || '';

  if (!imageUrl) {
    return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
  }

  // Handle protocol-relative URLs
  if (imageUrl.startsWith('//')) {
    imageUrl = `https:${imageUrl}`;
  }

  // Only proxy HTTP/HTTPS URLs
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    return NextResponse.json({ error: 'Only HTTP/HTTPS URLs can be proxied' }, { status: 400 });
  }

  // Block internal/private IPs and restrict to known image domains
  const ALLOWED_DOMAINS = [
    'myntra.com', 'www.myntra.com', 'assets.myntassets.com',
    'nykaa.com', 'www.nykaa.com', 'images-static.nykaa.com', 'adn-static2.nykaa.com',
    'amazon.in', 'www.amazon.in', 'm.media-amazon.com', 'images-eu.ssl-images-amazon.com',
    'flipkart.com', 'www.flipkart.com', 'rukminim2.flixcart.com',
    'caratlane.com', 'www.caratlane.com',
    'tanishq.co.in', 'www.tanishq.co.in',
    'bluestone.com', 'www.bluestone.com',
    'voylla.com', 'www.voylla.com',
    'googleusercontent.com', 'lh3.googleusercontent.com',
    'unsplash.com', 'images.unsplash.com',
    'placehold.co', 'via.placeholder.com',
    'cdn.shopify.com', 'shopify.com',
  ]
  const urlObj = new URL(imageUrl)
  const hostname = urlObj.hostname.toLowerCase()
  const isAllowed = ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))
  if (!isAllowed) {
    return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 })
  }
  // Block private/internal IPs
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
    return NextResponse.json({ error: 'Internal URLs not allowed' }, { status: 403 })
  }

  // Check cache
  const cacheKey = imageUrl;
  const cached = imageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return new NextResponse(cached.data, {
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
        'X-Proxy-Cache': 'HIT',
      },
    });
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': getReferer(platform),
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());

    // Validate it's actually an image
    if (!contentType.startsWith('image/') && !contentType.startsWith('application/octet-stream')) {
      return NextResponse.json(
        { error: 'URL does not point to an image' },
        { status: 400 }
      );
    }

    // Cache the result
    if (imageCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entry
      const oldestKey = imageCache.keys().next().value;
      if (oldestKey) imageCache.delete(oldestKey);
    }
    imageCache.set(cacheKey, { data: buffer, contentType, timestamp: Date.now() });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
        'X-Proxy-Cache': 'MISS',
      },
    });
  } catch (err) {
    console.error('Image proxy error:', err);
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 }
    );
  }
}

function getReferer(platform: string): string {
  const referers: Record<string, string> = {
    myntra: 'https://www.myntra.com/',
    nykaa: 'https://www.nykaa.com/',
    amazon: 'https://www.amazon.in/',
    flipkart: 'https://www.flipkart.com/',
    caratlane: 'https://www.caratlane.com/',
    tanishq: 'https://www.tanishq.co.in/',
    bluestone: 'https://www.bluestone.com/',
    voylla: 'https://www.voylla.com/',
    shopify: 'https://www.shopify.com/',
  };
  return referers[platform] || 'https://www.google.com/';
}
