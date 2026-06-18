import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fetchShopifyProducts, type ShopifyProductTransformed } from '@/lib/shopify';

// ============================================================
// Social Style Analysis Route — v29.2: Instagram Pixel Colors Merged
// ============================================================
//
// v29.2 CHANGES (built on v29.1):
//   1. BREAKING: Instagram photo pixel colors now MERGED into colorPreferences
//      - Previously: only profile pic pixel colors → colorPreferences
//      - Now: profile pic + Instagram photo pixel colors → MERGED → colorPreferences
//      - Instagram colors already had pixel extraction (v29.1), but were only
//        used in AI chat prompt, NOT in final colorPreferences
//   2. Color merge logic: combine same-name colors (average %), sort by frequency,
//      keep top 6 colors from BOTH sources
//   3. Result: colorPreferences reflects user's FULL visual palette across
//      profile picture AND Instagram photos
//
// v29.1 CHANGES (built on v29):
//   1. BREAKING: Pixel extraction is now PRIMARY color source for profile picture
//      - Pixel colors OVERRIDE VLM colors (more accurate, never rate-limited)
//      - VLM still used for gender/clothing/accessory/style detection (NOT colors)
//      - Color priority: Pixel → VLM → AI chat → hardcoded fallback
//   2. This means: even when ALL VLM models are rate-limited (429),
//      user colors are STILL accurate from pixel extraction
//   3. Same approach for products: pixel extraction for colors, no VLM needed
//
// v29 CHANGES (built on v28):
//   1. NEW: Product color extraction — each product image analyzed via pixel extraction
//      - Colors extracted from product images at fetch time (cached for 5 min with products)
//      - No AI needed — pure pixel analysis, works even when all models are rate-limited
//      - Stored in StyleProduct.colors field for matching
//   2. NEW: Color matching algorithm — user colors vs product colors
//      - calculateColorMatchScore() — exact name match + hex distance for similar colors
//      - 30% weight in final product score (category=50%, color=30%, other=20%)
//      - Products matching user's color preferences get boosted in recommendations
//      - Products NOT matching user's colors get penalized
//   3. Color-matched products get reason: "Matches your Navy & Gold style"
//   4. Color match score shown in debug trace for transparency
//
// v28 CHANGES (built on v27):
//   1. FIX: VLM that actually works — removed !isVercel() gate on internal API
//      - ZAI internal vision (glm-4.6v) tried FIRST even on Vercel
//      - Added Google Gemini Flash via direct API (free, separate from OpenRouter)
//      - Added 6 more OpenRouter VLM models for wider coverage
//      - Vision fallback chain: ZAI Internal → Gemini Flash → OpenRouter (6 models)
//   2. FIX: Pixel color extraction runs ALWAYS (not just when VLM fails)
//      - Runs in parallel with VLM for maximum reliability
//      - Pixel colors merged with VLM colors for accuracy
//      - If VLM fails, pixel colors used directly (as before)
//   3. FIX: Chat AI also tries ZAI internal even on Vercel
//      - More fallback models added for chat
//   4. Color preference merge: VLM + Pixel (both sources combined)
//
// v27 CHANGES (built on v26.1):
//   1. NEW: Pixel-based color extraction when VLM fails
//      - Uses sharp library to decode profile picture directly
//      - Samples pixels, groups by quantized color, names them
//      - 40-color name database (Gold, Bronze, Navy, Emerald, etc.)
//      - Merges similar named colors (e.g. multiple "Gold" shades)
//      - NO AI model needed — works even when OpenRouter is 429'd
//   2. Color preference fallback chain is now:
//      a. VLM dominantColors (best — AI analyzed)
//      b. Pixel-extracted colors (NEW — raw pixel analysis)
//      c. AI chat colorPreferences
//      d. Hardcoded fallback (worst — last resort)
//
// v26.1 HOTFIX: "Guess Women Printed Noelle Luxury Satchel Bag"
//   was recommended to male user because "women" was only checked
//   in tags/description, NOT in the product name itself.
//
//   NEW Layer 0: Name-level GENDER WORDS check — if the product
//   name contains "Women", "Ladies", "Girls" etc., it's IMMEDIATELY
//   blocked for male users. This runs BEFORE all other checks.
//
//   Also added: "satchel" to female product-type name patterns
//
// v26 CHANGES (built on v25):
//   1. ENHANCED: isGenderInappropriate() now has 7 filtering layers:
//      Layer 1: Category-level blocking (most reliable)
//      Layer 2: recipientTypes field check
//      Layer 3: Explicit gender field check
//      Layer 4: Tags-based gender detection (NEW — checks "women", "her", "bridal" etc.)
//      Layer 5: Description-based gender detection (NEW — checks "for her", "women's" etc.)
//      Layer 6: Name pattern matching (expanded with makeup, bags, clothing patterns)
//      Layer 7: Null gender safety (blocks obviously female products even if gender unknown)
//   2. NEW: StyleProduct.description field added — passes product descriptions from DB+Shopify
//   3. ENHANCED: VLM prompt now has explicit gender detection rules:
//      - Indian ethnic wear gender rules (kurta=men, saree=women)
//      - Multi-signal analysis (face + hair + clothing + accessories)
//      - Confidence requirement for gender determination
//   4. ENHANCED: AI system prompt now has STRICT gender rules:
//      - FORBIDDEN categories explicitly listed for male users
//      - Mandatory gender product filtering rules
//      - Tag/description checking rules for AI recommendations
//      - "When in doubt, do NOT recommend" safety rule
//
// v25 CHANGES (built on v24):
//   1. FIX: Duplicate categories — "Luxury Watches" appearing 4+ times
//      - Gender replacement .map() now uses a PERSISTENT Set (replacedCategoryNames)
//        that tracks replacements across iterations, so each female category
//        gets a DIFFERENT male replacement instead of all getting the same one
//      - buildProductRecommendations() now deduplicates finalCategories before slicing
//      - Added case-insensitive dedup for aiCategories
//   2. FIX: Female products slipping through for male users
//      - Category-level blocking moved to FIRST check in isGenderInappropriate()
//      - Also checks categorySlug for female-only categories
//      - Expanded femaleOnlyCategories: added Diamond Collection, Gemstone Jewelry,
//        Gold Necklaces, Bridal Collection, Silk Collection, Luxury Skincare
//      - Added 15+ new name patterns: choli, pallu, polki, jhumka, nath,
//        churidar, padded, thong, bralette, camisole, petticoat, halter, etc.
//      - NULL GENDER SAFETY: blocks obviously female products even when
//        gender detection fails (bridal, saree, lehenga, gown, kundan, etc.)
//      - recipientTypes null guard: uses `|| []` to prevent crashes
//
// v24 CHANGES (built on v23):
//   1. Instagram Photo VLM Analysis:
//      - Sends up to 5 Instagram IMAGE posts through VLM vision model
//      - Detects clothing items, accessories, colors, style keywords
//      - Identifies product categories from what user actually WEARS
//      - Gender detection from Instagram photos (as fallback)
//   2. Instagram photo category boosts in product scoring:
//      - VLM-detected categories get +12 match boost (confidence-weighted)
//   3. Instagram photo data in AI prompt:
//      - Photo analysis included in profile summary
//      - VLM-detected categories shown as HIGH PRIORITY in user prompt
//      - Instagram style keywords influence styleProfile tags
//      - Instagram colors combined with profile picture colors
//
// v22 CHANGES (built on v20):
//   1. Instagram text analysis (hashtags, captions, bio):
//      - Extracts fashion hashtags → style keywords + category boosts
//      - Scans captions for brand mentions
//      - Analyzes biography for style signals
//      - Follower count → social-influencer tag
//
// v20 CHANGES (built on v19):
//   1. YouTube subscription analysis:
//      - Accepts googleAccessToken with youtube.readonly scope
//      - Fetches user's YouTube subscriptions
//      - Analyzes channel names/descriptions for fashion interests
//      - Maps YouTube interests to product categories
//   2. YouTube interests added to AI prompt:
//      - "User watches luxury fashion channels" → boost Designer Handbags, Dresses
//      - "User watches watch review channels" → boost Luxury Watches
//      - "User watches beauty channels" → boost Skincare, Fragrances
//   3. YouTube category boosting in product scoring:
//      - Categories matching YouTube interests get +10-15 match boost
//      - Ensures products align with what user actually engages with
//
// Previous v19 features preserved:
//   - Gender detection (OAuth → VLM → Profile → INSTAGRAM_VLM → NEUTRAL)
//   - Birthday & age-group awareness
//   - Birthday gift products
//   - Gender-aware product filtering
//
// Previous v10 features preserved:
//   - Profile-Picture Match (dress, necklace, watch, eyewear)
//   - VLM color override
//   - Detected-items category override
//
// ============================================================

// ─── OpenRouter Configuration ───

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_CHAT_MODEL = 'google/gemma-4-31b-it:free';

// v28: Expanded VLM model list — more providers = less chance all are rate-limited
const OPENROUTER_VISION_MODEL = 'google/gemma-4-31b-it:free'; // primary — large context vision
const OPENROUTER_VISION_FALLBACKS = [
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'google/gemma-4-26b-a4b-it:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',      // Qwen has vision capability
  'meta-llama/llama-3.3-70b-instruct:free',     // Llama can handle image inputs
  'mistralai/mistral-small-3.1-24b-instruct:free', // Mistral with vision
];

// v28: Google Gemini Flash direct API — separate from OpenRouter, free tier
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

const APP_REFERER = 'https://3boxes-luxury.vercel.app';

function getOpenRouterApiKey(): string {
  return process.env.OPENROUTER_API_KEY || '';
}

function isVercel(): boolean {
  return !!process.env.VERCEL;
}

// ─── Internal API (sandbox fallback) ───

function getZAIBaseUrl(): string {
  return process.env.ZAI_BASE_URL || 'https://internal-api.z.ai/v1';
}

function getZAIHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.ZAI_API_KEY || 'Z.ai'}`,
    'X-Z-AI-From': 'Z',
    'X-Chat-Id': process.env.ZAI_CHAT_ID || '',
    'X-User-Id': process.env.ZAI_USER_ID || '',
    'X-Token': process.env.ZAI_TOKEN || '',
  };
}

// ─── OpenRouter API Calls ───

async function openRouterChat(
  messages: Array<{ role: string; content: string | any[] }>,
  model: string = OPENROUTER_CHAT_MODEL,
  maxTokens: number = 2000
): Promise<any> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': APP_REFERER,
      'X-Title': '3 Boxes Luxury - Social Style Analysis',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7 }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API returned ${response.status}: ${errorBody.substring(0, 300)}`);
  }
  return await response.json();
}

async function openRouterVision(
  messages: Array<{ role: string; content: any[] }>,
  model: string = OPENROUTER_VISION_MODEL
): Promise<any> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': APP_REFERER,
      'X-Title': '3 Boxes Luxury - VLM Profile Analysis',
    },
    body: JSON.stringify({ model, messages, max_tokens: 1500, temperature: 0.5 }),
    signal: AbortSignal.timeout(90000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter Vision API returned ${response.status}: ${errorBody.substring(0, 300)}`);
  }
  return await response.json();
}

// ─── Internal API Calls (sandbox fallback) ───

async function internalAIChat(
  messages: Array<{ role: string; content: string }>,
  temperature: number = 0.7,
  maxTokens: number = 2000
): Promise<any> {
  const url = `${getZAIBaseUrl()}/chat/completions`;
  const response = await fetch(url, {
    method: 'POST',
    headers: getZAIHeaders(),
    body: JSON.stringify({ messages, temperature, max_tokens: maxTokens }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Internal AI API returned ${response.status}: ${errorBody.substring(0, 200)}`);
  }
  return await response.json();
}

async function internalAIVision(
  messages: Array<{ role: string; content: any[] }>,
  thinking: { type: string } = { type: 'disabled' }
): Promise<any> {
  const url = `${getZAIBaseUrl()}/chat/completions/vision`;
  const response = await fetch(url, {
    method: 'POST',
    headers: getZAIHeaders(),
    body: JSON.stringify({ messages, thinking }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Internal Vision API returned ${response.status}: ${errorBody.substring(0, 200)}`);
  }
  return await response.json();
}

// ─── Unified AI Call Functions ───

// Fallback chat models — tried in order if primary model fails
const OPENROUTER_CHAT_FALLBACKS = [
  'google/gemma-4-31b-it:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
];

async function aiChat(
  messages: Array<{ role: string; content: string }>,
  temperature: number = 0.7,
  maxTokens: number = 2000
): Promise<any> {
  // v28: Try internal AI FIRST (even on Vercel) — no rate limits
  try {
    const result = await internalAIChat(messages, temperature, maxTokens);
    console.log('[Social Style v28] Internal AI chat SUCCESS');
    return result;
  } catch (intError) {
    console.warn('[Social Style v28] Internal AI chat failed:', intError instanceof Error ? intError.message : String(intError));
  }

  // v28: Try Google Gemini Flash for chat too (free, separate quota)
  const geminiKey = process.env.GEMINI_API_KEY || '';
  if (geminiKey) {
    try {
      // Convert chat messages to Gemini format
      const parts: any[] = [];
      for (const msg of messages) {
        parts.push({ text: `[${msg.role}]: ${msg.content}` });
      }
      const response = await fetch(
        `${GEMINI_BASE_URL}/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { temperature, maxOutputTokens: maxTokens },
          }),
          signal: AbortSignal.timeout(30000),
        }
      );
      if (response.ok) {
        const geminiResult = await response.json();
        const text = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text) {
          console.log('[Social Style v28] Gemini Flash chat SUCCESS');
          return { choices: [{ message: { content: text } }], _provider: 'gemini-flash' };
        }
      }
    } catch (gemChatErr) {
      console.warn('[Social Style v28] Gemini Flash chat failed:', gemChatErr instanceof Error ? gemChatErr.message : String(gemChatErr));
    }
  }

  // Fallback to OpenRouter with multiple models
  const apiKey = getOpenRouterApiKey();
  if (apiKey) {
    // Try primary model first, then fallbacks
    const modelsToTry = [OPENROUTER_CHAT_MODEL, ...OPENROUTER_CHAT_FALLBACKS.filter(m => m !== OPENROUTER_CHAT_MODEL)];
    for (const model of modelsToTry) {
      console.log('[Social Style v28] Using OpenRouter for chat, model:', model);
      try { return await openRouterChat(messages, model, maxTokens); }
      catch (orError) {
        const errMsg = orError instanceof Error ? orError.message : String(orError);
        console.warn('[Social Style v28] OpenRouter chat failed (' + model + '):', errMsg.substring(0, 200));
        if (errMsg.includes('429') || errMsg.includes('rate')) {
          console.log('[Social Style v28] Rate limited, trying next model...');
          continue; // Try next model
        }
        // For other errors (not rate limit), also try next model
        continue;
      }
    }
  }
  throw new Error('All AI chat providers failed. Set OPENROUTER_API_KEY or GEMINI_API_KEY.');
}

// v28: Google Gemini Flash direct API call — free tier, separate from OpenRouter
async function geminiVision(messages: Array<{ role: string; content: any[] }>): Promise<any> {
  const geminiKey = process.env.GEMINI_API_KEY || '';
  if (!geminiKey) throw new Error('GEMINI_API_KEY not set');

  // Convert OpenAI-format messages to Gemini format
  const parts: any[] = [];
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      parts.push({ text: msg.content });
    } else if (Array.isArray(msg.content)) {
      for (const item of msg.content) {
        if (item.type === 'text') parts.push({ text: item.text });
        if (item.type === 'image_url') {
          const url = item.image_url?.url || '';
          if (url.startsWith('data:')) {
            // base64 inline image
            const match = url.match(/^data:(.+?);base64,(.+)$/);
            if (match) {
              parts.push({
                inline_data: { mime_type: match[1], data: match[2] }
              });
            }
          } else {
            // URL image — fetch and convert to base64
            try {
              const imgResp = await fetch(url, { signal: AbortSignal.timeout(10000) });
              if (imgResp.ok) {
                const buf = Buffer.from(await imgResp.arrayBuffer());
                const ct = imgResp.headers.get('content-type') || 'image/jpeg';
                parts.push({
                  inline_data: { mime_type: ct, data: buf.toString('base64') }
                });
              }
            } catch { /* skip unfetchable image */ }
          }
        }
      }
    }
  }

  const response = await fetch(
    `${GEMINI_BASE_URL}/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 1500 },
      }),
      signal: AbortSignal.timeout(60000),
    }
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini API returned ${response.status}: ${errBody.substring(0, 200)}`);
  }

  const geminiResult = await response.json();
  // Convert Gemini response to OpenAI-compatible format
  const text = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return {
    choices: [{ message: { content: text } }],
    _provider: 'gemini-flash',
  };
}

async function aiVision(messages: Array<{ role: string; content: any[] }>): Promise<any> {
  // v28: Try internal vision (glm-4.6v) FIRST — even on Vercel now!
  // Previously gated by !isVercel() which blocked it on production.
  // ZAI internal API env vars may be set on Vercel too — always worth trying.
  try {
    const result = await internalAIVision(messages);
    console.log('[Social Style v28] Internal vision (glm-4.6v) SUCCESS');
    return { ...result, _provider: 'zai-internal' };
  } catch (intError) {
    console.warn('[Social Style v28] Internal vision failed:', intError instanceof Error ? intError.message : String(intError));
  }

  // v28: Try Google Gemini Flash direct API — free tier, independent of OpenRouter
  const geminiKey = process.env.GEMINI_API_KEY || '';
  if (geminiKey) {
    try {
      const result = await geminiVision(messages);
      console.log('[Social Style v28] Gemini Flash vision SUCCESS');
      return result;
    } catch (gemError) {
      console.warn('[Social Style v28] Gemini Flash vision failed:', gemError instanceof Error ? gemError.message : String(gemError));
    }
  } else {
    console.log('[Social Style v28] GEMINI_API_KEY not set, skipping Gemini Flash');
  }

  // v28: Fallback to OpenRouter with expanded vision model list
  const apiKey = getOpenRouterApiKey();
  if (apiKey) {
    const visionModels = [OPENROUTER_VISION_MODEL, ...OPENROUTER_VISION_FALLBACKS];
    for (const model of visionModels) {
      console.log('[Social Style v28] Trying OpenRouter vision, model:', model);
      try { return await openRouterVision(messages, model); }
      catch (orError) {
        const errMsg = orError instanceof Error ? orError.message : String(orError);
        console.warn(`[Social Style v28] OpenRouter vision (${model}) failed:`, errMsg.substring(0, 100));
        if (errMsg.includes('429')) {
          console.log('[Social Style v28] Vision model rate limited, trying next...');
          continue;
        }
        continue; // Try next model
      }
    }
  }
  throw new Error('All AI vision providers failed.');
}

// ─── Product Catalog — v24: Dynamic from Database + Shopify ─────────

// Normalized product interface for the style recommender
interface StyleProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;       // AI-friendly category name (e.g. "Luxury Watches")
  categorySlug: string;   // DB/Shopify slug (e.g. "watches")
  description?: string;   // v26: product description for gender analysis
  tags: string[];
  recipientTypes: string[]; // 'him', 'her', 'couple', 'kids', 'parents', 'friend'
  gender?: 'male' | 'female' | 'unisex';
  source: 'db' | 'shopify' | 'fallback';
  colors?: Array<{ name: string; hex: string; percentage: number }>; // v29: extracted from product image
}

// Map DB/Shopify category slugs → AI-friendly category names for the style recommender
const SLUG_TO_AI_CATEGORY: Record<string, string> = {
  // Men
  'watches': 'Luxury Watches',
  'leather-goods': 'Premium Leather',
  'fragrances': 'Artisan Perfumes',
  'mens-shirts-t-shirts': "Men's Shirts",
  'mens-shirts': "Men's Shirts",
  'fashion': 'Statement Accessories',
  // Women
  'jewelry': 'Fine Jewelry',
  'jewellery': 'Fine Jewelry',
  'sarees': 'Designer Sarees',
  'women-sarees': 'Designer Sarees',
  'women-fashion': 'Designer Dresses',
  'women-fragrances': 'Designer Fragrances',
  // Kids
  'kids-shirts': "Kids' Shirts",
  'kids-dresses': "Kids' Dresses",
  'toys': 'Kids Toys',
  'kids-fashion': 'Kids Fashion',
  // Home
  'home-living': 'Home & Living',
  'home-decor': 'Home Decor',
  // Office
  'corporate-gifts': 'Corporate Gifts',
  'desk-accessories': 'Desk Accessories',
  'stationery': 'Stationery',
  'office-corporate-gifts': 'Corporate Gifts',
  'office-desk': 'Desk Accessories',
  // Couple
  'couple-friendly-gifts': 'Couple Gifts',
  'romantic-gifts': 'Romantic Gifts',
  // New Arrivals
  'new-arrivals': 'New Arrivals',
};

// Reverse map: AI category → DB/Shopify slugs (one AI category can match multiple slugs)
const AI_CATEGORY_TO_SLUGS: Record<string, string[]> = {
  'Luxury Watches': ['watches'],
  'Premium Leather': ['leather-goods'],
  'Artisan Perfumes': ['fragrances'],
  "Men's Shirts": ['mens-shirts-t-shirts', 'mens-shirts'],
  'Statement Accessories': ['fashion'],
  'Fine Jewelry': ['jewelry', 'jewellery'],
  'Designer Sarees': ['sarees', 'women-sarees'],
  'Designer Dresses': ['women-fashion', 'fashion'],
  'Designer Fragrances': ['fragrances', 'women-fragrances'],
  "Kids' Shirts": ['kids-shirts'],
  "Kids' Dresses": ['kids-dresses'],
  'Kids Toys': ['toys'],
  'Kids Fashion': ['kids-fashion'],
  'Home & Living': ['home-living'],
  'Home Decor': ['home-decor'],
  'Corporate Gifts': ['corporate-gifts', 'office-corporate-gifts'],
  'Desk Accessories': ['desk-accessories', 'office-desk'],
  'Stationery': ['stationery'],
  'Couple Gifts': ['couple-friendly-gifts'],
  'Romantic Gifts': ['romantic-gifts'],
  'New Arrivals': ['new-arrivals'],
  // Legacy AI categories that may still be in prompts
  'Gold Necklaces': ['jewelry', 'jewellery'],
  'Smart Watches': ['watches'],
  'Premium Eyewear': ['fashion'],
  'Bespoke Tailoring': ['fashion', 'mens-shirts-t-shirts'],
  'Handcrafted Shoes': ['fashion'],
  'Designer Handbags': ['fashion', 'women-fashion'],
  'Luxury Skincare': ['fashion'],
  'Silk & Cashmere': ['women-fashion', 'fashion'],
  'Diamond Collection': ['jewelry', 'jewellery'],
  'Gemstone Jewelry': ['jewelry', 'jewellery'],
  'Luxury Sleepwear': ['fashion'],
  'Luxury Gift Sets': ['corporate-gifts', 'couple-friendly-gifts'],
};

// In-memory product cache (refreshed every 5 minutes)
interface ProductCache {
  products: StyleProduct[];
  categories: string[];
  timestamp: number;
}
let productCache: ProductCache | null = null;
const PRODUCT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all products from DB + Shopify, normalize to StyleProduct format.
 * Returns cached data if available.
 */
async function fetchAllProducts(): Promise<{ products: StyleProduct[]; categories: string[] }> {
  if (productCache && Date.now() - productCache.timestamp < PRODUCT_CACHE_TTL) {
    return { products: productCache.products, categories: productCache.categories };
  }

  console.log('[Social Style v24] Fetching products from DB + Shopify...');
  const allProducts: StyleProduct[] = [];
  const usedIds = new Set<string>();

  try {
    // ── Source 1: PostgreSQL via Prisma ──
    try {
      // Check if db.product exists (SQLite schema may not have Product model)
      if (db?.product && typeof db.product.findMany === 'function') {
        const dbProducts = await db.product.findMany({
          where: { stockStatus: { in: ['in_stock', 'low_stock'] } },
          include: { category: true },
          take: 500,
        });
        console.log(`[Social Style v24] DB products: ${dbProducts.length}`);

        for (const p of dbProducts) {
          const dedupeKey = `db-${p.id}`;
          if (usedIds.has(dedupeKey)) continue;
          usedIds.add(dedupeKey);

          // Also dedupe by slug to avoid DB+Shopify duplicates
          if (p.slug && usedIds.has(`slug-${p.slug}`)) continue;
          if (p.slug) usedIds.add(`slug-${p.slug}`);

          const catSlug = p.category?.slug || '';
          const aiCategory = SLUG_TO_AI_CATEGORY[catSlug] || p.category?.name || catSlug;

          const tags: string[] = p.tags ? JSON.parse(p.tags) : [];
          const recipientTypes: string[] = p.recipientTypes ? JSON.parse(p.recipientTypes) : [];
          let images: string[] = [];
          try { images = p.images ? JSON.parse(p.images) : []; } catch { images = []; }

          // Infer gender from recipientTypes + tags + name + description (v26.1: multi-signal)
          let gender: 'male' | 'female' | 'unisex' | undefined;
          if (recipientTypes.includes('him') && !recipientTypes.includes('her')) gender = 'male';
          else if (recipientTypes.includes('her') && !recipientTypes.includes('him')) gender = 'female';
          else if (recipientTypes.includes('him') && recipientTypes.includes('her')) gender = 'unisex';

          // v26.1: If recipientTypes is empty, infer gender AND recipientTypes from tags + name + description
          if (!gender) {
            const tagStr = tags.join(' ').toLowerCase();
            const nameLc = p.name.toLowerCase();
            const descLc = (p.description || '').toLowerCase();
            const allText = `${tagStr} ${nameLc} ${descLc}`;
            const hasFemaleSignal = /\b(women|women's?|ladies|lady|her|girls?|girl's|bride|bridal|feminine|queen|goddess)\b/.test(allText);
            const hasMaleSignal = /\b(men|men's?|mens|gentleman|him|boys?|boy's|sir|lord|king)\b/.test(allText);
            if (hasMaleSignal && !hasFemaleSignal) { gender = 'male'; if (!recipientTypes.includes('him')) recipientTypes.push('him'); }
            else if (hasFemaleSignal && !hasMaleSignal) { gender = 'female'; if (!recipientTypes.includes('her')) recipientTypes.push('her'); }
            else if (hasFemaleSignal && hasMaleSignal) { gender = 'unisex'; }
          }

          allProducts.push({
            id: p.id,
            name: p.name,
            price: p.price,
            image: images[0] || '/images/placeholder-product.png',
            category: aiCategory,
            categorySlug: catSlug,
            description: p.description || '',  // v26: pass description for gender filtering
            tags,
            recipientTypes,
            gender,
            source: 'db',
          });
        }
      } else {
        console.log('[Social Style v24] DB has no Product model — skipping DB fetch (using Shopify only)');
      }
    } catch (dbErr) {
      console.error('[Social Style v24] DB fetch failed:', dbErr instanceof Error ? dbErr.message : String(dbErr));
    }

    // ── Source 2: Shopify API ──
    try {
      const shopifyProducts = await fetchShopifyProducts();
      console.log(`[Social Style v24] Shopify products: ${shopifyProducts.length}`);

      for (const p of shopifyProducts) {
        const dedupeKey = `shopify-${p.id}`;
        if (usedIds.has(dedupeKey)) continue;
        // Dedupe by slug
        if (p.slug && usedIds.has(`slug-${p.slug}`)) continue;
        if (p.slug) usedIds.add(`slug-${p.slug}`);
        usedIds.add(dedupeKey);

        const aiCategory = SLUG_TO_AI_CATEGORY[p.categorySlug] || p.category || p.categorySlug;

        // v26.1: Infer gender from tags + product name + description (not just tags!)
        let gender: 'male' | 'female' | 'unisex' | undefined;
        const tagStr = p.tags.join(' ').toLowerCase();
        const nameLc = p.name.toLowerCase();
        const descLc = (p.description || '').toLowerCase();
        // Combine ALL text signals: tags + name + description
        const allText = `${tagStr} ${nameLc} ${descLc}`;

        const hasFemaleSignal = /\b(women|women's?|ladies|lady|her|girls?|girl's|bride|bridal|feminine|queen|goddess)\b/.test(allText);
        const hasMaleSignal = /\b(men|men's?|mens|gentleman|him|boys?|boy's|sir|lord|king)\b/.test(allText);

        if (hasMaleSignal && !hasFemaleSignal) gender = 'male';
        else if (hasFemaleSignal && !hasMaleSignal) gender = 'female';
        else if (hasFemaleSignal && hasMaleSignal) gender = 'unisex';

        // v26.1: Infer recipientTypes from tags + name + description (Shopify doesn't provide this!)
        let recipientTypes: string[] = p.recipientTypes || [];
        if (recipientTypes.length === 0) {
          recipientTypes = [];
          if (hasFemaleSignal) recipientTypes.push('her');
          if (hasMaleSignal) recipientTypes.push('him');
          if (recipientTypes.length === 0) recipientTypes.push('couple'); // default if no gender signal
        }

        allProducts.push({
          id: p.id,
          name: p.name,
          price: p.price,
          image: (p.images && p.images[0]) || '/images/placeholder-product.png',
          category: aiCategory,
          categorySlug: p.categorySlug,
          description: p.description || '',
          tags: p.tags,
          recipientTypes,
          gender,
          source: 'shopify',
        });
      }
    } catch (shopifyErr) {
      console.error('[Social Style v24] Shopify fetch failed:', shopifyErr instanceof Error ? shopifyErr.message : String(shopifyErr));
    }
  } catch (err) {
    console.error('[Social Style v24] Product fetch error:', err);
  }

  // ── Fallback: If DB + Shopify both fail, use minimal hardcoded catalog ──
  if (allProducts.length === 0) {
    console.warn('[Social Style v24] All sources failed — using fallback catalog');
    for (const p of FALLBACK_PRODUCT_CATALOG) {
      allProducts.push({ ...p, source: 'fallback' });
    }
  }

  const categories = [...new Set(allProducts.map(p => p.category))];
  console.log(`[Social Style v24] Total products: ${allProducts.length}, categories: ${categories.length}`);
  // v26.1: Debug log — show how many products were inferred as female
  const femaleInferred = allProducts.filter(p => p.gender === 'female').length;
  const maleInferred = allProducts.filter(p => p.gender === 'male').length;
  const noGender = allProducts.filter(p => !p.gender).length;
  console.log(`[Social Style v26.1] Gender inference: ${maleInferred} male, ${femaleInferred} female, ${noGender} unknown`);
  // Show a few examples of female products that will be blocked for male users
  const femaleProducts = allProducts.filter(p => p.gender === 'female').slice(0, 5);
  if (femaleProducts.length > 0) {
    console.log(`[Social Style v26.1] Female products (will be blocked for male): ${femaleProducts.map(p => `"${p.name}" [${p.recipientTypes.join(',')}]`).join(', ')}`);
  }

  // ── v29: Extract colors from product images (pixel-based, no AI needed) ──
  // Only extract for products with valid image URLs (skip placeholders)
  // Run in batches of 5 to avoid overwhelming the server
  console.log('[Social Style v29] Extracting colors from product images...');
  const BATCH_SIZE = 5;
  let colorExtracted = 0;
  for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
    const batch = allProducts.slice(i, i + BATCH_SIZE);
    const colorResults = await Promise.allSettled(
      batch.map(async (product) => {
        // Skip products without valid image URLs
        if (!product.image || product.image.startsWith('/images/') || product.image.includes('placeholder')) {
          return { productId: product.id, colors: null };
        }
        try {
          const colors = await extractColorsFromImagePixels(product.image);
          return { productId: product.id, colors };
        } catch {
          return { productId: product.id, colors: null };
        }
      })
    );
    for (let j = 0; j < colorResults.length; j++) {
      const result = colorResults[j];
      if (result.status === 'fulfilled' && result.value.colors) {
        const productIdx = i + j;
        if (productIdx < allProducts.length) {
          allProducts[productIdx].colors = result.value.colors;
          colorExtracted++;
        }
      }
    }
  }
  console.log(`[Social Style v29] Colors extracted for ${colorExtracted}/${allProducts.length} products`);

  productCache = { products: allProducts, categories, timestamp: Date.now() };
  return { products: allProducts, categories };
}

// Small fallback catalog for when both DB and Shopify are down
const FALLBACK_PRODUCT_CATALOG: StyleProduct[] = [
  { id: 'fallback-watch-1', name: 'Royal Chronograph Gold', price: 45000, image: '/images/products/generated/royal-chronograph-gold-11047389823249.png', category: 'Luxury Watches', categorySlug: 'watches', tags: ['watch', 'chronograph', 'gold'], recipientTypes: ['him'], gender: 'male', source: 'fallback' },
  { id: 'fallback-watch-2', name: 'Midnight Skeleton Tourbillon', price: 89000, image: '/images/products/generated/midnight-skeleton-tourbillon-11047389829999.png', category: 'Luxury Watches', categorySlug: 'watches', tags: ['watch', 'tourbillon', 'luxury'], recipientTypes: ['him'], gender: 'male', source: 'fallback' },
  { id: 'fallback-leather-1', name: 'Heritage Leather Briefcase', price: 28000, image: '/images/products/generated/heritage-leather-briefcase-11047388905745.png', category: 'Premium Leather', categorySlug: 'leather-goods', tags: ['leather', 'briefcase'], recipientTypes: ['him'], gender: 'male', source: 'fallback' },
  { id: 'fallback-tailoring-1', name: 'Bespoke Suit Package', price: 75000, image: '/images/products/generated/bespoke-suit-package-11047388819999.png', category: 'Bespoke Tailoring', categorySlug: 'fashion', tags: ['suit', 'bespoke', 'formal'], recipientTypes: ['him'], gender: 'male', source: 'fallback' },
  { id: 'fallback-eyewear-1', name: 'Aviator Gold Sunglasses', price: 15000, image: '/images/products/generated/aviator-gold-sunglasses-11047389219999.png', category: 'Premium Eyewear', categorySlug: 'fashion', tags: ['sunglasses', 'aviator', 'gold'], recipientTypes: ['him', 'her'], gender: 'unisex', source: 'fallback' },
  { id: 'fallback-eyewear-2', name: 'Classic Tortoise Frame Glasses', price: 8500, image: '/images/products/generated/classic-tortoise-frame-glasses-11047389229999.png', category: 'Premium Eyewear', categorySlug: 'fashion', tags: ['glasses', 'tortoise', 'optical', 'frames'], recipientTypes: ['him', 'her'], gender: 'unisex', source: 'fallback' },
  { id: 'fallback-eyewear-3', name: 'Sleek Black Rectangular Frames', price: 9200, image: '/images/products/generated/sleek-black-rectangular-frames-11047389239999.png', category: 'Premium Eyewear', categorySlug: 'fashion', tags: ['glasses', 'rectangular', 'black', 'optical'], recipientTypes: ['him'], gender: 'male', source: 'fallback' },
  { id: 'fallback-eyewear-4', name: 'Round Gold Wire Frames', price: 11000, image: '/images/products/generated/round-gold-wire-frames-11047389249999.png', category: 'Premium Eyewear', categorySlug: 'fashion', tags: ['glasses', 'round', 'gold', 'wire', 'optical'], recipientTypes: ['him', 'her'], gender: 'unisex', source: 'fallback' },
  { id: 'fallback-perfume-1', name: 'Oud Royale Intense', price: 12000, image: '/images/products/generated/oud-royale-intense-11047389039999.png', category: 'Artisan Perfumes', categorySlug: 'fragrances', tags: ['oud', 'perfume', 'intense'], recipientTypes: ['him'], gender: 'male', source: 'fallback' },
  { id: 'fallback-jewelry-1', name: 'Diamond Pendant Necklace', price: 95000, image: '/images/products/generated/diamond-solitaire-pendant-11047388709999.png', category: 'Fine Jewelry', categorySlug: 'jewelry', tags: ['diamond', 'pendant', 'necklace'], recipientTypes: ['her'], gender: 'female', source: 'fallback' },
  { id: 'fallback-saree-1', name: 'Banarasi Silk Saree', price: 8500, image: '/images/products/saree-1.jpg', category: 'Designer Sarees', categorySlug: 'sarees', tags: ['saree', 'silk', 'banarasi', 'wedding'], recipientTypes: ['her'], gender: 'female', source: 'fallback' },
];

const AVAILABLE_CATEGORIES: string[] = []; // Populated dynamically from fetchAllProducts()

// ─── Gender-specific category lists ───

const FEMALE_CATEGORIES = [
  'Designer Dresses', 'Gold Necklaces', 'Smart Watches', 'Fine Jewelry',
  'Diamond Collection', 'Designer Handbags', 'Designer Fragrances',
  'Luxury Skincare', 'Luxury Sleepwear', 'Premium Eyewear', 'Luxury Gift Sets',
  'Designer Sarees', 'Gemstone Jewelry', 'Silk & Cashmere',
];

const MALE_CATEGORIES = [
  'Luxury Watches', 'Smart Watches', 'Bespoke Tailoring', 'Premium Leather',
  'Statement Accessories', 'Handcrafted Shoes', 'Artisan Perfumes',
  'Premium Eyewear', 'Luxury Gift Sets', 'Gold Necklaces', 'Silk & Cashmere',
  "Men's Shirts", 'Corporate Gifts',
];

const GENDER_NEUTRAL_CATEGORIES = [
  'Premium Eyewear', 'Designer Fragrances', 'Artisan Perfumes',
  'Silk & Cashmere', 'Luxury Skincare', 'Luxury Sleepwear', 'Luxury Gift Sets',
];

// ─── Category Keywords ───

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Luxury Gift Sets': ['gift', 'gift set', 'gift box', 'birthday', 'celebration', 'present', 'hamper', 'gift collection', 'milestone'],
  'Smart Watches': ['smartwatch', 'smart watch', 'fitness tracker', 'digital watch', 'fitness band', 'smart watch black', 'lady smartwatch', 'wearable'],
  'Gold Necklaces': ['gold necklace', 'necklace', 'pendant', 'gold chain', 'chain necklace', 'pendant necklace', 'gold pendant', 'delicate necklace', 'charm necklace'],
  'Designer Dresses': ['dress', 'gown', 'frock', 'ethnic dress', 'embroidered dress', 'a-line dress', 'kaftan', 'silk dress', 'maxi dress', 'shift dress', 'anarkali', 'salwar', 'lehenga'],
  'Premium Eyewear': ['eyewear', 'sunglasses', 'optical', 'glasses', 'spectacles', 'frames', 'prescription', 'rectangular frames', 'black frames', 'reading glasses'],
  'Luxury Watches': ['watch', 'chronograph', 'tourbillon', 'timepiece', 'wristwatch', 'analog watch', 'mechanical watch'],
  'Premium Leather': ['leather', 'briefcase', 'wallet', 'leather bag', 'leather belt'],
  'Fine Jewelry': ['jewelry', 'jewellery', 'bracelet', 'earring', 'gemstone', 'bangle', 'ring', 'pendant', 'necklace', 'chain'],
  'Designer Fragrances': ['fragrance', 'parfum', 'perfume', 'scent', 'cologne'],
  'Silk & Cashmere': ['silk', 'cashmere', 'overcoat', 'wrap', 'textile', 'scarf', 'shawl'],
  'Statement Accessories': ['accessories', 'cufflink', 'statement', 'ring', 'brooch'],
  'Designer Handbags': ['handbag', 'bag', 'tote', 'clutch', 'purse', 'shoulder bag'],
  'Luxury Skincare': ['skincare', 'serum', 'cream', 'beauty', 'cosmetics'],
  'Artisan Perfumes': ['perfume', 'artisan', 'oud', 'niche', 'attar'],
  'Handcrafted Shoes': ['shoes', 'oxford', 'loafer', 'footwear', 'heels', 'sneakers', 'pumps', 'sandals'],
  'Bespoke Tailoring': ['tailoring', 'suit', 'bespoke', 'custom', 'formal wear', 'blazer'],
  'Diamond Collection': ['diamond', 'solitaire'],
  'Gemstone Jewelry': ['gemstone', 'emerald', 'sapphire', 'ruby', 'precious stone'],
  'Luxury Sleepwear': ['sleepwear', 'pajama', 'lounge', 'nightwear', 'robe'],
  'Designer Sarees': ['saree', 'sari', 'banarasi', 'silk saree', 'wedding saree', 'zari', 'ethnic'],
  "Men's Shirts": ['shirt', 't-shirt', 'polo', 'mens shirt', 'formal shirt', 'casual shirt', 'cotton shirt'],
  'Corporate Gifts': ['corporate', 'executive', 'business gift', 'office gift', 'professional'],
  'Desk Accessories': ['desk', 'organizer', 'pen holder', 'desk clock', 'desk pad'],
  'Stationery': ['stationery', 'pen', 'journal', 'notebook', 'planner', 'diary'],
  'Couple Gifts': ['couple', 'his and hers', 'romantic gift', 'anniversary', 'together'],
  'Romantic Gifts': ['romantic', 'valentine', 'love', 'candle', 'dinner set', 'spa'],
  'Home & Living': ['home', 'living', 'decor', 'candle', 'vase', 'blanket', 'throw'],
  'Home Decor': ['decor', 'vase', 'candle', 'art', 'frame', 'ornament'],
  'Kids Toys': ['toy', 'toy set', 'building block', 'puzzle', 'game'],
  "Kids' Shirts": ['kids shirt', 'boys shirt', 'children shirt', 'cotton shirt'],
  "Kids' Dresses": ['kids dress', 'girls dress', 'children dress', 'floral dress'],
  'Kids Fashion': ['kids fashion', 'kids clothing', 'children wear', 'sneakers'],
  'New Arrivals': ['new arrival', 'new', 'latest', 'just in', 'trending'],
};

// ============================================================
// v20 NEW: YouTube Subscription Analysis
// ============================================================

/**
 * YouTube channel keywords that map to product categories.
 * When a user's YouTube subscription matches these keywords,
 * the corresponding product categories get boosted in recommendations.
 */
const YOUTUBE_INTEREST_MAPPING: Record<string, { keywords: string[]; categories: string[]; gender?: 'male' | 'female' }> = {
  'luxury_fashion': {
    keywords: ['fashion', 'style', 'vogue', 'couture', 'runway', 'luxury fashion', 'designer', 'outfit', 'lookbook', 'fashion haul', 'style guide', 'wardrobe', 'OOTD'],
    categories: ['Designer Dresses', 'Designer Handbags', 'Gold Necklaces', 'Fine Jewelry'],
  },
  'handbags': {
    keywords: ['handbag', 'purse', 'bag collection', 'bag review', 'designer bag', 'chanel bag', 'lv bag', 'hermes', 'tote bag', 'clutch'],
    categories: ['Designer Handbags'],
    gender: 'female',
  },
  'watches': {
    keywords: ['watch', 'watch review', 'watch collection', 'luxury watch', 'rolex', 'omega', 'patek', 'timepiece', 'chronograph', 'watch enthusiast', 'horology'],
    categories: ['Luxury Watches', 'Smart Watches'],
    gender: 'male',
  },
  'jewelry': {
    keywords: ['jewelry', 'jewellery', 'gold necklace', 'diamond', 'ring', 'bracelet', 'earring', 'pendant', 'gemstone', 'gold chain'],
    categories: ['Gold Necklaces', 'Fine Jewelry', 'Diamond Collection'],
  },
  'skincare_beauty': {
    keywords: ['skincare', 'beauty', 'makeup', 'serum', 'cream', 'cosmetics', 'beauty routine', 'skincare routine', 'beauty review'],
    categories: ['Luxury Skincare', 'Designer Fragrances'],
    gender: 'female',
  },
  'fragrance': {
    keywords: ['fragrance', 'perfume', 'cologne', 'parfum', 'scent', 'oud', 'perfume review', 'fragrance collection', 'niche perfume'],
    categories: ['Designer Fragrances', 'Artisan Perfumes'],
  },
  'mens_style': {
    keywords: ['men style', 'menswear', 'gentleman', 'suit', 'tailoring', 'blazer', 'mens fashion', 'dapper', 'men grooming', 'formal wear'],
    categories: ['Bespoke Tailoring', 'Premium Leather', 'Statement Accessories'],
    gender: 'male',
  },
  'shoes': {
    keywords: ['shoes', 'sneakers', 'oxford', 'loafer', 'heels', 'footwear', 'shoe collection', 'shoe review'],
    categories: ['Handcrafted Shoes'],
  },
  'eyewear': {
    keywords: ['sunglasses', 'eyewear', 'glasses', 'ray-ban', 'frames', 'spectacles', 'optical'],
    categories: ['Premium Eyewear'],
  },
  'ethnic_fashion': {
    keywords: ['ethnic', 'saree', 'lehenga', 'salwar', 'anarkali', 'indian fashion', 'traditional wear', 'bridal', 'bridal wear'],
    categories: ['Designer Sarees', 'Fine Jewelry', 'Gold Necklaces'],
    gender: 'female',
  },
  'luxury_lifestyle': {
    keywords: ['luxury', 'lifestyle', 'premium', 'opulence', 'high end', 'luxury living', 'luxury review', 'unboxing luxury'],
    categories: ['Luxury Gift Sets', 'Silk & Cashmere', 'Luxury Watches'],
  },
  'gifting': {
    keywords: ['gift', 'gift guide', 'gift ideas', 'birthday gift', 'anniversary', 'present', 'celebration'],
    categories: ['Luxury Gift Sets', 'Designer Fragrances', 'Fine Jewelry'],
  },
  'leather': {
    keywords: ['leather', 'briefcase', 'wallet', 'leather craft', 'leather bag', 'leather review'],
    categories: ['Premium Leather'],
    gender: 'male',
  },
};

interface YouTubeInterest {
  interestGroup: string;
  matchedKeywords: string[];
  recommendedCategories: string[];
  inferredGender?: 'male' | 'female';
  confidence: number; // 0-1 based on how many keywords matched
}

/**
 * Fetch user's YouTube subscriptions using their Google OAuth access token
 */
async function fetchYouTubeSubscriptions(accessToken: string): Promise<Array<{ title: string; description: string; channelId: string }>> {
  try {
    console.log('[Social Style v20.5] Fetching YouTube subscriptions...');

    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=50',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.warn('[Social Style v20.5] YouTube subscriptions API returned:', response.status, errorBody.substring(0, 200));

      // v20.5: Log specific guidance for common errors
      if (response.status === 401) {
        console.warn('[Social Style v20.5] YouTube 401: Access token is expired or invalid. Frontend should call /api/auth/google/refresh');
      } else if (response.status === 403) {
        console.warn('[Social Style v20.5] YouTube 403: youtube.readonly scope not granted, or YouTube API not enabled in Google Cloud project');
      }

      return [];
    }

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const channels = data.items.map((item: any) => ({
        title: item.snippet?.title || '',
        description: item.snippet?.description || '',
        channelId: item.snippet?.resourceId?.channelId || '',
      })).filter((ch: any) => ch.channelId);

      console.log('[Social Style v20.5] YouTube subscriptions found:', channels.length);
      return channels;
    }

    // v20.5: Distinguish between "no subscriptions" and "empty channel list"
    console.log('[Social Style v20.5] YouTube API returned 0 subscriptions (user may not have any, or token lacks scope)');
    return [];
  } catch (error) {
    console.warn('[Social Style v20.5] YouTube subscription fetch failed:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Analyze YouTube subscriptions to extract fashion/style interests
 */
function analyzeYouTubeInterests(
  subscriptions: Array<{ title: string; description: string; channelId: string }>
): YouTubeInterest[] {
  if (subscriptions.length === 0) return [];

  // Combine all subscription titles and descriptions into one text blob
  const allText = subscriptions.map(ch => `${ch.title} ${ch.description}`).join(' ').toLowerCase();

  const interests: YouTubeInterest[] = [];

  for (const [group, mapping] of Object.entries(YOUTUBE_INTEREST_MAPPING)) {
    const matchedKeywords: string[] = [];

    for (const keyword of mapping.keywords) {
      // Count how many subscriptions contain this keyword
      const count = subscriptions.filter(ch =>
        `${ch.title} ${ch.description}`.toLowerCase().includes(keyword.toLowerCase())
      ).length;

      if (count > 0) {
        matchedKeywords.push(`${keyword}(${count})`);
      }
    }

    if (matchedKeywords.length > 0) {
      // Confidence based on number of matching subscriptions and keywords
      const totalMatches = matchedKeywords.reduce((sum, mk) => {
        const match = mk.match(/\((\d+)\)$/);
        return sum + (match ? parseInt(match[1], 10) : 1);
      }, 0);

      const confidence = Math.min(1, totalMatches / (subscriptions.length * 0.3)); // 30% of subs matching = full confidence

      interests.push({
        interestGroup: group,
        matchedKeywords,
        recommendedCategories: mapping.categories,
        inferredGender: mapping.gender,
        confidence: Math.round(confidence * 100) / 100,
      });
    }
  }

  // Sort by confidence (highest first)
  interests.sort((a, b) => b.confidence - a.confidence);

  console.log('[Social Style v20] YouTube interests detected:', interests.length);
  for (const interest of interests) {
    console.log(`  ${interest.interestGroup}: ${interest.matchedKeywords.join(', ')} → [${interest.recommendedCategories.join(', ')}] (confidence: ${interest.confidence})`);
  }

  return interests;
}

/**
 * Build YouTube interests prompt section for AI
 */
function buildYouTubeInterestsPrompt(interests: YouTubeInterest[]): string {
  if (interests.length === 0) return '';

  const lines: string[] = [
    '=== YOUTUBE INTERESTS (from user\'s subscribed channels) ===',
    'The user subscribes to YouTube channels that indicate these fashion/style interests:',
    '',
  ];

  for (const interest of interests) {
    const confidenceLabel = interest.confidence >= 0.7 ? 'HIGH' : interest.confidence >= 0.4 ? 'MEDIUM' : 'LOW';
    lines.push(`- ${interest.interestGroup.toUpperCase().replace(/_/g, ' ')} (confidence: ${confidenceLabel})`);
    lines.push(`  Keywords matched: ${interest.matchedKeywords.join(', ')}`);
    lines.push(`  PRIORITY categories to recommend: ${interest.recommendedCategories.join(', ')}`);

    if (interest.inferredGender) {
      lines.push(`  Gender signal: ${interest.inferredGender.toUpperCase()}`);
    }
  }

  lines.push('');
  lines.push('IMPORTANT: Use these YouTube interests to influence your category recommendations.');
  lines.push('- Categories that match YouTube interests should get HIGHER match scores (+5-15)');
  lines.push('- If multiple interests point to the same category, boost it even more');
  lines.push('- YouTube interest data is STRONGER than generic assumptions — the user actively engages with this content');

  return lines.join('\n');
}

/**
 * Get YouTube-inferred gender from interests
 */
function inferGenderFromYouTube(interests: YouTubeInterest[]): 'male' | 'female' | null {
  let maleScore = 0;
  let femaleScore = 0;

  for (const interest of interests) {
    if (interest.inferredGender === 'male') maleScore += interest.confidence;
    if (interest.inferredGender === 'female') femaleScore += interest.confidence;
  }

  if (maleScore > femaleScore && maleScore >= 0.3) return 'male';
  if (femaleScore > maleScore && femaleScore >= 0.3) return 'female';
  return null;
}

/**
 * Get YouTube category boost map (category → boost amount)
 */
function getYouTubeCategoryBoosts(interests: YouTubeInterest[]): Record<string, number> {
  const boosts: Record<string, number> = {};

  for (const interest of interests) {
    const boostAmount = Math.round(interest.confidence * 15); // max 15 points boost
    for (const category of interest.recommendedCategories) {
      boosts[category] = (boosts[category] || 0) + boostAmount;
    }
  }

  // Cap boosts at 20
  for (const cat of Object.keys(boosts)) {
    boosts[cat] = Math.min(20, boosts[cat]);
  }

  return boosts;
}

// ─── Gender Inference from Profile Data ───

function inferGenderFromProfile(
  googleData?: any,
  facebookData?: any,
  linkedinData?: any,
  instagramData?: any
): 'male' | 'female' | null {
  const names: string[] = [];
  if (googleData?.profile?.name) names.push(googleData.profile.name);
  if (facebookData?.profile?.name) names.push(facebookData.profile.name);
  if (linkedinData?.profile?.name) names.push(linkedinData.profile.name);
  // v22: Instagram now provides rich data — use full name from biography or username
  if (instagramData?.username) names.push(instagramData.username);

  if (names.length === 0) return null;

  const fullName = names[0];
  const firstName = fullName.split(/\s+/)[0];

  const maleNames = ['raj', 'kumar', 'amit', 'rahul', 'vikram', 'arjun', 'rohit', 'suresh', 'anil', 'prakash',
    'deepak', 'manoj', 'ravi', 'sunil', 'ajay', 'vijay', 'sanjay', 'mohit', 'neeraj', 'varun',
    'aditya', 'harsh', 'kartik', 'nishant', 'pranav', 'siddharth', 'dev', 'omkar', 'shreyas', 'tanay',
    // South Indian / Telugu male names
    'venkateswarlu', 'venkatesh', 'venkat', 'ramana', 'narasimha', 'srinivas', 'srinu', 'mohan', 'murthy',
    'lakshman', 'narayana', 'padmanabha', 'subramanyam', 'ganesan', 'murugan', 'karthik',
    'raju', 'babu', 'seshu', 'satish', 'giri', 'giridhar', 'kiran', 'santosh', 'ramesh', 'mahesh',
    'sreenu', 'naidu', 'reddy', 'krishna', 'balaji', 'hanuman', 'durga', 'shankar', 'shiva',
    // More Indian male names
    'ashok', 'bharat', 'chandra', 'dinesh', 'ganesh', 'harish', 'ishan', 'jay', 'kamal', 'lalit',
    'madan', 'naresh', 'parth', 'ravindra', 'sameer', 'tarun', 'uday', 'vivek', 'yogesh', 'zakir',
    // Western male names
    'john', 'michael', 'david', 'james', 'robert', 'william', 'richard', 'thomas', 'daniel', 'matthew',
    'chris', 'andrew', 'mark', 'steven', 'paul', 'joseph', 'peter', 'brian', 'kevin', 'jason'];

  const femaleNames = ['priya', 'anita', 'sunita', 'rekha', 'meena', 'pooja', 'neha', 'swati', 'aarti', 'divya',
    'nisha', 'rupa', 'smita', 'kavita', 'manisha', 'sandhya', 'priti', 'sonal', 'shilpa', 'reshma',
    'ananya', 'shreya', 'riya', 'aisha', 'kavya', 'tanya', 'pallavi', 'sneha', 'megha', 'isha',
    // South Indian / Telugu female names
    'lakshmi', 'padmavathi', 'saroja', 'satyavathi', 'rama', 'seetha', 'janaki', 'anuradha',
    'bhavani', 'durgamba', 'venkatalakshmi', 'nagalakshmi', 'rajyalakshmi', 'sujatha', 'bindu',
    'hema', 'jayasudha', 'vijaya', 'madhavi', 'vani', 'bhanu', 'sravanthi', 'hamsini', 'manasa',
    // More Indian female names
    'aarti', 'alka', 'amrita', 'aparna', 'ashwini', 'bharti', 'chhaya', 'deepa', 'geeta', 'henna',
    'jyoti', 'kalpana', 'leela', 'madhu', 'nandini', 'parul', 'rashmi', 'simran', 'tara', 'uma',
    // Western female names
    'mary', 'jennifer', 'lisa', 'sarah', 'jessica', 'emily', 'amanda', 'samantha', 'elizabeth', 'rachel',
    'karen', 'nancy', 'betty', 'margaret', 'sandra', 'ashley', 'dorothy', 'kimberly', 'angela', 'helen'];

  const lowerFirst = firstName.toLowerCase();

  if (maleNames.includes(lowerFirst)) return 'male';
  if (femaleNames.includes(lowerFirst)) return 'female';

  // v23.1: Expanded suffix rules for Indian names
  if (lowerFirst.endsWith('kumar') || lowerFirst.endsWith('raj') || lowerFirst.endsWith('dev') ||
      lowerFirst.endsWith('deep') || lowerFirst.endsWith('esh') || lowerFirst.endsWith('nath') ||
      lowerFirst.endsWith('dutt') || lowerFirst.endsWith('pal') || lowerFirst.endsWith('bhai') ||
      lowerFirst.endsWith('lu') || lowerFirst.endsWith('iah') || lowerFirst.endsWith('appa') ||
      lowerFirst.endsWith('anna') || lowerFirst.endsWith('rao') || lowerFirst.endsWith('nand') ||
      lowerFirst.endsWith('sh') || lowerFirst.endsWith('eshwar') || lowerFirst.endsWith('murthy') ||
      lowerFirst.endsWith('prasad') || lowerFirst.endsWith('swamy') || lowerFirst.endsWith('sekhar')) return 'male';
  if (lowerFirst.endsWith('devi') || lowerFirst.endsWith('bai') || lowerFirst.endsWith('ben') ||
      lowerFirst.endsWith('kaur') || lowerFirst.endsWith('bala') || lowerFirst.endsWith('amma') ||
      lowerFirst.endsWith('akshi') || lowerFirst.endsWith('vathi') || lowerFirst.endsWith('mmba') ||
      lowerFirst.endsWith('amma') || lowerFirst.endsWith('lakshmi') || lowerFirst.endsWith('wathi') ||
      lowerFirst.endsWith('kumari') || lowerFirst.endsWith('rani')) return 'female';

  return null;
}

// ─── v22: Extract fashion/style signals from Instagram data ───
// Analyzes Instagram profile, media captions, and hashtags for style preferences

function extractInstagramStyleSignals(instagramData: any): {
  styleKeywords: string[];
  brandMentions: string[];
  colorPreferences: string[];
  categoryBoosts: Record<string, number>;
  fashionHashtags: string[];
} {
  if (!instagramData) {
    return { styleKeywords: [], brandMentions: [], colorPreferences: [], categoryBoosts: {}, fashionHashtags: [] };
  }

  const styleKeywords: string[] = [];
  const brandMentions: string[] = [];
  const colorPreferences: string[] = [];
  const categoryBoosts: Record<string, number> = {};
  const fashionHashtags: string[] = [];

  // Fashion/style related hashtags
  const fashionTags = [
    '#fashion', '#style', '#ootd', '#outfit', '#lookoftheday', '#fashionista',
    '#streetstyle', '#streetfashion', '#luxury', '#luxuryfashion', '#designer',
    '#mensfashion', '#womensfashion', '#fashionblogger', '#instafashion',
    '#styleinspiration', '#fashionstyle', '#chic', '#elegant', '#classy',
    '#minimal', '#minimalist', '#contemporary', '#casual', '#formal',
    '#ethnic', '#traditional', '#fusion', '#boho', '#bohemian',
    '#vintage', '#retro', '#trendy', '#modern', '#classic',
    '#luxurylifestyle', '#premium', '#bespoke', '#tailored', '#haute',
    '#accessories', '#jewelry', '#watches', '#bags', '#shoes',
    '#denim', '#silk', '#leather', '#cotton', '#linen',
  ];

  // Brand patterns to look for
  const brandPatterns = [
    'gucci', 'louis vuitton', 'prada', 'chanel', 'versace', 'dior',
    'balenciaga', 'coach', 'burberry', 'armani', 'hermes', 'valentino',
    'dolce', 'gabbana', 'givenchy', 'fendi', 'celine', 'bottega',
    'zara', 'h&m', 'uniqlo', 'nike', 'adidas', 'puma',
    'raymond', 'peter england', 'allen solly', 'van heusen', 'park avenue',
    'fabindia', 'bib', 'w', 'global desi', 'and', 'nykaa fashion',
  ];

  // Style keywords from hashtags
  const styleTagMap: Record<string, string> = {
    '#fashion': 'fashion-forward',
    '#style': 'style-conscious',
    '#ootd': 'trendy',
    '#luxury': 'luxury-oriented',
    '#minimal': 'minimalist',
    '#minimalist': 'minimalist',
    '#chic': 'chic',
    '#elegant': 'elegant',
    '#classic': 'classic',
    '#streetstyle': 'urban',
    '#streetfashion': 'urban',
    '#vintage': 'vintage',
    '#retro': 'retro',
    '#boho': 'bohemian',
    '#bohemian': 'bohemian',
    '#ethnic': 'ethnic',
    '#traditional': 'traditional',
    '#fusion': 'fusion',
    '#casual': 'casual',
    '#formal': 'formal',
    '#designer': 'designer',
    '#luxuryfashion': 'luxury',
    '#premium': 'premium',
    '#bespoke': 'bespoke',
    '#tailored': 'tailored',
    '#contemporary': 'contemporary',
    '#trendy': 'trendy',
    '#modern': 'modern',
  };

  // Category boost from hashtags
  const categoryTagMap: Record<string, { category: string; boost: number }> = {
    '#accessories': { category: 'Accessories', boost: 8 },
    '#jewelry': { category: 'Gold Necklaces', boost: 10 },
    '#watches': { category: 'Luxury Watches', boost: 12 },
    '#bags': { category: 'Designer Bags', boost: 8 },
    '#shoes': { category: 'Premium Shoes', boost: 8 },
    '#denim': { category: 'Denim Collection', boost: 6 },
    '#silk': { category: 'Silk Collection', boost: 8 },
    '#leather': { category: 'Leather Collection', boost: 8 },
    '#mensfashion': { category: "Men's Collection", boost: 10 },
    '#womensfashion': { category: "Women's Collection", boost: 10 },
  };

  // Analyze hashtags
  const hashtags: string[] = instagramData.recentHashtags || [];
  for (const tag of hashtags) {
    const lowerTag = tag.toLowerCase();
    if (fashionTags.includes(lowerTag)) {
      fashionHashtags.push(tag);
      if (styleTagMap[lowerTag]) {
        styleKeywords.push(styleTagMap[lowerTag]);
      }
    }
    if (categoryTagMap[lowerTag]) {
      const { category, boost } = categoryTagMap[lowerTag];
      categoryBoosts[category] = (categoryBoosts[category] || 0) + boost;
    }
  }

  // Analyze captions from recent media for brand mentions
  const recentMedia = instagramData.recentMedia || [];
  for (const media of recentMedia) {
    if (media.caption) {
      const lowerCaption = media.caption.toLowerCase();
      for (const brand of brandPatterns) {
        if (lowerCaption.includes(brand)) {
          brandMentions.push(brand);
        }
      }
    }
  }

  // Deduplicate
  const uniqueStyleKeywords = [...new Set(styleKeywords)];
  const uniqueBrandMentions = [...new Set(brandMentions)];

  // Biography analysis — extract style signals from bio
  if (instagramData.biography) {
    const bio = instagramData.biography.toLowerCase();
    if (bio.includes('fashion') || bio.includes('style')) uniqueStyleKeywords.push('fashion-enthusiast');
    if (bio.includes('luxury') || bio.includes('premium')) uniqueStyleKeywords.push('luxury-oriented');
    if (bio.includes('minimal') || bio.includes('simple')) uniqueStyleKeywords.push('minimalist');
    if (bio.includes('designer') || bio.includes('brand')) uniqueStyleKeywords.push('brand-conscious');
  }

  // Follower count signals
  if (instagramData.followersCount && instagramData.followersCount > 1000) {
    uniqueStyleKeywords.push('social-influencer');
  }

  return {
    styleKeywords: uniqueStyleKeywords,
    brandMentions: uniqueBrandMentions,
    colorPreferences,
    categoryBoosts,
    fashionHashtags,
  };
}

// ─── v23: Instagram Photo VLM Analysis ───
//
// Sends Instagram post images through VLM to detect:
// - Clothing items (dresses, shirts, jackets, etc.)
// - Accessories (necklaces, watches, sunglasses, bags, etc.)
// - Dominant colors in outfits
// - Style keywords (chic, casual, formal, etc.)
// - Gender signal from visual appearance
//
// Analyzes up to 5 most recent IMAGE posts (skips videos/carousels).
// Results are merged with profile-picture VLM analysis for product scoring.

interface InstagramPhotoAnalysis {
  allClothing: string[];
  allAccessories: string[];
  dominantColors: { name: string; hex: string; percentage: number }[];
  styleKeywords: string[];
  detectedCategories: { category: string; confidence: number; source: string }[];
  genderSignal: 'male' | 'female' | null;
  photoCount: number;
}

async function analyzeInstagramPhotos(instagramData: any): Promise<InstagramPhotoAnalysis | null> {
  if (!instagramData?.recentMedia || instagramData.recentMedia.length === 0) {
    console.log('[Social Style v23] Instagram: No media to analyze');
    return null;
  }

  // Filter to IMAGE type only (skip VIDEO, CAROUSEL for VLM)
  const imageMedia = instagramData.recentMedia.filter(
    (m: any) => m.mediaType === 'IMAGE' && m.mediaUrl
  );

  if (imageMedia.length === 0) {
    console.log('[Social Style v23] Instagram: No image posts found (only videos/carousels)');
    return null;
  }

  // Analyze up to 5 most recent images
  const mediaToAnalyze = imageMedia.slice(0, 5);
  console.log('[Social Style v23] Instagram: Analyzing', mediaToAnalyze.length, 'photos with VLM');

  const IG_VLM_PROMPT = `Analyze this person's outfit and fashion style in detail. Focus on CLOTHING, ACCESSORIES, and COLORS.

Return a JSON object with EXACTLY this structure:
{
  "clothing": ["list ALL visible clothing items with colors and details, e.g., 'black silk blazer', 'white linen shirt', 'blue denim jeans'"],
  "accessories": ["list ALL visible accessories — watch, necklace, sunglasses, glasses, eyewear, bag, earrings, rings, belt, hat, scarf, etc."],
  "dominantColors": [
    {"name": "Descriptive Color Name", "hex": "#hexcode", "percentage": 35}
  ],
  "styleKeywords": ["3-5 style adjectives, e.g., 'chic', 'minimalist', 'bohemian', 'formal', 'streetwear'"],
  "gender": "male" or "female" or null,
  "detectedCategories": [
    {"category": "Category Name from this list: Designer Dresses, Gold Necklaces, Luxury Watches, Smart Watches, Premium Eyewear, Designer Handbags, Designer Bags, Fine Jewelry, Premium Shoes, Premium Leather, Silk Collection, Denim Collection, Luxury Skincare, Designer Fragrances, Artisan Perfumes, Bespoke Tailoring, Statement Accessories, Handcrafted Shoes, Diamond Collection, Luxury Gift Sets, Luxury Sleepwear, Men's Collection, Women's Collection", "confidence": 0.9}
  ]
}

CRITICAL RULES:
1. clothing: Describe EVERY visible garment with color + material if possible
2. accessories: List EVERY accessory — bags, watches, jewelry, sunglasses, belts, etc.
3. dominantColors: 3-5 dominant colors from the OUTFIT only (not background)
4. styleKeywords: 3-5 adjectives for overall fashion vibe
5. gender: Determine from visual appearance (clothing style, accessories, hair, etc.)
6. detectedCategories: Which product categories match what this person is wearing? (from the list above)
7. If no person is visible (e.g., product shot, landscape, food), set gender to null and focus on style/colors

Return ONLY the JSON. No markdown, no code fences, no extra text.`;

  const mergedResults: InstagramPhotoAnalysis = {
    allClothing: [],
    allAccessories: [],
    dominantColors: [],
    styleKeywords: [],
    detectedCategories: [],
    genderSignal: null,
    photoCount: 0,
  };

  // Track gender votes across photos
  const genderVotes: Record<string, number> = { male: 0, female: 0 };
  // Track color frequency across photos
  const colorFrequency: Record<string, { name: string; hex: string; totalPercentage: number; count: number }> = {};
  // Track category frequency
  const categoryFrequency: Record<string, { category: string; totalConfidence: number; count: number; source: string }> = {};

  for (let i = 0; i < mediaToAnalyze.length; i++) {
    const media = mediaToAnalyze[i];
    console.log(`[Social Style v29.2] Instagram: Analyzing photo ${i + 1}/${mediaToAnalyze.length}`, media.permalink || media.id);

    // v29.1: Run VLM AND pixel extraction in parallel for each Instagram photo
    // Pixel extraction = PRIMARY for colors, VLM = clothing/accessories/style/gender only
    const [vlmResult, pixelResult] = await Promise.allSettled([
      // VLM: Get clothing, accessories, style keywords, gender, categories (NOT colors)
      (async () => {
        let imageUrl = media.mediaUrl;
        try {
          const imageResponse = await fetch(media.mediaUrl, {
            signal: AbortSignal.timeout(15000),
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StyleAnalyzer/1.0)' },
          });
          if (imageResponse.ok) {
            const imageBuffer = await imageResponse.arrayBuffer();
            const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
            imageUrl = `data:${contentType};base64,${Buffer.from(imageBuffer).toString('base64')}`;
          }
        } catch (fetchError) {
          console.warn(`[Social Style v29.2] Instagram photo ${i + 1} fetch error:`, fetchError instanceof Error ? fetchError.message : String(fetchError));
        }

        const visionResult = await aiVision([
          {
            role: 'user',
            content: [
              { type: 'text', text: IG_VLM_PROMPT },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ]);
        return visionResult;
      })(),
      // Pixel extraction: Get accurate colors directly from image pixels
      extractColorsFromImagePixels(media.mediaUrl),
    ]);

    // Process VLM result
    if (vlmResult.status === 'fulfilled') {
      try {
        const visionResult = vlmResult.value;
        const rawContent = visionResult.choices?.[0]?.message?.content || '';
        let cleanedContent = rawContent.trim();
        if (cleanedContent.startsWith('```')) {
          cleanedContent = cleanedContent.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        }

        // v23.1: Robust JSON parsing for Instagram photo VLM
        let photoAnalysis: any;
        try {
          photoAnalysis = JSON.parse(cleanedContent);
        } catch {
          const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              let repaired = jsonMatch[0];
              const openB = (repaired.match(/\{/g) || []).length;
              const closeB = (repaired.match(/\}/g) || []).length;
              const openBr = (repaired.match(/\[/g) || []).length;
              const closeBr = (repaired.match(/\]/g) || []).length;
              for (let i = 0; i < openBr - closeBr; i++) repaired += ']';
              for (let i = 0; i < openB - closeB; i++) repaired += '}';
              photoAnalysis = JSON.parse(repaired);
              console.log('[Social Style v29.2] Instagram photo JSON repaired');
            } catch {
              console.warn('[Social Style v29.2] Instagram photo JSON repair failed, skipping VLM for this photo');
              photoAnalysis = null;
            }
          } else {
            photoAnalysis = null;
          }
        }

        if (photoAnalysis) {
          mergedResults.photoCount++;

          // Merge clothing
          if (photoAnalysis.clothing && Array.isArray(photoAnalysis.clothing)) {
            mergedResults.allClothing.push(...photoAnalysis.clothing);
          }

          // Merge accessories
          if (photoAnalysis.accessories && Array.isArray(photoAnalysis.accessories)) {
            mergedResults.allAccessories.push(...photoAnalysis.accessories);
            // v29.2: Detect eyewear in Instagram accessories → auto-add Premium Eyewear category
            const igAccStr = photoAnalysis.accessories.join(' ').toLowerCase();
            if (igAccStr.includes('glass') || igAccStr.includes('eyewear') || igAccStr.includes('spectacle') || igAccStr.includes('sunglass')) {
              const eyewearKey = 'Premium Eyewear';
              if (categoryFrequency[eyewearKey]) {
                categoryFrequency[eyewearKey].totalConfidence += 0.85;
                categoryFrequency[eyewearKey].count++;
              } else {
                categoryFrequency[eyewearKey] = { category: eyewearKey, totalConfidence: 0.85, count: 1, source: 'IG photo: eyewear detected' };
              }
              console.log(`[Social Style v29.2] Instagram photo ${i + 1}: eyewear detected in accessories → boosting Premium Eyewear`);
            }
          }

          // Merge style keywords
          if (photoAnalysis.styleKeywords && Array.isArray(photoAnalysis.styleKeywords)) {
            mergedResults.styleKeywords.push(...photoAnalysis.styleKeywords);
          }

          // Merge gender votes
          if (photoAnalysis.gender === 'male' || photoAnalysis.gender === 'female') {
            genderVotes[photoAnalysis.gender]++;
          }

          // v29.1: DO NOT use VLM dominantColors — pixel extraction is PRIMARY
          // If pixel extraction failed for this photo, fall back to VLM colors
          if (pixelResult.status !== 'fulfilled' || !pixelResult.value) {
            if (photoAnalysis.dominantColors && Array.isArray(photoAnalysis.dominantColors)) {
              for (const color of photoAnalysis.dominantColors) {
                const key = color.name?.toLowerCase() || color.hex;
                if (colorFrequency[key]) {
                  colorFrequency[key].totalPercentage += (color.percentage || 0);
                  colorFrequency[key].count++;
                } else {
                  colorFrequency[key] = { name: color.name, hex: color.hex, totalPercentage: color.percentage || 0, count: 1 };
                }
              }
            }
          }

          // Merge detected categories
          if (photoAnalysis.detectedCategories && Array.isArray(photoAnalysis.detectedCategories)) {
            for (const cat of photoAnalysis.detectedCategories) {
              const key = cat.category;
              if (categoryFrequency[key]) {
                categoryFrequency[key].totalConfidence += (cat.confidence || 0.5);
                categoryFrequency[key].count++;
              } else {
                categoryFrequency[key] = { category: cat.category, totalConfidence: cat.confidence || 0.5, count: 1, source: `IG photo: ${cat.category}` };
              }
            }
          }

          console.log(`[Social Style v29.2] Instagram photo ${i + 1} VLM analyzed:`, {
            clothing: photoAnalysis.clothing?.length || 0,
            accessories: photoAnalysis.accessories?.length || 0,
            gender: photoAnalysis.gender || 'unknown',
            categories: photoAnalysis.detectedCategories?.length || 0,
          });
        }
      } catch (parseError) {
        console.warn(`[Social Style v29.2] Instagram photo ${i + 1} VLM parse failed:`, parseError instanceof Error ? parseError.message : String(parseError));
      }
    } else {
      console.warn(`[Social Style v29.2] Instagram photo ${i + 1} VLM failed:`, vlmResult.reason?.message || String(vlmResult.reason));
    }

    // v29.1: Process pixel extraction result — PRIMARY color source
    if (pixelResult.status === 'fulfilled' && pixelResult.value) {
      const pixelColors = pixelResult.value;
      // Clear any VLM colors for this photo (pixel overrides)
      // Re-initialize colorFrequency if it was populated by VLM fallback
      for (const color of pixelColors) {
        const key = color.name?.toLowerCase() || color.hex;
        if (colorFrequency[key]) {
          colorFrequency[key].totalPercentage += (color.percentage || 0);
          colorFrequency[key].count++;
        } else {
          colorFrequency[key] = { name: color.name, hex: color.hex, totalPercentage: color.percentage || 0, count: 1 };
        }
      }
      if (vlmResult.status === 'fulfilled') {
        mergedResults.photoCount = Math.max(mergedResults.photoCount, 1); // At least 1 photo analyzed
      }
      console.log(`[Social Style v29.2] Instagram photo ${i + 1} pixel colors: ${pixelColors.map(c => `${c.name}(${c.percentage}%)`).join(', ')}`);
    }
  }

  // Finalize gender signal from majority vote
  if (genderVotes.male > 0 || genderVotes.female > 0) {
    mergedResults.genderSignal = genderVotes.female >= genderVotes.male ? 'female' : 'male';
  }

  // Finalize dominant colors (averaged across photos, sorted by frequency-weighted percentage)
  mergedResults.dominantColors = Object.values(colorFrequency)
    .sort((a, b) => (b.totalPercentage / b.count) - (a.totalPercentage / a.count))
    .slice(0, 6)
    .map(c => ({ name: c.name, hex: c.hex, percentage: Math.round(c.totalPercentage / c.count) }));

  // Finalize detected categories (sorted by frequency-weighted confidence)
  mergedResults.detectedCategories = Object.values(categoryFrequency)
    .sort((a, b) => (b.totalConfidence / b.count) - (a.totalConfidence / a.count))
    .slice(0, 8)
    .map(c => ({
      category: c.category,
      confidence: Math.round((c.totalConfidence / c.count) * 100) / 100,
      source: c.source,
    }));

  // Deduplicate style keywords
  mergedResults.styleKeywords = [...new Set(mergedResults.styleKeywords)];

  console.log('[Social Style v29.2] Instagram photo analysis COMPLETE:', {
    photosAnalyzed: mergedResults.photoCount,
    clothingItems: mergedResults.allClothing.length,
    accessories: mergedResults.allAccessories.length,
    styleKeywords: mergedResults.styleKeywords,
    genderSignal: mergedResults.genderSignal || 'none',
    topCategories: mergedResults.detectedCategories.slice(0, 5).map(c => `${c.category} (${c.confidence})`),
    colors: mergedResults.dominantColors.map(c => `${c.name}(${c.percentage}%)`),
    colorSource: 'PIXEL PRIMARY (VLM fallback)',
  });

  return mergedResults;
}

// ─── Birthday Utility Functions ───

function parseBirthday(birthday: string | null | undefined): Date | null {
  if (!birthday) return null;
  try {
    if (birthday.includes('/')) {
      const parts = birthday.split('/');
      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return new Date(2000, month - 1, day);
      }
    }
    if (birthday.includes('-')) {
      const parts = birthday.split('-');
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return new Date(2000, month - 1, day);
      }
    }
  } catch {}
  return null;
}

function getDaysUntilBirthday(birthday: string | null | undefined): number | null {
  const bday = parseBirthday(birthday);
  if (!bday) return null;

  const now = new Date();
  const thisYear = now.getFullYear();

  let nextBday = new Date(thisYear, bday.getMonth(), bday.getDate());

  // Compare date-only (ignore time) — fixes birthday TODAY bug
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (nextBday < todayStart) {
    nextBday = new Date(thisYear + 1, bday.getMonth(), bday.getDate());
  }

  const diffMs = nextBday.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function getAgeStyleGuidance(ageGroup: string | null): string {
  if (!ageGroup) return '';
  if (ageGroup === '18-24') return 'Recommend: Trendy, modern, youthful styles — smart casual, street luxury, bold accessories, statement pieces.';
  if (ageGroup === '25-34') return 'Recommend: Professional yet stylish — blend of formal and smart-casual, versatile luxury pieces, work-to-evening transitions.';
  if (ageGroup === '35-44') return 'Recommend: Sophisticated, refined luxury — premium quality, classic elegance, investment pieces, understated opulence.';
  if (ageGroup === '45-54') return 'Recommend: Classic luxury, timeless pieces — heritage brands, premium materials, understated elegance, refined taste.';
  if (ageGroup === '55+' || ageGroup === '55plus') return 'Recommend: Classic, timeless elegance — heritage styles, comfort luxury, premium craftsmanship, distinguished sophistication.';
  return '';
}

// ─── Fallback Analysis ───

const FALLBACK_ANALYSIS = {
  styleProfile: {
    tags: ['Classic', 'Minimalist', 'Sophisticated', 'Contemporary'],
    confidence: 0.87,
    description: 'Your style reflects a refined appreciation for timeless elegance combined with modern sensibility. You gravitate toward clean lines, premium fabrics, and understated luxury that speaks volumes without excess.',
  },
  colorPreferences: [
    { name: 'Ivory & Cream', hex: '#FFFDD0', affinity: 0.92 },
    { name: 'Deep Charcoal', hex: '#36454F', affinity: 0.88 },
    { name: 'Champagne Gold', hex: '#F7E7CE', affinity: 0.85 },
    { name: 'Slate Blue', hex: '#6A7BA2', affinity: 0.78 },
    { name: 'Burgundy', hex: '#800020', affinity: 0.72 },
    { name: 'Forest Green', hex: '#228B22', affinity: 0.65 },
  ],
  recommendedCategories: [
    { name: 'Smart Watches', match: 95, reason: 'Your modern style pairs perfectly with a sleek smartwatch' },
    { name: 'Gold Necklaces', match: 92, reason: 'A delicate gold necklace complements your elegant look' },
    { name: 'Premium Eyewear', match: 86, reason: 'Refined frames that match your sophisticated aesthetic' },
    { name: 'Luxury Watches', match: 84, reason: 'A classic timepiece elevates any ensemble' },
    { name: 'Silk & Cashmere', match: 81, reason: 'Luxury fabrics match your refined sensibility' },
    { name: 'Designer Fragrances', match: 78, reason: 'A signature scent completes the luxury experience' },
    { name: 'Premium Leather', match: 76, reason: 'Fine leather goods complement your polished look' },
    { name: 'Luxury Gift Sets', match: 74, reason: 'Curated luxury sets for the discerning individual' },
  ],
};

function generateDynamicFallback(gender: 'male' | 'female' | null): any {
  if (gender === 'male') {
    return {
      styleProfile: {
        tags: ['Classic', 'Refined', 'Sophisticated', 'Modern'],
        confidence: 0.85,
        description: 'Your style reflects a distinguished blend of classic sophistication and modern refinement. You appreciate quality craftsmanship, tailored fits, and accessories that make a subtle yet powerful statement.',
      },
      colorPreferences: [
        { name: 'Midnight Navy', hex: '#191970', affinity: 0.90 },
        { name: 'Charcoal Grey', hex: '#36454F', affinity: 0.87 },
        { name: 'Burgundy', hex: '#800020', affinity: 0.82 },
        { name: 'Camel', hex: '#C19A6B', affinity: 0.78 },
        { name: 'Ivory', hex: '#FFFFF0', affinity: 0.72 },
      ],
      recommendedCategories: [
        { name: 'Luxury Watches', match: 94, reason: 'A premium timepiece is the cornerstone of a gentleman\'s style' },
        { name: 'Bespoke Tailoring', match: 91, reason: 'Your refined taste calls for expertly tailored formal wear' },
        { name: 'Premium Leather', match: 88, reason: 'Premium leather goods complement your distinguished aesthetic' },
        { name: 'Premium Eyewear', match: 85, reason: 'Sophisticated frames that frame your professional look' },
        { name: 'Smart Watches', match: 82, reason: 'A modern smartwatch bridges your tech-savvy and elegant sides' },
        { name: 'Statement Accessories', match: 80, reason: 'Refined accessories complete the gentleman\'s ensemble' },
        { name: 'Artisan Perfumes', match: 78, reason: 'A signature scent leaves a lasting impression' },
        { name: 'Handcrafted Shoes', match: 76, reason: 'Handcrafted footwear grounds your distinguished look' },
      ],
    };
  }
  if (gender === 'female') {
    return {
      styleProfile: {
        tags: ['Elegant', 'Chic', 'Graceful', 'Timeless'],
        confidence: 0.87,
        description: 'Your style embodies graceful elegance with a modern twist. You have an eye for exquisite craftsmanship, luxurious fabrics, and accessories that enhance your natural sophistication.',
      },
      colorPreferences: [
        { name: 'Rose Gold', hex: '#B76E79', affinity: 0.92 },
        { name: 'Champagne', hex: '#F7E7CE', affinity: 0.88 },
        { name: 'Blush Pink', hex: '#FFB6C1', affinity: 0.84 },
        { name: 'Ivory', hex: '#FFFFF0', affinity: 0.79 },
        { name: 'Emerald', hex: '#046307', affinity: 0.73 },
      ],
      recommendedCategories: [
        { name: 'Designer Dresses', match: 94, reason: 'Your elegant style is perfectly complemented by our curated dress collection' },
        { name: 'Fine Jewelry', match: 92, reason: 'Exquisite jewelry enhances your natural grace' },
        { name: 'Designer Handbags', match: 89, reason: 'A luxury handbag is the finishing touch to any ensemble' },
        { name: 'Gold Necklaces', match: 86, reason: 'A beautiful gold necklace frames your elegance' },
        { name: 'Premium Eyewear', match: 83, reason: 'Chic frames that complement your sophisticated look' },
        { name: 'Designer Fragrances', match: 80, reason: 'A signature fragrance leaves an unforgettable impression' },
        { name: 'Luxury Skincare', match: 78, reason: 'Premium skincare for your refined self-care routine' },
        { name: 'Smart Watches', match: 75, reason: 'A sleek smartwatch blends technology with your modern elegance' },
      ],
    };
  }
  return FALLBACK_ANALYSIS;
}

// ─── VLM Profile Picture Analysis ───

interface VisualAnalysis {
  dominantColors: { name: string; hex: string; percentage: number }[];
  clothing: string[];
  accessories: string[];
  styleKeywords: string[];
  summary: string;
  gender?: 'male' | 'female';
  detectedItems: {
    dress: { visible: boolean; description: string; color: string; style: string } | null;
    necklace: { visible: boolean; description: string; material: string; style: string } | null;
    watch: { visible: boolean; description: string; type: string; color: string } | null;
    eyewear: { visible: boolean; description: string; frameColor: string; frameShape: string } | null;
  };
}

// ─── v27: Pixel-Based Color Extraction (works WITHOUT VLM/AI) ───
// When VLM fails (rate limits), extract colors directly from image pixels.
// Uses sharp to decode the image, then samples pixels and groups by color.

const COLOR_NAME_DB = [
  { name: 'Gold', hex: '#FFD700', r: 255, g: 215, b: 0 },
  { name: 'Amber', hex: '#FFBF00', r: 255, g: 191, b: 0 },
  { name: 'Honey', hex: '#EB9605', r: 235, g: 150, b: 5 },
  { name: 'Copper', hex: '#B87333', r: 184, g: 115, b: 51 },
  { name: 'Bronze', hex: '#CD7F32', r: 205, g: 127, b: 50 },
  { name: 'Rose Gold', hex: '#B76E79', r: 183, g: 110, b: 121 },
  { name: 'Burgundy', hex: '#800020', r: 128, g: 0, b: 32 },
  { name: 'Navy', hex: '#000080', r: 0, g: 0, b: 128 },
  { name: 'Royal Blue', hex: '#4169E1', r: 65, g: 105, b: 225 },
  { name: 'Sapphire', hex: '#0F52BA', r: 15, g: 82, b: 186 },
  { name: 'Charcoal', hex: '#36454F', r: 54, g: 69, b: 79 },
  { name: 'Silver', hex: '#C0C0C0', r: 192, g: 192, b: 192 },
  { name: 'Midnight Blue', hex: '#191970', r: 25, g: 25, b: 112 },
  { name: 'Forest Green', hex: '#228B22', r: 34, g: 139, b: 34 },
  { name: 'Emerald', hex: '#046307', r: 4, g: 99, b: 7 },
  { name: 'Teal', hex: '#008080', r: 0, g: 128, b: 128 },
  { name: 'Ivory', hex: '#FFFFF0', r: 255, g: 255, b: 240 },
  { name: 'Champagne', hex: '#F7E7CE', r: 247, g: 231, b: 206 },
  { name: 'Camel', hex: '#C19A6B', r: 193, g: 154, b: 107 },
  { name: 'Mahogany', hex: '#C04000', r: 192, g: 64, b: 0 },
  { name: 'Crimson', hex: '#DC143C', r: 220, g: 20, b: 60 },
  { name: 'Plum', hex: '#8E4585', r: 142, g: 69, b: 133 },
  { name: 'Olive', hex: '#808000', r: 128, g: 128, b: 0 },
  { name: 'Coral', hex: '#FF7F50', r: 255, g: 127, b: 80 },
  { name: 'Blush Pink', hex: '#FFB6C1', r: 255, g: 182, b: 193 },
  { name: 'Lavender', hex: '#E6E6FA', r: 230, g: 230, b: 250 },
  { name: 'Slate', hex: '#708090', r: 112, g: 128, b: 144 },
  { name: 'Rust', hex: '#B7410E', r: 183, g: 65, b: 14 },
  { name: 'Sand', hex: '#C2B280', r: 194, g: 178, b: 128 },
  { name: 'Cream', hex: '#FFFDD0', r: 255, g: 253, b: 208 },
  { name: 'Walnut', hex: '#773F1A', r: 119, g: 63, b: 26 },
  { name: 'Blush', hex: '#DE5D83', r: 222, g: 93, b: 131 },
  { name: 'Ruby', hex: '#E0115F', r: 224, g: 17, b: 95 },
  { name: 'Onyx', hex: '#353839', r: 53, g: 56, b: 57 },
  { name: 'Pearl', hex: '#EAE0C8', r: 234, g: 224, b: 200 },
  { name: 'Saffron', hex: '#F4C430', r: 244, g: 196, b: 48 },
  { name: 'Maroon', hex: '#800000', r: 128, g: 0, b: 0 },
  { name: 'Sage', hex: '#BCB88A', r: 188, g: 184, b: 138 },
  { name: 'Steel Blue', hex: '#4682B4', r: 70, g: 130, b: 180 },
  { name: 'Cognac', hex: '#9A463D', r: 154, g: 70, b: 61 },
];

function findClosestColorName(r: number, g: number, b: number): { name: string; hex: string } {
  let minDist = Infinity;
  let closest = COLOR_NAME_DB[0];
  for (const c of COLOR_NAME_DB) {
    const dist = Math.sqrt((r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2);
    if (dist < minDist) {
      minDist = dist;
      closest = c;
    }
  }
  return { name: closest.name, hex: closest.hex };
}

async function extractColorsFromImagePixels(imageUrl: string): Promise<Array<{ name: string; hex: string; percentage: number }> | null> {
  try {
    // Dynamic import of sharp (available in Node.js/Vercel)
    const sharp = await import('sharp');

    // Fetch the image
    const imageResponse = await fetch(imageUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ColorExtractor/1.0)' },
    });
    if (!imageResponse.ok) return null;

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Decode to raw pixels
    const { data, info } = await sharp.default(imageBuffer)
      .resize(200, 200, { fit: 'inside' }) // downscale for speed
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Sample pixels and group by quantized color
    const colorMap: Record<string, { totalR: number; totalG: number; totalB: number; count: number }> = {};
    let totalSampled = 0;

    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = info.channels >= 4 ? data[i + 3] : 255;

      // Skip transparent pixels (logos with transparent backgrounds)
      if (a < 100) continue;
      // Skip near-white background
      if (r > 245 && g > 245 && b > 245) continue;
      // Skip near-black (usually shadows)
      if (r < 15 && g < 15 && b < 15) continue;

      totalSampled++;

      // Quantize to nearest 32 to group similar colors
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;
      const key = `${qr},${qg},${qb}`;

      if (!colorMap[key]) colorMap[key] = { totalR: 0, totalG: 0, totalB: 0, count: 0 };
      colorMap[key].totalR += r;
      colorMap[key].totalG += g;
      colorMap[key].totalB += b;
      colorMap[key].count++;
    }

    if (totalSampled === 0) return null;

    // Sort by frequency, take top 6
    const sorted = Object.values(colorMap).sort((a, b) => b.count - a.count);

    // Group similar named colors (merge "Gold" appearing multiple times)
    const namedColors: Map<string, { name: string; hex: string; percentage: number; avgR: number; avgG: number; avgB: number }> = new Map();

    for (const entry of sorted.slice(0, 15)) {
      const avgR = Math.round(entry.totalR / entry.count);
      const avgG = Math.round(entry.totalG / entry.count);
      const avgB = Math.round(entry.totalB / entry.count);
      const { name, hex } = findClosestColorName(avgR, avgG, avgB);
      const pct = (entry.count / totalSampled) * 100;

      if (namedColors.has(name)) {
        // Merge with existing — keep the one with higher percentage
        const existing = namedColors.get(name)!;
        existing.percentage += pct;
        // Weight-average the RGB
        const totalW = existing.percentage;
        existing.avgR = Math.round((existing.avgR * (totalW - pct) + avgR * pct) / totalW);
        existing.avgG = Math.round((existing.avgG * (totalW - pct) + avgG * pct) / totalW);
        existing.avgB = Math.round((existing.avgB * (totalW - pct) + avgB * pct) / totalW);
      } else {
        namedColors.set(name, { name, hex, percentage: pct, avgR, avgG, avgB });
      }
    }

    // Return top 5-6 named colors, sorted by percentage
    const results = [...namedColors.values()]
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 6)
      .map((c, i) => ({
        name: c.name,
        hex: c.hex,
        percentage: Math.round(c.percentage),
      }));

    console.log(`[Social Style v27] Pixel color extraction: ${results.map(c => `${c.name}(${c.percentage}%)`).join(', ')}`);
    return results;
  } catch (err) {
    console.error('[Social Style v27] Pixel color extraction failed:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

async function analyzeProfilePicture(avatarUrl: string): Promise<VisualAnalysis | null> {
  try {
    console.log('[Social Style] === VLM ANALYSIS START (v20) ===');

    let imageUrl = avatarUrl;
    try {
      const imageResponse = await fetch(avatarUrl, {
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StyleAnalyzer/1.0)' },
      });
      if (imageResponse.ok) {
        const imageBuffer = await imageResponse.arrayBuffer();
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
        const base64 = `data:${contentType};base64,${Buffer.from(imageBuffer).toString('base64')}`;
        imageUrl = base64;
      }
    } catch (fetchError) {
      console.warn('[Social Style] Image fetch error:', fetchError instanceof Error ? fetchError.message : String(fetchError));
    }

    const VLM_PROMPT = `Analyze this person's fashion style in detail. You MUST detect and describe these specific items: DRESS, NECKLACE, WATCH, and EYEWEAR. You MUST also determine the person's gender.

Return a JSON object with EXACTLY this structure:
{
  "gender": "male" or "female",
  "dominantColors": [
    {"name": "Descriptive Color Name", "hex": "#hexcode", "percentage": 35}
  ],
  "clothing": ["list of clothing items visible with colors and details"],
  "accessories": ["list of ALL accessories visible — necklace, watch, glasses, earrings, rings, bags, etc."],
  "styleKeywords": ["4-6 style adjectives"],
  "summary": "1-2 sentence description of this person's overall style",
  "detectedItems": {
    "dress": { "visible": true/false, "description": "...", "color": "...", "style": "..." },
    "necklace": { "visible": true/false, "description": "...", "material": "...", "style": "..." },
    "watch": { "visible": true/false, "description": "...", "type": "...", "color": "..." },
    "eyewear": { "visible": true/false, "description": "...", "frameColor": "...", "frameShape": "..." }
  }
}

CRITICAL RULES:
0. GENDER: Look at the person's face, hair, clothing, and accessories to determine if they are "male" or "female".
   - Short hair + shirt/tie/blazer → likely MALE
   - Long hair + earrings + dress/saree → likely FEMALE
   - If wearing Indian ethnic wear: kurta/sherwani = male, saree/lehenga/salwar = female
   - Be CONFIDENT in your gender determination — this is CRITICAL for product recommendations
   - If unsure, look at multiple signals: facial features, hairstyle, clothing type, accessories (earrings vs cufflinks)
1. dominantColors: List 4-6 dominant colors from the person's OUTFIT (not background). Highest percentage = largest area.
2. detectedItems: MOST IMPORTANT. If item visible: set visible=true with full details. If not visible: set visible=false, all other fields empty "".
3. clothing: Describe ALL visible clothing items with colors, fabrics, details.
4. accessories: List EVERY accessory you can see — rings, earrings, necklaces, watches, glasses, bags, ties, cufflinks.
5. styleKeywords: 4-6 adjectives describing OVERALL fashion style.

Return ONLY the JSON. No markdown, no code fences, no extra text.`;

    const visionResult = await aiVision([
      {
        role: 'user',
        content: [
          { type: 'text', text: VLM_PROMPT },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }
    ]);

    const rawContent = visionResult.choices?.[0]?.message?.content || '';

    let cleanedContent = rawContent.trim();
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    // v23.1: Robust JSON parsing — handle truncated/malformed JSON from free models
    let analysis: VisualAnalysis;
    try {
      analysis = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.warn('[Social Style] VLM JSON parse failed, attempting repair:', parseError instanceof Error ? parseError.message : String(parseError));

      // Attempt 1: Try to find and extract just the JSON object
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          analysis = JSON.parse(jsonMatch[0]);
        } catch {
          // Attempt 2: Fix common issues — unterminated strings, truncated JSON
          let repaired = jsonMatch[0];
          // Count open vs close braces/brackets
          const openBraces = (repaired.match(/\{/g) || []).length;
          const closeBraces = (repaired.match(/\}/g) || []).length;
          const openBrackets = (repaired.match(/\[/g) || []).length;
          const closeBrackets = (repaired.match(/\]/g) || []).length;
          // Close any unclosed strings (find last " without a matching close)
          const lastQuoteIdx = repaired.lastIndexOf('"');
          const beforeLastQuote = repaired.substring(0, lastQuoteIdx);
          const quoteCount = (beforeLastQuote.match(/(?<!\\)"/g) || []).length;
          if (quoteCount % 2 === 1) {
            // Odd number of quotes before last — there's an unclosed string
            // Find the opening quote of the unclosed string
            const lastColonIdx = repaired.lastIndexOf(':', lastQuoteIdx);
            if (lastColonIdx > 0) {
              // Truncate from the key that has the broken value
              repaired = repaired.substring(0, lastColonIdx).replace(/,\s*$/, '');
            }
          }
          // Close unclosed brackets and braces
          for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += ']';
          for (let i = 0; i < openBraces - closeBraces; i++) repaired += '}';

          try {
            analysis = JSON.parse(repaired);
            console.log('[Social Style] VLM JSON repaired successfully');
          } catch (finalError) {
            console.error('[Social Style] VLM JSON repair failed, returning null');
            return null;
          }
        }
      } else {
        console.error('[Social Style] No JSON object found in VLM response');
        return null;
      }
    }

    if (!analysis.detectedItems) {
      analysis.detectedItems = { dress: null, necklace: null, watch: null, eyewear: null };
      const clothingStr = (analysis.clothing || []).join(' ').toLowerCase();
      const accessoryStr = (analysis.accessories || []).join(' ').toLowerCase();
      // v29.2: Also check ALL text combined for eyewear keywords (VLM may put glasses in clothing)
      const allTextStr = `${clothingStr} ${accessoryStr} ${(analysis.summary || '').toLowerCase()}`;

      if (clothingStr.includes('dress') || clothingStr.includes('gown') || clothingStr.includes('kaftan')) {
        analysis.detectedItems.dress = { visible: true, description: clothingStr, color: '', style: '' };
      }
      if (accessoryStr.includes('necklace') || accessoryStr.includes('pendant') || accessoryStr.includes('chain')) {
        analysis.detectedItems.necklace = { visible: true, description: accessoryStr, material: '', style: '' };
      }
      if (accessoryStr.includes('watch') || accessoryStr.includes('smartwatch')) {
        analysis.detectedItems.watch = { visible: true, description: accessoryStr, type: '', color: '' };
      }
      // v29.2: Broader eyewear detection — check combined text, not just accessories
      if (allTextStr.includes('glass') || allTextStr.includes('eyewear') || allTextStr.includes('spectacle') || allTextStr.includes('sunglass')) {
        // Try to extract frame details from the text
        let frameColor = '';
        let frameShape = '';
        if (allTextStr.includes('black frame') || allTextStr.includes('black-frame')) frameColor = 'black';
        else if (allTextStr.includes('gold frame') || allTextStr.includes('gold-frame') || allTextStr.includes('gold wire')) frameColor = 'gold';
        else if (allTextStr.includes('tortoise') || allTextStr.includes('tortoiseshell')) frameColor = 'tortoise';
        else if (allTextStr.includes('silver frame') || allTextStr.includes('wire frame')) frameColor = 'silver';
        else if (allTextStr.includes('brown frame')) frameColor = 'brown';
        if (allTextStr.includes('round')) frameShape = 'round';
        else if (allTextStr.includes('rectangular') || allTextStr.includes('square')) frameShape = 'rectangular';
        else if (allTextStr.includes('aviator')) frameShape = 'aviator';
        else if (allTextStr.includes('cat-eye') || allTextStr.includes('cateye')) frameShape = 'cat-eye';
        else if (allTextStr.includes('wayfarer')) frameShape = 'wayfarer';
        const eyewearDesc = allTextStr.includes('sunglass') ? 'sunglasses' : allTextStr.includes('eyeglass') || allTextStr.includes('glasses') ? 'glasses' : 'eyewear';
        analysis.detectedItems.eyewear = { visible: true, description: eyewearDesc, frameColor, frameShape };
        console.log(`[Social Style v29.2] Eyewear auto-detected from text: ${eyewearDesc}, frame: ${frameColor} ${frameShape}`);
      }
    }

    if (!analysis.gender) {
      const clothingStr = (analysis.clothing || []).join(' ').toLowerCase();
      const accessoryStr = (analysis.accessories || []).join(' ').toLowerCase();
      if (clothingStr.includes('dress') || clothingStr.includes('saree') || clothingStr.includes('lehenga') ||
          accessoryStr.includes('necklace') || accessoryStr.includes('pendant') || accessoryStr.includes('earring')) {
        analysis.gender = 'female';
      } else if (clothingStr.includes('shirt') || clothingStr.includes('blazer') || clothingStr.includes('suit') ||
                 accessoryStr.includes('cufflink') || accessoryStr.includes('tie')) {
        analysis.gender = 'male';
      }
    }

    console.log('[Social Style] === VLM ANALYSIS SUCCESS (v20) ===');
    console.log('[Social Style] Gender:', analysis.gender || 'UNKNOWN');
    return analysis;
  } catch (error) {
    console.error('[Social Style] === VLM ANALYSIS FAILED ===');
    console.error('[Social Style] Error:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

// ─── Map unknown category to closest available ───

function mapToAvailableCategory(unknownCategory: string, dynamicCategories?: string[]): string {
  const availableCats = dynamicCategories && dynamicCategories.length > 0 ? dynamicCategories : Object.keys(AI_CATEGORY_TO_SLUGS);
  const lower = unknownCategory.toLowerCase();
  for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const isMatch = keywords.some(kw => lower.includes(kw) || kw.split(' ')[0] === lower.split(' ')[0]);
    if (isMatch && availableCats.some(ac => ac.toLowerCase() === catName.toLowerCase())) return catName;
  }
  const words = lower.split(/\s+/);
  for (const word of words) {
    if (word.length < 3) continue;
    for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(kw => kw.includes(word) || word.includes(kw)) && availableCats.some(ac => ac.toLowerCase() === catName.toLowerCase())) return catName;
    }
  }
  // Default: pick first male-appropriate category for male, first female for female
  return 'Luxury Watches';
}

// ─── Build product recommendations (v20: gender + birthday + YouTube) ───

// v29: Color matching — compare user's preferred colors with product colors
// Returns a score 0-100 indicating how well the product colors match the user's preferences
function calculateColorMatchScore(
  userColors: Array<{ name: string; hex: string; percentage?: number; affinity?: number }> | undefined,
  productColors: Array<{ name: string; hex: string; percentage: number }> | undefined
): number {
  if (!userColors || userColors.length === 0 || !productColors || productColors.length === 0) return 50; // neutral — no data

  let totalScore = 0;
  let totalWeight = 0;

  for (const userColor of userColors) {
    // Weight by user's color preference strength (percentage or affinity)
    const userWeight = userColor.percentage || (userColor.affinity ? userColor.affinity * 100 : 50);
    totalWeight += userWeight;
    let bestMatchForThisColor = 0;

    for (const prodColor of productColors) {
      // 1. Exact name match (e.g., both are "Navy") → 100%
      if (userColor.name.toLowerCase() === prodColor.name.toLowerCase()) {
        bestMatchForThisColor = 100;
        break; // Can't beat exact match
      }

      // 2. Hex distance — how close are the colors in RGB space?
      const userHex = hexToRgb(userColor.hex);
      const prodHex = hexToRgb(prodColor.hex);
      if (userHex && prodHex) {
        const dist = Math.sqrt(
          (userHex.r - prodHex.r) ** 2 +
          (userHex.g - prodHex.g) ** 2 +
          (userHex.b - prodHex.b) ** 2
        );
        // Max possible distance = ~441 (black to white)
        // < 50 = very close (same color family), < 100 = similar shade
        // < 150 = related color family, > 200 = different colors
        if (dist < 50) bestMatchForThisColor = Math.max(bestMatchForThisColor, 90);
        else if (dist < 80) bestMatchForThisColor = Math.max(bestMatchForThisColor, 75);
        else if (dist < 120) bestMatchForThisColor = Math.max(bestMatchForThisColor, 50);
        else if (dist < 180) bestMatchForThisColor = Math.max(bestMatchForThisColor, 25);
        else bestMatchForThisColor = Math.max(bestMatchForThisColor, 0);
      }
    }

    totalScore += bestMatchForThisColor * userWeight;
  }

  if (totalWeight === 0) return 50;
  return Math.round(totalScore / totalWeight); // 0-100
}

// Helper: hex string to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

function buildProductRecommendations(
  aiResponse: any,
  recommendedCategories: { name: string; match: number; reason: string }[],
  visualAnalysis?: VisualAnalysis | null,
  gender?: 'male' | 'female' | null,
  isNearBirthday?: boolean,
  isBirthdayToday?: boolean,
  daysUntilBirthday?: number | null,
  youtubeCategoryBoosts?: Record<string, number>,
  instagramStyleSignals?: { styleKeywords: string[]; brandMentions: string[]; fashionHashtags: string[]; categoryBoosts: Record<string, number> } | null,
  instagramPhotoAnalysis?: InstagramPhotoAnalysis | null,
  allProducts?: StyleProduct[], // v24: dynamic products from DB + Shopify
  dynamicCategories?: string[], // v24: dynamic category list
  userColorPreferences?: Array<{ name: string; hex: string; affinity: number }>, // v29: user colors for matching
): any[] {
  const productCatalog = allProducts && allProducts.length > 0 ? allProducts : FALLBACK_PRODUCT_CATALOG;
  const availableCats = dynamicCategories && dynamicCategories.length > 0 ? dynamicCategories : Object.keys(AI_CATEGORY_TO_SLUGS);

  const aiCategories: { category: string; reason: string }[] = [];

  if (Array.isArray(aiResponse?.recommendedProducts)) {
    for (const rp of aiResponse.recommendedProducts.slice(0, 10)) {
      const catName = String(rp.category || '');
      const validatedCat = availableCats.some(ac => ac.toLowerCase() === catName.toLowerCase())
        ? catName
        : mapToAvailableCategory(catName, availableCats);
      aiCategories.push({ category: validatedCat, reason: String(rp.reason || 'Matches your style profile') });
    }
  }

  if (aiCategories.length === 0 && recommendedCategories.length > 0) {
    for (const rc of recommendedCategories) {
      aiCategories.push({ category: rc.name, reason: rc.reason });
    }
  }

  if (aiCategories.length === 0) {
    const fallback = generateDynamicFallback(gender || null);
    for (const fc of fallback.recommendedCategories) {
      aiCategories.push({ category: fc.name, reason: fc.reason });
    }
  }

  if (isNearBirthday) {
    const existingCats = new Set(aiCategories.map(ac => ac.category.toLowerCase()));
    if (!existingCats.has('luxury gift sets') && !existingCats.has('corporate gifts') && !existingCats.has('couple gifts')) {
      aiCategories.unshift({
        category: 'Corporate Gifts',
        reason: isBirthdayToday
          ? 'A perfect birthday gift to celebrate your special day!'
          : `Your birthday is in ${daysUntilBirthday} days — treat yourself!`,
      });
    }
  }

  if (visualAnalysis?.detectedItems) {
    const di = visualAnalysis.detectedItems;
    const existingCats = new Set(aiCategories.map(ac => ac.category.toLowerCase()));

    if (di.dress?.visible && !existingCats.has('designer dresses') && !existingCats.has('designer sarees') && gender !== 'male') {
      aiCategories.unshift({ category: 'Designer Sarees', reason: `Your ${di.dress.style || ''} attire matches our curated collection` });
    }
    if (di.necklace?.visible && !existingCats.has('gold necklaces') && !existingCats.has('fine jewelry')) {
      aiCategories.unshift({ category: 'Fine Jewelry', reason: `Your ${di.necklace.material || 'gold'} necklace complements our jewelry collection` });
    }
    if (di.watch?.visible) {
      const watchCat = (di.watch.type?.toLowerCase().includes('smart') || di.watch.type?.toLowerCase().includes('digital') || di.watch.type?.toLowerCase().includes('fitness'))
        ? 'Smart Watches'
        : 'Luxury Watches';
      if (!existingCats.has(watchCat.toLowerCase())) {
        aiCategories.unshift({ category: watchCat, reason: `Your ${di.watch.type || ''} watch style matches our ${watchCat.toLowerCase()} collection` });
      }
    }
    if (di.eyewear?.visible) {
      // v29.2: FORCE Premium Eyewear — remove any AI category that's about eyewear but wrong name
      // (e.g., AI returns "Statement Accessories" with eyewear reason → replace with Premium Eyewear)
      const eyewearAliases = ['statement accessories', 'accessories'];
      const eyewearReasonKeywords = ['eyewear', 'glasses', 'frame', 'spectacle'];
      for (let j = aiCategories.length - 1; j >= 0; j--) {
        const cat = aiCategories[j];
        const catLower = cat.category.toLowerCase();
        const reasonLower = cat.reason.toLowerCase();
        // If AI put eyewear under wrong category name (e.g., Statement Accessories), REMOVE it
        if (eyewearAliases.includes(catLower) && eyewearReasonKeywords.some(kw => reasonLower.includes(kw))) {
          console.log(`[Social Style v29.2] Replacing AI category "${cat.category}" (eyewear reason) with Premium Eyewear`);
          aiCategories.splice(j, 1);
        }
      }
      if (!existingCats.has('premium eyewear')) {
        const frameDesc = [di.eyewear.frameColor, di.eyewear.frameShape].filter(Boolean).join(' ');
        aiCategories.unshift({ category: 'Premium Eyewear', reason: `Your ${frameDesc || ''} ${di.eyewear.description || 'eyewear'} matches our collection` });
      }
    }
  }

  // v25 FIX: Deduplicate categories before slicing — prevents same category appearing multiple times
  const dedupedCategories: { category: string; reason: string }[] = [];
  const seenCats = new Set<string>();
  for (const ac of aiCategories) {
    const key = ac.category.toLowerCase();
    if (!seenCats.has(key)) {
      seenCats.add(key);
      dedupedCategories.push(ac);
    }
  }
  const finalCategories = dedupedCategories.slice(0, 8);

  // Gender-appropriate product categories — v25: expanded with more categories
  const maleOnlyCategories = ['Bespoke Tailoring', 'Statement Accessories', "Men's Shirts", 'Handcrafted Shoes', 'Premium Leather', 'Corporate Gifts'];
  const femaleOnlyCategories = ['Designer Dresses', 'Designer Handbags', 'Fine Jewelry', 'Designer Sarees', 'Diamond Collection', 'Gemstone Jewelry', 'Gold Necklaces', 'Bridal Collection', 'Silk Collection', 'Luxury Skincare'];

  // v26.1: Product-level gender filter — 8 layers including name-level gender words
  const isGenderInappropriate = (product: StyleProduct): boolean => {
    // ─── Layer 0: Name-level GENDER WORDS check (v26.1 — catches "Women", "Ladies" in name) ───
    // Uses regex word boundaries so "Women" doesn't falsely match "men" (woMEN)
    const nameLc = product.name.toLowerCase();
    if (gender === 'male') {
      // Female gender words in product name → block for male users
      const hasFemaleNameWord = /\b(women|women's?|ladies|lady|girls?|girl's|bride|bridal|feminine|queen|goddess|madame)\b/.test(nameLc);
      // Male gender words → allow (product is for men)
      const hasMaleNameWord = /\b(men|men's?|mens|gentleman|boys?|boy's|sir|lord|king|mr)\b/.test(nameLc);
      if (hasFemaleNameWord && !hasMaleNameWord) return true;
    }
    if (gender === 'female') {
      const hasMaleNameWord = /\b(men|men's?|mens|gentleman|boys?|boy's|sir|lord|king)\b/.test(nameLc);
      const hasFemaleNameWord = /\b(women|women's?|ladies|lady|girls?|girl's|queen)\b/.test(nameLc);
      if (hasMaleNameWord && !hasFemaleNameWord) return true;
    }

    // ─── Layer 1: Category-level blocking (most reliable for category-level) ───
    if (gender === 'male' && femaleOnlyCategories.some(fc => product.category === fc || product.categorySlug?.toLowerCase().includes(fc.toLowerCase().replace(/[\s']/g, '-')))) return true;
    if (gender === 'female' && maleOnlyCategories.some(mc => product.category === mc || product.categorySlug?.toLowerCase().includes(mc.toLowerCase().replace(/[\s']/g, '-')))) return true;

    // ─── Layer 2: recipientTypes field ───
    const rTypes = product.recipientTypes || [];
    if (gender === 'male' && rTypes.includes('her') && !rTypes.includes('him') && !rTypes.includes('couple')) return true;
    if (gender === 'female' && rTypes.includes('him') && !rTypes.includes('her') && !rTypes.includes('couple')) return true;

    // ─── Layer 3: Explicit gender field ───
    if (gender === 'male' && product.gender === 'female') return true;
    if (gender === 'female' && product.gender === 'male') return true;

    // ─── Layer 4: Tags-based gender detection (v26.1: regex word boundaries) ───
    // Tags often contain "women", "her", "bridal", "ladies", "girls" etc.
    const tagStr = (product.tags || []).join(' ').toLowerCase();
    if (gender === 'male') {
      const hasFemaleTag = /\b(women|women's?|ladies|lady|girls?|girl's|bridal|bride|feminine|wifey|missy|girly)\b/.test(tagStr);
      const hasMaleTag = /\b(men|men's?|mens|gentleman|unisex|him|boys?|male)\b/.test(tagStr);
      if (hasFemaleTag && !hasMaleTag) return true;
    }
    if (gender === 'female') {
      const hasMaleTag = /\b(men|men's?|mens|gentleman|him|boys?|masculine|male)\b/.test(tagStr);
      const hasFemaleTag = /\b(women|women's?|ladies|her|unisex|girls?|female)\b/.test(tagStr);
      if (hasMaleTag && !hasFemaleTag) return true;
    }

    // ─── Layer 5: Description-based gender detection ───
    // Product descriptions often mention "perfect for her", "women's collection", etc.
    const descLc = (product.description || '').toLowerCase();
    if (descLc.length > 10) {
      if (gender === 'male') {
        const femaleDescSignals = ['for her', 'for women', "women's", 'ladies', 'feminine', 'bride', 'bridal', 'she will love', 'perfect for her', 'her wardrobe', 'her collection', 'her style', 'elegant woman', 'queen', 'goddess', 'sheer elegance', 'graceful silhouette'];
        const maleDescSignals = ['for him', 'for men', "men's", 'gentleman', 'masculine', 'his wardrobe', 'his collection', 'his style', 'modern man'];
        const hasFemaleDesc = femaleDescSignals.some(p => descLc.includes(p));
        const hasMaleDesc = maleDescSignals.some(p => descLc.includes(p));
        if (hasFemaleDesc && !hasMaleDesc) return true;
      }
      if (gender === 'female') {
        const maleDescSignals = ['for him', 'for men', "men's", 'gentleman', 'masculine', 'his wardrobe'];
        const femaleDescSignals = ['for her', 'for women', "women's", 'ladies', 'feminine'];
        const hasMaleDesc = maleDescSignals.some(p => descLc.includes(p));
        const hasFemaleDesc = femaleDescSignals.some(p => descLc.includes(p));
        if (hasMaleDesc && !hasFemaleDesc) return true;
      }
    }

    // ─── Layer 6: Name patterns — product-type words that are exclusively female ───
    if (gender === 'male' && (
      nameLc.includes('earring') || nameLc.includes('bangle') || nameLc.includes('saree') ||
      nameLc.includes('sari') || nameLc.includes('lehenga') || nameLc.includes('bracelet') ||
      nameLc.includes('handbag') || nameLc.includes('clutch') || nameLc.includes('pendant necklace') ||
      nameLc.includes('lipstick') || nameLc.includes('heels') || nameLc.includes('pump') ||
      nameLc.includes('gown') || nameLc.includes('kundan') ||
      nameLc.includes('necklace') || nameLc.includes('maang') || nameLc.includes('mangalsutra') ||
      nameLc.includes('anklet') || nameLc.includes('brooch') || nameLc.includes('cosmetic') ||
      nameLc.includes('salwar') || nameLc.includes('anarkali') || nameLc.includes('dupatta') ||
      nameLc.includes('lip gloss') || nameLc.includes('mascara') || nameLc.includes('hand cream') ||
      nameLc.includes('pashmina') || nameLc.includes('wrap dress') || nameLc.includes('kaftan') ||
      nameLc.includes('choli') || nameLc.includes('pallu') || nameLc.includes('polki') ||
      nameLc.includes('jhumka') || nameLc.includes('nath') || nameLc.includes('churidar') ||
      nameLc.includes('padded') || nameLc.includes('thong') || nameLc.includes('bralette') ||
      nameLc.includes('camisole') || nameLc.includes('petticoat') || nameLc.includes('halter') ||
      nameLc.includes('maxi dress') || nameLc.includes('sheath dress') || nameLc.includes('skirt') ||
      nameLc.includes('tote') || nameLc.includes('pouch') || nameLc.includes('sling bag') ||
      nameLc.includes('shoulder bag') || nameLc.includes('satchel') || nameLc.includes('makeup') ||
      nameLc.includes('nail polish') || nameLc.includes('foundation') || nameLc.includes('concealer') ||
      nameLc.includes('blush') || nameLc.includes('eyeshadow') || nameLc.includes('highlighter') ||
      nameLc.includes('corset') || nameLc.includes('bikini') || nameLc.includes('crop top')
    )) return true;
    if (gender === 'female' && (
      nameLc.includes('cufflink') || nameLc.includes('tie pin') || nameLc.includes('oxford') ||
      nameLc.includes('briefcase') || nameLc.includes('bow tie') || nameLc.includes('suspenders')
    )) return true;

    // ─── Layer 7: Null/unknown gender safety — block obviously female products ───
    if (!gender || gender === 'male') {
      const obviousFemalePatterns = ['bridal', 'saree', 'sari', 'lehenga', 'gown', 'kundan', 'anarkali', 'salwar', 'dupatta', 'choli', 'jhumka', 'mangalsutra', 'maang', 'polki', 'nath'];
      if (obviousFemalePatterns.some(p => nameLc.includes(p) || tagStr.includes(p) || descLc.includes(p))) return true;
    }

    return false;
  };

  // v24: Build product list from real DB/Shopify products
  const products: any[] = [];
  const usedProductIds = new Set<string>();

  const calculateMatchScore = (product: StyleProduct, aiCat: { category: string; reason: string }, baseScore: number): { score: number; colorMatch: number } => {
    let matchScore = baseScore;
    let colorMatchPct = 50; // neutral default

    // Gender penalty
    if (gender === 'male' && femaleOnlyCategories.includes(product.category)) matchScore -= 30;
    if (gender === 'female' && maleOnlyCategories.includes(product.category)) matchScore -= 30;
    if (isGenderInappropriate(product)) matchScore -= 40;

    // YouTube category boost
    if (youtubeCategoryBoosts && youtubeCategoryBoosts[product.category]) {
      matchScore += youtubeCategoryBoosts[product.category];
    }
    // Instagram TEXT category boost
    if (instagramStyleSignals?.categoryBoosts && instagramStyleSignals.categoryBoosts[product.category]) {
      matchScore += instagramStyleSignals.categoryBoosts[product.category];
    }
    // Instagram PHOTO VLM category boost
    if (instagramPhotoAnalysis?.detectedCategories) {
      const igPhotoCat = instagramPhotoAnalysis.detectedCategories.find(c => c.category === product.category);
      if (igPhotoCat) {
        matchScore += Math.round(igPhotoCat.confidence * 12);
      }
    }

    // v29: Color match scoring — compare user's preferred colors with product image colors
    if (userColorPreferences && userColorPreferences.length > 0 && product.colors && product.colors.length > 0) {
      colorMatchPct = calculateColorMatchScore(userColorPreferences, product.colors);
      // Color match affects score: 30% weight
      // colorMatchPct 0-100 → adjust matchScore by -15 to +15
      const colorAdjust = Math.round((colorMatchPct - 50) * 0.3); // -15 to +15
      matchScore += colorAdjust;
    }

    return { score: Math.min(99, Math.max(50, matchScore)), colorMatch: colorMatchPct };
  };

  for (const aiCat of finalCategories) {
    // Try exact category match first
    let categoryProducts = productCatalog.filter(p => p.category === aiCat.category);

    // If no exact match, try matching via slug mapping
    if (categoryProducts.length === 0) {
      const slugs = AI_CATEGORY_TO_SLUGS[aiCat.category];
      if (slugs) {
        categoryProducts = productCatalog.filter(p => slugs.includes(p.categorySlug));
      }
    }

    // If still no match, try mapped category
    if (categoryProducts.length === 0) {
      const mappedCat = mapToAvailableCategory(aiCat.category, availableCats);
      const mappedSlugs = AI_CATEGORY_TO_SLUGS[mappedCat];
      if (mappedSlugs) {
        categoryProducts = productCatalog.filter(p => mappedSlugs.includes(p.categorySlug) || p.category === mappedCat);
      }
    }

    if (categoryProducts.length === 0) continue;

    // Pick up to 2 products from category (shuffle for variety, filter gender-inappropriate)
    // v29: Sort by color match score first (best color-matched products prioritized)
    const genderFiltered = categoryProducts
      .filter(p => !usedProductIds.has(p.id) && !isGenderInappropriate(p));

    // v29: Pre-score all products by color match so we can pick the best-matching ones
    const scoredProducts = genderFiltered.map(p => {
      const colorScore = (userColorPreferences && userColorPreferences.length > 0 && p.colors && p.colors.length > 0)
        ? calculateColorMatchScore(userColorPreferences, p.colors)
        : 50;
      return { product: p, colorScore };
    });

    // Sort: highest color match first, with some randomness for variety
    scoredProducts.sort((a, b) => (b.colorScore + Math.random() * 20) - (a.colorScore + Math.random() * 20));
    const picks = scoredProducts.slice(0, Math.min(2, scoredProducts.length));

    for (let i = 0; i < picks.length; i++) {
      const { product, colorScore } = picks[i];
      const baseScore = i === 0 ? 75 + Math.floor(Math.random() * 20) : 65 + Math.floor(Math.random() * 15);
      const { score: matchScore, colorMatch } = calculateMatchScore(product, aiCat, baseScore);
      usedProductIds.add(product.id);

      // v29: Build reason that includes color match info
      // v29.2: FIX — don't carry eyewear reasons to non-eyewear products
      let reason = aiCat.reason;
      const eyewearKw = ['eyewear', 'glasses', 'frame', 'spectacle', 'sunglass'];
      if (product.category !== 'Premium Eyewear' && eyewearKw.some(kw => reason.toLowerCase().includes(kw))) {
        // This product is NOT eyewear but has eyewear reason → replace with category-appropriate reason
        reason = `Matches your ${gender === 'male' ? 'refined gentleman' : 'elegant feminine'} style`;
      }
      if (colorMatch >= 70 && userColorPreferences && userColorPreferences.length > 0) {
        // Find which user colors match this product
        const matchingColorNames: string[] = [];
        for (const uc of userColorPreferences) {
          if (product.colors?.some(pc => pc.name.toLowerCase() === uc.name.toLowerCase() || (hexToRgb(uc.hex) && hexToRgb(pc.hex) && Math.sqrt((hexToRgb(uc.hex)!.r - hexToRgb(pc.hex)!.r) ** 2 + (hexToRgb(uc.hex)!.g - hexToRgb(pc.hex)!.g) ** 2 + (hexToRgb(uc.hex)!.b - hexToRgb(pc.hex)!.b) ** 2) < 100))) {
            matchingColorNames.push(uc.name);
          }
        }
        if (matchingColorNames.length > 0) {
          reason += ` — matches your ${matchingColorNames.slice(0, 3).join(' & ')} palette`;
        }
      }

      products.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category,
        matchScore,
        reason,
        colorMatch,     // v29: color match percentage (0-100)
        productColors: product.colors?.slice(0, 3).map(c => ({ name: c.name, hex: c.hex })),  // v29: show product colors
      });
    }
  }

  // Sort by match score (highest first), cap at 8
  products.sort((a, b) => b.matchScore - a.matchScore);

  return products.slice(0, 8);
}

// ─── Build Profile Summary ───

function buildProfileSummary(
  networks: string[],
  googleData: any, facebookData: any, linkedinData: any, instagramData: any,
  visualAnalysis: VisualAnalysis | null,
  gender: 'male' | 'female' | null,
  birthday: string | null, ageGroup: string | null,
  daysUntilBirthday: number | null,
  instagramPhotoAnalysis: InstagramPhotoAnalysis | null = null
): string {
  const parts: string[] = [];

  if (gender) parts.push(`Gender: ${gender}`);
  if (ageGroup) parts.push(`Age Group: ${ageGroup}`);
  if (birthday) parts.push(`Birthday: ${birthday} (${daysUntilBirthday !== null ? `${daysUntilBirthday} days away` : 'date known'})`);

  if (googleData?.profile?.name) parts.push(`Name: ${googleData.profile.name}`);
  if (facebookData?.profile?.name) parts.push(`Facebook: ${facebookData.profile.name}`);
  if (linkedinData?.profile?.name) parts.push(`LinkedIn: ${linkedinData.profile.name}`);

  // v22: Include Instagram profile data (TEXT signals)
  if (instagramData?.username) {
    parts.push(`Instagram: @${instagramData.username}`);
    if (instagramData.biography) parts.push(`IG Bio: ${instagramData.biography.substring(0, 200)}`);
    if (instagramData.followersCount) parts.push(`IG Followers: ${instagramData.followersCount}`);
    if (instagramData.mediaCount) parts.push(`IG Posts: ${instagramData.mediaCount}`);
    if (instagramData.recentHashtags?.length) parts.push(`IG Hashtags: ${instagramData.recentHashtags.slice(0, 15).join(', ')}`);
    if (instagramData.recentMedia?.length) {
      const captions = instagramData.recentMedia
        .filter((m: any) => m.caption)
        .slice(0, 5)
        .map((m: any) => m.caption.substring(0, 100));
      if (captions.length) parts.push(`IG Recent Captions: ${captions.join(' | ')}`);
    }
  }

  // v23: Include Instagram photo VLM analysis (VISUAL signals)
  if (instagramPhotoAnalysis && instagramPhotoAnalysis.photoCount > 0) {
    parts.push(`=== INSTAGRAM PHOTO ANALYSIS (${instagramPhotoAnalysis.photoCount} photos analyzed by VLM) ===`);
    if (instagramPhotoAnalysis.allClothing.length > 0) {
      parts.push(`IG Photo Clothing: ${[...new Set(instagramPhotoAnalysis.allClothing)].slice(0, 15).join(', ')}`);
    }
    if (instagramPhotoAnalysis.allAccessories.length > 0) {
      parts.push(`IG Photo Accessories: ${[...new Set(instagramPhotoAnalysis.allAccessories)].slice(0, 10).join(', ')}`);
    }
    if (instagramPhotoAnalysis.dominantColors.length > 0) {
      parts.push(`IG Photo Colors: ${instagramPhotoAnalysis.dominantColors.map(c => c.name).join(', ')}`);
    }
    if (instagramPhotoAnalysis.styleKeywords.length > 0) {
      parts.push(`IG Photo Style: ${instagramPhotoAnalysis.styleKeywords.join(', ')}`);
    }
    if (instagramPhotoAnalysis.detectedCategories.length > 0) {
      parts.push(`IG Photo Detected Categories: ${instagramPhotoAnalysis.detectedCategories.map(c => `${c.category} (${Math.round(c.confidence * 100)}%)`).join(', ')}`);
    }
  }

  if (visualAnalysis) {
    if (visualAnalysis.styleKeywords?.length) parts.push(`Profile Style: ${visualAnalysis.styleKeywords.join(', ')}`);
    if (visualAnalysis.clothing?.length) parts.push(`Profile Wearing: ${visualAnalysis.clothing.join(', ')}`);
    if (visualAnalysis.accessories?.length) parts.push(`Profile Accessories: ${visualAnalysis.accessories.join(', ')}`);
    if (visualAnalysis.dominantColors?.length) parts.push(`Profile Colors: ${visualAnalysis.dominantColors.map(c => c.name).join(', ')}`);
  }

  return parts.join('\n');
}

// ─── Generate Enhanced Fallback ───

function generateEnhancedFallback(
  visualAnalysis: VisualAnalysis | null,
  gender: 'male' | 'female' | null,
  isNearBirthday: boolean,
  isBirthdayToday: boolean
): any {
  const base = generateDynamicFallback(gender);

  const categories = [...base.recommendedCategories];

  if (visualAnalysis?.detectedItems) {
    const di = visualAnalysis.detectedItems;
    if (di.dress?.visible && gender !== 'male') {
      categories.unshift({ name: 'Designer Dresses', match: 94, reason: 'Your dress matches our collection' });
    }
    if (di.necklace?.visible) {
      categories.unshift({ name: 'Gold Necklaces', match: 93, reason: 'Your necklace complements our collection' });
    }
    if (di.watch?.visible) {
      const isSmart = di.watch.type?.toLowerCase().includes('smart') || di.watch.type?.toLowerCase().includes('digital');
      categories.unshift({ name: isSmart ? 'Smart Watches' : 'Luxury Watches', match: 92, reason: 'Your watch style matches our collection' });
    }
    if (di.eyewear?.visible) {
      // v29.2: Higher match score for eyewear detection (was 91, now 95)
      const frameDesc = [di.eyewear.frameColor, di.eyewear.frameShape].filter(Boolean).join(' ');
      categories.unshift({ name: 'Premium Eyewear', match: 95, reason: `Your ${frameDesc || ''} eyewear matches our collection` });
    }
  }

  if (isNearBirthday) {
    categories.unshift({
      name: 'Luxury Gift Sets',
      match: isBirthdayToday ? 95 : 88,
      reason: isBirthdayToday ? 'Birthday today — perfect gift!' : 'Birthday approaching — treat yourself!',
    });
  }

  return {
    ...base,
    recommendedCategories: categories.slice(0, 8),
  };
}

// ============================================================
// Main POST Handler — v20: YouTube-Enhanced
// ============================================================

export async function POST(request: NextRequest) {
  const debugTrace: string[] = [];
  let detectedGender: 'male' | 'female' | null = null; // Hoisted so catch block can access it

  try {
    const body = await request.json();
    const {
      networks, googleData, facebookData, linkedinData, instagramData,
      googleAccessToken, // v20 NEW: Google OAuth token with youtube.readonly scope
    } = body;

    console.log('[Social Style] === REQUEST (v20: YouTube-Enhanced) ===');
    console.log('[Social Style] Networks:', networks);
    console.log('[Social Style v20] Has Google access token:', !!googleAccessToken);

    // ─── Step 1: VLM analysis of profile picture ───
    const avatarUrls: string[] = [];
    if (googleData?.profile?.avatar) avatarUrls.push(googleData.profile.avatar);
    if (facebookData?.profile?.avatar) avatarUrls.push(facebookData.profile.avatar);
    if (linkedinData?.profile?.avatar) avatarUrls.push(linkedinData.profile.avatar);

    // v29.1: Run VLM analysis and pixel extraction IN PARALLEL
    // Pixel extraction is now PRIMARY for colors (more accurate, never rate-limited)
    // VLM is used for gender/clothing/accessory/style detection (NOT for colors)
    let visualAnalysis: VisualAnalysis | null = null;
    let pixelExtractedColors: Array<{ name: string; hex: string; percentage: number }> | null = null;

    if (avatarUrls.length > 0) {
      // Run both VLM and pixel extraction concurrently
      const [vlmResult, pixelResult] = await Promise.allSettled([
        analyzeProfilePicture(avatarUrls[0]),
        extractColorsFromImagePixels(avatarUrls[0]),
      ]);

      visualAnalysis = vlmResult.status === 'fulfilled' ? vlmResult.value : null;
      pixelExtractedColors = pixelResult.status === 'fulfilled' ? pixelResult.value : null;

      debugTrace.push(`VLM: ${visualAnalysis ? 'SUCCESS (gender/clothing/style)' : 'FAILED'}`);
      debugTrace.push(`PixelColors: ${pixelExtractedColors ? pixelExtractedColors.map(c => c.name).join(',') : 'FAILED'}`);

      // v29.1: PIXEL EXTRACTION IS PRIMARY FOR COLORS
      // If VLM succeeded but pixel extraction also worked,
      // REPLACE VLM colors with pixel-extracted colors (more accurate)
      if (pixelExtractedColors && pixelExtractedColors.length > 0) {
        if (visualAnalysis) {
          // VLM worked → keep gender/clothing/accessory/style, but OVERRIDE colors with pixel data
          const oldVlmColors = visualAnalysis.dominantColors?.map(c => c.name).join(', ') || 'none';
          visualAnalysis.dominantColors = pixelExtractedColors;
          console.log(`[Social Style v29.2] Colors: Pixel PRIMARY (replaced VLM colors: ${oldVlmColors} → Pixel: ${pixelExtractedColors.map(c => c.name).join(', ')})`);
          debugTrace.push(`Colors: PIXEL PRIMARY (${pixelExtractedColors.length} colors, replaced VLM colors)`);
        }
        // If VLM failed → pixel colors will be used directly via pixelExtractedColors
        console.log(`[Social Style v29.2] Pixel colors: ${pixelExtractedColors.map(c => `${c.name}(${c.percentage}%)`).join(', ')}`);
      } else if (visualAnalysis?.dominantColors?.length) {
        // Pixel extraction failed but VLM worked → use VLM colors as fallback
        console.log('[Social Style v29.2] Pixel extraction failed, using VLM colors as fallback');
        debugTrace.push(`Colors: VLM fallback (${visualAnalysis.dominantColors.length} colors)`);
      } else {
        console.log('[Social Style v29.2] Both pixel extraction and VLM failed for colors');
        debugTrace.push('Colors: ALL FAILED (will use AI/fallback)');
      }
    } else {
      debugTrace.push('VLM: SKIPPED (no avatar)');
      debugTrace.push('PixelColors: SKIPPED (no avatar)');
    }

    // ─── Step 1.5: Determine gender (v20: added YouTube gender inference) ───
    detectedGender = null; // Reset for each request (already declared above)
    const genderSource = ['unknown'];

    // Priority 0a: OAuth gender from Facebook
    const facebookGenderRaw = facebookData?.gender || facebookData?.profile?.gender || null;
    if (facebookGenderRaw === 'male' || facebookGenderRaw === 'female') {
      detectedGender = facebookGenderRaw;
      genderSource[0] = 'OAUTH-FACEBOOK';
    }

    // Priority 0b: OAuth gender from Google
    if (genderSource[0] === 'unknown') {
      const googleGenderRaw = googleData?.gender || googleData?.profile?.gender || null;
      if (googleGenderRaw === 'male' || googleGenderRaw === 'female') {
        detectedGender = googleGenderRaw;
        genderSource[0] = 'OAUTH-GOOGLE';
      }
    }

    // Priority 0c: OAuth gender from LinkedIn
    if (genderSource[0] === 'unknown') {
      const linkedinGenderRaw = linkedinData?.gender || linkedinData?.profile?.gender || null;
      if (linkedinGenderRaw === 'male' || linkedinGenderRaw === 'female') {
        detectedGender = linkedinGenderRaw;
        genderSource[0] = 'OAUTH-LINKEDIN';
      }
    }

    // Priority 1: VLM visual gender
    if (genderSource[0] === 'unknown' && visualAnalysis?.gender && (visualAnalysis.gender === 'male' || visualAnalysis.gender === 'female')) {
      detectedGender = visualAnalysis.gender;
      genderSource[0] = 'VLM';
    }

    // Priority 2: Profile name inference
    if (genderSource[0] === 'unknown') {
      const profileGender = inferGenderFromProfile(googleData, facebookData, linkedinData, instagramData);
      if (profileGender) {
        detectedGender = profileGender;
        genderSource[0] = 'PROFILE';
      }
    }

    // ─── Step 1.7: v20 NEW — YouTube Subscription Analysis ───
    let youtubeInterests: YouTubeInterest[] = [];
    let youtubeCategoryBoosts: Record<string, number> = {};

    if (googleAccessToken) {
      console.log('[Social Style v20] Fetching YouTube subscriptions...');
      debugTrace.push('YouTube: FETCHING');

      const subscriptions = await fetchYouTubeSubscriptions(googleAccessToken);

      if (subscriptions.length > 0) {
        youtubeInterests = analyzeYouTubeInterests(subscriptions);

        if (youtubeInterests.length > 0) {
          youtubeCategoryBoosts = getYouTubeCategoryBoosts(youtubeInterests);
          debugTrace.push(`YouTube: ${youtubeInterests.length} interests found`);

          // v20: YouTube can also help determine gender if still unknown
          if (genderSource[0] === 'unknown') {
            const youtubeGender = inferGenderFromYouTube(youtubeInterests);
            if (youtubeGender) {
              detectedGender = youtubeGender;
              genderSource[0] = 'YOUTUBE';
              console.log('[Social Style v20] Gender from YouTube interests =', detectedGender);
            }
          }
        } else {
          debugTrace.push('YouTube: No fashion interests detected');
        }
      } else {
        debugTrace.push('YouTube: No subscriptions or token invalid');
      }
    } else {
      debugTrace.push('YouTube: SKIPPED (no access token)');
    }

    debugTrace.push(`Gender: ${detectedGender || 'NEUTRAL'} (source: ${genderSource[0]})`);
    console.log('[Social Style v20] FINAL gender =', detectedGender || 'NEUTRAL', '| source =', genderSource[0]);
    console.log('[Social Style v20] YouTube category boosts:', JSON.stringify(youtubeCategoryBoosts));

    // ─── Step 1.7b: v22 — Instagram Style Signal Extraction (TEXT: hashtags, captions, bio) ───
    const instagramStyleSignals = extractInstagramStyleSignals(instagramData);
    if (instagramStyleSignals.styleKeywords.length > 0 || instagramStyleSignals.fashionHashtags.length > 0) {
      console.log('[Social Style v22] Instagram TEXT signals:', {
        keywords: instagramStyleSignals.styleKeywords,
        brands: instagramStyleSignals.brandMentions,
        hashtags: instagramStyleSignals.fashionHashtags.length,
        categoryBoosts: Object.keys(instagramStyleSignals.categoryBoosts),
      });
      debugTrace.push(`Instagram TEXT: ${instagramStyleSignals.styleKeywords.length} style signals, ${instagramStyleSignals.fashionHashtags.length} fashion hashtags`);
    } else {
      debugTrace.push('Instagram TEXT: No style signals detected');
    }

    // ─── Step 1.7c: v23 NEW — Instagram Photo VLM Analysis (VISUAL: clothing, accessories, colors) ───
    let instagramPhotoAnalysis: InstagramPhotoAnalysis | null = null;
    if (instagramData?.recentMedia?.length > 0) {
      try {
        instagramPhotoAnalysis = await analyzeInstagramPhotos(instagramData);
        if (instagramPhotoAnalysis && instagramPhotoAnalysis.photoCount > 0) {
          debugTrace.push(`Instagram PHOTOS: ${instagramPhotoAnalysis.photoCount} analyzed, ${instagramPhotoAnalysis.allClothing.length} clothing items, ${instagramPhotoAnalysis.allAccessories.length} accessories`);
          console.log('[Social Style v23] Instagram photo VLM analysis successful');

          // v23: Instagram photos can also detect gender (use as fallback if no other source)
          if (!detectedGender && instagramPhotoAnalysis.genderSignal) {
            detectedGender = instagramPhotoAnalysis.genderSignal;
            genderSource[0] = 'INSTAGRAM_VLM';
            console.log('[Social Style v23] Gender from Instagram photos =', detectedGender);
          }
        } else {
          debugTrace.push('Instagram PHOTOS: No suitable images found');
        }
      } catch (igPhotoError) {
        console.warn('[Social Style v23] Instagram photo VLM analysis failed:', igPhotoError instanceof Error ? igPhotoError.message : String(igPhotoError));
        debugTrace.push('Instagram PHOTOS: VLM analysis failed');
      }
    } else {
      debugTrace.push('Instagram PHOTOS: SKIPPED (no media)');
    }

    // ─── v29.2: MERGE Instagram photo pixel colors with profile pic pixel colors ───
    // Previously: pixelExtractedColors only had profile pic colors
    // Now: merge Instagram photo colors into pixelExtractedColors so colorPreferences
    //      reflects the user's FULL visual palette (profile + Instagram)
    if (instagramPhotoAnalysis?.dominantColors?.length > 0) {
      const igColors = instagramPhotoAnalysis.dominantColors;
      console.log(`[Social Style v29.2] Instagram pixel colors: ${igColors.map(c => `${c.name}(${c.percentage}%)`).join(', ')}`);

      if (pixelExtractedColors && pixelExtractedColors.length > 0) {
        // MERGE: both profile pic and Instagram photos have pixel colors
        const mergedMap: Record<string, { name: string; hex: string; totalPct: number; count: number }> = {};

        // Add profile pic colors (weight = 2x since it's the primary identity)
        for (const c of pixelExtractedColors) {
          const key = c.name.toLowerCase();
          if (mergedMap[key]) {
            mergedMap[key].totalPct += c.percentage * 2;
            mergedMap[key].count += 2;
          } else {
            mergedMap[key] = { name: c.name, hex: c.hex, totalPct: c.percentage * 2, count: 2 };
          }
        }

        // Add Instagram photo colors (weight = 1x — reinforces or adds new colors)
        for (const c of igColors) {
          const key = c.name.toLowerCase();
          if (mergedMap[key]) {
            mergedMap[key].totalPct += c.percentage;
            mergedMap[key].count += 1;
          } else {
            mergedMap[key] = { name: c.name, hex: c.hex, totalPct: c.percentage, count: 1 };
          }
        }

        // Convert back to array, average by weight, sort by percentage
        const mergedColors = Object.values(mergedMap)
          .map(c => ({ name: c.name, hex: c.hex, percentage: Math.round(c.totalPct / c.count) }))
          .sort((a, b) => b.percentage - a.percentage)
          .slice(0, 6);

        const oldProfileColors = pixelExtractedColors.map(c => c.name).join(', ');
        pixelExtractedColors = mergedColors;
        console.log(`[Social Style v29.2] Colors MERGED: Profile(${oldProfileColors}) + IG(${igColors.map(c => c.name).join(', ')}) → Final: ${mergedColors.map(c => c.name).join(', ')}`);
        debugTrace.push(`Colors MERGED: Profile+IG pixel → ${mergedColors.map(c => c.name).join(', ')}`);
      } else {
        // No profile pic pixel colors, but Instagram has pixel colors → use Instagram directly
        pixelExtractedColors = igColors.map(c => ({ name: c.name, hex: c.hex, percentage: c.percentage }));
        console.log(`[Social Style v29.2] Colors: No profile pic pixel, using IG pixel colors: ${igColors.map(c => c.name).join(', ')}`);
        debugTrace.push(`Colors: IG pixel only → ${igColors.map(c => c.name).join(', ')}`);
      }
    }

    // ─── Step 1.6: Extract birthday & age data ───
    // v20.3: Debug log what we receive from frontend
    console.log('[Social Style v20.3] googleData keys:', googleData ? Object.keys(googleData) : 'NO googleData');
    console.log('[Social Style v20.3] googleData.birthday:', googleData?.birthday || 'NOT SET');
    console.log('[Social Style v20.3] facebookData?.birthday:', facebookData?.birthday || 'NOT SET');

    let userBirthday: string | null = null;
    let userAgeGroup: string | null = null;
    let daysUntilBirthday: number | null = null;

    if (facebookData?.birthday) userBirthday = facebookData.birthday;
    if (facebookData?.ageRange) {
      const ar = facebookData.ageRange;
      if (ar.min && ar.max) userAgeGroup = `${ar.min}-${ar.max}`;
      else if (ar.min) userAgeGroup = ar.min >= 55 ? '55+' : `${ar.min}-${ar.min + 9}`;
    }
    if (facebookData?.ageGroup) userAgeGroup = facebookData.ageGroup;
    if (!userBirthday && googleData?.birthday) userBirthday = googleData.birthday;

    if (userBirthday) daysUntilBirthday = getDaysUntilBirthday(userBirthday);

    const isNearBirthday = daysUntilBirthday !== null && daysUntilBirthday >= 0 && daysUntilBirthday <= 30;
    const isBirthdayToday = daysUntilBirthday === 0;

    console.log('[Social Style v20] Birthday:', userBirthday || 'unknown');
    console.log('[Social Style v20] Days until birthday:', daysUntilBirthday ?? 'unknown');
    console.log('[Social Style v20] Birthday TODAY:', isBirthdayToday);

    if (userBirthday) debugTrace.push(`Birthday: ${userBirthday}`);
    if (daysUntilBirthday !== null) debugTrace.push(`Days to bday: ${daysUntilBirthday}`);
    if (isNearBirthday) debugTrace.push(`BIRTHDAY MODE: ${isBirthdayToday ? 'TODAY!' : `${daysUntilBirthday} days away`}`);

    // ─── Step 1.8: Fetch real products from DB + Shopify (v24.2: MOVED UP before AI prompt) ───
    const { products: allProducts, categories: dynamicCategories } = await fetchAllProducts();
    debugTrace.push(`DB+Shopify products: ${allProducts.length}, categories: ${dynamicCategories.length}`);

    // ─── Step 2: Build profile summary ───
    const profileSummary = buildProfileSummary(
      networks, googleData, facebookData, linkedinData, instagramData,
      visualAnalysis, detectedGender, userBirthday, userAgeGroup, daysUntilBirthday,
      instagramPhotoAnalysis
    );

    // ─── Step 3: AI style analysis (v20: includes YouTube interests) ───
    let aiResponse: any = null;
    const MAX_RETRIES = 2;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const categoryList = dynamicCategories.length > 0 ? dynamicCategories.join(', ') : Object.keys(AI_CATEGORY_TO_SLUGS).join(', ');

        let detectedItemsPrompt = '';
        if (visualAnalysis?.detectedItems) {
          const di = visualAnalysis.detectedItems;
          const items: string[] = [];
          if (di.dress?.visible) items.push(`DRESS: ${di.dress.description} (Color: ${di.dress.color}, Style: ${di.dress.style}) — MUST recommend "Designer Dresses" category`);
          if (di.necklace?.visible) items.push(`NECKLACE: ${di.necklace.description} (Material: ${di.necklace.material}, Style: ${di.necklace.style}) — MUST recommend "Gold Necklaces" category`);
          if (di.watch?.visible) items.push(`WATCH: ${di.watch.description} (Type: ${di.watch.type}, Color: ${di.watch.color}) — MUST recommend "Smart Watches" if smartwatch/digital, or "Luxury Watches" if analog/mechanical`);
          if (di.eyewear?.visible) items.push(`EYEWEAR: ${di.eyewear.description} (Frame: ${di.eyewear.frameColor}, Shape: ${di.eyewear.frameShape}) — MUST recommend "Premium Eyewear" category. Do NOT use "Statement Accessories" or any other category name for eyewear. The correct category is EXACTLY "Premium Eyewear".`);
          detectedItemsPrompt = items.join('\n');
        }

        const genderCategoryRules = detectedGender === 'male'
          ? `MALE GENDER DETECTED — CATEGORY RULES (STRICT — DO NOT VIOLATE):
- PRIORITY categories for men: "Luxury Watches", "Bespoke Tailoring", "Premium Leather", "Statement Accessories", "Handcrafted Shoes", "Smart Watches", "Men's Shirts", "Artisan Perfumes"
- FORBIDDEN categories — NEVER recommend these for a male user: "Designer Dresses", "Designer Handbags", "Fine Jewelry", "Designer Sarees", "Diamond Collection", "Gemstone Jewelry", "Gold Necklaces", "Bridal Collection", "Silk Collection", "Luxury Skincare"
- "Gold Necklaces" is acceptable ONLY if a necklace was detected in the photo (men's chains)
- "Fine Jewelry" and "Diamond Collection" are acceptable for men (cufflinks, rings, bracelets)
- NEVER recommend products with: saree, lehenga, gown, bridal, kundan, anarkali, salwar, dupatta, choli, jhumka, mangalsutra, bangle, earring, handbag, clutch, necklace, anklet in their name/tags/description`
          : detectedGender === 'female'
          ? `FEMALE GENDER DETECTED — CATEGORY RULES:
- PRIORITY categories for women: "Designer Dresses", "Gold Necklaces", "Smart Watches", "Fine Jewelry", "Designer Handbags", "Diamond Collection", "Luxury Skincare", "Designer Sarees", "Designer Fragrances"
- Do NOT recommend: "Bespoke Tailoring", "Statement Accessories" (cufflinks — these are male categories)
- "Premium Leather" is acceptable (wallets, bags for women)
- "Luxury Watches" is acceptable (women's luxury watches)`
          : `GENDER NOT DETECTED — GENDER-NEUTRAL CATEGORY RULES:
- Recommend gender-neutral categories: "Premium Eyewear", "Designer Fragrances", "Artisan Perfumes", "Silk & Cashmere", "Luxury Skincare", "Luxury Sleepwear", "Luxury Gift Sets"
- Include a BALANCED MIX from both male and female categories
- Do NOT heavily weight strongly gendered categories`;

        let birthdayPrompt = '';
        if (isBirthdayToday) {
          birthdayPrompt = `
=== BIRTHDAY ALERT — TODAY IS THE USER'S BIRTHDAY! ===
It is the user's birthday TODAY! You MUST include "Luxury Gift Sets" in the recommendedCategories with a HIGH match score (90+).
Reason: "A perfect birthday gift to celebrate your special day!"
Also mention birthday celebration in the styleProfile description — make it personal and festive.
Recommend gift-worthy items: Luxury Gift Sets, Fine Jewelry, Designer Fragrances, Gold Necklaces.`;
        } else if (isNearBirthday) {
          birthdayPrompt = `
=== BIRTHDAY APPROACHING — ${daysUntilBirthday} DAYS UNTIL BIRTHDAY ===
The user's birthday is in ${daysUntilBirthday} days! Include "Luxury Gift Sets" in the recommendedCategories with a good match score (85+).
Reason: "Your birthday is coming — treat yourself or share a wish list!"
Consider birthday-appropriate recommendations: gift sets, celebration-worthy jewelry, special occasion fragrances.`;
        }

        const ageGuidance = getAgeStyleGuidance(userAgeGroup);
        let agePrompt = '';
        if (ageGuidance) {
          agePrompt = `
=== AGE-APPROPRIATE STYLE GUIDANCE ===
Age Group: ${userAgeGroup}
${ageGuidance}`;
        }

        // v20 NEW: Build YouTube interests prompt
        const youtubePrompt = buildYouTubeInterestsPrompt(youtubeInterests);

        // v23 NEW: Build Instagram photo VLM analysis prompt
        let igPhotoPrompt = '';
        if (instagramPhotoAnalysis && instagramPhotoAnalysis.photoCount > 0) {
          const igCats = instagramPhotoAnalysis.detectedCategories.slice(0, 5).map(c => `${c.category} (${Math.round(c.confidence * 100)}% confidence)`).join(', ');
          const igStyle = instagramPhotoAnalysis.styleKeywords.join(', ');
          const igColors = instagramPhotoAnalysis.dominantColors.map(c => c.name).join(', ');
          igPhotoPrompt = `
=== INSTAGRAM PHOTO ANALYSIS (v23) ===
${instagramPhotoAnalysis.photoCount} Instagram photos were analyzed by VLM vision model.
Detected clothing across photos: ${[...new Set(instagramPhotoAnalysis.allClothing)].slice(0, 10).join(', ')}
Detected accessories across photos: ${[...new Set(instagramPhotoAnalysis.allAccessories)].slice(0, 8).join(', ')}
Dominant outfit colors: ${igColors}
Style keywords from photos: ${igStyle}
VLM-detected product categories: ${igCats}
Gender signal from photos: ${instagramPhotoAnalysis.genderSignal || 'inconclusive'}

INSTAGRAM PHOTO RULES:
- Categories detected in Instagram photos should get HIGHER match scores (+5-10)
- If Instagram photos show a dress/outfit, recommend matching product categories
- If Instagram photos show accessories (watch, necklace, sunglasses), recommend those categories
- Instagram photo style keywords should influence the styleProfile tags and description
- Combine Instagram photo colors with profile picture colors in colorPreferences
- If Instagram gender signal differs from other sources, trust the most consistent signal`;
        }

        const aiResult = await aiChat([
          {
            role: 'system',
            content: `You are a luxury fashion AI stylist for "3 Boxes Luxury". You analyze profile pictures, Instagram post photos, social data, and YouTube interests to recommend products that MATCH what the person is wearing AND are appropriate for their gender, age, upcoming celebrations, and content interests.

Return a JSON object with EXACTLY this structure:
{
  "styleProfile": {
    "tags": ["tag1", "tag2", "tag3", "tag4"],
    "confidence": 0.85,
    "description": "2-3 sentence personalized style description"
  },
  "colorPreferences": [
    {"name": "Color Name", "hex": "#hexcode", "affinity": 0.90}
  ],
  "recommendedCategories": [
    {"name": "Category Name", "match": 92, "reason": "Why this matches"}
  ],
  "recommendedProducts": [
    {"category": "Category Name", "reason": "Why this product type fits"}
  ]

IMPORTANT: Return 8 recommendedCategories and 8 recommendedProducts for a rich, varied selection.
}

=== MOST IMPORTANT RULE — GENDER + BIRTHDAY + YOUTUBE + INSTAGRAM-AWARE DETECTED ITEMS ===

The detected gender is: **${detectedGender ? detectedGender.toUpperCase() : 'UNKNOWN (use gender-neutral recommendations)'}**

${genderCategoryRules}
${birthdayPrompt}
${agePrompt}
${youtubePrompt}
${igPhotoPrompt}

DETECTED ITEMS RULE (still #1 priority when visible):
- If DRESS is visible (and gender is female) → "Designer Dresses" must be in recommendedCategories (match: 90-97)
- If NECKLACE is visible → "Gold Necklaces" must be in recommendedCategories (match: 90-97)
- If WATCH is visible → "Smart Watches" (for smartwatch/digital) or "Luxury Watches" (for analog) must be in recommendedCategories (match: 90-97)
- If EYEWEAR is visible → "Premium Eyewear" must be in recommendedCategories (match: 90-97). Do NOT use "Statement Accessories" for eyewear.
- When gender is MALE and dress is detected, do NOT recommend "Designer Dresses" — this is likely a cultural garment

COLOR RULES — MANDATORY:
- Copy the EXACT dominant colors from the visual analysis into colorPreferences
- The HIGHEST percentage color gets the HIGHEST affinity
- Do NOT invent colors — use what the visual analysis provided

CATEGORY RULES:
- Categories MUST come from this list: ${categoryList}
- Do NOT recommend categories outside this list
- Give HIGHEST match scores to categories matching VISIBLE items AND appropriate for the detected gender
- Products MUST be gender-appropriate
- If YouTube interests suggest certain categories, give them HIGHER match scores
- If Instagram photo VLM analysis detected specific categories, give them HIGHER match scores (+5-10)

BIRTHDAY RULE (when birthday is near or today):
- "Luxury Gift Sets" MUST be in recommendedCategories when birthday is within 30 days
- Give it a high match score (85-95)
- The reason should mention birthday celebration

YOUTUBE RULES (when YouTube interests are available):
- Categories matching YouTube interests should get HIGHER match scores (+5-15)
- If multiple YouTube interests point to the same category, boost it even more
- YouTube data reflects the user's ACTUAL content consumption — it's a strong signal

INSTAGRAM PHOTO RULES (when Instagram photo analysis is available):
- Categories detected by VLM in Instagram photos are STRONG visual signals — the user actually WEARS these items
- Give those categories HIGHER match scores (+5-10)
- If Instagram photos show the user frequently wearing dresses, recommend "Designer Dresses" with high match
- If Instagram photos show watches, sunglasses, necklaces, recommend those categories
- Instagram photo colors should be included in colorPreferences
- Instagram style keywords should influence the styleProfile tags

PRODUCT RULES:
- 6 entries, each from the available category list
- At least 4 of the 6 should match detected items, birthday, YouTube interests, or Instagram photo analysis
- Use the EXACT same category names from the available list
- GENDER PRODUCT FILTERING IS MANDATORY:
  * If gender is MALE: products must be for men — check name, tags, and description for female signals
  * If gender is FEMALE: products must be for women — check name, tags, and description for male signals
  * Products tagged "her", "women", "ladies", "bridal" must NEVER be recommended to male users
  * Products tagged "him", "men", "gentleman" must NEVER be recommended to female users
  * Products with names containing: saree, lehenga, gown, bridal, kundan, anarkali, bangle, earring, handbag, necklace are FEMALE-ONLY
  * When in doubt, do NOT recommend the product — safety first

Return ONLY the JSON, no markdown, no code fences.`
          },
          {
            role: 'user',
            content: `Analyze this user's style (Gender: ${detectedGender || 'unknown — use gender-neutral recommendations'}${userAgeGroup ? `, Age: ${userAgeGroup}` : ''}${isNearBirthday ? `, Birthday: ${isBirthdayToday ? 'TODAY!' : `${daysUntilBirthday} days away`}` : ''}${youtubeInterests.length > 0 ? `, YouTube interests: ${youtubeInterests.map(i => i.interestGroup).join(', ')}` : ''}${instagramPhotoAnalysis && instagramPhotoAnalysis.photoCount > 0 ? `, Instagram photos analyzed: ${instagramPhotoAnalysis.photoCount}` : ''}):\n\n${profileSummary}\n\n${detectedItemsPrompt ? `=== DETECTED ITEMS IN PROFILE PICTURE (HIGHEST PRIORITY) ===\n${detectedItemsPrompt}` : '(No detected items from profile picture)'}${instagramPhotoAnalysis && instagramPhotoAnalysis.detectedCategories.length > 0 ? `\n\n=== DETECTED CATEGORIES IN INSTAGRAM PHOTOS (HIGH PRIORITY) ===\n${instagramPhotoAnalysis.detectedCategories.slice(0, 5).map(c => `- ${c.category} (${Math.round(c.confidence * 100)}% confidence): VLM detected this in the user's Instagram posts`).join('\\n')}` : ''}`
          }
        ]);

        const rawContent = aiResult.choices?.[0]?.message?.content || '';
        let cleanedContent = rawContent.trim();
        if (cleanedContent.startsWith('```')) {
          cleanedContent = cleanedContent.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        }
        // v23.1: Robust JSON parsing for AI chat response
        try {
          aiResponse = JSON.parse(cleanedContent);
        } catch {
          const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            let repaired = jsonMatch[0];
            const openB = (repaired.match(/\{/g) || []).length;
            const closeB = (repaired.match(/\}/g) || []).length;
            const openBr = (repaired.match(/\[/g) || []).length;
            const closeBr = (repaired.match(/\]/g) || []).length;
            for (let i = 0; i < openBr - closeBr; i++) repaired += ']';
            for (let i = 0; i < openB - closeB; i++) repaired += '}';
            try {
              aiResponse = JSON.parse(repaired);
              console.log('[Social Style v23] AI chat JSON repaired');
            } catch {
              throw new Error('AI JSON repair failed');
            }
          } else {
            throw new Error('No JSON found in AI response');
          }
        }
        console.log('[Social Style] AI analysis successful (attempt', attempt, ')');
        break;
      } catch (aiError) {
        console.error(`[Social Style] AI attempt ${attempt} FAILED:`, aiError instanceof Error ? aiError.message : String(aiError));
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.error('[Social Style] ALL AI ATTEMPTS FAILED — using enhanced fallback');
          aiResponse = generateEnhancedFallback(visualAnalysis, detectedGender, isNearBirthday, isBirthdayToday);
        }
      }
    }

    // ─── Step 4: Validate and normalize ─── (allProducts & dynamicCategories already fetched in Step 1.8)
    const rawCategories = Array.isArray(aiResponse?.recommendedCategories)
      ? aiResponse.recommendedCategories.slice(0, 8).map((c: any) => ({
          name: String(c.name || 'Unknown'),
          match: typeof c.match === 'number' ? Math.min(99, Math.max(50, c.match)) : 70,
          reason: String(c.reason || 'Matches your style profile'),
        }))
      : generateDynamicFallback(detectedGender).recommendedCategories;

    const validatedCategories = rawCategories.map((cat: { name: string; match: number; reason: string }) => {
      const hasProducts = dynamicCategories.some(ac => ac.toLowerCase() === cat.name.toLowerCase());
      if (hasProducts) return cat;
      const mapped = mapToAvailableCategory(cat.name, dynamicCategories);
      return { ...cat, name: mapped };
    });

    // Gender-filter inappropriate categories — v24.1: replace with varied male categories, not all "Luxury Watches"
    const maleReplacements = ['Luxury Watches', 'Premium Leather', "Men's Shirts", 'Artisan Perfumes', 'Handcrafted Shoes', 'Corporate Gifts', 'Statement Accessories', 'Smart Watches'];
    const femaleReplacements = ['Fine Jewelry', 'Designer Sarees', 'Designer Handbags', 'Designer Fragrances', 'Luxury Skincare', 'Gold Necklaces', 'Designer Dresses', 'Smart Watches'];

    // v25 FIX: Use a persistent Set that tracks replacements across iterations
    // Previously each .map() iteration rebuilt existingCatNames from the original list,
    // causing ALL female categories to get the SAME replacement (e.g. all → "Luxury Watches")
    const replacedCategoryNames = new Set<string>(validatedCategories.map(c => c.name));

    const genderFilteredRaw = validatedCategories.map((cat: { name: string; match: number; reason: string }) => {
      if (detectedGender === 'male') {
        const femaleOnly = ['Designer Dresses', 'Designer Handbags', 'Fine Jewelry', 'Designer Sarees', 'Diamond Collection', 'Gemstone Jewelry', 'Luxury Sleepwear', 'Luxury Skincare', 'Gold Necklaces', 'Designer Fragrances', 'Bridal Collection', 'Silk Collection'];
        if (femaleOnly.includes(cat.name)) {
          // Pick a male replacement NOT already used (persistent Set tracks across iterations)
          const replacement = maleReplacements.find(r => !replacedCategoryNames.has(r)) || maleReplacements[0];
          replacedCategoryNames.add(replacement); // Track so next iteration won't pick the same one
          return { ...cat, name: replacement, reason: `Matches your refined gentleman style` };
        }
      } else if (detectedGender === 'female') {
        const maleOnly = ['Bespoke Tailoring', 'Statement Accessories', "Men's Shirts", 'Handcrafted Shoes', 'Premium Leather', 'Corporate Gifts', 'Smart Watches', 'Luxury Watches'];
        if (maleOnly.includes(cat.name)) {
          const replacement = femaleReplacements.find(r => !replacedCategoryNames.has(r)) || femaleReplacements[0];
          replacedCategoryNames.add(replacement);
          return { ...cat, name: replacement, reason: `Complements your elegant feminine style` };
        }
      }
      return cat;
    });

    // v24.1: Deduplicate categories (same name shouldn't appear twice)
    const genderFilteredCategories: { name: string; match: number; reason: string }[] = [];
    const seenCategoryNames = new Set<string>();
    for (const cat of genderFilteredRaw) {
      if (!seenCategoryNames.has(cat.name)) {
        seenCategoryNames.add(cat.name);
        genderFilteredCategories.push(cat);
      } else {
        // Replace duplicate with a gender-appropriate category not yet in the list
        const replacements = detectedGender === 'male' ? maleReplacements : femaleReplacements;
        const altCat = replacements.find(r => !seenCategoryNames.has(r));
        if (altCat) {
          seenCategoryNames.add(altCat);
          genderFilteredCategories.push({ ...cat, name: altCat, reason: `Matches your ${detectedGender === 'male' ? 'refined gentleman' : 'elegant feminine'} style` });
        }
      }
    }

    // v29.2: FIX eyewear leaking into wrong categories
    // AI sometimes puts eyewear-related reasons on non-eyewear categories (e.g., "Your eyewear matches" on "Luxury Watches")
    // This is WRONG — remove eyewear reasons from non-eyewear categories
    const eyewearKeywords = ['eyewear', 'glasses', 'frame', 'spectacle', 'sunglass'];
    for (const cat of genderFilteredCategories) {
      if (cat.name !== 'Premium Eyewear') {
        const reasonLower = cat.reason.toLowerCase();
        if (eyewearKeywords.some(kw => reasonLower.includes(kw))) {
          // Replace the wrong reason with a generic one
          cat.reason = `Matches your ${detectedGender === 'male' ? 'refined gentleman' : 'elegant feminine'} style`;
          console.log(`[Social Style v29.2] Fixed wrong eyewear reason on "${cat.name}" → replaced with generic reason`);
        }
      }
    }

    // v29.2: FORCE "Premium Eyewear" into displayed categories when eyewear is detected
    // This ensures the user SEES "Premium Eyewear" as a recommended category
    if (visualAnalysis?.detectedItems?.eyewear?.visible) {
      const eyewearIdx = genderFilteredCategories.findIndex(c => c.name === 'Premium Eyewear');
      const di = visualAnalysis.detectedItems;
      const frameDesc = [di.eyewear.frameColor, di.eyewear.frameShape].filter(Boolean).join(' ');
      const eyewearReason = `Your ${frameDesc || ''} eyewear matches our collection`;

      if (eyewearIdx >= 0) {
        // Premium Eyewear already in list → update reason and boost match score
        genderFilteredCategories[eyewearIdx].match = Math.max(genderFilteredCategories[eyewearIdx].match, 95);
        genderFilteredCategories[eyewearIdx].reason = eyewearReason;
      } else {
        // Premium Eyewear NOT in list → FORCE insert at top, remove lowest category
        genderFilteredCategories.unshift({ name: 'Premium Eyewear', match: 95, reason: eyewearReason });
        // Remove the lowest-scoring category to keep max 8
        if (genderFilteredCategories.length > 8) {
          genderFilteredCategories.pop();
        }
        // Re-sort by match score
        genderFilteredCategories.sort((a, b) => b.match - a.match);
      }
      console.log(`[Social Style v29.2] FORCE-added Premium Eyewear to displayed categories (match: 95)`);
    }

    // Ensure "Luxury Gift Sets" when birthday is near
    if (isNearBirthday) {
      const hasGiftCategory = genderFilteredCategories.some(c => c.name === 'Luxury Gift Sets');
      if (!hasGiftCategory) {
        const lastIndex = genderFilteredCategories.length - 1;
        if (lastIndex >= 0) {
          genderFilteredCategories[lastIndex] = {
            name: 'Luxury Gift Sets',
            match: isBirthdayToday ? 95 : 88,
            reason: isBirthdayToday
              ? 'A perfect birthday gift to celebrate your special day!'
              : `Your birthday is in ${daysUntilBirthday} days — treat yourself!`,
          };
        }
      }
    }

    // v20: Apply YouTube category boosts to match scores
    if (Object.keys(youtubeCategoryBoosts).length > 0) {
      for (const cat of genderFilteredCategories) {
        if (youtubeCategoryBoosts[cat.name]) {
          cat.match = Math.min(99, cat.match + youtubeCategoryBoosts[cat.name]);
          cat.reason += ' (matches your YouTube interests)';
        }
      }
      // Re-sort by match score after boosting
      genderFilteredCategories.sort((a, b) => b.match - a.match);
    }

    const fallbackGender: 'male' | 'female' = detectedGender || 'female';
    const analysis = {
      styleProfile: {
        tags: Array.isArray(aiResponse?.styleProfile?.tags) ? aiResponse.styleProfile.tags.slice(0, 4) : generateDynamicFallback(fallbackGender).styleProfile.tags,
        confidence: typeof aiResponse?.styleProfile?.confidence === 'number'
          ? Math.min(0.99, Math.max(0.5, aiResponse.styleProfile.confidence))
          : generateDynamicFallback(fallbackGender).styleProfile.confidence,
        description: typeof aiResponse?.styleProfile?.description === 'string'
          ? aiResponse.styleProfile.description
          : generateDynamicFallback(fallbackGender).styleProfile.description,
      },
      // v29.2: Pixel extraction is PRIMARY color source (most accurate, never rate-limited)
      // Colors come from BOTH profile pic + Instagram photos (merged with weight)
      // Priority: Pixel (profile + IG merged) → VLM (if pixel failed) → AI chat → hardcoded fallback
      // v29.2: pixelExtractedColors now includes MERGED colors from profile pic + Instagram photos
      colorPreferences: pixelExtractedColors && pixelExtractedColors.length > 0
        ? pixelExtractedColors.slice(0, 6).map((c: any, i: number) => ({
            name: String(c.name || 'Unknown'),
            hex: String(c.hex || '#808080'),
            affinity: Math.min(1, Math.max(0.5, 0.55 + (c.percentage || (50 - i * 8)) / 100)),
          }))
        : visualAnalysis?.dominantColors?.length
          ? visualAnalysis.dominantColors.slice(0, 6).map((c: any, i: number) => ({
              name: String(c.name || 'Unknown'),
              hex: String(c.hex || '#808080'),
              affinity: Math.min(1, Math.max(0.5, 0.55 + (c.percentage || (50 - i * 8)) / 100)),
            }))
          : Array.isArray(aiResponse?.colorPreferences)
            ? aiResponse.colorPreferences.slice(0, 6).map((c: any) => ({
                name: String(c.name || 'Unknown'),
                hex: String(c.hex || '#808080'),
                affinity: typeof c.affinity === 'number' ? Math.min(1, Math.max(0, c.affinity)) : 0.5,
              }))
            : generateDynamicFallback(fallbackGender).colorPreferences,
      recommendedCategories: genderFilteredCategories,
    };

    // ─── Step 5: Build product recommendations (v24: uses real DB/Shopify products) ───
    const products = buildProductRecommendations(
      aiResponse, analysis.recommendedCategories, visualAnalysis, detectedGender,
      isNearBirthday, isBirthdayToday, daysUntilBirthday,
      youtubeCategoryBoosts,
      instagramStyleSignals,
      instagramPhotoAnalysis,
      allProducts,          // v24: real products from DB + Shopify
      dynamicCategories,    // v24: dynamic category list
      analysis.colorPreferences  // v29: user's color preferences for product matching
    );

    debugTrace.push(`Categories: ${analysis.recommendedCategories.map((c: any) => c.name).join(', ')}`);
    debugTrace.push(`Products: ${products.map((p: any) => p.name).join(', ')}`);
    // v29: Add color match info to debug trace
    debugTrace.push(`Color matching: ${products.filter((p: any) => p.colorMatch >= 70).length}/${products.length} products match user colors`);

    // Build response (same as v19 + YouTube data)
    const responseData: any = { analysis, products, _debug: debugTrace };
    if (userBirthday) responseData.birthday = userBirthday;
    if (userAgeGroup) responseData.ageGroup = userAgeGroup;
    if (detectedGender) responseData.gender = detectedGender;
    if (daysUntilBirthday !== null) {
      responseData.daysUntilBirthday = daysUntilBirthday;
      responseData.isNearBirthday = isNearBirthday;
      responseData.isBirthdayToday = isBirthdayToday;
    }
    // v20: Include YouTube interest data in response
    if (youtubeInterests.length > 0) {
      responseData.youtubeInterests = youtubeInterests.map(i => ({
        group: i.interestGroup,
        categories: i.recommendedCategories,
        confidence: i.confidence,
      }));
      responseData.youtubeCategoryBoosts = youtubeCategoryBoosts;
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[Social Style] Analysis error:', error);
    const genderAwareFallback = generateDynamicFallback(detectedGender);
    return NextResponse.json({ analysis: genderAwareFallback, products: [] });
  }
}
