/**
 * Chunked image generation - processes products without images in small batches
 * Designed to be run multiple times, each time picking up where it left off
 */

import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const SHOPIFY_DOMAIN = '3boxesluxury-2.myshopify.com';
const SHOPIFY_ADMIN_TOKEN = 'YOUR_SHOPIFY_ADMIN_TOKEN';
const SHOPIFY_API_VERSION = '2024-10';
const SHOPIFY_BASE_URL = `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}`;

const PRODUCT_DELAY_MS = 3000;
const IMAGE_SIZE = '1024x1024';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'images', 'products', 'generated');
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || '5', 10);

// Progress tracking file
const PROGRESS_FILE = path.join(process.cwd(), '.image-gen-progress.json');

interface Progress {
  processedIds: number[];
  failedIds: number[];
  lastRun: string;
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
  images: Array<{ id: number; src: string; alt: string | null }>;
}

type ProductCategory = 
  | 'jewelry' | 'watches' | 'sarees' | 'mens-shirts' | 'fashion'
  | 'fragrances' | 'leather' | 'home' | 'couple' | 'romantic' | 'toys'
  | 'default';

interface CategoryPrompt {
  category: ProductCategory;
  keywords: string[];
  productTypes: string[];
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

function detectCategory(product: ShopifyProduct): CategoryPrompt {
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
  const titleAndTags = [product.title.toLowerCase(), product.tags.toLowerCase()].join(' ');
  for (const cat of CATEGORY_PROMPTS) {
    for (const keyword of cat.keywords) {
      if (titleAndTags.includes(keyword.toLowerCase())) return cat;
    }
  }
  const bodyText = product.body_html.toLowerCase();
  for (const cat of CATEGORY_PROMPTS) {
    for (const keyword of cat.keywords) {
      if (bodyText.includes(keyword.toLowerCase())) return cat;
    }
  }
  return DEFAULT_PROMPT;
}

function buildPrompt(product: ShopifyProduct): string {
  const category = detectCategory(product);
  return category.promptTemplate.replace('{productName}', product.title);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadProgress(): Progress {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    }
  } catch {}
  return { processedIds: [], failedIds: [], lastRun: '' };
}

function saveProgress(progress: Progress) {
  progress.lastRun = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function fetchAllProducts(): Promise<ShopifyProduct[]> {
  console.log('📡 Fetching products from Shopify...');
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
  const data = await response.json() as { products: ShopifyProduct[] };
  console.log(`   Found ${data.products.length} active products`);
  return data.products;
}

async function generateProductImage(product: ShopifyProduct): Promise<string> {
  const prompt = buildPrompt(product);
  console.log(`   Category: ${detectCategory(product).category}`);
  console.log(`   Prompt: "${prompt.substring(0, 100)}..."`);
  
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

function saveImageLocally(productId: number, productTitle: string, base64Data: string): string {
  const safeName = productTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50);
  const filename = `${safeName}-${productId}.png`;
  const filepath = path.join(OUTPUT_DIR, filename);
  const buffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(filepath, buffer);
  return filepath;
}

async function uploadImageToShopify(productId: number, base64Data: string, altText: string): Promise<boolean> {
  const url = `${SHOPIFY_BASE_URL}/products/${productId}/images.json`;
  const body = {
    image: { attachment: base64Data, alt: altText },
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
  const data = await response.json() as { image?: { id: number; src: string } };
  if (!data.image || !data.image.id) {
    throw new Error('Shopify returned OK but no image data in response');
  }
  return true;
}

async function main() {
  const startTime = Date.now();
  const progress = loadProgress();
  
  console.log('═══════════════════════════════════════════════════');
  console.log('  3 BOXES LUXURY — Chunked Image Generator');
  console.log(`  Chunk size: ${CHUNK_SIZE}`);
  console.log(`  Previously processed: ${progress.processedIds.length}`);
  console.log(`  Previously failed: ${progress.failedIds.length}`);
  console.log('═══════════════════════════════════════════════════');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let products: ShopifyProduct[];
  try {
    products = await fetchAllProducts();
  } catch (error) {
    console.error('✗ Failed to fetch products:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Filter to products that need images (no images AND not already processed)
  const needsImage = products.filter(p => {
    const hasImage = p.images && p.images.length > 0;
    const alreadyProcessed = progress.processedIds.includes(p.id);
    return !hasImage && !alreadyProcessed;
  });

  console.log(`\n  Products needing images: ${needsImage.length}`);
  
  if (needsImage.length === 0) {
    console.log('  No products need images! All done.');
    console.log(`  Total processed across all runs: ${progress.processedIds.length}`);
    console.log(`  Total failed across all runs: ${progress.failedIds.length}`);
    return;
  }

  // Take only CHUNK_SIZE products
  const chunk = needsImage.slice(0, CHUNK_SIZE);
  console.log(`  Processing chunk of ${chunk.length} products\n`);

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < chunk.length; i++) {
    const product = chunk[i];
    console.log(`[${i + 1}/${chunk.length}] "${product.title}" (ID: ${product.id})`);
    
    try {
      const base64Data = await generateProductImage(product);
      console.log(`   ✓ Image generated (${(base64Data.length * 0.75 / 1024).toFixed(0)} KB)`);
      
      try {
        const localPath = saveImageLocally(product.id, product.title, base64Data);
        console.log(`   ✓ Saved: ${path.relative(process.cwd(), localPath)}`);
      } catch (e) {
        console.log(`   ⚠ Local save failed: ${e instanceof Error ? e.message : String(e)}`);
      }

      console.log(`   Uploading to Shopify...`);
      await uploadImageToShopify(product.id, base64Data, product.title);
      console.log(`   ✓ Uploaded to Shopify`);
      
      progress.processedIds.push(product.id);
      succeeded++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`   ✗ Failed: ${msg}`);
      progress.failedIds.push(product.id);
      failed++;
    }

    saveProgress(progress);
    
    if (i < chunk.length - 1) {
      await sleep(PRODUCT_DELAY_MS);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  Chunk: ${succeeded} succeeded, ${failed} failed (${elapsed}s)`);
  console.log(`  Total progress: ${progress.processedIds.length} processed, ${progress.failedIds.length} failed`);
  console.log(`  Remaining: ${needsImage.length - chunk.length} products still need images`);
  console.log('═══════════════════════════════════════════════════\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
