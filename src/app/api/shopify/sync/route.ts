import { NextRequest, NextResponse } from 'next/server';
import { getShopifyProducts, getShopifyCollections, shopifyProductToAppProduct } from '@/lib/shopify/client';
import {
  testAdminConnection,
  createShopifyProduct,
  updateShopifyProduct,
  createShopifyCustomCollection,
  updateShopifyCustomCollection,
  createShopifyCollect,
  localProductToShopifyInput,
  localCategoryToShopifyCollectionInput,
  shopifyGidToNumericId,
  numericIdToShopifyGid,
  type ShopifyAdminCustomCollectionInput,
} from '@/lib/shopify/admin-client';
import { db } from '@/lib/db';

// ==============================
// HELPERS
// ==============================

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://3boxesluxurycurations.com';
const RATE_LIMIT_DELAY_MS = 500;

/** Sleep helper for rate limiting */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convert a relative image URL to a full publicly accessible URL.
 * If the URL is already absolute (starts with http), return as-is.
 * If it's a relative path (starts with /), prepend the APP_URL.
 * Otherwise, prepend APP_URL + /.
 */
function toFullImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${APP_URL}${url}`;
  return `${APP_URL}/${url}`;
}

/**
 * Parse a JSON string field safely, returning the parsed value or a fallback.
 */
function parseJsonField<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// ==============================
// POST — Sync endpoint (both directions)
// ==============================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { direction = 'shopify-to-local' } = body;

    // ────────────────────────────────────────────
    // Direction: local-to-shopify
    // Push local products FROM our DB TO Shopify
    // ────────────────────────────────────────────
    if (direction === 'local-to-shopify') {
      return await handleLocalToShopify();
    }

    // ────────────────────────────────────────────
    // Direction: shopify-to-local (existing)
    // Pull products FROM Shopify and save to local DB
    // ────────────────────────────────────────────
    if (direction === 'shopify-to-local') {
      return await handleShopifyToLocal();
    }

    return NextResponse.json(
      { error: 'Invalid sync direction. Use: local-to-shopify or shopify-to-local' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Shopify sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync products', details: error.message },
      { status: 500 }
    );
  }
}

// ==============================
// local-to-shopify handler
// ==============================

async function handleLocalToShopify() {
  // Step 1: Test Admin API connection
  const connectionTest = await testAdminConnection();
  if (!connectionTest.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Shopify Admin API not connected. Please set SHOPIFY_ADMIN_TOKEN in your app settings.',
        details: connectionTest.error,
      },
      { status: 403 }
    );
  }

  const results = {
    direction: 'local-to-shopify' as const,
    adminApiConnected: true,
    shop: connectionTest.shop?.name || '3boxesluxury-2.myshopify.com',

    // Category results
    categories: {
      total: 0,
      created: 0,
      updated: 0,
      failed: 0,
      details: [] as Array<{
        id: string;
        name: string;
        status: 'created' | 'updated' | 'failed';
        shopifyId?: string;
        error?: string;
      }>,
    },

    // Product results
    products: {
      total: 0,
      created: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      details: [] as Array<{
        id: string;
        name: string;
        status: 'created' | 'updated' | 'failed' | 'skipped';
        shopifyId?: string;
        shopifyVariantId?: string;
        error?: string;
      }>,
    },

    // Collect (product ↔ collection) results
    collects: {
      total: 0,
      created: 0,
      failed: 0,
    },
  };

  // ── Step 2: Push categories as Shopify Custom Collections ──

  const localCategories = await db.category.findMany({
    orderBy: { name: 'asc' },
  });
  results.categories.total = localCategories.length;

  // Map local category ID → Shopify collection numeric ID (for later collect creation)
  const categoryShopifyMap = new Map<string, number>(); // localCategoryId → numeric collection ID

  for (const cat of localCategories) {
    try {
      // Convert image URL to full URL if needed
      const fullImageUrl = cat.image ? toFullImageUrl(cat.image) : null;

      // Build collection input — try WITH image first, fallback to WITHOUT image
      const collectionInputWithImage = localCategoryToShopifyCollectionInput(
        {
          name: cat.name,
          description: cat.description,
          image: fullImageUrl,
        },
        { published: true }
      );

      const collectionInputWithoutImage = localCategoryToShopifyCollectionInput(
        {
          name: cat.name,
          description: cat.description,
          image: null, // Skip image — will be added later when site is publicly accessible
        },
        { published: true }
      );

      const createOrUpdateCollection = async (input: ShopifyAdminCustomCollectionInput) => {
        if (cat.shopifyId) {
          const numericId = shopifyGidToNumericId(cat.shopifyId);
          if (!numericId) {
            throw new Error(`Invalid shopifyId format: ${cat.shopifyId}`);
          }
          return await updateShopifyCustomCollection(numericId, input);
        } else {
          return await createShopifyCustomCollection(input);
        }
      };

      let response;
      let usedImage = false;

      // Try with image first
      try {
        response = await createOrUpdateCollection(collectionInputWithImage);
        usedImage = true;
      } catch (imgError: any) {
        // If image upload fails (connection error, etc.), retry without image
        const errMsg = imgError?.message || String(imgError);
        if (errMsg.includes('Image') || errMsg.includes('image') || errMsg.includes('failed to download') || errMsg.includes('connection error')) {
          console.log(`Category "${cat.name}": image upload failed, creating without image`);
          response = await createOrUpdateCollection(collectionInputWithoutImage);
          usedImage = false;
        } else {
          // Some other error — don't retry
          throw imgError;
        }
      }

      const shopifyNumericId = response.custom_collection.id;
      const shopifyGid = response.custom_collection.admin_graphql_api_id;

      categoryShopifyMap.set(cat.id, shopifyNumericId);

      const isUpdate = !!cat.shopifyId;

      // Save the Shopify GID back to the local category
      await db.category.update({
        where: { id: cat.id },
        data: { shopifyId: shopifyGid || numericIdToShopifyGid(shopifyNumericId, 'CustomCollection') },
      });

      results.categories.details.push({
        id: cat.id,
        name: cat.name,
        status: isUpdate ? 'updated' : 'created',
        shopifyId: shopifyGid || numericIdToShopifyGid(shopifyNumericId, 'CustomCollection'),
        error: usedImage ? undefined : 'Collection created without image (image URL not publicly accessible)',
      });
      if (isUpdate) {
        results.categories.updated++;
      } else {
        results.categories.created++;
      }

      // Rate limit between collection operations
      await sleep(RATE_LIMIT_DELAY_MS);
    } catch (error: any) {
      console.error(`Failed to push category "${cat.name}" (${cat.id}):`, error);
      results.categories.details.push({
        id: cat.id,
        name: cat.name,
        status: 'failed',
        error: error?.message || String(error),
      });
      results.categories.failed++;
    }
  }

  // ── Step 3: Push products to Shopify ──

  const localProducts = await db.product.findMany({
    where: {
      // Only push local (non-Shopify-sourced) products
      // Note: source can be null for local products, so we use OR to include both null and non-shopify
      OR: [
        { source: null },
        { source: { not: 'shopify' } },
      ],
    },
    include: {
      category: true,
      variants: true,
    },
    orderBy: { name: 'asc' },
  });
  results.products.total = localProducts.length;

  // Map local product ID → Shopify product numeric ID (for later collect creation)
  const productShopifyMap = new Map<string, number>(); // localProductId → numeric product ID

  for (const product of localProducts) {
    try {
      // Parse images JSON and convert relative URLs to full URLs
      const parsedImages: string[] = parseJsonField(product.images, []);
      const fullImageUrls = parsedImages.map(toFullImageUrl);

      // Parse tags
      const parsedTags: string[] = parseJsonField(product.tags, []);

      // Build variant data for the helper
      const variants = product.variants && product.variants.length > 0
        ? product.variants.map((v) => ({
            name: v.name,
            price: v.price,
            compareAtPrice: v.compareAtPrice,
            sku: v.sku,
            stock: v.stock,
            attributes: v.attributes,
            image: v.image ? toFullImageUrl(v.image) : null,
          }))
        : undefined;

      // Build the local product data for the helper function
      const localProductData = {
        name: product.name,
        description: product.description || '',
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        sku: product.sku,
        images: JSON.stringify(fullImageUrls),
        stock: product.stock,
        tags: JSON.stringify(parsedTags),
        occasions: product.occasions,
        recipientTypes: product.recipientTypes,
        relationships: product.relationships,
        category: product.category?.name || '',
        vendor: '3 BOXES LUXURY',
        variants,
      };

      // Convert to Shopify Admin API input format
      const shopifyInput = localProductToShopifyInput(localProductData, {
        status: 'active',
      });

      if (product.shopifyId) {
        // Product already has a Shopify ID → update
        const numericId = shopifyGidToNumericId(product.shopifyId);
        if (!numericId) {
          results.products.details.push({
            id: product.id,
            name: product.name,
            status: 'failed',
            error: `Invalid shopifyId format: ${product.shopifyId}`,
          });
          results.products.failed++;
          continue;
        }

        const response = await updateShopifyProduct(numericId, shopifyInput);
        const shopifyProduct = response.product;
        const shopifyNumericId = shopifyProduct.id;
        const shopifyGid = shopifyProduct.admin_graphql_api_id;
        const shopifyVariantGid = shopifyProduct.variants[0]?.admin_graphql_api_id;

        productShopifyMap.set(product.id, shopifyNumericId);

        // Update local product with Shopify IDs
        await db.product.update({
          where: { id: product.id },
          data: {
            shopifyId: shopifyGid || numericIdToShopifyGid(shopifyNumericId, 'Product'),
            shopifyVariantId: shopifyVariantGid || '',
            source: 'local',
            lastSyncedAt: new Date(),
          },
        });

        results.products.details.push({
          id: product.id,
          name: product.name,
          status: 'updated',
          shopifyId: shopifyGid || numericIdToShopifyGid(shopifyNumericId, 'Product'),
          shopifyVariantId: shopifyVariantGid || '',
        });
        results.products.updated++;
      } else {
        // No Shopify ID → create new
        const response = await createShopifyProduct(shopifyInput);
        const shopifyProduct = response.product;
        const shopifyNumericId = shopifyProduct.id;
        const shopifyGid = shopifyProduct.admin_graphql_api_id;
        const shopifyVariantGid = shopifyProduct.variants[0]?.admin_graphql_api_id;

        productShopifyMap.set(product.id, shopifyNumericId);

        // Save Shopify IDs back to local product
        await db.product.update({
          where: { id: product.id },
          data: {
            shopifyId: shopifyGid || numericIdToShopifyGid(shopifyNumericId, 'Product'),
            shopifyVariantId: shopifyVariantGid || '',
            source: 'local',
            lastSyncedAt: new Date(),
          },
        });

        results.products.details.push({
          id: product.id,
          name: product.name,
          status: 'created',
          shopifyId: shopifyGid || numericIdToShopifyGid(shopifyNumericId, 'Product'),
          shopifyVariantId: shopifyVariantGid || '',
        });
        results.products.created++;
      }

      // Rate limit between product operations
      await sleep(RATE_LIMIT_DELAY_MS);
    } catch (error: any) {
      console.error(`Failed to push product "${product.name}" (${product.id}):`, error);
      results.products.details.push({
        id: product.id,
        name: product.name,
        status: 'failed',
        error: error?.message || String(error),
      });
      results.products.failed++;
      // Continue with next product — don't stop the entire sync
    }
  }

  // ── Step 4: Add products to their collections (Collects) ──

  // Re-fetch products with updated shopifyId values to get the category mapping
  const updatedProducts = await db.product.findMany({
    where: {
      id: { in: localProducts.map((p) => p.id) },
      shopifyId: { not: null },
    },
    select: {
      id: true,
      categoryId: true,
      shopifyId: true,
    },
  });

  for (const up of updatedProducts) {
    const shopifyProductNumericId = productShopifyMap.get(up.id);
    const shopifyCollectionNumericId = categoryShopifyMap.get(up.categoryId);

    if (!shopifyProductNumericId || !shopifyCollectionNumericId) {
      // Can't create a collect without both IDs
      continue;
    }

    results.collects.total++;

    try {
      await createShopifyCollect({
        collection_id: shopifyCollectionNumericId,
        product_id: shopifyProductNumericId,
      });
      results.collects.created++;

      // Rate limit between collect operations
      await sleep(RATE_LIMIT_DELAY_MS);
    } catch (error: any) {
      // Collects may already exist (duplicate), which returns an error
      // We treat this as non-fatal but log it
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes('already exists') || errorMsg.includes('has already been taken')) {
        // Already linked — count as success
        results.collects.created++;
      } else {
        console.error(
          `Failed to add product ${up.id} to collection ${up.categoryId}:`,
          error
        );
        results.collects.failed++;
      }
    }
  }

  return NextResponse.json({
    success: true,
    ...results,
  });
}

// ==============================
// shopify-to-local handler (existing — unchanged logic)
// ==============================

async function handleShopifyToLocal() {
  // Fetch all products from Shopify
  const { products: shopifyProducts } = await getShopifyProducts(250);

  let synced = 0;
  let created = 0;
  let updated = 0;

  // Ensure a default "Uncategorized" category exists
  let defaultCategory = await db.category.findFirst({ where: { slug: 'uncategorized' } });
  if (!defaultCategory) {
    defaultCategory = await db.category.create({
      data: {
        name: 'Uncategorized',
        slug: 'uncategorized',
        description: 'Products without a specific category',
      },
    });
  }

  for (const sp of shopifyProducts) {
    const appProduct = shopifyProductToAppProduct(sp);
    const variant = sp.variants.edges[0]?.node;
    const price = variant?.price?.amount ? parseFloat(variant.price.amount) : 0;
    const compareAtPrice = variant?.compareAtPrice?.amount ? parseFloat(variant.compareAtPrice.amount) : null;
    const imageUrl = sp.featuredImage?.url || (sp.images.edges[0]?.node?.url) || '';
    const allImages = sp.images.edges.map(e => e.node.url);

    // Find or create category based on productType
    let category = defaultCategory;
    if (sp.productType) {
      const catSlug = sp.productType.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');
      let existingCat = await db.category.findFirst({ where: { slug: catSlug } });
      if (!existingCat) {
        existingCat = await db.category.create({
          data: {
            name: sp.productType,
            slug: catSlug,
            description: `Products of type ${sp.productType}`,
          },
        });
      }
      category = existingCat;
    }

    // Check if product already exists (by shopifyId or handle)
    const existing = await db.product.findFirst({
      where: {
        OR: [
          { shopifyId: sp.id },
          { slug: sp.handle },
        ],
      },
    });

    // Generate a product number
    const productNumber = `SHP-${sp.id.split('/').pop()}`;

    const productData = {
      name: sp.title,
      slug: sp.handle,
      description: sp.description || '',
      price,
      compareAtPrice,
      productNumber: existing?.productNumber || productNumber,
      images: JSON.stringify(allImages.length > 0 ? allImages : (imageUrl ? [imageUrl] : [])),
      categoryId: category.id,
      stock: variant?.availableForSale ? 10 : 0,
      stockStatus: variant?.availableForSale ? 'in_stock' as const : 'out_of_stock' as const,
      tags: JSON.stringify(sp.tags || []),
      vendor: undefined, // Don't set vendor - it's a FK relation
      shopifyId: sp.id,
      shopifyVariantId: variant?.id || '',
      shopifyData: JSON.stringify(sp),
      source: 'shopify',
      isExternal: false,
      rating: 0,
      reviewCount: 0,
      featured: false,
    };

    if (existing) {
      await db.product.update({
        where: { id: existing.id },
        data: {
          name: productData.name,
          slug: productData.slug,
          description: productData.description,
          price: productData.price,
          compareAtPrice: productData.compareAtPrice,
          images: productData.images,
          categoryId: productData.categoryId,
          stock: productData.stock,
          stockStatus: productData.stockStatus,
          tags: productData.tags,
          shopifyId: productData.shopifyId,
          shopifyVariantId: productData.shopifyVariantId,
          shopifyData: productData.shopifyData,
          source: productData.source,
        },
      });
      updated++;
    } else {
      await db.product.create({
        data: productData as any,
      });
      created++;
    }

    synced++;
  }

  // Also sync collections as categories
  const collections = await getShopifyCollections();
  let categoriesSynced = 0;

  for (const col of collections) {
    if (col.handle === 'frontpage') continue; // Skip default

    const existing = await db.category.findFirst({
      where: {
        OR: [
          { shopifyId: col.id },
          { slug: col.handle },
        ],
      },
    });

    const categoryData = {
      name: col.title,
      slug: col.handle,
      description: col.description || '',
      image: col.image?.url || '',
      shopifyId: col.id,
    };

    if (existing) {
      await db.category.update({
        where: { id: existing.id },
        data: categoryData,
      });
    } else {
      await db.category.create({
        data: categoryData as any,
      });
    }
    categoriesSynced++;
  }

  return NextResponse.json({
    success: true,
    synced,
    created,
    updated,
    categoriesSynced,
    source: 'shopify',
  });
}

// ==============================
// GET — Sync status
// ==============================

export async function GET() {
  try {
    // Test Admin API connection
    const adminConnection = await testAdminConnection();

    // Local product/category counts
    // Note: source can be null for local products, so we use OR to include both null and non-shopify
    const localProductFilter = {
      OR: [
        { source: null },
        { source: { not: 'shopify' } },
      ],
    };

    const totalLocalProducts = await db.product.count({
      where: localProductFilter,
    });

    const localProductsPushed = await db.product.count({
      where: {
        ...localProductFilter,
        shopifyId: { not: null },
      },
    });

    const localProductsNotPushed = await db.product.count({
      where: {
        shopifyId: null,
        OR: [
          { source: null },
          { source: { not: 'shopify' } },
        ],
      },
    });

    const totalCategories = await db.category.count();
    const categoriesPushed = await db.category.count({
      where: { shopifyId: { not: null } },
    });
    const categoriesNotPushed = await db.category.count({
      where: { shopifyId: null },
    });

    // Shopify-sourced products in local DB
    const shopifyProducts = await db.product.count({
      where: { source: 'shopify' },
    });

    // Total products
    const totalProducts = await db.product.count();

    // Last sync timestamps
    const lastPushedProduct = await db.product.findFirst({
      where: {
        OR: [
          { source: null },
          { source: { not: 'shopify' } },
        ],
        shopifyId: { not: null },
        lastSyncedAt: { not: null },
      },
      orderBy: { lastSyncedAt: 'desc' },
      select: { lastSyncedAt: true },
    });

    const lastShopifyProduct = await db.product.findFirst({
      where: { source: 'shopify' },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    return NextResponse.json({
      status: adminConnection.success ? 'connected' : 'admin_api_not_configured',
      store: '3boxesluxury-2.myshopify.com',
      adminApi: {
        connected: adminConnection.success,
        shopName: adminConnection.shop?.name || null,
        error: adminConnection.error || null,
      },
      sync: {
        // local → shopify push stats
        localToShopify: {
          totalLocalProducts,
          pushedToShopify: localProductsPushed,
          notYetPushed: localProductsNotPushed,
          totalCategories,
          categoriesPushed,
          categoriesNotPushed,
          lastPushedAt: lastPushedProduct?.lastSyncedAt || null,
        },
        // shopify → local pull stats
        shopifyToLocal: {
          shopifyProductsInLocalDb: shopifyProducts,
          totalProducts,
          lastPulledAt: lastShopifyProduct?.updatedAt || null,
        },
      },
    });
  } catch (error: any) {
    console.error('Shopify sync status error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status', details: error.message },
      { status: 500 }
    );
  }
}
