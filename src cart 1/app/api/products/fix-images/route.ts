import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionAsync } from '@/lib/sessions';
import { processProductImages } from '@/lib/image-downloader';

async function verifyAdmin(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const user = await getSessionAsync(auth?.replace('Bearer ', '') ?? '');
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  if (user.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null };
  return { error: null, user };
}

/**
 * POST /api/products/fix-images
 *
 * Re-scrape and download images for external products that have empty image arrays.
 * This fixes products that were imported before the image download feature was added.
 */
export async function POST(request: NextRequest) {
  const { error: authError } = await verifyAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { productId, all } = body;

    if (all) {
      // Fix all external products with empty images
      const products = await db.product.findMany({
        where: {
          isExternal: true,
          OR: [
            { images: '[]' },
            { images: '' },
          ],
        },
        include: { category: true },
      });

      let fixed = 0;
      let failed = 0;
      const errors: string[] = [];

      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();

      for (const product of products) {
        try {
          if (!product.sourceUrl) {
            errors.push(`${product.name}: No source URL`);
            failed++;
            continue;
          }

          // Re-scrape the product page for images
          const images = await rescrapeImages(zai, product.sourceUrl, product.platform);

          if (images.length === 0) {
            errors.push(`${product.name}: No images found`);
            failed++;
            continue;
          }

          // Download images to local storage
          const localImages = await processProductImages(images, product.platform || undefined);

          if (localImages.length === 0) {
            // Keep original URLs as fallback
            await db.product.update({
              where: { id: product.id },
              data: { images: JSON.stringify(images) },
            });
            fixed++;
          } else {
            await db.product.update({
              where: { id: product.id },
              data: { images: JSON.stringify(localImages) },
            });
            fixed++;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`${product.name}: ${msg}`);
          failed++;
        }
      }

      return NextResponse.json({
        message: `Fixed ${fixed} of ${products.length} products`,
        fixed,
        failed,
        total: products.length,
        errors: errors.slice(0, 10),
      });
    } else if (productId) {
      // Fix a single product
      const product = await db.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      if (!product.sourceUrl) {
        return NextResponse.json({ error: 'Product has no source URL' }, { status: 400 });
      }

      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();

      const images = await rescrapeImages(zai, product.sourceUrl, product.platform);

      if (images.length === 0) {
        return NextResponse.json({ error: 'No images found on the source page' }, { status: 404 });
      }

      const localImages = await processProductImages(images, product.platform || undefined);
      const finalImages = localImages.length > 0 ? localImages : images;

      await db.product.update({
        where: { id: productId },
        data: { images: JSON.stringify(finalImages) },
      });

      return NextResponse.json({
        message: 'Images updated successfully',
        imagesFound: images.length,
        imagesDownloaded: localImages.length,
        finalImages,
      });
    } else {
      return NextResponse.json({ error: 'Provide productId or all=true' }, { status: 400 });
    }
  } catch (err) {
    console.error('Error fixing images:', err);
    return NextResponse.json({ error: 'Failed to fix images' }, { status: 500 });
  }
}

async function rescrapeImages(
  zai: { functions: { invoke: (name: string, params: Record<string, unknown>) => Promise<unknown> }; chat: { completions: { create: (params: Record<string, unknown>) => Promise<unknown> } } },
  url: string,
  platform: string | null
): Promise<string[]> {
  try {
    const pageData = await zai.functions.invoke('page_reader', { url });

    if (!pageData) return [];

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an image URL extractor for a luxury e-commerce platform. 
Your ONLY job is to find product image URLs from the given webpage content.
Return a JSON object with a single field "images" containing an array of FULL, ABSOLUTE image URLs (starting with http:// or https://).

IMPORTANT RULES:
- Only include COMPLETE URLs starting with http:// or https://
- Include the LARGEST/HIGHEST QUALITY version of each product image
- EXCLUDE: thumbnails, icons, logos, UI elements, social media icons, banner ads, pixel trackers
- EXCLUDE: data: URIs, SVG icons, placeholder images
- If you find image URLs starting with //, convert them to https://
- Look specifically in: <img src>, <img data-src>, <source srcset>, JSON-LD "image" field, og:image meta tags
- For e-commerce sites, product images are usually in:
  - Nykaa: cdn.nykaa.com or images-static.nykaa.com URLs
  - Myntra: assets.myntassets.com URLs  
  - Amazon: images-eu.ssl-images-amazon.com or m.media-amazon.com URLs
  - Flipkart: rukminim1.flixcart.com URLs
  - CaratLane: caratlane.com URLs
  - Tanishq: tanishq.co.in URLs
- Return up to 5 best product images
- Return ONLY the JSON object, no explanation`,
        },
        {
          role: 'user',
          content: `Extract product image URLs from this webpage:\n\nURL: ${url}\nPlatform: ${platform || 'unknown'}\n\nPage Content:\n${pageData}`,
        },
      ],
      thinking: { type: 'disabled' },
    });

    const content = completion.choices?.[0]?.message?.content || '';

    try {
      const jsonMatch =
        content.match(/```json\s*([\s\S]*?)```/) ||
        content.match(/```\s*([\s\S]*?)```/) ||
        [null, content];
      const jsonStr = jsonMatch[1] || content;
      const data = JSON.parse(jsonStr.trim());
      return data.images || [];
    } catch {
      return [];
    }
  } catch {
    return [];
  }
}
