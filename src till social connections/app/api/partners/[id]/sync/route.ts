import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionAsync } from '@/lib/sessions';
import { autoTranslateProduct } from '@/lib/auto-translate';

async function verifyAdmin(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const user = await getSessionAsync(auth?.replace('Bearer ', '') ?? '');
  if (!user) return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  if (user.role !== 'admin') return { error: Response.json({ error: 'Forbidden' }, { status: 403 }), user: null };
  return { error: null, user };
}

// Price ranges by category type for placeholder pricing
const PRICE_RANGES: Record<string, [number, number]> = {
  jewelry: [5000, 50000],
  jewellery: [5000, 50000],
  rings: [3000, 30000],
  necklaces: [8000, 60000],
  earrings: [2000, 25000],
  bracelets: [3000, 35000],
  watches: [5000, 80000],
  fashion: [500, 5000],
  clothing: [500, 5000],
  sarees: [2000, 15000],
  'mens-shirts': [500, 3000],
  'home-decor': [1000, 10000],
  'home-living': [1000, 10000],
  fragrance: [1000, 8000],
  perfumes: [1000, 8000],
  bags: [1000, 15000],
  shoes: [1000, 10000],
};

function getRandomPrice(category: string): number {
  const normalized = category.toLowerCase().trim();
  const range = PRICE_RANGES[normalized] || [500, 5000];
  const [min, max] = range;
  return Math.round((Math.random() * (max - min) + min) / 10) * 10;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

// Extract external ID from product URL based on platform
function extractExternalId(url: string, platformSlug: string): string | null {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;

    switch (platformSlug) {
      case 'myntra': {
        const match = path.match(/\/(\d+)\//);
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
      default: {
        const genericMatch = url.match(/\/(\d{4,})/);
        return genericMatch ? genericMatch[1] : null;
      }
    }
  } catch {
    return null;
  }
}

// Build affiliate URL with tracking tag
function buildAffiliateUrl(url: string, affiliateTag: string | null, platformSlug: string): string {
  try {
    const parsed = new URL(url);

    if (affiliateTag) {
      parsed.searchParams.set('aff', affiliateTag);
    } else {
      parsed.searchParams.set('aff', '3boxesluxury');
    }

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

// Check if a URL looks like a product page (not category/search/homepage)
function isProductUrl(url: string, platformSlug: string): boolean {
  const nonProductPatterns: Record<string, RegExp[]> = {
    myntra: [/\/shopping\//i, /\/search\//i, /\/guides\//i, /\/lookbook\//i],
    nykaa: [/\/brands\//i, /\/search\//i, /\/offers\//i],
    amazon: [/\/s\?/i, /\/gp\/browse\//i, /\/best-sellers\//i],
    flipkart: [/\/search\?/i, /\/offers\//i, /\/brands\//i],
    caratlane: [/\/collections\/?$/i],
    tanishq: [/\/collections\/?$/i],
    bluestone: [/\/collections\/?$/i],
    voylla: [/\/collections\/?$/i],
  };

  const patterns = nonProductPatterns[platformSlug] || [];
  if (patterns.some((p) => p.test(url))) return false;
  if (url.split('/').filter(Boolean).length < 4) return false;
  return true;
}

// POST /api/partners/[id]/sync — Trigger a sync for a specific partner
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await verifyAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;

    // Get integration (without include for categoryMaps to avoid Prisma cache issues)
    const integration = await db.platformIntegration.findUnique({
      where: { id },
    });

    if (!integration) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    if (!integration.isActive) {
      return Response.json({ error: 'Partner is not active' }, { status: 400 });
    }

    // Check if already syncing
    if (integration.syncStatus === 'syncing') {
      return Response.json(
        { error: 'Partner is already syncing. Please wait.' },
        { status: 409 }
      );
    }

    // Fetch category maps separately
    const categoryMaps = await db.partnerCategoryMap.findMany({
      where: { integrationId: id },
    });

    // Step 1: Set partner's syncStatus to "syncing"
    await db.platformIntegration.update({
      where: { id },
      data: { syncStatus: 'syncing', lastSyncError: null },
    });

    // Step 2: Create a SyncLog entry with status "started"
    const syncLog = await db.syncLog.create({
      data: {
        integrationId: id,
        type: 'full',
        status: 'started',
      },
    });

    // Build the sync context
    const syncContext = {
      id: integration.id,
      name: integration.name,
      slug: integration.slug,
      baseUrl: integration.baseUrl,
      categories: integration.categories,
      affiliateTag: integration.affiliateTag,
      commission: integration.commission,
      maxProducts: integration.maxProducts,
      categoryMaps: categoryMaps.map((cm) => ({
        partnerCatName: cm.partnerCatName,
        partnerCatSlug: cm.partnerCatSlug,
        localCatId: cm.localCatId,
      })),
    };

    // Run the sync process
    try {
      const result = await performPartnerSync(syncContext);

      // Step 4: Update SyncLog with results
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

      // Step 5: Set partner syncStatus back to "idle" and update lastSyncedAt
      const currentCount = await db.product.count({
        where: { isExternal: true, platform: integration.slug },
      });
      await db.platformIntegration.update({
        where: { id },
        data: {
          lastSyncedAt: new Date(),
          syncStatus: 'idle',
          productCount: currentCount,
        },
      });

      return Response.json({
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

      // Update integration status
      await db.platformIntegration.update({
        where: { id },
        data: {
          syncStatus: 'error',
          lastSyncError: errorMessage,
        },
      });

      return Response.json(
        { error: 'Sync failed', details: errorMessage },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error('Error triggering partner sync:', err);
    return Response.json({ error: 'Failed to trigger sync' }, { status: 500 });
  }
}

interface SyncResult {
  productsFound: number;
  productsAdded: number;
  productsUpdated: number;
  errors: string[];
}

interface SyncContext {
  id: string;
  name: string;
  slug: string;
  baseUrl: string;
  categories: string;
  affiliateTag: string | null;
  commission: number | null;
  maxProducts: number;
  categoryMaps: { partnerCatName: string; partnerCatSlug: string; localCatId: string | null }[];
}

async function performPartnerSync(integration: SyncContext): Promise<SyncResult> {
  const ZAI = (await import('z-ai-web-dev-sdk')).default;
  const zai = await ZAI.create();

  const partnerCategories: string[] = JSON.parse(integration.categories || '[]');
  let productsFound = 0;
  let productsAdded = 0;
  let productsUpdated = 0;
  const errors: string[] = [];

  // Get domain from baseUrl for site: search
  let domain: string;
  try {
    domain = new URL(integration.baseUrl).hostname;
  } catch {
    domain = integration.baseUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }

  // Get existing external product count to respect maxProducts
  const existingCount = await db.product.count({
    where: { isExternal: true, platform: integration.slug },
  });

  // Step 3: For each category, search for products on the partner's site
  for (const category of partnerCategories) {
    if (existingCount + productsAdded >= integration.maxProducts) break;

    try {
      // Build search query using web search
      const searchQuery = `site:${domain} ${category} jewelry fashion luxury buy`;

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

          // Skip non-product URLs
          if (!isProductUrl(productUrl, integration.slug)) continue;

          // Check if we already have this product (by sourceUrl or externalId)
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

          // Get the partner category mapping
          const categoryMap = integration.categoryMaps.find(
            (cm) => cm.partnerCatSlug === slugify(category) || cm.partnerCatName.toLowerCase() === category.toLowerCase()
          );

          let categoryId: string | null = null;

          if (categoryMap?.localCatId) {
            // Use mapped local category
            categoryId = categoryMap.localCatId;
          } else {
            // Try to find a matching local category by name/slug
            const localCat = await db.category.findFirst({
              where: {
                OR: [
                  { slug: slugify(category) },
                  { name: { contains: category, mode: 'insensitive' } },
                ],
              },
            });

            if (localCat) {
              categoryId = localCat.id;
            } else {
              // Create a new category if no mapping exists
              const newSlug = slugify(category);
              const existingSlug = await db.category.findUnique({ where: { slug: newSlug } });
              if (!existingSlug) {
                const newCat = await db.category.create({
                  data: {
                    name: category.charAt(0).toUpperCase() + category.slice(1),
                    slug: newSlug,
                    description: `Products from ${integration.name} - ${category}`,
                    image: `https://placehold.co/800x400/1c1917/amber?text=${encodeURIComponent(category)}`,
                  },
                });
                categoryId = newCat.id;

                // Auto-create a category mapping
                await db.partnerCategoryMap.create({
                  data: {
                    integrationId: integration.id,
                    partnerCatName: category,
                    partnerCatSlug: slugify(category),
                    localCatId: categoryId,
                  },
                });
              } else {
                categoryId = existingSlug.id;
              }
            }
          }

          // Fallback to first category if still not found
          if (!categoryId) {
            const fallback = await db.category.findFirst();
            if (!fallback) {
              errors.push(`No categories found in DB for product from ${productUrl}`);
              continue;
            }
            categoryId = fallback.id;
          }

          // Create product from search result
          const productName = item.title || item.name || 'Unknown Product';
          const productDescription = item.snippet || item.description || `Product from ${integration.name}`;
          const price = getRandomPrice(category);
          const productNumber = `EXT-${integration.slug.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

          // Auto-generate slug
          const baseSlug = slugify(productName);
          let slug = baseSlug;
          let slugCounter = 1;
          while (await db.product.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${slugCounter}`;
            slugCounter++;
          }

          // Use search result image if available, or placeholder
          const imageUrl = item.image || item.thumbnail || (item.pagemap as Record<string, unknown> | undefined)?.cse_image
            ? ((item.pagemap as Record<string, Array<{ src: string }>>)?.cse_image?.[0]?.src ?? null)
            : null;
          const images = imageUrl
            ? JSON.stringify([imageUrl])
            : JSON.stringify([`https://placehold.co/400x400/1c1917/amber?text=${encodeURIComponent(productName.substring(0, 10))}`]);

          // Build affiliate URL
          const affiliateUrl = buildAffiliateUrl(productUrl, integration.affiliateTag, integration.slug);

          // Extract external ID
          const externalId = extractExternalId(productUrl, integration.slug);

          const newProduct = await db.product.create({
            data: {
              productNumber,
              name: productName,
              slug,
              description: productDescription,
              price,
              images,
              categoryId,
              stock: 999, // External products always "available"
              featured: false,
              isExternal: true,
              platform: integration.slug,
              sourceUrl: productUrl,
              affiliateUrl,
              affiliateId: integration.affiliateTag || null,
              commission: integration.commission || null,
              externalId,
              lastSyncedAt: new Date(),
              syncStatus: 'active',
            },
          });

          // Auto-translate new product (fire-and-forget)
          autoTranslateProduct(newProduct.id, productName, productDescription).catch(() => {});

          productsAdded++;
        } catch (itemErr: unknown) {
          const msg = itemErr instanceof Error ? itemErr.message : 'Unknown error';
          errors.push(`Error processing item: ${msg}`);
        }
      }
    } catch (catErr: unknown) {
      const msg = catErr instanceof Error ? catErr.message : 'Unknown error';
      errors.push(`Error syncing category "${category}": ${msg}`);
    }
  }

  return { productsFound, productsAdded, productsUpdated, errors };
}
