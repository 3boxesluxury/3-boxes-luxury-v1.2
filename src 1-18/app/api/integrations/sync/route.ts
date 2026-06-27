import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionAsync } from '@/lib/sessions';

async function verifyAdmin(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const user = await getSessionAsync(auth?.replace('Bearer ', '') ?? '');
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  if (user.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null };
  return { error: null, user };
}

// Platform slug to domain mapping for site: search
const PLATFORM_DOMAINS: Record<string, string> = {
  myntra: 'myntra.com',
  nykaa: 'nykaa.com',
  amazon: 'amazon.in',
  flipkart: 'flipkart.com',
  caratlane: 'caratlane.com',
  tanishq: 'tanishq.co.in',
  bluestone: 'bluestone.com',
  voylla: 'voylla.com',
};

// Map platform category to our internal category slug
const CATEGORY_SLUG_MAP: Record<string, string> = {
  jewelry: 'jewelry',
  jewellery: 'jewelry',
  watches: 'watches',
  fashion: 'fashion',
  sarees: 'sarees',
  'home-living': 'home-decor',
  'home decor': 'home-decor',
  fragrances: 'fragrance',
  fragrance: 'fragrance',
  perfume: 'fragrance',
};

interface ScrapedProductData {
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number | null;
  images: string[];
  brand?: string | null;
  category?: string | null;
  tags?: string[] | null;
  sku?: string | null;
  inStock?: boolean | null;
  url?: string | null;
}

// POST /api/integrations/sync - Trigger sync for a specific integration
export async function POST(request: NextRequest) {
  const { error: authError } = await verifyAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { integrationId, category, query } = body;

    if (!integrationId) {
      return NextResponse.json(
        { error: 'integrationId is required' },
        { status: 400 }
      );
    }

    // Get integration
    const integration = await db.platformIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    if (!integration.isActive) {
      return NextResponse.json(
        { error: 'Integration is not active' },
        { status: 400 }
      );
    }

    // Check if already syncing
    if (integration.syncStatus === 'syncing') {
      return NextResponse.json(
        { error: 'Integration is already syncing. Please wait.' },
        { status: 409 }
      );
    }

    // Mark as syncing
    await db.platformIntegration.update({
      where: { id: integrationId },
      data: { syncStatus: 'syncing', lastSyncError: null },
    });

    // Create sync log entry
    const syncLog = await db.syncLog.create({
      data: {
        integrationId,
        type: category ? 'category' : 'full',
        status: 'started',
      },
    });

    // Run sync in background (don't await - return immediately)
    // Actually, we need to await to get results. Let's run it inline but with a timeout.
    try {
      const result = await performSync(integration, category, query);

      // Update sync log
      await db.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'completed',
          productsFound: result.productsFound,
          productsAdded: result.productsAdded,
          productsUpdated: result.productsUpdated,
          completedAt: new Date(),
        },
      });

      // Update integration
      const currentCount = await db.product.count({
        where: { isExternal: true, platform: integration.slug },
      });
      await db.platformIntegration.update({
        where: { id: integrationId },
        data: {
          lastSyncedAt: new Date(),
          syncStatus: 'idle',
          productCount: currentCount,
        },
      });

      return NextResponse.json({
        message: `Sync completed for ${integration.name}`,
        productsFound: result.productsFound,
        productsAdded: result.productsAdded,
        productsUpdated: result.productsUpdated,
        errors: result.errors,
      });
    } catch (syncErr: unknown) {
      const errorMessage = syncErr instanceof Error ? syncErr.message : 'Unknown sync error';

      // Update sync log with error
      await db.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'failed',
          error: errorMessage,
          completedAt: new Date(),
        },
      });

      // Update integration
      await db.platformIntegration.update({
        where: { id: integrationId },
        data: {
          syncStatus: 'error',
          lastSyncError: errorMessage,
        },
      });

      return NextResponse.json(
        { error: 'Sync failed', details: errorMessage },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error('Error triggering sync:', err);
    return NextResponse.json(
      { error: 'Failed to trigger sync' },
      { status: 500 }
    );
  }
}

async function performSync(
  integration: {
    id: string;
    name: string;
    slug: string;
    baseUrl: string;
    categories: string;
    affiliateTag: string | null;
    commission: number | null;
    maxProducts: number;
  },
  category?: string,
  query?: string
): Promise<{
  productsFound: number;
  productsAdded: number;
  productsUpdated: number;
  errors: string[];
}> {
  const ZAI = (await import('z-ai-web-dev-sdk')).default;
  const zai = await ZAI.create();

  const integrationCategories: string[] = JSON.parse(integration.categories || '[]');
  const categoriesToSync = category ? [category] : integrationCategories;

  let productsFound = 0;
  let productsAdded = 0;
  let productsUpdated = 0;
  const errors: string[] = [];

  const domain = PLATFORM_DOMAINS[integration.slug] || new URL(integration.baseUrl).hostname;

  // Get existing external product count to respect maxProducts
  const existingCount = await db.product.count({
    where: { isExternal: true, platform: integration.slug },
  });

  for (const cat of categoriesToSync) {
    if (existingCount + productsAdded >= integration.maxProducts) break;

    try {
      // Build search query
      const searchQuery = query
        ? `site:${domain} ${query}`
        : `site:${domain} ${cat} luxury buy`;

      // Search for products
      const searchResults = await zai.functions.invoke('web_search', {
        query: searchQuery,
        num: 20,
      });

      const resultsList = searchResults?.results || searchResults || [];
      if (!Array.isArray(resultsList)) continue;

      productsFound += resultsList.length;

      // Process each search result (limit to 20 per category)
      const itemsToProcess = resultsList.slice(0, 20);

      for (const item of itemsToProcess) {
        if (existingCount + productsAdded >= integration.maxProducts) break;

        try {
          const productUrl = item.url || item.link;
          if (!productUrl) continue;

          // Skip non-product pages (like category pages, search pages)
          if (isNonProductUrl(productUrl, integration.slug)) continue;

          // Check if we already have this product
          const existing = await db.product.findFirst({
            where: {
              platform: integration.slug,
              sourceUrl: productUrl,
            },
          });

          if (existing) {
            // Update lastSyncedAt
            await db.product.update({
              where: { id: existing.id },
              data: { lastSyncedAt: new Date(), syncStatus: 'active' },
            });
            productsUpdated++;
            continue;
          }

          // Scrape product details
          const productData = await scrapeProduct(zai, productUrl, integration.slug);
          if (!productData || !productData.name || !productData.price) continue;

          // Map category
          const categorySlug = mapCategory(productData.category || cat);
          const categoryRecord = await db.category.findFirst({
            where: { slug: categorySlug },
          });

          if (!categoryRecord) {
            // Fallback to first available category
            const fallback = await db.category.findFirst();
            if (!fallback) {
              errors.push(`No categories found in DB for product: ${productData.name}`);
              continue;
            }
            // Use fallback
            await importProduct(productData, productUrl, integration, fallback.id);
            productsAdded++;
            continue;
          }

          await importProduct(productData, productUrl, integration, categoryRecord.id);
          productsAdded++;
        } catch (itemErr: unknown) {
          const msg = itemErr instanceof Error ? itemErr.message : 'Unknown error';
          errors.push(`Error processing item: ${msg}`);
        }
      }
    } catch (catErr: unknown) {
      const msg = catErr instanceof Error ? catErr.message : 'Unknown error';
      errors.push(`Error syncing category "${cat}": ${msg}`);
    }
  }

  return { productsFound, productsAdded, productsUpdated, errors };
}

function isNonProductUrl(url: string, platformSlug: string): boolean {
  const nonProductPatterns: Record<string, RegExp[]> = {
    myntra: [/\/shopping\//i, /\/search\//i, /\/guides\//i, /\/lookbook\//i],
    nykaa: [/\/brands\//i, /\/search\//i, /\/offers\//i],
    amazon: [/\/s\?/i, /\/gp\/browse\//i, /\/best-sellers\//i],
    flipkart: [/\/search\?/i, /\/offers\//i, /\/brands\//i],
    caratlane: [/\/collections\//i],
    tanishq: [/\/collections\//i],
    bluestone: [/\/collections\//i],
    voylla: [/\/collections\//i],
  };

  const patterns = nonProductPatterns[platformSlug] || [];
  // Also skip URLs that look like homepage or category pages (no specific product identifier)
  if (url === '' || url.split('/').filter(Boolean).length < 4) return true;
  return patterns.some((p) => p.test(url));
}

async function scrapeProduct(
  zai: { functions: { invoke: (name: string, params: Record<string, unknown>) => Promise<unknown> }; chat: { completions: { create: (params: Record<string, unknown>) => Promise<unknown> } } },
  url: string,
  platformSlug: string
): Promise<ScrapedProductData | null> {
  try {
    // Read the page content
    const pageData = await zai.functions.invoke('page_reader', { url });

    if (!pageData) return null;

    // Use LLM to extract structured product data
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a product data extraction assistant for a luxury e-commerce platform called "3 BOXES LUXURY". 
Extract structured product data from the given webpage content. Return ONLY a valid JSON object with these fields:
- name: string (product name, clean and professional)
- description: string (detailed product description, well-formatted)
- price: number (current selling price in INR, numeric only)
- compareAtPrice: number or null (original/MRP price if available, otherwise null)
- images: string[] (array of FULL, ABSOLUTE image URLs found on the page - must start with http or https. Do NOT include relative URLs, data URIs, or placeholder images. Look for high-resolution product images in <img>, <source>, <picture> tags, and CSS background-image properties. For platforms like Nykaa, Myntra, Amazon, images are often in img tags with data-src or src attributes, or in JSON-LD structured data.)
- brand: string or null (brand name if available)
- category: string or null (product category like "jewelry", "watches", "fashion", "sarees", "fragrance", "home-living")
- tags: string[] (relevant tags for the product)
- sku: string or null (SKU if available)
- inStock: boolean (whether the product appears to be in stock)

IMPORTANT FOR IMAGES:
- Only include COMPLETE URLs starting with http:// or https://
- Include the LARGEST/HIGHEST QUALITY version of each image
- Exclude thumbnails, icons, logos, and UI elements
- Exclude data: URIs and placeholder images
- If you find image URLs starting with //, prefix them with https:
- Look in these locations: <img src>, <img data-src>, <source srcset>, JSON-LD "image" field, og:image meta tags

If you cannot find a field, use null. For prices, extract the numeric value only (no currency symbols).
Return ONLY the JSON object, no markdown or explanation.`,
        },
        {
          role: 'user',
          content: `Extract product data from this webpage content:\n\nURL: ${url}\nPlatform: ${platformSlug}\n\nPage Content:\n${pageData}`,
        },
      ],
      thinking: { type: 'disabled' },
    });

    const content = completion.choices?.[0]?.message?.content || '';

    // Parse the JSON from the LLM response
    try {
      const jsonMatch =
        content.match(/```json\s*([\s\S]*?)```/) ||
        content.match(/```\s*([\s\S]*?)```/) ||
        [null, content];
      const jsonStr = jsonMatch[1] || content;
      const productData: ScrapedProductData = JSON.parse(jsonStr.trim());
      productData.url = url;
      return productData;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

function mapCategory(rawCategory: string): string {
  const normalized = rawCategory.toLowerCase().trim();
  return CATEGORY_SLUG_MAP[normalized] || normalized;
}

async function importProduct(
  productData: ScrapedProductData,
  sourceUrl: string,
  integration: {
    id: string;
    slug: string;
    name: string;
    affiliateTag: string | null;
    commission: number | null;
  },
  categoryId: string
): Promise<void> {
  // Auto-generate productNumber: PRD-XXXXX
  const lastProduct = await db.product.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { productNumber: true },
  });
  let nextNum = 10001;
  if (lastProduct?.productNumber) {
    const lastNum = parseInt(lastProduct.productNumber.replace('PRD-', ''));
    nextNum = lastNum + 1;
  }
  const productNumber = `PRD-${nextNum}`;

  // Auto-generate slug from name
  const baseSlug = productData.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
  let slug = baseSlug;
  let slugCounter = 1;
  while (await db.product.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${slugCounter}`;
    slugCounter++;
  }

  // Generate affiliate URL
  const affiliateUrl = generateAffiliateUrl(sourceUrl, integration.affiliateTag, integration.slug);

  // Extract external ID from URL
  const externalId = extractExternalId(sourceUrl, integration.slug);

  // Download external images to local storage
  const { processProductImages } = await import('@/lib/image-downloader');
  const localImages = await processProductImages(productData.images || [], integration.slug);

  // If no images were downloaded, keep the original URLs (they'll be proxied)
  const finalImages = localImages.length > 0 ? localImages : (productData.images || []);

  await db.product.create({
    data: {
      productNumber,
      name: productData.name,
      slug,
      description: productData.description || '',
      price: productData.price,
      compareAtPrice: productData.compareAtPrice || null,
      images: JSON.stringify(finalImages),
      categoryId,
      stock: 999, // Virtual stock for external products
      featured: false,
      tags: JSON.stringify(productData.tags || []),
      isExternal: true,
      platform: integration.slug,
      sourceUrl,
      affiliateUrl,
      affiliateId: integration.affiliateTag || null,
      commission: integration.commission || null,
      externalId,
      lastSyncedAt: new Date(),
      syncStatus: 'active',
    },
  });
}

function generateAffiliateUrl(url: string, affiliateTag: string | null, platformSlug: string): string {
  try {
    const parsed = new URL(url);

    if (affiliateTag) {
      parsed.searchParams.set('aff', affiliateTag);
    } else {
      parsed.searchParams.set('aff', '3boxesluxury');
    }

    // Platform-specific affiliate params
    switch (platformSlug) {
      case 'amazon':
        parsed.searchParams.set('tag', affiliateTag || '3boxesluxury-21');
        break;
      case 'flipkart':
        parsed.searchParams.set('affid', affiliateTag || '3boxesluxury');
        break;
    }

    return parsed.toString();
  } catch {
    return `${url}?aff=${affiliateTag || '3boxesluxury'}`;
  }
}

function extractExternalId(url: string, platformSlug: string): string | null {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;

    switch (platformSlug) {
      case 'myntra': {
        const match = path.match(/\/(\d+)\/buy/);
        return match ? match[1] : null;
      }
      case 'amazon': {
        const match = path.match(/\/dp\/([A-Z0-9]+)/i);
        return match ? match[1] : null;
      }
      case 'flipkart': {
        const match = path.match(/\/p\/([a-z0-9]+)/i);
        return match ? match[1] : null;
      }
      case 'nykaa': {
        const match = path.match(/\/p\/(\d+)/);
        return match ? match[1] : null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}
