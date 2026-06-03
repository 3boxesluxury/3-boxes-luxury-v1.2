/**
 * Generate Product Images Script
 * 
 * Fetches all products from Shopify Admin API, generates unique AI product
 * images using z-ai-web-dev-sdk, and uploads them to the corresponding
 * Shopify products.
 * 
 * Usage:
 *   bun run scripts/generate-product-images.ts            # Process first 3 products (test)
 *   bun run scripts/generate-product-images.ts --all       # Process all products
 *   bun run scripts/generate-product-images.ts --limit 10  # Process first 10 products
 */

import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

// ── Configuration ──────────────────────────────────────────────────────────

const SHOPIFY_DOMAIN = '3boxesluxury-2.myshopify.com';
const SHOPIFY_ADMIN_TOKEN = 'YOUR_SHOPIFY_ADMIN_TOKEN';
const SHOPIFY_API_VERSION = '2024-10';
const SHOPIFY_BASE_URL = `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}`;

const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 5000;
const PRODUCT_DELAY_MS = 2000; // Delay between individual products within a batch
const IMAGE_SIZE = '1024x1024';

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'images', 'products', 'generated');

// ── Types ──────────────────────────────────────────────────────────────────

interface ShopifyImage {
  id: number;
  product_id: number;
  position: number;
  created_at: string;
  updated_at: string;
  alt: string | null;
  width: number;
  height: number;
  src: string;
  variant_ids: number[];
  admin_graphql_api_id: string;
}

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  handle: string;
  status: string;
  tags: string;
  images: ShopifyImage[];
  variants: Array<{
    id: number;
    title: string;
    price: string;
  }>;
}

interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

interface GenerationResult {
  productId: number;
  title: string;
  status: 'generated' | 'skipped' | 'failed';
  error?: string;
  localPath?: string;
  shopifyUploaded: boolean;
}

// ── Category-to-Prompt Mapping ─────────────────────────────────────────────

type ProductCategory = 
  | 'jewelry' | 'watches' | 'sarees' | 'mens-shirts' | 'fashion'
  | 'fragrances' | 'leather' | 'home' | 'couple' | 'romantic' | 'toys'
  | 'default';

interface CategoryPrompt {
  category: ProductCategory;
  keywords: string[];           // Used for title/tags matching
  productTypes: string[];       // Used for product_type field matching (highest priority)
  promptTemplate: string;
}

const CATEGORY_PROMPTS: CategoryPrompt[] = [
  {
    category: 'sarees',
    productTypes: ['saree', 'sarees', 'sari'],
    keywords: ['saree', 'sari', 'banarasi', 'kanjeevaram', 'chiffon', 'patola', 'organza', 'georgette'],
    promptTemplate: 'Professional product photography of {productName}, elegant Indian silk saree draped on mannequin, rich colors, studio lighting, luxury fashion photography, no human models, product-focused',
  },
  {
    category: 'watches',
    productTypes: ['watch', 'watches', 'timepiece'],
    keywords: ['watch', 'chronograph', 'timepiece', 'moonphase', 'skeleton', 'dive watch', 'automatic watch', 'quartz watch'],
    promptTemplate: 'Professional product photography of {productName}, luxury timepiece on premium dark leather cushion, dramatic side lighting showing dial detail, studio quality, 4K detail, no models, product-only shot',
  },
  {
    category: 'mens-shirts',
    productTypes: ['shirt', 'shirts', 't-shirt', 't-shirts', 'mens shirts', "men's shirts", 'mens shirts & t-shirts'],
    keywords: ['shirt', 't-shirt', 'polo', 'henley', 'oxford shirt', 'dress shirt', 'v-neck', 'crew neck', 'henley shirt'],
    promptTemplate: 'Professional product photography of {productName}, premium men\'s shirt on invisible mannequin, crisp studio lighting, luxury fashion e-commerce, no visible human models, clean background',
  },
  {
    category: 'jewelry',
    productTypes: ['jewelry', 'jewellery', 'ring', 'earring', 'necklace', 'bracelet', 'bangle'],
    keywords: ['ring', 'earring', 'necklace', 'bracelet', 'bangle', 'kundan', 'jhumka', 'polki', 'pendant', 'cuff', 'choker', 'jewelry', 'jewellery'],
    promptTemplate: 'Professional product photography of {productName}, luxurious jewelry on dark velvet display, golden ambient lighting, studio quality, 4K detail, luxury e-commerce style, no models, product-only shot on dark background',
  },
  {
    category: 'fashion',
    productTypes: ['fashion', 'dress', 'gown', 'clothing', 'apparel'],
    keywords: ['gown', 'dress', 'blouse', 'fashion', 'evening', 'cocktail', 'couture', 'top', 'skirt'],
    promptTemplate: 'Professional product photography of {productName}, high fashion piece on display, dramatic studio lighting, luxury e-commerce style, 4K, no human models, product-focused',
  },
  {
    category: 'fragrances',
    productTypes: ['fragrance', 'fragrances', 'perfume', 'cologne'],
    keywords: ['fragrance', 'perfume', 'oud', 'cologne', 'eau de', 'scented candle', 'aromatic candle'],
    promptTemplate: 'Professional product photography of {productName}, luxury fragrance bottle on reflective dark surface, moody lighting, premium e-commerce style, no models, product-only shot',
  },
  {
    category: 'leather',
    productTypes: ['leather', 'leather goods', 'bag', 'bags', 'wallet', 'briefcase'],
    keywords: ['leather', 'briefcase', 'wallet', 'belt', 'clutch', 'handbag', 'satchel', 'laptop bag', 'weekend bag'],
    promptTemplate: 'Professional product photography of {productName}, premium leather product on mahogany surface, warm lighting, luxury goods photography, no models, product-only shot',
  },
  {
    category: 'home',
    productTypes: ['home', 'home & living', 'home decor', 'decor', 'living'],
    keywords: ['home decor', 'vase', 'cushion', 'crystal vase', 'ornament', 'lamp', 'candle collection'],
    promptTemplate: 'Professional product photography of {productName}, luxury home decor item in elegant setting, soft lighting, premium lifestyle photography, no human models, product-focused',
  },
  {
    category: 'couple',
    productTypes: ['couple', 'couple friendly gifts', 'couple gifts'],
    keywords: ['couple', 'his and hers', 'watch pair', 'wine set', 'photo frame'],
    promptTemplate: 'Professional product photography of {productName}, luxury couple\'s gift set in premium packaging, romantic warm lighting, e-commerce, no human models, product-focused',
  },
  {
    category: 'romantic',
    productTypes: ['romantic', 'romantic gifts', 'valentine'],
    keywords: ['romantic', 'rose bouquet', 'spa set', 'valentine', 'anniversary gift', 'love', 'heart'],
    promptTemplate: 'Professional product photography of {productName}, romantic gift in elegant presentation, soft rose-gold lighting, luxury gifting style, no human models, product-focused',
  },
  {
    category: 'toys',
    productTypes: ['toy', 'toys', 'collectible', 'game'],
    keywords: ['toy', 'building blocks', 'train set', 'puzzle', 'game', 'collectible', 'playset', 'figurine'],
    promptTemplate: 'Professional product photography of {productName}, premium collectible item on dark display, dramatic lighting, luxury product photography, no human models, product-only shot',
  },
];

const DEFAULT_PROMPT: CategoryPrompt = {
  category: 'default',
  keywords: [],
  productTypes: [],
  promptTemplate: 'Professional product photography of {productName}, luxury product on dark premium surface, studio quality lighting, 4K detail, e-commerce style, no models, product-only shot',
};

// ── Helper Functions ───────────────────────────────────────────────────────

/**
 * Detect the category of a product based on product_type (highest priority),
 * then title/tags, then body_html
 */
function detectCategory(product: ShopifyProduct): CategoryPrompt {
  // Priority 1: Match by product_type (most reliable indicator)
  const productType = (product.product_type || '').toLowerCase().trim();
  if (productType) {
    for (const cat of CATEGORY_PROMPTS) {
      for (const pt of cat.productTypes) {
        if (productType === pt || productType.includes(pt) || pt.includes(productType)) {
          return cat;
        }
      }
    }
  }

  // Priority 2: Match by title and tags (more specific than body_html)
  const titleAndTags = [
    product.title.toLowerCase(),
    product.tags.toLowerCase(),
  ].join(' ');

  for (const cat of CATEGORY_PROMPTS) {
    for (const keyword of cat.keywords) {
      if (titleAndTags.includes(keyword.toLowerCase())) {
        return cat;
      }
    }
  }

  // Priority 3: Match by body_html (least reliable, broader text)
  const bodyText = product.body_html.toLowerCase();
  for (const cat of CATEGORY_PROMPTS) {
    for (const keyword of cat.keywords) {
      if (bodyText.includes(keyword.toLowerCase())) {
        return cat;
      }
    }
  }

  return DEFAULT_PROMPT;
}

/**
 * Build the AI image generation prompt for a product
 */
function buildPrompt(product: ShopifyProduct): string {
  const category = detectCategory(product);
  const prompt = category.promptTemplate.replace('{productName}', product.title);
  return prompt;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch all active products from Shopify Admin API
 */
async function fetchAllProducts(): Promise<ShopifyProduct[]> {
  console.log('\n📡 Fetching products from Shopify...');
  
  const url = `${SHOPIFY_BASE_URL}/products.json?limit=250&status=active`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Shopify API error (${response.status}): ${body}`);
  }

  const data = await response.json() as ShopifyProductsResponse;
  console.log(`   Found ${data.products.length} active products`);
  
  return data.products;
}

/**
 * Generate an AI image for a product using z-ai-web-dev-sdk
 */
async function generateProductImage(product: ShopifyProduct): Promise<string> {
  const prompt = buildPrompt(product);
  
  console.log(`   Prompt: "${prompt.substring(0, 120)}..."`);
  console.log(`   Category: ${detectCategory(product).category}`);
  
  const zai = await ZAI.create();
  const response = await zai.images.generations.create({
    prompt,
    size: IMAGE_SIZE as any,
  });

  if (!response.data || response.data.length === 0) {
    throw new Error('No image data returned from AI generation');
  }

  const imageBase64 = response.data[0].base64;
  if (!imageBase64) {
    throw new Error('No base64 data in AI generation response');
  }

  return imageBase64;
}

/**
 * Save a base64 image locally as a backup
 */
function saveImageLocally(productId: number, productTitle: string, base64Data: string): string {
  // Create a safe filename from the product title
  const safeName = productTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
  
  const filename = `${safeName}-${productId}.png`;
  const filepath = path.join(OUTPUT_DIR, filename);
  
  const buffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(filepath, buffer);
  
  return filepath;
}

/**
 * Upload a base64-encoded image to a Shopify product.
 * Uses the dedicated image creation endpoint (POST /products/{id}/images.json)
 * which is more reliable than the product update endpoint.
 * Returns true if the upload was verified successful.
 */
async function uploadImageToShopify(
  productId: number,
  base64Data: string,
  altText: string
): Promise<boolean> {
  // Use the dedicated image creation endpoint — more reliable than PUT product
  const url = `${SHOPIFY_BASE_URL}/products/${productId}/images.json`;
  
  const body = {
    image: {
      attachment: base64Data,
      alt: altText,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Shopify upload error (${response.status}): ${errorBody}`);
  }

  // Verify the upload by checking the response contains image data
  const data = await response.json() as { image?: { id: number; src: string } };
  
  if (!data.image || !data.image.id) {
    throw new Error('Shopify returned OK but no image data in response — upload may have failed silently');
  }

  return true;
}

/**
 * Process a single product: generate image, save locally, upload to Shopify
 */
async function processProduct(
  product: ShopifyProduct,
  index: number,
  total: number
): Promise<GenerationResult> {
  const result: GenerationResult = {
    productId: product.id,
    title: product.title,
    status: 'generated',
    shopifyUploaded: false,
  };

  try {
    // Skip products that already have images
    if (product.images && product.images.length > 0) {
      console.log(`[${index + 1}/${total}] Skipping "${product.title}" — already has ${product.images.length} image(s)`);
      result.status = 'skipped';
      return result;
    }

    console.log(`[${index + 1}/${total}] Generating image for "${product.title}"...`);

    // Generate AI image
    const base64Data = await generateProductImage(product);
    console.log(`   ✓ Image generated (${(base64Data.length * 0.75 / 1024).toFixed(0)} KB)`);

    // Save locally
    try {
      const localPath = saveImageLocally(product.id, product.title, base64Data);
      result.localPath = localPath;
      console.log(`   ✓ Saved locally: ${path.relative(process.cwd(), localPath)}`);
    } catch (saveError) {
      console.log(`   ⚠ Local save failed: ${saveError instanceof Error ? saveError.message : String(saveError)}`);
    }

    // Upload to Shopify
    console.log(`   Uploading to Shopify...`);
    const uploaded = await uploadImageToShopify(product.id, base64Data, product.title);
    result.shopifyUploaded = uploaded;
    
    if (uploaded) {
      console.log(`   ✓ Success — image uploaded to Shopify product #${product.id}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`   ✗ Failed: ${errorMessage}`);
    result.status = 'failed';
    result.error = errorMessage;
  }

  return result;
}

/**
 * Process products in batches with delays between individual products
 */
async function processBatch(
  products: ShopifyProduct[],
  startIndex: number,
  total: number
): Promise<GenerationResult[]> {
  const results: GenerationResult[] = [];

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const result = await processProduct(product, startIndex + i, total);
    results.push(result);

    // Small delay between individual products within a batch to avoid rate limits
    if (i < products.length - 1) {
      await sleep(PRODUCT_DELAY_MS);
    }
  }

  return results;
}

// ── Main Function ──────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  3 BOXES LUXURY — AI Product Image Generator');
  console.log('═══════════════════════════════════════════════════════════');

  // Parse CLI arguments
  const args = process.argv.slice(2);
  let limit = 3; // Default: test mode with 3 products
  
  if (args.includes('--all')) {
    limit = Infinity;
  } else if (args.includes('--limit')) {
    const limitIndex = args.indexOf('--limit');
    const limitValue = parseInt(args[limitIndex + 1], 10);
    if (!isNaN(limitValue) && limitValue > 0) {
      limit = limitValue;
    }
  }

  console.log(`\n  Mode: ${limit === Infinity ? 'ALL PRODUCTS' : `FIRST ${limit} PRODUCTS`}`);
  console.log(`  Batch size: ${BATCH_SIZE}`);
  console.log(`  Batch delay: ${BATCH_DELAY_MS / 1000}s`);
  console.log(`  Product delay: ${PRODUCT_DELAY_MS / 1000}s`);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`\n📁 Created output directory: ${OUTPUT_DIR}`);
  }

  // Fetch products from Shopify
  let products: ShopifyProduct[];
  try {
    products = await fetchAllProducts();
  } catch (error) {
    console.error('\n✗ Failed to fetch products from Shopify:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  if (products.length === 0) {
    console.log('\nNo products found. Exiting.');
    process.exit(0);
  }

  // Apply limit
  const productsToProcess = limit === Infinity ? products : products.slice(0, Math.min(limit, products.length));
  
  console.log(`\n  Products to process: ${productsToProcess.length} of ${products.length} total`);

  // Filter out products that already have images for info
  const productsWithImages = productsToProcess.filter(p => p.images && p.images.length > 0);
  const productsWithoutImages = productsToProcess.filter(p => !p.images || p.images.length === 0);
  
  if (productsWithImages.length > 0) {
    console.log(`  Products with existing images (will skip): ${productsWithImages.length}`);
  }
  console.log(`  Products needing images: ${productsWithoutImages.length}`);

  // Process in batches
  const allResults: GenerationResult[] = [];
  
  for (let i = 0; i < productsToProcess.length; i += BATCH_SIZE) {
    const batch = productsToProcess.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(productsToProcess.length / BATCH_SIZE);
    
    console.log(`\n── Batch ${batchNumber}/${totalBatches} ──`);
    
    const batchResults = await processBatch(batch, i, productsToProcess.length);
    allResults.push(...batchResults);

    // Delay between batches (but not after the last one)
    if (i + BATCH_SIZE < productsToProcess.length) {
      console.log(`\n⏳ Waiting ${BATCH_DELAY_MS / 1000}s before next batch...`);
      await sleep(BATCH_DELAY_MS);
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  const generated = allResults.filter(r => r.status === 'generated');
  const skipped = allResults.filter(r => r.status === 'skipped');
  const failed = allResults.filter(r => r.status === 'failed');
  const uploaded = allResults.filter(r => r.shopifyUploaded);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Total processed:  ${allResults.length}`);
  console.log(`  Images generated: ${generated.length}`);
  console.log(`  Uploaded to Shopify: ${uploaded.length}`);
  console.log(`  Skipped (existing): ${skipped.length}`);
  console.log(`  Failed: ${failed.length}`);
  console.log(`  Time elapsed: ${elapsed}s`);
  
  if (failed.length > 0) {
    console.log('\n  Failed products:');
    for (const f of failed) {
      console.log(`    ✗ #${f.productId} "${f.title}": ${f.error || 'Unknown error'}`);
    }
  }

  if (generated.length > 0) {
    console.log('\n  Successfully generated:');
    for (const g of generated) {
      const uploadStatus = g.shopifyUploaded ? '✓ Uploaded' : '✗ Not uploaded';
      console.log(`    ✓ #${g.productId} "${g.title}" — ${uploadStatus}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
