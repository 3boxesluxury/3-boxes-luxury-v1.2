/**
 * scripts/import-scraped-products.ts
 *
 * Imports scraped products from `scraped-products.json` into your Prisma database.
 * Creates Category and Vendor records as needed.
 *
 * ─── Usage ──────────────────────────────────────────────────────────────────
 *   bun run scripts/import-scraped-products.ts
 *   (or: npx tsx scripts/import-scraped-products.ts)
 *
 * ─── Prerequisites ──────────────────────────────────────────────────────────
 *   1. Run `bun run scripts/cleanup-all-products.ts` FIRST to empty the DB.
 *   2. Place `scraped-products.json` (from the scrape-3boxesgifts.py output)
 *      in the project root (or set SCRAPED_PRODUCTS_PATH env var).
 *
 * ─── What gets imported ─────────────────────────────────────────────────────
 *   - 14 Category records (from Shopify collections)
 *   - ~7 Vendor records (from Shopify product vendors — 3boxesgifts, The Man
 *     Company, Lattafa Pride, Bla Bli Blu, WildHorn, Park Avenue, etc.)
 *   - 48 Product records (from Shopify products.json)
 *
 * ─── Field mapping (Shopify → Prisma) ───────────────────────────────────────
 *   Shopify field            → Prisma Product field
 *   ─────────────────────────────────────────────
 *   id                       → productNumber (as string)
 *   handle                   → slug
 *   title                    → name
 *   body_html                → description (HTML stripped to plain text)
 *   variants[0].price        → price (Float)
 *   variants[0].compare_at_price → compareAtPrice (Float?, nullable)
 *   variants[0].sku          → sku (String?, nullable)
 *   images[].src             → images (JSON-stringified array of URLs)
 *   tags                     → tags (JSON-stringified array)
 *   variants[0].inventory_quantity → stock (Int, default 0)
 *   vendor                   → vendor (relation via Vendor.name)
 *   collections              → category (relation via Category.slug)
 *   product_type             → tags (also appended as a tag)
 *
 * For full mapping details, see the transformProduct() function below.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ─── Configuration ──────────────────────────────────────────────────────────
const SCRAPED_PRODUCTS_PATH =
  process.env.SCRAPED_PRODUCTS_PATH ||
  path.join(process.cwd(), 'scraped-products.json');

// Currency conversion: Shopify stores prices in INR for this store (confirmed
// via the analytics data we saw: "currencyCode":"INR"). Your Prisma schema
// stores price as Float (no specific currency), so we keep INR values as-is.
// If your app uses a different base currency, adjust here.
const PRICE_CURRENCY = 'INR';

// ─── Types (matching the scraped JSON shape) ────────────────────────────────
interface ShopifyImage {
  id: number;
  src: string;
  alt_text?: string | null;
  position?: number;
}
interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  compare_at_price?: string | null;
  sku?: string | null;
  inventory_quantity?: number | null;
  available?: boolean | null;
  weight?: number | null;
  weight_unit?: string | null;
}
interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html?: string | null;
  vendor?: string | null;
  product_type?: string | null;
  tags?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  published_at?: string | null;
  images?: ShopifyImage[];
  variants?: ShopifyVariant[];
}
interface ScrapedCollection {
  id: number;
  handle: string;
  title: string;
  body_html?: string | null;
  products_type?: string | null;
  published_at?: string | null;
  product_handles: string[];
}
interface ScrapedData {
  products: ShopifyProduct[];
  collections: ScrapedCollection[];
  errors?: string[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Strip HTML tags and decode entities, returning plain text. */
function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  let text = html;
  // Convert <br>, <p>, <li>, </li>, </p>, </h1-6>, </div> to newlines
  text = text.replace(/<\s*(br|\/p|\/li|\/h[1-6]|\/div)[^>]*>/gi, '\n');
  // Convert <li> to bullet
  text = text.replace(/<\s*li[^>]*>/gi, '• ');
  // Remove all other tags
  text = text.replace(/<[^>]+>/g, '');
  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"');
  // Collapse multiple newlines and trim each line
  text = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join('\n')
    .trim();
  return text;
}

/** Generate a URL-safe slug from a string. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Convert price string ("699.00") to Float. */
function parsePrice(s: string | null | undefined): number {
  if (!s) return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/** Parse Shopify tags string ("tag1, tag2, tag3") into array. */
function parseTags(s: string | null | undefined): string[] {
  if (!s) return [];
  return s
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/** Map 3boxesgifts collection titles to your existing app's category slugs.
 *  This allows the scraped products to show up in your existing navigation
 *  (Men, Women, Kids, Home, Office, etc.) where possible.
 *
 *  Collections that don't have a clear mapping get their own slug.
 */
function mapCollectionToCategorySlug(collectionHandle: string, collectionTitle: string): string {
  const map: Record<string, string> = {
    'beauty': 'beauty',
    'birthday': 'birthday-gifts',
    'corporate-gifts': 'office-corporate-gifts',
    'gifts': 'gift-sets',
    'home-decor': 'home-decor',
    'jewellary': 'jewellery',
    'men-gift-hamper': 'men-gift-hamper',
    'men-grooming-kit': 'men-grooming-kit',
    'men': 'mens-gifts',
    'perfumes': 'fragrances',
    'love': 'romantic-gifts',
    'scented-candle': 'scented-candles',
    'toys': 'toys',
    'travel': 'travel-products',
  };
  return map[collectionHandle] || slugify(collectionTitle);
}

// ─── Main import logic ──────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  📦 IMPORT: Load scraped products into your Prisma database');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log();

  // ─── Step 0: Load scraped JSON ───────────────────────────────────────────
  if (!fs.existsSync(SCRAPED_PRODUCTS_PATH)) {
    console.error(`❌ ERROR: Scraped products file not found at: ${SCRAPED_PRODUCTS_PATH}`);
    console.error();
    console.error('   Place scraped-products.json in your project root,');
    console.error('   or set SCRAPED_PRODUCTS_PATH env var to its full path.');
    process.exit(1);
  }
  console.log(`📁 Loading scraped data from: ${SCRAPED_PRODUCTS_PATH}`);
  const rawData = fs.readFileSync(SCRAPED_PRODUCTS_PATH, 'utf-8');
  const scraped: ScrapedData = JSON.parse(rawData);
  console.log(`   ✓ ${scraped.products.length} products to import`);
  console.log(`   ✓ ${scraped.collections.length} collections to import as categories`);
  console.log();

  // ─── Step 1: Create Categories ───────────────────────────────────────────
  console.log('🏷️  Creating categories...');
  const categoryMap = new Map<string, string>(); // slug → categoryId
  let categoriesCreated = 0;
  let categoriesSkipped = 0;

  for (const col of scraped.collections) {
    // Skip empty collections (Men's Gifts, Toys — had 0 products)
    if (!col.product_handles || col.product_handles.length === 0) {
      // Still create the category so it exists in the DB
    }
    const slug = mapCollectionToCategorySlug(col.handle, col.title);
    const description = stripHtml(col.body_html) || `Products from the ${col.title} collection at 3boxesgifts.com`;

    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      categoryMap.set(slug, existing.id);
      categoriesSkipped++;
    } else {
      const created = await prisma.category.create({
        data: {
          name: col.title,
          slug,
          description,
        },
      });
      categoryMap.set(slug, created.id);
      categoriesCreated++;
    }
  }
  console.log(`   ✓ Created ${categoriesCreated} new categories (${categoriesSkipped} already existed)`);
  console.log();

  // ─── Step 2: Create Vendors ──────────────────────────────────────────────
  console.log('🏢 Creating vendors...');
  const vendorMap = new Map<string, string>(); // name → vendorId
  const uniqueVendors = new Set<string>();
  for (const p of scraped.products) {
    if (p.vendor && p.vendor.trim()) {
      uniqueVendors.add(p.vendor.trim());
    }
  }
  let vendorsCreated = 0;
  let vendorsSkipped = 0;
  for (const name of uniqueVendors) {
    const slug = slugify(name);
    const existing = await prisma.vendor.findUnique({ where: { slug } });
    if (existing) {
      vendorMap.set(name, existing.id);
      vendorsSkipped++;
    } else {
      const created = await prisma.vendor.create({
        data: { name, slug },
      });
      vendorMap.set(name, created.id);
      vendorsCreated++;
    }
  }
  console.log(`   ✓ Created ${vendorsCreated} new vendors (${vendorsSkipped} already existed)`);
  console.log(`   Vendors: ${Array.from(uniqueVendors).join(', ')}`);
  console.log();

  // ─── Step 3: Build product → category lookup ─────────────────────────────
  // A product may belong to multiple collections; pick the first non-empty one.
  const productCategorySlug = new Map<string, string>(); // productHandle → categorySlug
  for (const col of scraped.collections) {
    for (const handle of (col.product_handles || [])) {
      if (!productCategorySlug.has(handle)) {
        productCategorySlug.set(handle, mapCollectionToCategorySlug(col.handle, col.title));
      }
    }
  }

  // ─── Step 4: Create Products ─────────────────────────────────────────────
  console.log('🛍️  Creating products...');
  let productsCreated = 0;
  let productsSkipped = 0;
  let productsFailed = 0;
  const failedProducts: Array<{ handle: string; title: string; error: string }> = [];

  for (const p of scraped.products) {
    try {
      // Skip products with no title (we saw some "Scented Candels" entries with empty titles)
      if (!p.title || p.title.trim() === '') {
        console.log(`   ⏭️  Skipping product with no title (handle: ${p.handle})`);
        productsSkipped++;
        continue;
      }

      const productNumber = String(p.id);
      const slug = p.handle;
      const description = stripHtml(p.body_html) || `${p.title} — available at 3BOXES LUXURY.`;
      const firstVariant = p.variants?.[0];
      const price = parsePrice(firstVariant?.price);
      const compareAtPrice = firstVariant?.compare_at_price
        ? parsePrice(firstVariant.compare_at_price)
        : null;
      const sku = firstVariant?.sku || null;
      const stock = firstVariant?.inventory_quantity ?? 100; // default 100 if null
      const images = (p.images || []).map((img) => img.src);
      const imagesJson = JSON.stringify(images);
      const tags = parseTags(p.tags);
      if (p.product_type) tags.push(p.product_type);
      const tagsJson = JSON.stringify(tags);
            // Find category for this product (with smart fallback)
      let categorySlug = productCategorySlug.get(p.handle);

      // Fallback 1: Try matching by keywords in title or product_type
      if (!categorySlug) {
        const titleLower = (p.title || '').toLowerCase();
        const productTypeLower = (p.product_type || '').toLowerCase();
        const searchText = `${titleLower} ${productTypeLower}`;

        console.log(`   🔍 No collection mapping for "${p.title}" — trying keyword fallback...`);

        if (searchText.includes('corporate') || searchText.includes('executive') || searchText.includes('office')) {
          categorySlug = 'office-corporate-gifts';
          console.log(`   ✓ Matched keyword: corporate/office → ${categorySlug}`);
        } else if (searchText.includes('perfume') || searchText.includes('parfum') || searchText.includes('fragrance') || searchText.includes('eau de')) {
          categorySlug = 'fragrances';
          console.log(`   ✓ Matched keyword: perfume → ${categorySlug}`);
        } else if (searchText.includes('candle')) {
          categorySlug = 'scented-candles';
          console.log(`   ✓ Matched keyword: candle → ${categorySlug}`);
        } else if (searchText.includes('jewell') || searchText.includes('necklace') || searchText.includes('ring') || searchText.includes('bracelet') || searchText.includes('earring')) {
          categorySlug = 'jewellery';
          console.log(`   ✓ Matched keyword: jewellery → ${categorySlug}`);
        } else if (searchText.includes('home') || searchText.includes('decor') || searchText.includes('vase') || searchText.includes('planter') || searchText.includes('statue') || searchText.includes('figurine')) {
          categorySlug = 'home-decor';
          console.log(`   ✓ Matched keyword: home decor → ${categorySlug}`);
        } else if (searchText.includes('men') || searchText.includes('grooming') || searchText.includes('shaving')) {
          categorySlug = 'men-grooming-kit';
          console.log(`   ✓ Matched keyword: men/grooming → ${categorySlug}`);
        } else if (searchText.includes('birthday')) {
          categorySlug = 'birthday-gifts';
          console.log(`   ✓ Matched keyword: birthday → ${categorySlug}`);
        } else if (searchText.includes('love') || searchText.includes('romantic') || searchText.includes('couple') || searchText.includes('anniversary')) {
          categorySlug = 'romantic-gifts';
          console.log(`   ✓ Matched keyword: romantic → ${categorySlug}`);
        } else if (searchText.includes('beauty') || searchText.includes('skincare') || searchText.includes('cosmetic')) {
          categorySlug = 'beauty';
          console.log(`   ✓ Matched keyword: beauty → ${categorySlug}`);
        } else if (searchText.includes('gift') || searchText.includes('hamper') || searchText.includes('set') || searchText.includes('combo')) {
          categorySlug = 'gift-sets';
          console.log(`   ✓ Matched keyword: gift set → ${categorySlug}`);
        } else if (searchText.includes('travel')) {
          categorySlug = 'travel-products';
          console.log(`   ✓ Matched keyword: travel → ${categorySlug}`);
        }
      }

      // Fallback 2: Use first available category if still no match
      if (!categorySlug && categoryMap.size > 0) {
        categorySlug = Array.from(categoryMap.keys())[0];
        console.log(`   ⚠️  No keyword match — using fallback category: ${categorySlug}`);
      }

      const categoryId = categorySlug ? categoryMap.get(categorySlug) : null;
      if (!categoryId) {
        console.log(`   ⚠️  Product "${p.title}" has no category — skipping`);
        productsSkipped++;
        continue;
      }

      // Find vendor for this product
      const vendorId = p.vendor ? vendorMap.get(p.vendor.trim()) : null;

      // Check if product already exists (by slug or productNumber)
      const existing = await prisma.product.findFirst({
        where: { OR: [{ slug }, { productNumber }] },
      });
      if (existing) {
        console.log(`   ⏭️  Skipping existing product: ${p.title}`);
        productsSkipped++;
        continue;
      }

      await prisma.product.create({
        data: {
          productNumber,
          name: p.title,
          slug,
          description,
          price,
          compareAtPrice,
          sku,
          images: imagesJson,
          categoryId,
          stock,
          reorderLevel: 5,
          rating: 0,
          reviewCount: 0,
          featured: false,
          tags: tagsJson,
          vendorId: vendorId || null,
          sourceUrl: `https://3boxesgifts.com/products/${p.handle}`,
          platform: '3boxesgifts',
          isExternal: false,
          syncStatus: 'active',
        },
      });
      productsCreated++;
      if (productsCreated % 10 === 0) {
        console.log(`   ✓ Created ${productsCreated} products so far...`);
      }
    } catch (e: any) {
      productsFailed++;
      failedProducts.push({
        handle: p.handle,
        title: p.title || '(no title)',
        error: e.message,
      });
      console.error(`   ❌ Failed to create product "${p.title}": ${e.message}`);
    }
  }
  console.log();
  console.log(`   ✓ Created ${productsCreated} new products`);
  console.log(`   ⏭️  Skipped ${productsSkipped} (already existed or no title)`);
  console.log(`   ❌ Failed ${productsFailed}`);
  if (failedProducts.length > 0) {
    console.log();
    console.log('   Failed products detail:');
    for (const f of failedProducts) {
      console.log(`     - ${f.title} (${f.handle}): ${f.error}`);
    }
  }
  console.log();

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ✅ IMPORT COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log();
  console.log('📊 Summary:');
  console.log(`   Categories created: ${categoriesCreated} (skipped: ${categoriesSkipped})`);
  console.log(`   Vendors created:    ${vendorsCreated} (skipped: ${vendorsSkipped})`);
  console.log(`   Products created:   ${productsCreated} (skipped: ${productsSkipped}, failed: ${productsFailed})`);
  console.log();
  console.log('👉 Next steps:');
  console.log('   1. Verify the products in your admin dashboard');
  console.log('   2. Run your app and check the homepage to see the new products');
  console.log('   3. If anything looks wrong, run cleanup-all-products.ts and re-import');
}

main()
  .catch((error) => {
    console.error();
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('  ❌ IMPORT FAILED');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error();
    console.error('Error details:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
