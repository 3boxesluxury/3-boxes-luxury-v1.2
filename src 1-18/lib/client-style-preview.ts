/**
 * Client-side Style Preview Engine
 * 
 * Creates a virtual try-on effect using HTML5 Canvas compositing.
 * Works entirely in the browser — no AI service needed.
 * Used when the AI service is unavailable (e.g. on Vercel deployments).
 */

export interface StylePreviewOptions {
  selfieData: string;      // base64 data URL of user's selfie
  productImage: string;    // URL or base64 of the product image
  categorySlug: string;    // product category for placement logic
  productName: string;     // product name for placement logic
  position: { x: number; y: number };  // 0-1 normalized position on selfie
  scale: number;           // 0.1-2.0 scale factor for the product
  opacity: number;         // 0-1 opacity
  blendMode: string;       // canvas globalCompositeOperation
}

export interface StylePreviewResult {
  imageUrl: string;        // base64 data URL of the composited result
  width: number;
  height: number;
}

/**
 * Load an image from a URL or data URL and return an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src.substring(0, 80)}`));
    img.src = src;
  });
}

/**
 * Get default placement for a product category
 */
export function getDefaultPlacement(categorySlug: string, productName: string): {
  position: { x: number; y: number };
  scale: number;
  opacity: number;
  blendMode: string;
} {
  const n = productName.toLowerCase();

  // Jewelry
  if (categorySlug === 'jewelry') {
    if (n.includes('earring') || n.includes('jhumka') || n.includes('stud')) {
      return { position: { x: 0.5, y: 0.22 }, scale: 0.45, opacity: 0.92, blendMode: 'source-over' };
    }
    if (n.includes('necklace') || n.includes('choker') || n.includes('pendant') || n.includes('temple')) {
      return { position: { x: 0.5, y: 0.42 }, scale: 0.55, opacity: 0.90, blendMode: 'source-over' };
    }
    if (n.includes('bracelet') || n.includes('cuff') || n.includes('bangle')) {
      return { position: { x: 0.3, y: 0.62 }, scale: 0.35, opacity: 0.92, blendMode: 'source-over' };
    }
    if (n.includes('ring')) {
      return { position: { x: 0.35, y: 0.65 }, scale: 0.25, opacity: 0.92, blendMode: 'source-over' };
    }
    // Default jewelry
    return { position: { x: 0.5, y: 0.40 }, scale: 0.50, opacity: 0.90, blendMode: 'source-over' };
  }

  // Watches
  if (categorySlug === 'watches') {
    return { position: { x: 0.3, y: 0.58 }, scale: 0.35, opacity: 0.92, blendMode: 'source-over' };
  }

  // Sarees and Fashion — overlay the texture/pattern
  if (categorySlug === 'sarees' || categorySlug === 'fashion') {
    return { position: { x: 0.5, y: 0.55 }, scale: 0.85, opacity: 0.70, blendMode: 'multiply' };
  }

  // Men's shirts
  if (categorySlug === 'mens-shirts') {
    return { position: { x: 0.5, y: 0.45 }, scale: 0.70, opacity: 0.75, blendMode: 'multiply' };
  }

  // Fragrances — side accent
  if (categorySlug === 'fragrances') {
    return { position: { x: 0.78, y: 0.70 }, scale: 0.30, opacity: 0.88, blendMode: 'source-over' };
  }

  // Leather goods / bags
  if (categorySlug === 'leather-goods') {
    return { position: { x: 0.35, y: 0.68 }, scale: 0.40, opacity: 0.88, blendMode: 'source-over' };
  }

  // Default
  return { position: { x: 0.5, y: 0.5 }, scale: 0.50, opacity: 0.85, blendMode: 'source-over' };
}

/**
 * Generate a style preview by compositing the product image onto the selfie
 */
export async function generateStylePreview(options: StylePreviewOptions): Promise<StylePreviewResult> {
  const [selfieImg, productImg] = await Promise.all([
    loadImage(options.selfieData),
    loadImage(options.productImage),
  ]);

  // Use selfie dimensions as the base
  const canvas = document.createElement('canvas');
  const width = selfieImg.naturalWidth;
  const height = selfieImg.naturalHeight;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // Step 1: Draw the selfie as the base
  ctx.drawImage(selfieImg, 0, 0, width, height);

  // Step 2: Calculate product placement
  const productAspect = productImg.naturalWidth / productImg.naturalHeight;
  const baseSize = Math.min(width, height) * options.scale;
  const productW = baseSize;
  const productH = baseSize / productAspect;

  // Center the product at the given position
  const px = (options.position.x * width) - (productW / 2);
  const py = (options.position.y * height) - (productH / 2);

  // Step 3: Apply blend mode and draw product
  ctx.save();
  ctx.globalAlpha = options.opacity;
  ctx.globalCompositeOperation = options.blendMode as GlobalCompositeOperation;

  // For multiply blend, we need a slightly different approach for better results
  if (options.blendMode === 'multiply') {
    // Draw a white background under the product area to prevent dark artifacts
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = options.opacity * 0.3;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px, py, productW, productH);
    
    ctx.globalAlpha = options.opacity;
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(productImg, px, py, productW, productH);
    
    // Overlay the product at low opacity for color accuracy
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = options.opacity * 0.25;
    ctx.drawImage(productImg, px, py, productW, productH);
  } else {
    // For source-over (jewelry, watches, etc.) — add a subtle shadow for realism
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = Math.max(8, baseSize * 0.05);
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.drawImage(productImg, px, py, productW, productH);
  }

  ctx.restore();

  // Step 4: Add a subtle vignette for a polished look
  ctx.save();
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.3,
    width / 2, height / 2, Math.max(width, height) * 0.7
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Convert to data URL
  const imageUrl = canvas.toDataURL('image/png');

  return { imageUrl, width, height };
}

/**
 * Generate a "side-by-side" style board (for fragrances, home-living, etc.)
 */
export async function generateStyleBoard(
  selfieData: string,
  productImage: string,
  productName: string,
): Promise<StylePreviewResult> {
  const [selfieImg, productImg] = await Promise.all([
    loadImage(selfieData),
    loadImage(productImage),
  ]);

  const canvas = document.createElement('canvas');
  const padding = 30;
  const gap = 20;

  // Calculate dimensions
  const selfieAspect = selfieImg.naturalWidth / selfieImg.naturalHeight;
  const productAspect = productImg.naturalWidth / productImg.naturalHeight;

  const targetH = 600;
  const selfieW = targetH * selfieAspect;
  const productW = targetH * productAspect;

  const totalW = padding * 2 + selfieW + gap + productW;
  const totalH = padding + targetH + padding + 40; // extra for label

  canvas.width = totalW;
  canvas.height = totalH;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // Background
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(0, 0, totalW, totalH);

  // Draw selfie
  ctx.drawImage(selfieImg, padding, padding, selfieW, targetH);

  // Draw product
  ctx.drawImage(productImg, padding + selfieW + gap, padding, productW, targetH);

  // Border around selfie
  ctx.strokeStyle = 'rgba(217, 119, 6, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(padding, padding, selfieW, targetH);

  // Border around product
  ctx.strokeRect(padding + selfieW + gap, padding, productW, targetH);

  // Label
  ctx.fillStyle = '#d97706';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Style Preview', totalW / 2, totalH - 12);

  // Badge
  ctx.fillStyle = 'rgba(217, 119, 6, 0.15)';
  ctx.fillRect(padding, padding, 90, 24);
  ctx.fillStyle = '#d97706';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('✨ 3 BOXES', padding + 6, padding + 16);

  const imageUrl = canvas.toDataURL('image/png');
  return { imageUrl, width: totalW, height: totalH };
}

/**
 * Get a product image as a data URL (handles both URLs and data URLs)
 */
export async function getProductImageDataUrl(imageUrl: string): Promise<string> {
  // Already a data URL
  if (imageUrl.startsWith('data:')) return imageUrl;

  // Try to load and convert
  try {
    // Use image proxy for external URLs
    let src = imageUrl;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      src = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
    } else if (imageUrl.startsWith('//')) {
      src = `/api/image-proxy?url=${encodeURIComponent('https:' + imageUrl)}`;
    }

    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas error');
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    throw new Error('Could not load product image for style preview');
  }
}
