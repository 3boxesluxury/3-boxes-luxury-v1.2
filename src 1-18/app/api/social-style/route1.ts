import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// Social Style Analysis Route — v15: Dynamic Gender Detection
// ============================================================
//
// v15 FIX: No more hardcoded default gender — works for BOTH male and female users!
//
// Problem with v14.1: Default gender was hardcoded to 'male', which means
// female users whose gender couldn't be detected would get male product
// recommendations (bespoke tailoring, cufflinks, etc.).
//
// v15 Changes:
//   1. Added Priority 0: OAuth-provided gender from Facebook Graph API
//      (Facebook now returns 'gender' field — one-line fix in OAuth callback)
//   2. Removed hardcoded default — when gender truly can't be determined,
//      the system uses GENDER-NEUTRAL product selection (mixed from both
//      male and female categories) instead of forcing one gender
//   3. Gender-neutral categories shown when gender is unknown:
//      Premium Eyewear, Designer Fragrances, Silk & Cashmere, Luxury Skincare,
//      Luxury Sleepwear, plus a balanced mix from gendered categories
//   4. scoreProduct() gender penalty only applies when gender IS known
//
// v14.1 FIX (preserved): Male LinkedIn users were getting female products
//   - Gender filter fixed, scoreProduct() cross-gender penalty, name lists expanded
//
// v14 FIX (preserved): Facebook & LinkedIn avatar URLs expire after hours/days.
//
// ============================================================

// ─── OpenRouter Configuration ───

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_CHAT_MODEL = 'z-ai/glm-4.5-air:free';
const OPENROUTER_VISION_MODEL = 'nvidia/nemotron-nano-12b-v2-vl:free';
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
      'X-Title': '3 Boxes Luxury — Social Style Analysis',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.1 }),
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
      'X-Title': '3 Boxes Luxury — VLM Profile Analysis',
    },
    body: JSON.stringify({ model, messages, max_tokens: 1500, temperature: 0.1 }),
    signal: AbortSignal.timeout(90000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter Vision API returned ${response.status}: ${errorBody.substring(0, 300)}`);
  }
  return await response.json();
}

// ─── Google AI Studio Vision (FREE tier — Gemini 2.0 Flash) ───
// v17: Use Google AI Studio directly instead of OpenRouter for VLM.
// Free tier: 15 requests/min, 1,500/day, ~45,000/month — more than enough.
// Gemini 2.0 Flash is MUCH better at color detection than Nemotron.

const GOOGLE_AI_MODEL = 'gemini-2.0-flash';

function getGoogleAIApiKey(): string {
  return process.env.GOOGLE_AI_API_KEY || '';
}

async function googleAIVision(
  messages: Array<{ role: string; content: any[] }>,
): Promise<any> {
  const apiKey = getGoogleAIApiKey();
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not set');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_AI_MODEL}:generateContent?key=${apiKey}`;

  // Convert OpenRouter message format to Google Gemini format
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: Array.isArray(m.content) ? m.content.map((c: any) => {
      if (c.type === 'text') return { text: c.text };
      if (c.type === 'image_url') {
        const imageUrl = c.image_url.url;
        if (imageUrl.startsWith('data:')) {
          // Base64 encoded image
          const [meta, base64] = imageUrl.split(',');
          const mimeType = meta.match(/data:(.*?);/)?.[1] || 'image/jpeg';
          return { inlineData: { mimeType, data: base64 } };
        }
        // URL-based image — Gemini needs inline data, so we skip URL-only images
        // (our code already converts to base64 before calling VLM, so this shouldn't happen)
        return { text: `[Image URL: ${imageUrl.substring(0, 50)}...]` };
      }
      return { text: '' };
    }) : [{ text: String(m.content) }]
  }));

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2000,
      },
    }),
    signal: AbortSignal.timeout(90000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google AI Vision returned ${response.status}: ${errorBody.substring(0, 300)}`);
  }

  const result = await response.json();

  // Convert Google Gemini response format to OpenRouter format
  // so the rest of the code doesn't need to change
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { choices: [{ message: { content: text } }] };
}

// ─── Internal API Calls (sandbox fallback) ───

async function internalAIChat(
  messages: Array<{ role: string; content: string }>,
  temperature: number = 0.1,
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

async function aiChat(
  messages: Array<{ role: string; content: string }>,
  temperature: number = 0.1,
  maxTokens: number = 2000
): Promise<any> {
  const apiKey = getOpenRouterApiKey();
  if (apiKey) {
    console.log('[Social Style] Using OpenRouter for chat');
    try { return await openRouterChat(messages, OPENROUTER_CHAT_MODEL, maxTokens); }
    catch (orError) { console.warn('[Social Style] OpenRouter chat failed:', orError instanceof Error ? orError.message : String(orError)); }
  }
  // v12.1: Try internal AI on Vercel too (removed !isVercel() check)
  try { return await internalAIChat(messages, temperature, maxTokens); }
  catch (intError) { console.warn('[Social Style] Internal AI chat failed:', intError instanceof Error ? intError.message : String(intError)); }
  throw new Error('All AI chat providers failed. Set OPENROUTER_API_KEY or configure Z.ai internal API.');
}

async function aiVision(messages: Array<{ role: string; content: any[] }>): Promise<any> {
  // v17: Priority order: Google AI Studio (FREE, best quality) → OpenRouter (fallback) → Internal Z.ai (last resort)

  // v17: Try Google AI Studio FIRST (Gemini 2.0 Flash — FREE tier, best color detection)
  const googleApiKey = getGoogleAIApiKey();
  if (googleApiKey) {
    console.log('[Social Style] v17: Trying Google AI Studio (Gemini 2.0 Flash) for vision...');
    try {
      const result = await googleAIVision(messages);
      console.log('[Social Style] v17: Google AI Studio vision succeeded');
      return result;
    } catch (googleError) {
      console.warn('[Social Style] v17: Google AI Studio vision failed:', googleError instanceof Error ? googleError.message : String(googleError));
    }
  } else {
    console.log('[Social Style] v17: GOOGLE_AI_API_KEY not set — skipping Google AI Studio');
  }

  // Fallback: Try OpenRouter VLM (Nemotron — free but less accurate)
  const apiKey = getOpenRouterApiKey();
  if (apiKey) {
    console.log('[Social Style] Trying OpenRouter for vision (fallback)...');
    try {
      const result = await openRouterVision(messages, OPENROUTER_VISION_MODEL);
      console.log('[Social Style] OpenRouter vision succeeded');
      return result;
    } catch (orError) {
      console.warn('[Social Style] OpenRouter vision failed:', orError instanceof Error ? orError.message : String(orError));
    }
  }

  // Last resort: Try internal Z.ai vision API
  console.log('[Social Style] Trying internal Z.ai vision API (last resort)...');
  try {
    const result = await internalAIVision(messages);
    console.log('[Social Style] Internal Z.ai vision succeeded');
    return result;
  } catch (intError) {
    console.warn('[Social Style] Internal Z.ai vision failed:', intError instanceof Error ? intError.message : String(intError));
  }

  throw new Error('All AI vision providers failed. Google AI Studio, OpenRouter, and Z.ai internal API all returned errors.');
}

// ─── Product Catalog ─────────
// v13: EXPANDED catalog with color/style tags for ANALYSIS-DRIVEN product selection
// Each product now has: colors[], styles[], formality so we can match
// detected profile colors and styles to the RIGHT product deterministically.
// No more random picks — same analysis = same products, different analysis = different products.

// ─── Avatar URL Expiration Detection (v14) ───
// Facebook & LinkedIn avatar URLs have embedded expiration timestamps.
// Facebook: ext=UNIX_TIMESTAMP in platform-lookaside.fbsbx.com or scontent URLs
// LinkedIn: e=UNIX_TIMESTAMP in media.licdn.com URLs
// Google: lh3.googleusercontent.com URLs are more stable but can also expire
// If the URL is expired, we should skip it or try to refresh it.

interface AvatarUrlResult {
  url: string;
  source: string;       // 'linkedin', 'google', 'facebook'
  isExpired: boolean;    // v14: Did we detect the URL has expired?
  isLikelyBlocked: boolean; // v14: Is the URL from a CDN that blocks server-side fetches?
  freshnessNote: string; // v14: Human-readable explanation
}

function checkAvatarUrl(url: string, source: string): AvatarUrlResult {
  if (!url) {
    return { url, source, isExpired: true, isLikelyBlocked: false, freshnessNote: 'No URL provided' };
  }

  const now = Math.floor(Date.now() / 1000); // Current UNIX timestamp in seconds
  let isExpired = false;
  let isLikelyBlocked = false;
  let freshnessNote = 'URL appears fresh';

  // ─── Check Facebook avatar URL expiration ───
  if (url.includes('platform-lookaside.fbsbx.com') || url.includes('fbcdn.net')) {
    // Facebook URLs have ext= parameter (UNIX timestamp in seconds)
    const extMatch = url.match(/[?&]ext=(\d+)/);
    if (extMatch) {
      const extTimestamp = parseInt(extMatch[1], 10);
      if (extTimestamp > 0 && extTimestamp < now) {
        isExpired = true;
        freshnessNote = `Facebook avatar URL expired at ${new Date(extTimestamp * 1000).toISOString()} (ext=${extTimestamp})`;
      } else if (extTimestamp > 0) {
        freshnessNote = `Facebook avatar URL valid until ${new Date(extTimestamp * 1000).toISOString()}`;
      }
    }
    // Facebook CDN sometimes blocks server-side fetches even for valid URLs
    // (returns 403 without proper referer/cookies)
    isLikelyBlocked = true;
  }

  // ─── Check LinkedIn avatar URL expiration ───
  if (url.includes('media.licdn.com')) {
    // LinkedIn URLs have e= parameter (UNIX timestamp in seconds)
    const eMatch = url.match(/[?&]e=(\d+)/);
    if (eMatch) {
      const eTimestamp = parseInt(eMatch[1], 10);
      if (eTimestamp > 0 && eTimestamp < now) {
        isExpired = true;
        freshnessNote = `LinkedIn avatar URL expired at ${new Date(eTimestamp * 1000).toISOString()} (e=${eTimestamp})`;
      } else if (eTimestamp > 0) {
        freshnessNote = `LinkedIn avatar URL valid until ${new Date(eTimestamp * 1000).toISOString()}`;
      }
    }
    // LinkedIn CDN also blocks server-side fetches (returns 403)
    isLikelyBlocked = true;
  }

  // ─── Check Google avatar URL ───
  if (url.includes('googleusercontent.com')) {
    // Google URLs are more stable — they don't have visible expiration
    // But they can be blocked from server-side if the photo is private
    isLikelyBlocked = false; // Google usually allows server-side fetch
    freshnessNote = 'Google avatar URL (usually stable, no visible expiration)';
  }

  return { url, source, isExpired, isLikelyBlocked, freshnessNote };
}

// ─── Avatar URL Refresh via Platform APIs (v14) ───
// When we detect an expired URL, we can try to get a fresh one.
// For Facebook: Use Graph API /me/picture?redirect=false with stored access token
// For LinkedIn: Re-fetch /v2/userinfo with stored access token
// For Google: Re-fetch from userinfo endpoint

async function refreshFacebookAvatar(accessToken: string): Promise<string | null> {
  if (!accessToken) return null;
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me/picture?redirect=false&width=400&height=400&access_token=${accessToken}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (response.ok) {
      const data = await response.json();
      const freshUrl = data?.data?.url;
      if (freshUrl) {
        console.log('[Social Style] v14: Refreshed Facebook avatar URL successfully');
        return freshUrl;
      }
    }
    console.warn('[Social Style] v14: Failed to refresh Facebook avatar — status:', response.status);
  } catch (err) {
    console.warn('[Social Style] v14: Facebook avatar refresh error:', err instanceof Error ? err.message : String(err));
  }
  return null;
}

async function refreshLinkedInAvatar(accessToken: string): Promise<string | null> {
  if (!accessToken) return null;
  try {
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      const data = await response.json();
      const freshUrl = data?.picture;
      if (freshUrl) {
        console.log('[Social Style] v14: Refreshed LinkedIn avatar URL successfully');
        return freshUrl;
      }
    }
    console.warn('[Social Style] v14: Failed to refresh LinkedIn avatar — status:', response.status);
  } catch (err) {
    console.warn('[Social Style] v14: LinkedIn avatar refresh error:', err instanceof Error ? err.message : String(err));
  }
  return null;
}

async function refreshGoogleAvatar(accessToken: string): Promise<string | null> {
  if (!accessToken) return null;
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      const data = await response.json();
      const freshUrl = data?.picture;
      if (freshUrl) {
        console.log('[Social Style] v14: Refreshed Google avatar URL successfully');
        return freshUrl;
      }
    }
    console.warn('[Social Style] v14: Failed to refresh Google avatar — status:', response.status);
  } catch (err) {
    console.warn('[Social Style] v14: Google avatar refresh error:', err instanceof Error ? err.message : String(err));
  }
  return null;
}

// ─── Product Catalog ─────────

interface ProductEntry {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  colors: string[];   // color names this product features (lowercase)
  styles: string[];   // style tags: formal, casual, ethnic, modern, classic, bold, minimalist, etc.
  formality: 'formal' | 'smart-casual' | 'casual' | 'evening' | 'ethnic';
}

const PRODUCT_CATALOG: ProductEntry[] = [
  // ─── Designer Shirts (male-focused) ───
  { id: 'prod-shirt-1', name: 'Premium Formal Shirt White', price: 8500, image: '/images/products/generated/premium-formal-shirt-white-11047388530001.png', category: 'Designer Shirts', colors: ['white', 'ivory', 'cream'], styles: ['formal', 'classic', 'minimalist'], formality: 'formal' },
  { id: 'prod-shirt-2', name: 'Slim Fit Blazer Navy', price: 32000, image: '/images/products/generated/slim-fit-blazer-navy-11047388530002.png', category: 'Designer Shirts', colors: ['navy', 'blue', 'dark blue'], styles: ['formal', 'modern', 'bold'], formality: 'formal' },
  { id: 'prod-shirt-3', name: 'Linen Button-Down Shirt', price: 6500, image: '/images/products/generated/linen-button-down-shirt-11047388530003.png', category: 'Designer Shirts', colors: ['beige', 'tan', 'natural', 'camel'], styles: ['casual', 'classic', 'refined'], formality: 'smart-casual' },
  { id: 'prod-shirt-4', name: 'Charcoal Slim Fit Suit Shirt', price: 9200, image: '/images/products/generated/premium-formal-shirt-white-11047388530001.png', category: 'Designer Shirts', colors: ['charcoal', 'grey', 'gray', 'dark grey'], styles: ['formal', 'modern', 'sophisticated'], formality: 'formal' },
  { id: 'prod-shirt-5', name: 'Burgundy Dress Shirt', price: 8800, image: '/images/products/generated/slim-fit-blazer-navy-11047388530002.png', category: 'Designer Shirts', colors: ['burgundy', 'maroon', 'wine', 'red'], styles: ['formal', 'bold', 'classic'], formality: 'formal' },
  { id: 'prod-shirt-6', name: 'Oxford Button-Down Sky Blue', price: 7200, image: '/images/products/generated/linen-button-down-shirt-11047388530003.png', category: 'Designer Shirts', colors: ['light blue', 'sky blue', 'blue', 'pastel blue'], styles: ['smart-casual', 'classic', 'refined'], formality: 'smart-casual' },

  // ─── Bespoke Tailoring (male-focused) ───
  { id: 'prod-tailoring-1', name: 'Bespoke Suit Package', price: 75000, image: '/images/products/generated/bespoke-suit-package-11047388819999.png', category: 'Bespoke Tailoring', colors: ['navy', 'charcoal', 'dark grey'], styles: ['formal', 'classic', 'sophisticated'], formality: 'formal' },
  { id: 'prod-tailoring-2', name: 'Italian Wool Tuxedo Set', price: 95000, image: '/images/products/generated/bespoke-suit-package-11047388819999.png', category: 'Bespoke Tailoring', colors: ['black', 'midnight', 'charcoal'], styles: ['formal', 'evening', 'bold'], formality: 'evening' },
  { id: 'prod-tailoring-3', name: 'Three-Piece Linen Suit', price: 68000, image: '/images/products/generated/bespoke-suit-package-11047388819999.png', category: 'Bespoke Tailoring', colors: ['beige', 'cream', 'ivory', 'camel'], styles: ['smart-casual', 'refined', 'classic'], formality: 'smart-casual' },
  { id: 'prod-tailoring-4', name: 'Burgundy Velvet Blazer Set', price: 55000, image: '/images/products/generated/bespoke-suit-package-11047388819999.png', category: 'Bespoke Tailoring', colors: ['burgundy', 'wine', 'maroon', 'deep red'], styles: ['evening', 'bold', 'sophisticated'], formality: 'evening' },
  { id: 'prod-tailoring-5', name: 'Slim Fit Business Suit Navy', price: 72000, image: '/images/products/generated/bespoke-suit-package-11047388819999.png', category: 'Bespoke Tailoring', colors: ['navy', 'blue', 'dark blue', 'midnight blue'], styles: ['formal', 'professional', 'modern'], formality: 'formal' },

  // ─── Luxury Watches (male-focused) ───
  { id: 'prod-watch-1', name: 'Royal Chronograph Gold', price: 45000, image: '/images/products/generated/royal-chronograph-gold-11047389823249.png', category: 'Luxury Watches', colors: ['gold', 'champagne', 'brown', 'camel'], styles: ['formal', 'classic', 'bold'], formality: 'formal' },
  { id: 'prod-watch-2', name: 'Midnight Skeleton Tourbillon', price: 89000, image: '/images/products/generated/midnight-skeleton-tourbillon-11047389829999.png', category: 'Luxury Watches', colors: ['black', 'midnight', 'dark'], styles: ['evening', 'sophisticated', 'bold'], formality: 'evening' },
  { id: 'prod-watch-3', name: 'Silver Automatic Dress Watch', price: 38000, image: '/images/products/generated/royal-chronograph-gold-11047389823249.png', category: 'Luxury Watches', colors: ['silver', 'grey', 'white', 'light'], styles: ['formal', 'minimalist', 'refined'], formality: 'formal' },
  { id: 'prod-watch-4', name: 'Rose Gold Pilot Chronograph', price: 52000, image: '/images/products/generated/midnight-skeleton-tourbillon-11047389829999.png', category: 'Luxury Watches', colors: ['rose gold', 'copper', 'warm'], styles: ['smart-casual', 'bold', 'modern'], formality: 'smart-casual' },
  { id: 'prod-watch-5', name: 'Navy Dial Racing Watch', price: 42000, image: '/images/products/generated/royal-chronograph-gold-11047389823249.png', category: 'Luxury Watches', colors: ['navy', 'blue', 'steel'], styles: ['casual', 'bold', 'modern'], formality: 'casual' },

  // ─── Premium Leather (male-focused) ───
  { id: 'prod-leather-1', name: 'Heritage Leather Briefcase', price: 28000, image: '/images/products/generated/heritage-leather-briefcase-11047388905745.png', category: 'Premium Leather', colors: ['brown', 'tan', 'camel', 'cognac'], styles: ['formal', 'classic', 'professional'], formality: 'formal' },
  { id: 'prod-leather-2', name: 'Artisan Wallet Collection', price: 12000, image: '/images/products/generated/artisan-wallet-collection-11047388909999.png', category: 'Premium Leather', colors: ['black', 'dark brown', 'charcoal'], styles: ['classic', 'minimalist', 'refined'], formality: 'formal' },
  { id: 'prod-leather-3', name: 'Saddle Leather Messenger Bag', price: 22000, image: '/images/products/generated/heritage-leather-briefcase-11047388905745.png', category: 'Premium Leather', colors: ['tan', 'brown', 'camel', 'beige'], styles: ['smart-casual', 'classic', 'refined'], formality: 'smart-casual' },
  { id: 'prod-leather-4', name: 'Black Leather Belt Collection', price: 8500, image: '/images/products/generated/artisan-wallet-collection-11047388909999.png', category: 'Premium Leather', colors: ['black', 'charcoal', 'dark'], styles: ['formal', 'minimalist', 'classic'], formality: 'formal' },

  // ─── Statement Accessories (male-focused) ───
  { id: 'prod-accessories-1', name: 'Onyx Cufflink Set', price: 9500, image: '/images/products/generated/onyx-cufflink-set-11047389419999.png', category: 'Statement Accessories', colors: ['black', 'silver', 'dark'], styles: ['formal', 'classic', 'sophisticated'], formality: 'formal' },
  { id: 'prod-accessories-2', name: 'Gold Tie Bar & Pocket Square Set', price: 7800, image: '/images/products/generated/onyx-cufflink-set-11047389419999.png', category: 'Statement Accessories', colors: ['gold', 'champagne', 'warm'], styles: ['formal', 'bold', 'classic'], formality: 'formal' },
  { id: 'prod-accessories-3', name: 'Silver Lapel Pin Collection', price: 5800, image: '/images/products/generated/onyx-cufflink-set-11047389419999.png', category: 'Statement Accessories', colors: ['silver', 'white', 'light'], styles: ['formal', 'refined', 'minimalist'], formality: 'formal' },
  { id: 'prod-accessories-4', name: 'Burgundy Silk Pocket Square', price: 4200, image: '/images/products/generated/onyx-cufflink-set-11047389419999.png', category: 'Statement Accessories', colors: ['burgundy', 'wine', 'red', 'deep red'], styles: ['formal', 'bold', 'classic'], formality: 'formal' },

  // ─── Handcrafted Shoes (gender-neutral) ───
  { id: 'prod-shoes-1', name: 'Hand-Stitched Oxford', price: 24000, image: '/images/products/generated/hand-stitched-oxford-11047388619999.png', category: 'Handcrafted Shoes', colors: ['brown', 'tan', 'cognac'], styles: ['formal', 'classic', 'refined'], formality: 'formal' },
  { id: 'prod-shoes-2', name: 'Suede Loafer Collection', price: 18000, image: '/images/products/generated/suede-loafer-collection-11047388629999.png', category: 'Handcrafted Shoes', colors: ['navy', 'blue', 'dark blue'], styles: ['smart-casual', 'modern', 'refined'], formality: 'smart-casual' },
  { id: 'prod-shoes-3', name: 'Black Cap-Toe Derby', price: 22000, image: '/images/products/generated/hand-stitched-oxford-11047388619999.png', category: 'Handcrafted Shoes', colors: ['black', 'charcoal', 'dark'], styles: ['formal', 'classic', 'professional'], formality: 'formal' },
  { id: 'prod-shoes-4', name: 'Italian Leather Monk Strap', price: 26000, image: '/images/products/generated/suede-loafer-collection-11047388629999.png', category: 'Handcrafted Shoes', colors: ['brown', 'cognac', 'camel'], styles: ['formal', 'bold', 'sophisticated'], formality: 'formal' },
  { id: 'prod-shoes-5', name: 'Tan Brogue Boot', price: 20000, image: '/images/products/generated/hand-stitched-oxford-11047388619999.png', category: 'Handcrafted Shoes', colors: ['tan', 'beige', 'camel', 'brown'], styles: ['smart-casual', 'classic', 'bold'], formality: 'smart-casual' },
  { id: 'prod-shoes-6', name: 'Rose Gold Heeled Sandal', price: 19500, image: '/images/products/generated/suede-loafer-collection-11047388629999.png', category: 'Handcrafted Shoes', colors: ['rose gold', 'gold', 'pink', 'warm'], styles: ['evening', 'elegant', 'bold'], formality: 'evening' },
  { id: 'prod-shoes-7', name: 'Black Stiletto Pump', price: 23000, image: '/images/products/generated/hand-stitched-oxford-11047388619999.png', category: 'Handcrafted Shoes', colors: ['black', 'dark'], styles: ['formal', 'elegant', 'classic'], formality: 'formal' },

  // ─── Designer Dresses (female-focused) ───
  { id: 'prod-dress-1', name: 'Embroidered Silk A-Line Dress', price: 32000, image: '/images/products/generated/embroidered-silk-a-line-dress-11047388430001.png', category: 'Designer Dresses', colors: ['teal', 'green', 'emerald'], styles: ['ethnic', 'elegant', 'cultural'], formality: 'ethnic' },
  { id: 'prod-dress-2', name: 'Gold Thread Kaftan Dress', price: 28000, image: '/images/products/generated/gold-thread-kaftan-dress-11047388430002.png', category: 'Designer Dresses', colors: ['gold', 'champagne', 'warm'], styles: ['ethnic', 'bold', 'cultural'], formality: 'ethnic' },
  { id: 'prod-dress-3', name: 'Teal Embroidered Ethnic Dress', price: 25000, image: '/images/products/generated/teal-embroidered-ethnic-dress-11047388430003.png', category: 'Designer Dresses', colors: ['teal', 'blue', 'green'], styles: ['ethnic', 'elegant', 'traditional'], formality: 'ethnic' },
  { id: 'prod-dress-4', name: 'Burgundy Velvet Evening Gown', price: 48000, image: '/images/products/generated/embroidered-silk-a-line-dress-11047388430001.png', category: 'Designer Dresses', colors: ['burgundy', 'wine', 'red', 'deep red'], styles: ['evening', 'bold', 'sophisticated'], formality: 'evening' },
  { id: 'prod-dress-5', name: 'Navy Silk Wrap Dress', price: 29000, image: '/images/products/generated/gold-thread-kaftan-dress-11047388430002.png', category: 'Designer Dresses', colors: ['navy', 'blue', 'dark blue'], styles: ['formal', 'elegant', 'modern'], formality: 'formal' },
  { id: 'prod-dress-6', name: 'Rose Pink Floral Midi Dress', price: 22000, image: '/images/products/generated/teal-embroidered-ethnic-dress-11047388430003.png', category: 'Designer Dresses', colors: ['pink', 'rose', 'floral', 'light'], styles: ['casual', 'elegant', 'refined'], formality: 'casual' },
  { id: 'prod-dress-7', name: 'Black Lace Cocktail Dress', price: 35000, image: '/images/products/generated/embroidered-silk-a-line-dress-11047388430001.png', category: 'Designer Dresses', colors: ['black', 'dark', 'lace'], styles: ['evening', 'sophisticated', 'bold'], formality: 'evening' },
  { id: 'prod-dress-8', name: 'Ivory Embroidered Shift Dress', price: 26000, image: '/images/products/generated/gold-thread-kaftan-dress-11047388430002.png', category: 'Designer Dresses', colors: ['ivory', 'cream', 'white', 'beige'], styles: ['smart-casual', 'elegant', 'classic'], formality: 'smart-casual' },

  // ─── Gold Necklaces (female-focused) ───
  { id: 'prod-necklace-1', name: 'Delicate Gold Pendant Necklace', price: 28000, image: '/images/products/generated/delicate-gold-pendant-necklace-11047388730001.png', category: 'Gold Necklaces', colors: ['gold', 'warm', 'champagne'], styles: ['elegant', 'minimalist', 'refined'], formality: 'formal' },
  { id: 'prod-necklace-2', name: 'Layered Gold Chain Necklace', price: 35000, image: '/images/products/generated/layered-gold-chain-necklace-11047388730002.png', category: 'Gold Necklaces', colors: ['gold', 'warm'], styles: ['bold', 'modern', 'sophisticated'], formality: 'smart-casual' },
  { id: 'prod-necklace-3', name: 'Gold Charm Necklace with Gemstone', price: 42000, image: '/images/products/generated/gold-charm-necklace-gemstone-11047388730003.png', category: 'Gold Necklaces', colors: ['gold', 'emerald', 'green', 'gemstone'], styles: ['elegant', 'cultural', 'bold'], formality: 'formal' },
  { id: 'prod-necklace-4', name: 'Rose Gold Choker Necklace', price: 31000, image: '/images/products/generated/delicate-gold-pendant-necklace-11047388730001.png', category: 'Gold Necklaces', colors: ['rose gold', 'pink', 'warm'], styles: ['modern', 'bold', 'elegant'], formality: 'evening' },
  { id: 'prod-necklace-5', name: 'Pearl Strand Necklace', price: 38000, image: '/images/products/generated/layered-gold-chain-necklace-11047388730002.png', category: 'Gold Necklaces', colors: ['white', 'pearl', 'ivory', 'cream'], styles: ['classic', 'elegant', 'refined'], formality: 'formal' },
  { id: 'prod-necklace-6', name: 'Silver & Sapphire Pendant', price: 33000, image: '/images/products/generated/gold-charm-necklace-gemstone-11047388730003.png', category: 'Gold Necklaces', colors: ['silver', 'blue', 'sapphire'], styles: ['elegant', 'minimalist', 'sophisticated'], formality: 'formal' },

  // ─── Smart Watches (female-focused) ───
  { id: 'prod-smartwatch-1', name: 'Elegance Smart Watch Black', price: 22000, image: '/images/products/generated/elegance-smart-watch-black-11047389830001.png', category: 'Smart Watches', colors: ['black', 'dark'], styles: ['modern', 'minimalist', 'sophisticated'], formality: 'smart-casual' },
  { id: 'prod-smartwatch-2', name: 'Luxe Fitness Tracker Rose Gold', price: 15000, image: '/images/products/generated/luxe-fitness-tracker-rose-gold-11047389830002.png', category: 'Smart Watches', colors: ['rose gold', 'pink', 'warm'], styles: ['casual', 'modern', 'elegant'], formality: 'casual' },
  { id: 'prod-smartwatch-3', name: 'Minimal Digital Watch Matte Black', price: 18000, image: '/images/products/generated/minimal-digital-watch-matte-black-11047389830003.png', category: 'Smart Watches', colors: ['black', 'matte', 'dark'], styles: ['modern', 'minimalist', 'bold'], formality: 'casual' },
  { id: 'prod-smartwatch-4', name: 'Gold Band Smart Watch', price: 25000, image: '/images/products/generated/elegance-smart-watch-black-11047389830001.png', category: 'Smart Watches', colors: ['gold', 'champagne', 'warm'], styles: ['elegant', 'modern', 'bold'], formality: 'formal' },
  { id: 'prod-smartwatch-5', name: 'Silver Link Smart Watch', price: 20000, image: '/images/products/generated/luxe-fitness-tracker-rose-gold-11047389830002.png', category: 'Smart Watches', colors: ['silver', 'grey', 'steel'], styles: ['modern', 'minimalist', 'refined'], formality: 'smart-casual' },

  // ─── Fine Jewelry (female-focused) ───
  { id: 'prod-jewelry-1', name: 'Emerald Tennis Bracelet', price: 62000, image: '/images/products/generated/emerald-tennis-bracelet-11047388709137.png', category: 'Fine Jewelry', colors: ['emerald', 'green', 'gold'], styles: ['elegant', 'classic', 'bold'], formality: 'formal' },
  { id: 'prod-jewelry-2', name: 'Sapphire Cascade Earrings', price: 38000, image: '/images/products/generated/sapphire-cascade-earrings-11047389954321.png', category: 'Fine Jewelry', colors: ['sapphire', 'blue', 'silver'], styles: ['elegant', 'sophisticated', 'bold'], formality: 'formal' },
  { id: 'prod-jewelry-3', name: 'Ruby Drop Earrings', price: 42000, image: '/images/products/generated/emerald-tennis-bracelet-11047388709137.png', category: 'Fine Jewelry', colors: ['ruby', 'red', 'burgundy', 'wine'], styles: ['evening', 'bold', 'elegant'], formality: 'evening' },
  { id: 'prod-jewelry-4', name: 'Pearl Cluster Bracelet', price: 28000, image: '/images/products/generated/sapphire-cascade-earrings-11047389954321.png', category: 'Fine Jewelry', colors: ['pearl', 'white', 'cream', 'ivory'], styles: ['classic', 'elegant', 'refined'], formality: 'formal' },
  { id: 'prod-jewelry-5', name: 'Rose Gold Bangle Set', price: 24000, image: '/images/products/generated/emerald-tennis-bracelet-11047388709137.png', category: 'Fine Jewelry', colors: ['rose gold', 'pink', 'warm'], styles: ['modern', 'elegant', 'bold'], formality: 'smart-casual' },

  // ─── Diamond Collection (female-focused) ───
  { id: 'prod-diamond-1', name: 'Diamond Solitaire Pendant', price: 95000, image: '/images/products/generated/diamond-solitaire-pendant-11047388709999.png', category: 'Diamond Collection', colors: ['white', 'silver', 'diamond'], styles: ['elegant', 'classic', 'sophisticated'], formality: 'formal' },
  { id: 'prod-diamond-2', name: 'Diamond Tennis Necklace', price: 120000, image: '/images/products/generated/diamond-solitaire-pendant-11047388709999.png', category: 'Diamond Collection', colors: ['white', 'silver', 'diamond'], styles: ['evening', 'bold', 'sophisticated'], formality: 'evening' },
  { id: 'prod-diamond-3', name: 'Diamond Stud Earrings', price: 55000, image: '/images/products/generated/diamond-solitaire-pendant-11047388709999.png', category: 'Diamond Collection', colors: ['white', 'silver', 'diamond'], styles: ['elegant', 'minimalist', 'classic'], formality: 'formal' },

  // ─── Designer Handbags (female-focused) ───
  { id: 'prod-bag-1', name: 'Quilted Chain Handbag', price: 52000, image: '/images/products/generated/quilted-chain-handbag-11047388019999.png', category: 'Designer Handbags', colors: ['black', 'dark', 'gold'], styles: ['elegant', 'classic', 'sophisticated'], formality: 'formal' },
  { id: 'prod-bag-2', name: 'Structured Tote in Calfskin', price: 42000, image: '/images/products/generated/structured-tote-calfskin-11047388029999.png', category: 'Designer Handbags', colors: ['tan', 'beige', 'camel', 'brown'], styles: ['formal', 'classic', 'professional'], formality: 'formal' },
  { id: 'prod-bag-3', name: 'Burgundy Crossbody Bag', price: 35000, image: '/images/products/generated/quilted-chain-handbag-11047388019999.png', category: 'Designer Handbags', colors: ['burgundy', 'wine', 'red', 'deep red'], styles: ['smart-casual', 'bold', 'modern'], formality: 'smart-casual' },
  { id: 'prod-bag-4', name: 'Navy Mini Satchel', price: 38000, image: '/images/products/generated/structured-tote-calfskin-11047388029999.png', category: 'Designer Handbags', colors: ['navy', 'blue', 'dark blue'], styles: ['smart-casual', 'elegant', 'refined'], formality: 'smart-casual' },
  { id: 'prod-bag-5', name: 'Rose Gold Evening Clutch', price: 28000, image: '/images/products/generated/quilted-chain-handbag-11047388019999.png', category: 'Designer Handbags', colors: ['rose gold', 'gold', 'pink', 'warm'], styles: ['evening', 'elegant', 'bold'], formality: 'evening' },

  // ─── Gemstone Jewelry (female-focused) ───
  { id: 'prod-gemstone-1', name: 'Emerald Cocktail Ring', price: 45000, image: '/images/products/generated/emerald-tennis-bracelet-11047388709137.png', category: 'Gemstone Jewelry', colors: ['emerald', 'green', 'gold'], styles: ['evening', 'bold', 'elegant'], formality: 'evening' },
  { id: 'prod-gemstone-2', name: 'Sapphire Statement Necklace', price: 58000, image: '/images/products/generated/sapphire-cascade-earrings-11047389954321.png', category: 'Gemstone Jewelry', colors: ['sapphire', 'blue', 'silver'], styles: ['evening', 'bold', 'sophisticated'], formality: 'evening' },
  { id: 'prod-gemstone-3', name: 'Ruby Tennis Bracelet', price: 52000, image: '/images/products/generated/diamond-solitaire-pendant-11047388709999.png', category: 'Gemstone Jewelry', colors: ['ruby', 'red', 'burgundy', 'gold'], styles: ['elegant', 'bold', 'classic'], formality: 'formal' },

  // ─── Premium Eyewear (gender-neutral) ───
  { id: 'prod-eyewear-1', name: 'Matte Black Rectangular Frames', price: 12000, image: '/images/products/generated/matte-black-rectangular-frames-11047389230001.png', category: 'Premium Eyewear', colors: ['black', 'dark', 'matte'], styles: ['modern', 'minimalist', 'professional'], formality: 'formal' },
  { id: 'prod-eyewear-2', name: 'Aviator Gold Sunglasses', price: 15000, image: '/images/products/generated/aviator-gold-sunglasses-11047389219999.png', category: 'Premium Eyewear', colors: ['gold', 'brown', 'warm'], styles: ['casual', 'classic', 'bold'], formality: 'casual' },
  { id: 'prod-eyewear-3', name: 'Tortoiseshell Cat-Eye Frames', price: 13500, image: '/images/products/generated/tortoiseshell-cat-eye-frames-11047389230002.png', category: 'Premium Eyewear', colors: ['brown', 'tortoiseshell', 'warm'], styles: ['elegant', 'bold', 'sophisticated'], formality: 'smart-casual' },
  { id: 'prod-eyewear-4', name: 'Silver Round Frames', price: 11000, image: '/images/products/generated/matte-black-rectangular-frames-11047389230001.png', category: 'Premium Eyewear', colors: ['silver', 'grey', 'light'], styles: ['minimalist', 'refined', 'classic'], formality: 'formal' },
  { id: 'prod-eyewear-5', name: 'Navy Blue Wayfarer', price: 14000, image: '/images/products/generated/aviator-gold-sunglasses-11047389219999.png', category: 'Premium Eyewear', colors: ['navy', 'blue', 'dark blue'], styles: ['smart-casual', 'modern', 'bold'], formality: 'smart-casual' },

  // ─── Designer Fragrances (gender-neutral) ───
  { id: 'prod-fragrance-1', name: 'Jardin Secret Eau de Parfum', price: 8500, image: '/images/products/generated/jardin-secret-eau-de-parfum-11047389036817.png', category: 'Designer Fragrances', colors: ['floral', 'pink', 'light'], styles: ['elegant', 'refined', 'classic'], formality: 'casual' },
  { id: 'prod-fragrance-2', name: 'Oud Royale Intense', price: 12000, image: '/images/products/generated/oud-royale-intense-11047389039999.png', category: 'Artisan Perfumes', colors: ['dark', 'amber', 'warm', 'brown'], styles: ['bold', 'sophisticated', 'evening'], formality: 'evening' },
  { id: 'prod-fragrance-3', name: 'Citrus Breeze Eau de Toilette', price: 7500, image: '/images/products/generated/jardin-secret-eau-de-parfum-11047389036817.png', category: 'Designer Fragrances', colors: ['yellow', 'citrus', 'light', 'fresh'], styles: ['casual', 'modern', 'fresh'], formality: 'casual' },
  { id: 'prod-fragrance-4', name: 'Noir Absolu Parfum', price: 15000, image: '/images/products/generated/oud-royale-intense-11047389039999.png', category: 'Artisan Perfumes', colors: ['black', 'dark', 'midnight'], styles: ['evening', 'bold', 'sophisticated'], formality: 'evening' },
  { id: 'prod-fragrance-5', name: 'White Musk Collection', price: 9500, image: '/images/products/generated/jardin-secret-eau-de-parfum-11047389036817.png', category: 'Designer Fragrances', colors: ['white', 'soft', 'light', 'cream'], styles: ['elegant', 'minimalist', 'refined'], formality: 'formal' },

  // ─── Silk & Cashmere (gender-neutral) ───
  { id: 'prod-cashmere-1', name: 'Cashmere Overcoat', price: 35000, image: '/images/products/generated/cashmere-overcoat-11047388414225.png', category: 'Silk & Cashmere', colors: ['camel', 'beige', 'tan', 'brown'], styles: ['formal', 'classic', 'refined'], formality: 'formal' },
  { id: 'prod-cashmere-2', name: 'Silk Evening Wrap', price: 18000, image: '/images/products/generated/silk-evening-wrap-11047388419999.png', category: 'Silk & Cashmere', colors: ['black', 'dark', 'midnight'], styles: ['evening', 'elegant', 'sophisticated'], formality: 'evening' },
  { id: 'prod-cashmere-3', name: 'Burgundy Cashmere Scarf', price: 12000, image: '/images/products/generated/cashmere-overcoat-11047388414225.png', category: 'Silk & Cashmere', colors: ['burgundy', 'wine', 'red', 'deep red'], styles: ['smart-casual', 'classic', 'bold'], formality: 'smart-casual' },
  { id: 'prod-cashmere-4', name: 'Ivory Silk Shawl', price: 15000, image: '/images/products/generated/silk-evening-wrap-11047388419999.png', category: 'Silk & Cashmere', colors: ['ivory', 'cream', 'white', 'beige'], styles: ['elegant', 'ethnic', 'refined'], formality: 'ethnic' },
  { id: 'prod-cashmere-5', name: 'Navy Cashmere V-Neck', price: 16000, image: '/images/products/generated/cashmere-overcoat-11047388414225.png', category: 'Silk & Cashmere', colors: ['navy', 'blue', 'dark blue'], styles: ['smart-casual', 'classic', 'refined'], formality: 'smart-casual' },

  // ─── Luxury Skincare (gender-neutral) ───
  { id: 'prod-skincare-1', name: 'Gold Essence Serum', price: 6800, image: '/images/products/generated/gold-essence-serum-11047389619999.png', category: 'Luxury Skincare', colors: ['gold', 'warm', 'champagne'], styles: ['elegant', 'refined', 'modern'], formality: 'casual' },
  { id: 'prod-skincare-2', name: 'Pearl Brightening Cream', price: 5500, image: '/images/products/generated/gold-essence-serum-11047389619999.png', category: 'Luxury Skincare', colors: ['white', 'pearl', 'cream'], styles: ['elegant', 'refined', 'classic'], formality: 'casual' },
  { id: 'prod-skincare-3', name: 'Midnight Recovery Oil', price: 7200, image: '/images/products/generated/gold-essence-serum-11047389619999.png', category: 'Luxury Skincare', colors: ['dark', 'blue', 'midnight'], styles: ['modern', 'sophisticated', 'bold'], formality: 'casual' },

  // ─── Luxury Sleepwear (gender-neutral) ───
  { id: 'prod-sleepwear-1', name: 'Silk Pajama Set', price: 14000, image: '/images/products/generated/silk-pajama-set-11047388219999.png', category: 'Luxury Sleepwear', colors: ['ivory', 'cream', 'white'], styles: ['elegant', 'classic', 'refined'], formality: 'casual' },
  { id: 'prod-sleepwear-2', name: 'Navy Silk Robe', price: 12000, image: '/images/products/generated/silk-pajama-set-11047388219999.png', category: 'Luxury Sleepwear', colors: ['navy', 'blue', 'dark blue'], styles: ['classic', 'sophisticated', 'refined'], formality: 'casual' },
  { id: 'prod-sleepwear-3', name: 'Burgundy Velvet Lounge Set', price: 16000, image: '/images/products/generated/silk-pajama-set-11047388219999.png', category: 'Luxury Sleepwear', colors: ['burgundy', 'wine', 'deep red'], styles: ['bold', 'elegant', 'sophisticated'], formality: 'casual' },
]

const AVAILABLE_CATEGORIES = [...new Set(PRODUCT_CATALOG.map(p => p.category))];

// ─── Gender-specific category lists ───
// v11: Categories appropriate for each gender

const MALE_CATEGORIES = [
  'Bespoke Tailoring',
  'Designer Shirts',
  'Luxury Watches',
  'Premium Eyewear',
  'Premium Leather',
  'Statement Accessories',
  'Handcrafted Shoes',
  'Designer Fragrances',
  'Artisan Perfumes',
  'Silk & Cashmere',
  'Luxury Skincare',
  'Luxury Sleepwear',
];

const FEMALE_CATEGORIES = [
  'Designer Dresses',
  'Gold Necklaces',
  'Smart Watches',
  'Premium Eyewear',
  'Fine Jewelry',
  'Designer Handbags',
  'Diamond Collection',
  'Gemstone Jewelry',
  'Designer Fragrances',
  'Artisan Perfumes',
  'Silk & Cashmere',
  'Luxury Skincare',
  'Luxury Sleepwear',
  'Handcrafted Shoes',
];

// Categories suitable for both genders
const GENDER_NEUTRAL_CATEGORIES = [
  'Premium Eyewear',
  'Designer Fragrances',
  'Artisan Perfumes',
  'Silk & Cashmere',
  'Luxury Skincare',
  'Luxury Sleepwear',
  'Handcrafted Shoes',
];

// ─── Category Keywords (v11: added Designer Shirts + gender-aware keywords) ───

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Designer Shirts': ['shirt', 'formal shirt', 'dress shirt', 'blazer', 'suit jacket', 'button-down', 'linen shirt', 'kurta', 'sherwani', 'polo', 'collared', 'slim fit'],
  'Smart Watches': ['smartwatch', 'smart watch', 'fitness tracker', 'digital watch', 'fitness band', 'smart watch black', 'lady smartwatch', 'wearable'],
  'Gold Necklaces': ['gold necklace', 'necklace', 'pendant', 'gold chain', 'chain necklace', 'pendant necklace', 'gold pendant', 'delicate necklace', 'charm necklace'],
  'Designer Dresses': ['dress', 'gown', 'frock', 'ethnic dress', 'embroidered dress', 'a-line dress', 'kaftan', 'silk dress', 'maxi dress', 'shift dress', 'anarkali', 'salwar', 'saree', 'lehenga'],
  'Premium Eyewear': ['eyewear', 'sunglasses', 'optical', 'glasses', 'spectacles', 'frames', 'prescription', 'rectangular frames', 'black frames', 'reading glasses'],
  'Luxury Watches': ['watch', 'chronograph', 'tourbillon', 'timepiece', 'wristwatch', 'analog watch', 'mechanical watch'],
  'Premium Leather': ['leather', 'briefcase', 'wallet', 'leather bag', 'leather belt'],
  'Fine Jewelry': ['jewelry', 'bracelet', 'earring', 'gemstone', 'bangle', 'ring'],
  'Designer Fragrances': ['fragrance', 'parfum', 'perfume', 'scent', 'cologne'],
  'Silk & Cashmere': ['silk', 'cashmere', 'overcoat', 'wrap', 'textile', 'scarf', 'shawl'],
  'Statement Accessories': ['accessories', 'cufflink', 'statement', 'ring', 'brooch', 'tie pin', 'pocket square'],
  'Designer Handbags': ['handbag', 'bag', 'tote', 'clutch', 'purse', 'shoulder bag'],
  'Luxury Skincare': ['skincare', 'serum', 'cream', 'beauty', 'cosmetics'],
  'Artisan Perfumes': ['perfume', 'artisan', 'oud', 'niche', 'attar'],
  'Handcrafted Shoes': ['shoes', 'oxford', 'loafer', 'footwear', 'heels', 'sneakers', 'pumps', 'sandals'],
  'Bespoke Tailoring': ['tailoring', 'suit', 'bespoke', 'custom', 'formal wear', 'blazer', 'tuxedo'],
  'Diamond Collection': ['diamond', 'solitaire'],
  'Gemstone Jewelry': ['gemstone', 'emerald', 'sapphire', 'ruby', 'precious stone'],
  'Luxury Sleepwear': ['sleepwear', 'pajama', 'lounge', 'nightwear', 'robe'],
};

// ─── Gender Inference from Profile Data (v11.1) ───
// When VLM doesn't detect gender, we infer from social profile data

function inferGenderFromProfile(
  googleData?: any,
  facebookData?: any,
  linkedinData?: any,
  instagramData?: any
): 'male' | 'female' | null {
  // Collect all available names
  const names: string[] = [];
  if (linkedinData?.profile?.name) names.push(linkedinData.profile.name);
  if (googleData?.profile?.name) names.push(googleData.profile.name);
  if (facebookData?.profile?.name) names.push(facebookData.profile.name);
  if (instagramData?.name) names.push(instagramData.name);
  if (instagramData?.username) names.push(instagramData.username);

  if (names.length === 0) return null;

  const fullName = names.join(' ').toLowerCase();
  const firstName = fullName.split(/\s+/)[0]; // First name is most gender-indicative

  // Common Indian male first names
  const maleNames = new Set([
    'rahul', 'amit', 'rajesh', 'suresh', 'vijay', 'anil', 'sunil', 'mohan', 'prakash', 'ramesh',
    'vikram', 'arjun', 'karan', 'rohit', 'manish', 'deepak', 'sanjay', 'ajay', 'ravi', 'ashok',
    'pradeep', 'naresh', 'mahesh', 'dinesh', 'raj', 'anand', 'sachin', 'nilesh', 'pankaj', 'jitendra',
    'harish', 'gaurav', 'nikhil', 'aditya', 'varun', 'siddharth', 'shivam', 'rahul', 'akash', 'darshit',
    'parth', 'dhruv', 'yash', 'pratik', 'sagar', 'bhavin', 'chirag', 'mehul', 'hardik', 'jay',
    'vivek', 'anurag', 'pranav', 'avinash', 'devang', 'haresh', 'kishor', 'nirav', 'paresh', 'rajan',
    'shailesh', 'tej', 'vimal', 'dhrumil', 'bhavik', 'keval', 'malay', 'naimish', 'omkar', 'param',
    'john', 'michael', 'david', 'james', 'robert', 'william', 'richard', 'thomas', 'charles', 'daniel',
    'matthew', 'andrew', 'joshua', 'kevin', 'brian', 'jason', 'timothy', 'ryan', 'mark', 'steven',
    'peter', 'adam', 'benjamin', 'nicholas', 'alexander', 'jonathan', 'christopher', 'patrick', 'sean', 'eric',
    'muhammad', 'ahmed', 'ali', 'hassan', 'omar', 'ibrahim', 'yusuf', 'khalid', 'hamza', 'bilal',
    'wei', 'zhang', 'li', 'wang', 'chen', 'liu', 'yang', 'huang', 'zhao', 'wu',
    'takeshi', 'kenji', 'hiroshi', 'yuki', 'akira', 'shin', 'ryo', 'taro', 'kaito', 'haruto',
    // v14.1: More common Western/international male names
    'anthony', 'carlos', 'christian', 'derek', 'edward', 'frank', 'george', 'henry', 'ian',
    'jose', 'kenneth', 'luis', 'marco', 'nathan', 'oscar', 'pablo', 'quinn', 'raymond', 'samuel',
    'trevor', 'victor', 'walter', 'xavier', 'zachary', 'aaron', 'blake', 'cole', 'dean', 'ethan',
    'felix', 'gavin', 'hugo', 'ivan', 'jeremy', 'kyle', 'logan', 'mason', 'noah', 'owen',
    'pedro', 'quentin', 'reuben', 'simon', 'theo', 'vincent', 'wyatt', 'xander', 'zane',
    'luca', 'mateo', 'diego', 'santiago', 'andres', 'rafael', 'gabriel', 'miguel', 'felipe', 'ricardo',
    'viktor', 'sergei', 'alexei', 'dmitri', 'oleg', 'maxim', 'artur', 'denis', 'ilya', 'kirill',
  ]);

  // Common Indian female first names
  const femaleNames = new Set([
    'priya', 'anita', 'sunita', 'rekha', 'sangeeta', 'pooja', 'neha', 'swati', 'manisha', 'divya',
    'aarti', 'nisha', 'meena', 'kavita', 'usha', 'lata', 'asha', 'geeta', 'seeta', 'radha',
    'shreya', 'ananya', 'riya', 'diya', 'pallavi', 'namrata', 'prachi', 'aasha', 'megha', 'rinki',
    'jigna', 'bharti', 'komal', 'nidhi', 'parul', 'shruti', 'tanya', 'urvashi', 'vandana', 'shivani',
    'sneha', 'payal', 'kajal', 'hema', 'jaya', 'mamta', 'ranjana', 'suman', 'vimla', 'kiran',
    'mary', 'jennifer', 'lisa', 'sarah', 'jessica', 'ashley', 'amanda', 'elizabeth', 'samantha', 'emily',
    'rachel', 'lauren', 'megan', 'nicole', 'stephanie', 'angela', 'michelle', 'katherine', 'christina', 'sophie',
    'olivia', 'emma', 'isabella', 'sophia', 'ava', 'mia', 'charlotte', 'amelia', 'harper', 'evelyn',
    'fatima', 'aisha', 'zainab', 'maryam', 'khadija', 'nour', 'layla', 'yasmin', 'huda', 'sara',
    'yuki', 'sakura', 'hana', 'mai', 'yui', 'haruka', 'miku', 'rin', 'aoi', 'mana',
  ]);

  // Check first name against known names
  if (maleNames.has(firstName)) {
    console.log('[Social Style] Gender inferred from name:', firstName, '→ MALE');
    return 'male';
  }
  if (femaleNames.has(firstName)) {
    console.log('[Social Style] Gender inferred from name:', firstName, '→ FEMALE');
    return 'female';
  }

  // Heuristic: Check for common male name suffixes (Indian names)
  if (firstName.endsWith('esh') || firstName.endsWith('jay') || firstName.endsWith('raj') ||
      firstName.endsWith('dev') || firstName.endsWith('pal') || firstName.endsWith('deep') ||
      firstName.endsWith('kumar') || firstName.endsWith('nath') || firstName.endsWith('bhai') ||
      firstName.endsWith('jit') || firstName.endsWith('raj') || firstName.endsWith('dip')) {
    console.log('[Social Style] Gender inferred from name suffix:', firstName, '→ MALE');
    return 'male';
  }

  // Heuristic: Common female name suffixes
  if (firstName.endsWith('ita') || firstName.endsWith('ika') || firstName.endsWith('sha') ||
      firstName.endsWith('na') || firstName.endsWith('ti') || firstName.endsWith('li') ||
      firstName.endsWith('ya') || firstName.endsWith('i') && firstName.length > 3) {
    // This is weak, don't rely on it alone
    console.log('[Social Style] Gender hint from name suffix:', firstName, '→ possibly FEMALE');
  }

  // Check LinkedIn headline for gender hints
  if (linkedinData?.profile?.headline) {
    const headline = linkedinData.profile.headline.toLowerCase();
    if (headline.includes(' he ') || headline.includes(' his ') || headline.includes('mr.') || headline.includes('mr ')) {
      return 'male';
    }
    if (headline.includes(' she ') || headline.includes(' her ') || headline.includes('ms.') || headline.includes('mrs.') || headline.includes('ms ')) {
      return 'female';
    }
  }

  console.log('[Social Style] Could not infer gender from profile data for name:', firstName);
  return null;
}

// ─── Fallback Analysis (v11: gender-neutral) ───

const FALLBACK_ANALYSIS_MALE_STATIC = {
  styleProfile: {
    tags: ['Classic', 'Refined', 'Sophisticated', 'Contemporary'],
    confidence: 0.87,
    description: 'Your style reflects a refined appreciation for timeless elegance combined with modern sensibility. You gravitate toward clean lines, premium fabrics, and understated luxury that speaks volumes without excess.',
  },
  colorPreferences: [
    { name: 'Deep Charcoal', hex: '#36454F', affinity: 0.92 },
    { name: 'Navy Blue', hex: '#1B2A4A', affinity: 0.88 },
    { name: 'Ivory & Cream', hex: '#FFFDD0', affinity: 0.85 },
    { name: 'Champagne Gold', hex: '#F7E7CE', affinity: 0.78 },
    { name: 'Burgundy', hex: '#800020', affinity: 0.72 },
    { name: 'Forest Green', hex: '#228B22', affinity: 0.65 },
  ],
  recommendedCategories: [
    { name: 'Bespoke Tailoring', match: 95, reason: 'Your professional style pairs perfectly with bespoke tailoring' },
    { name: 'Luxury Watches', match: 92, reason: 'A refined timepiece complements your sophisticated look' },
    { name: 'Designer Shirts', match: 89, reason: 'Premium shirts that match your refined aesthetic' },
    { name: 'Premium Eyewear', match: 86, reason: 'Refined frames that match your sophisticated aesthetic' },
    { name: 'Premium Leather', match: 82, reason: 'Quality leather goods complete a polished look' },
  ],
};

// v11.2: Dynamic fallback — generates varied results so every user doesn't get the same recommendations
function generateDynamicFallback(gender: 'male' | 'female'): any {
  // Randomize within a range so not every user sees the same numbers
  const randomOffset = () => Math.floor(Math.random() * 6) - 3; // -3 to +3
  const shuffleArray = <T>(arr: T[]): T[] => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  if (gender === 'male') {
    const allMaleColors = [
      { name: 'Deep Charcoal', hex: '#36454F', affinity: 0.92 },
      { name: 'Navy Blue', hex: '#1B2A4A', affinity: 0.88 },
      { name: 'Ivory & Cream', hex: '#FFFDD0', affinity: 0.85 },
      { name: 'Champagne Gold', hex: '#F7E7CE', affinity: 0.78 },
      { name: 'Burgundy', hex: '#800020', affinity: 0.72 },
      { name: 'Forest Green', hex: '#228B22', affinity: 0.65 },
      { name: 'Slate Grey', hex: '#708090', affinity: 0.68 },
      { name: 'Midnight Blue', hex: '#191970', affinity: 0.82 },
      { name: 'Camel', hex: '#C19A6B', affinity: 0.75 },
      { name: 'Charcoal Black', hex: '#2A2A2A', affinity: 0.90 },
    ];
    const selectedColors = shuffleArray(allMaleColors).slice(0, 6).map((c, i) => ({
      ...c,
      affinity: Math.min(0.99, Math.max(0.5, c.affinity + (randomOffset() / 100) - (i * 0.04))),
    })).sort((a, b) => b.affinity - a.affinity);

    const allMaleCategories = [
      { name: 'Bespoke Tailoring', match: 95, reason: 'Your professional style pairs perfectly with bespoke tailoring' },
      { name: 'Luxury Watches', match: 92, reason: 'A refined timepiece complements your sophisticated look' },
      { name: 'Designer Shirts', match: 89, reason: 'Premium shirts that match your refined aesthetic' },
      { name: 'Premium Eyewear', match: 86, reason: 'Refined frames that match your sophisticated aesthetic' },
      { name: 'Premium Leather', match: 82, reason: 'Quality leather goods complete a polished look' },
      { name: 'Handcrafted Shoes', match: 80, reason: 'Handcrafted shoes for the discerning gentleman' },
      { name: 'Statement Accessories', match: 78, reason: 'Cufflinks and accessories for the modern gentleman' },
      { name: 'Designer Fragrances', match: 76, reason: 'A signature scent for the refined man' },
    ];
    const selectedCategories = shuffleArray(allMaleCategories).slice(0, 5).map(c => ({
      ...c,
      match: Math.min(99, Math.max(70, c.match + randomOffset())),
    })).sort((a, b) => b.match - a.match);

    const descriptions = [
      'Your style reflects a refined appreciation for timeless elegance combined with modern sensibility. You gravitate toward clean lines, premium fabrics, and understated luxury.',
      'Your professional aesthetic balances classic tailoring with contemporary details. You appreciate quality craftsmanship and understated sophistication.',
      'You have a discerning eye for quality and detail. Your wardrobe combines classic pieces with modern accents for a polished, confident look.',
    ];

    return {
      styleProfile: {
        tags: shuffleArray(['Classic', 'Refined', 'Sophisticated', 'Contemporary', 'Modern', 'Professional', 'Minimalist']).slice(0, 4),
        confidence: 0.85 + Math.random() * 0.08,
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
      },
      colorPreferences: selectedColors,
      recommendedCategories: selectedCategories,
      recommendedProducts: selectedCategories.map(c => ({ category: c.name, reason: c.reason })),
    };
  } else {
    const allFemaleColors = [
      { name: 'Deep Teal', hex: '#008080', affinity: 0.94 },
      { name: 'Gold Embroidery', hex: '#D4AF37', affinity: 0.90 },
      { name: 'Jet Black', hex: '#1A1A1A', affinity: 0.87 },
      { name: 'Champagne Gold', hex: '#F7E7CE', affinity: 0.78 },
      { name: 'Ivory & Cream', hex: '#FFFDD0', affinity: 0.72 },
      { name: 'Slate Blue', hex: '#6A7BA2', affinity: 0.65 },
      { name: 'Rose Pink', hex: '#FF66CC', affinity: 0.82 },
      { name: 'Emerald Green', hex: '#046307', affinity: 0.76 },
      { name: 'Ruby Red', hex: '#9B111E', affinity: 0.84 },
      { name: 'Pearl White', hex: '#F0EAD6', affinity: 0.80 },
      { name: 'Sapphire Blue', hex: '#0F52BA', affinity: 0.88 },
      { name: 'Lavender', hex: '#B57EDC', affinity: 0.70 },
      { name: 'Coral', hex: '#FF7F50', affinity: 0.74 },
      { name: 'Burgundy', hex: '#800020', affinity: 0.86 },
    ];
    const selectedColors = shuffleArray(allFemaleColors).slice(0, 6).map((c, i) => ({
      ...c,
      affinity: Math.min(0.99, Math.max(0.5, c.affinity + (randomOffset() / 100) - (i * 0.04))),
    })).sort((a, b) => b.affinity - a.affinity);

    const allFemaleCategories = [
      { name: 'Smart Watches', match: 95, reason: 'Your modern style pairs perfectly with a sleek smartwatch' },
      { name: 'Gold Necklaces', match: 92, reason: 'A delicate gold necklace complements your elegant look' },
      { name: 'Designer Dresses', match: 89, reason: 'Your dress style suggests you would love our curated dress collection' },
      { name: 'Premium Eyewear', match: 86, reason: 'Refined frames that match your sophisticated aesthetic' },
      { name: 'Fine Jewelry', match: 82, reason: 'Sophisticated taste matches elegant jewelry selections' },
      { name: 'Designer Handbags', match: 84, reason: 'A designer handbag completes your elegant ensemble' },
      { name: 'Diamond Collection', match: 80, reason: 'Timeless diamond pieces for special occasions' },
      { name: 'Designer Fragrances', match: 78, reason: 'A signature fragrance that complements your style' },
      { name: 'Silk & Cashmere', match: 77, reason: 'Luxurious fabrics for your refined wardrobe' },
    ];
    const selectedCategories = shuffleArray(allFemaleCategories).slice(0, 5).map(c => ({
      ...c,
      match: Math.min(99, Math.max(70, c.match + randomOffset())),
    })).sort((a, b) => b.match - a.match);

    const descriptions = [
      'Your style reflects a refined appreciation for timeless elegance combined with modern sensibility. You gravitate toward rich colors, delicate accessories, and pieces that balance heritage with contemporary life.',
      'You have an eye for elegant details and sophisticated color palettes. Your wardrobe blends classic silhouettes with modern accents for a polished, confident look.',
      'Your fashion sense combines grace with bold choices. You appreciate quality craftsmanship and pieces that make a statement while remaining effortlessly chic.',
    ];

    return {
      styleProfile: {
        tags: shuffleArray(['Elegant', 'Cultural', 'Sophisticated', 'Modern', 'Refined', 'Classic', 'Artisanal']).slice(0, 4),
        confidence: 0.85 + Math.random() * 0.08,
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
      },
      colorPreferences: selectedColors,
      recommendedCategories: selectedCategories,
      recommendedProducts: selectedCategories.map(c => ({ category: c.name, reason: c.reason })),
    };
  }
}

// v12: REMOVED static fallback constants — they were computed ONCE at module load
// and then reused for every request, causing all users to get identical results.
// Now we always call generateDynamicFallback() at request time instead.

// ============================================================
// VLM Profile Picture Analysis — v11: Gender + Item Detection
// ============================================================

interface VisualAnalysis {
  isPerson?: boolean; // v11.2: whether image shows a real person (not a logo/avatar/icon)
  gender?: 'male' | 'female'; // v11 NEW: gender detection
  dominantColors: { name: string; hex: string; percentage: number }[];
  clothing: string[];
  accessories: string[];
  styleKeywords: string[];
  summary: string;
  // v11: Enhanced detected items — gender-aware
  detectedItems: {
    dress: { visible: boolean; description: string; color: string; style: string } | null;
    upperGarment: { visible: boolean; description: string; color: string; style: string } | null; // v11: shirt/blazer/suit for males
    necklace: { visible: boolean; description: string; material: string; style: string } | null;
    watch: { visible: boolean; description: string; type: string; color: string } | null;
    eyewear: { visible: boolean; description: string; frameColor: string; frameShape: string } | null;
  };
}

async function analyzeProfilePicture(avatarUrl: string): Promise<VisualAnalysis | null> {
  try {
    console.log('[Social Style] === VLM ANALYSIS START (v12) ===');
    console.log('[Social Style] Avatar URL:', avatarUrl?.substring(0, 120));

    // ─── Step A: Fetch image and convert to base64 ───
    let imageUrl = avatarUrl;
    let imageFetchOk = false;

    // v14: Detect if the URL is from a CDN that blocks server-side fetches
    const isFacebookCdn = avatarUrl.includes('fbcdn.net') || avatarUrl.includes('platform-lookaside.fbsbx.com');
    const isLinkedInCdn = avatarUrl.includes('media.licdn.com');
    const isBlockedCdn = isFacebookCdn || isLinkedInCdn;

    try {
      // v14: Use browser-like headers for CDN URLs that block server-side fetches
      const fetchHeaders: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      };
      if (isFacebookCdn) {
        // Facebook CDN requires a referer from facebook.com
        fetchHeaders['Referer'] = 'https://www.facebook.com/';
        fetchHeaders['Accept'] = 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8';
      }
      if (isLinkedInCdn) {
        // LinkedIn CDN requires a referer from linkedin.com
        fetchHeaders['Referer'] = 'https://www.linkedin.com/';
        fetchHeaders['Accept'] = 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8';
      }

      const imageResponse = await fetch(avatarUrl, {
        signal: AbortSignal.timeout(15000),
        headers: fetchHeaders,
      });
      if (imageResponse.ok) {
        const imageBuffer = await imageResponse.arrayBuffer();
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

        // v14: Validate that we actually got an image (not an HTML error page)
        if (!contentType.startsWith('image/')) {
          console.warn('[Social Style] v14: Avatar URL returned non-image content-type:', contentType);
          imageFetchOk = false;
        } else {
          const base64 = `data:${contentType};base64,${Buffer.from(imageBuffer).toString('base64')}`;
          imageUrl = base64;
          imageFetchOk = true;
          console.log('[Social Style] Image converted to base64, size:', Math.round(base64.length / 1024), 'KB');
        }
      } else {
        console.warn('[Social Style] Image fetch failed — status:', imageResponse.status, 'URL:', avatarUrl?.substring(0, 80));
        // v14: Log specific CDN blocking diagnosis
        if (imageResponse.status === 403 && isBlockedCdn) {
          console.warn(`[Social Style] v14: CDN blocked server-side fetch (403). ${isFacebookCdn ? 'Facebook' : 'LinkedIn'} CDN requires browser context. Consider using Google avatar instead.`);
        }
      }
    } catch (fetchError) {
      console.warn('[Social Style] Image fetch error:', fetchError instanceof Error ? fetchError.message : String(fetchError), 'URL:', avatarUrl?.substring(0, 80));
    }

    // v14: If image couldn't be fetched, VLM can't analyze a URL it can't access
    if (!imageFetchOk && imageUrl === avatarUrl) {
      console.error('[Social Style] v14: Could NOT fetch image for VLM — the URL may be expired or blocked by CDN. VLM will likely fail.');
      // For blocked CDNs (Facebook/LinkedIn), skip VLM entirely — it will just waste time
      if (isBlockedCdn) {
        console.warn('[Social Style] v14: Skipping VLM for blocked CDN URL — returning null early');
        return null;
      }
      // For other URLs, still try VLM with the original URL (some providers can fetch it themselves)
    }

    // ─── Step B: Call VLM — v11 ENHANCED PROMPT with gender detection ───
    const VLM_PROMPT = `FIRST: Determine if this image shows a REAL PERSON or is a logo/icon/avatar/illustration.

If the image is NOT a real person (it's a logo, icon, cartoon, illustration, brand mark, or generic avatar), return:
{
  "isPerson": false,
  "gender": null,
  "dominantColors": [{"name": "Color Name", "hex": "#hexcode", "percentage": 100}],
  "clothing": [],
  "accessories": [],
  "styleKeywords": [],
  "summary": "Image is not a person photo",
  "detectedItems": {
    "dress": {"visible": false, "description": "", "color": "", "style": ""},
    "upperGarment": {"visible": false, "description": "", "color": "", "style": ""},
    "necklace": {"visible": false, "description": "", "material": "", "style": ""},
    "watch": {"visible": false, "description": "", "type": "", "color": ""},
    "eyewear": {"visible": false, "description": "", "frameColor": "", "frameShape": ""}
  }
}

If the image IS a real person, analyze their fashion style and return:
{
  "isPerson": true,
  "gender": "male" or "female",
  "dominantColors": [
    {"name": "Descriptive Color Name", "hex": "#hexcode", "percentage": 35}
  ],
  "clothing": ["list of clothing items visible with colors and details"],
  "accessories": ["list of ALL accessories visible"],
  "styleKeywords": ["4-6 style adjectives"],
  "summary": "1-2 sentence description of this person's overall style",
  "detectedItems": {
    "dress": {
      "visible": true/false,
      "description": "e.g. Teal A-line dress with gold embroidery (only if wearing a dress/gown)",
      "color": "e.g. Deep Teal",
      "style": "e.g. Embroidered A-line / Ethnic / Casual / Formal"
    },
    "upperGarment": {
      "visible": true/false,
      "description": "e.g. Navy slim-fit blazer over white dress shirt (for shirts/blazers/suits/jackets)",
      "color": "e.g. Navy Blue",
      "style": "e.g. Formal / Business / Casual / Smart Casual"
    },
    "necklace": {
      "visible": true/false,
      "description": "e.g. Delicate gold pendant necklace at collarbone",
      "material": "e.g. Gold / Silver / Rose Gold",
      "style": "e.g. Pendant / Chain / Layered / Choker"
    },
    "watch": {
      "visible": true/false,
      "description": "e.g. Black smartwatch with sleek band on left wrist",
      "type": "e.g. Smartwatch / Analog / Digital / Fitness Tracker",
      "color": "e.g. Black / Silver / Gold"
    },
    "eyewear": {
      "visible": true/false,
      "description": "e.g. Matte black rectangular prescription glasses",
      "frameColor": "e.g. Black / Tortoiseshell / Gold",
      "frameShape": "e.g. Rectangular / Round / Cat-eye / Aviator"
    }
  }
}

CRITICAL RULES (FOLLOW IN ORDER):

RULE 0 — IS PERSON CHECK (HIGHEST PRIORITY):
- If the image shows a LOGO, BRAND MARK, ICON, CARTOON, ILLUSTRATION, SILHOUETTE, or GENERIC AVATAR → set isPerson=false
- Real person photos will show a face with skin, eyes, hair, and usually clothing
- Company logos (like a "3 Boxes" logo), letter marks, geometric shapes → isPerson=false
- When in doubt, if you cannot see a real human face, set isPerson=false

RULE 1 — GENDER (SECOND PRIORITY):
- Look at the person and determine if they are "male" or "female". This determines which product categories to recommend. Be accurate — if the person appears male, set gender to "male".

RULE 2 — COLOR DETECTION (STRICT — DO NOT GUESS):
This is the most error-prone part. Follow this EXACT process:

STEP 2A: Identify the MAIN garment first.
- If the person is wearing a DRESS/GOWN/SAREE: that is the main garment.
- If the person is wearing a SHIRT/BLOUSE/JACKET: the largest visible garment is the main garment.
- Name the main garment in "detectedItems" (dress or upperGarment).

STEP 2B: Determine the main garment's color using this method:
- Look at the main garment as a whole. What is its OVERALL color tone?
- Ask yourself: Does this garment look more RED, ORANGE, YELLOW, GREEN, BLUE, or PURPLE?
- Then refine: Is it a light or dark shade? Warm or cool tone?
- Match to a SPECIFIC color name. Examples of precise names:
  * Greenish-blue → "Teal" or "Deep Teal" (NOT "Blue" or "Green")
  * Dark red → "Burgundy" or "Maroon" (NOT "Red")
  * Light purple → "Lavender" (NOT "Purple")
  * Dark blue → "Navy Blue" (NOT "Blue")
  * Blue-green → "Teal" or "Turquoise" (NOT "Blue" or "Green")
  * Reddish-purple → "Plum" or "Burgundy" (NOT "Red" or "Purple")
- The main garment color MUST be the FIRST entry in dominantColors with the HIGHEST percentage (typically 40-70%).

STEP 2C: List ONLY colors you can ACTUALLY SEE in the image.
- Each color in dominantColors must correspond to a REAL, VISIBLE part of the outfit or accessories.
- Do NOT include: colors you "think would complement", "imagined" colors, or colors from the background.
- If a dress has embroidery/trim in a different color, include that (e.g., "Gold Embroidery" for gold thread on a teal dress).
- Hair color can be included if prominent (e.g., "Jet Black" for dark hair).
- Skin tone should NOT be included as a color.
- Maximum 5 colors. Only include a color if you are CONFIDENT it is visible.

STEP 2D: Set percentages proportional to VISUAL AREA.
- The main garment color should dominate: 40-70% if it covers most of the outfit.
- Secondary colors get lower percentages based on how much visible area they actually occupy.
- Percentages should roughly total 100%.

IMPORTANT: If you see a dress that appears blue-green / greenish-blue, call it "Deep Teal" or "Teal" — do NOT call it "Sapphire Blue", "Navy Blue", "Royal Blue", "Coral", or "Burgundy". Teal is a DISTINCT color between green and blue. If you are unsure between blue and green, it is likely TEAL.

RULE 3 — detectedItems (GENDER-AWARE):
- For FEMALE persons: Focus on "dress" (dress/gown/saree/kaftan), "necklace", "watch", "eyewear"
- For MALE persons: Focus on "upperGarment" (shirt/blazer/suit jacket/kurta), "watch", "eyewear"
- If the person is MALE, "dress" should typically be visible=false
- If the person is FEMALE, "upperGarment" can describe their top/blouse if no dress
- Do NOT guess or invent items that are not visible
- Be SPECIFIC: "navy slim-fit blazer" not just "blazer", "gold chronograph watch" not just "watch"
- The "color" field in detectedItems MUST match the color name in dominantColors for that garment

RULE 4 — clothing: Describe ALL visible clothing items with their EXACT colors, fabrics, and details. The description must match the color you identified in Rule 2.

RULE 5 — accessories: List EVERY accessory you can see — necklace, watch, glasses, earrings, rings, bracelets, bags, belts, cufflinks, tie, pocket square, etc. Only list what is actually VISIBLE.

RULE 6 — styleKeywords: 4-6 adjectives describing the OVERALL fashion style. For males: Classic, Refined, Professional, Modern, Bold, Sophisticated, Minimalist. For females: Elegant, Traditional, Modern, Bold, Cultural, Sophisticated, Artisanal.

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
    console.log('[Social Style] VLM raw response length:', rawContent.length);
    console.log('[Social Style] VLM response preview:', rawContent.substring(0, 500));

    let cleanedContent = rawContent.trim();
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    const analysis: VisualAnalysis = JSON.parse(cleanedContent);

    // ─── v11.2: Check if image is NOT a person (logo/icon/avatar) ───
    if (analysis.isPerson === false) {
      console.log('[Social Style] v11.2: VLM detected image is NOT a person (logo/icon/avatar). Skipping visual analysis.');
      // Return null so the system falls back to profile-based gender inference
      // instead of using garbage visual data from a logo
      return null;
    }

    // Extra safety: if VLM didn't set isPerson but there are no clothing items
    // and no accessories detected, it's likely not a person photo
    if (analysis.isPerson === undefined) {
      const clothingStr = (analysis.clothing || []).join(' ').toLowerCase();
      const accessoryStr = (analysis.accessories || []).join(' ').toLowerCase();
      const hasNoClothing = clothingStr.length === 0 || clothingStr === 'none' || clothingStr === 'n/a';
      const hasNoAccessories = accessoryStr.length === 0 || accessoryStr === 'none' || accessoryStr === 'n/a';
      const hasNoItems = !analysis.detectedItems?.dress?.visible && !analysis.detectedItems?.upperGarment?.visible &&
        !analysis.detectedItems?.necklace?.visible && !analysis.detectedItems?.watch?.visible && !analysis.detectedItems?.eyewear?.visible;

      if (hasNoClothing && hasNoAccessories && hasNoItems) {
        console.log('[Social Style] v11.2: No clothing/accessories/items detected — image is likely NOT a person. Skipping visual analysis.');
        return null;
      }
    }

    // ─── v11: Post-process gender detection ───
    // If VLM didn't return gender, infer from detected items
    if (!analysis.gender) {
      const clothingStr = (analysis.clothing || []).join(' ').toLowerCase();
      const accessoryStr = (analysis.accessories || []).join(' ').toLowerCase();
      const hasDress = clothingStr.includes('dress') || clothingStr.includes('gown') || clothingStr.includes('saree') || clothingStr.includes('kaftan');
      const hasMaleClothing = clothingStr.includes('shirt') || clothingStr.includes('blazer') || clothingStr.includes('suit') || clothingStr.includes('tie') || clothingStr.includes('kurta') || clothingStr.includes('sherwani');
      const hasFemaleAccessories = accessoryStr.includes('necklace') || accessoryStr.includes('earring') || accessoryStr.includes('bangle');

      if (hasMaleClothing && !hasDress) {
        analysis.gender = 'male';
      } else if (hasDress || hasFemaleAccessories) {
        analysis.gender = 'female';
      } else {
        // Default to female but log warning
        analysis.gender = 'female';
        console.warn('[Social Style] Could not determine gender from clothing, defaulting to female');
      }
    }

    // Ensure detectedItems exists (backward compatibility)
    if (!analysis.detectedItems) {
      analysis.detectedItems = {
        dress: null,
        upperGarment: null,
        necklace: null,
        watch: null,
        eyewear: null,
      };
      // Try to infer from clothing/accessories
      const clothingStr = (analysis.clothing || []).join(' ').toLowerCase();
      const accessoryStr = (analysis.accessories || []).join(' ').toLowerCase();

      if (clothingStr.includes('dress') || clothingStr.includes('gown') || clothingStr.includes('kaftan') || clothingStr.includes('saree')) {
        analysis.detectedItems.dress = { visible: true, description: clothingStr, color: '', style: '' };
      }
      if (clothingStr.includes('shirt') || clothingStr.includes('blazer') || clothingStr.includes('suit') || clothingStr.includes('jacket') || clothingStr.includes('kurta')) {
        analysis.detectedItems.upperGarment = { visible: true, description: clothingStr, color: '', style: '' };
      }
      if (accessoryStr.includes('necklace') || accessoryStr.includes('pendant') || accessoryStr.includes('chain')) {
        analysis.detectedItems.necklace = { visible: true, description: accessoryStr, material: '', style: '' };
      }
      if (accessoryStr.includes('watch') || accessoryStr.includes('smartwatch')) {
        analysis.detectedItems.watch = { visible: true, description: accessoryStr, type: '', color: '' };
      }
      if (accessoryStr.includes('glass') || accessoryStr.includes('eyewear') || accessoryStr.includes('spectacle')) {
        analysis.detectedItems.eyewear = { visible: true, description: accessoryStr, frameColor: '', frameShape: '' };
      }
    }

    // v11: Ensure upperGarment exists for backward compatibility
    if (!analysis.detectedItems.upperGarment) {
      analysis.detectedItems.upperGarment = null;
    }

    // v11: Cross-validate — if male, dress should NOT be visible
    if (analysis.gender === 'male' && analysis.detectedItems.dress?.visible) {
      // The VLM may have misidentified a shirt/jacket as a dress for a male
      // Move the dress description to upperGarment
      if (!analysis.detectedItems.upperGarment?.visible) {
        analysis.detectedItems.upperGarment = {
          visible: true,
          description: analysis.detectedItems.dress.description,
          color: analysis.detectedItems.dress.color,
          style: analysis.detectedItems.dress.style,
        };
      }
      analysis.detectedItems.dress = { visible: false, description: '', color: '', style: '' };
      console.log('[Social Style] v11 FIX: Moved male "dress" to "upperGarment"');
    }

    // ─── v17: DUAL-PASS VLM FOR COLOR CONSISTENCY ───
    // Run VLM a second time and merge colors — only keep colors
    // that appear in BOTH passes (consensus). This eliminates
    // hallucinated colors that the model invents on one call only.

    console.log('[Social Style] v17: Running VLM PASS 2 for color consensus...');

    try {
      const pass2Result = await aiVision([
        {
          role: 'user',
          content: [
            { type: 'text', text: VLM_PROMPT },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ]);

      const pass2Raw = pass2Result.choices?.[0]?.message?.content || '';
      let pass2Cleaned = pass2Raw.trim();
      if (pass2Cleaned.startsWith('```')) {
        pass2Cleaned = pass2Cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      }
      const pass2Analysis: VisualAnalysis = JSON.parse(pass2Cleaned);

      if (pass2Analysis.dominantColors?.length) {
        // ─── Merge colors using consensus ───
        // Colors that appear in BOTH passes get HIGH confidence
        // Colors that appear in only ONE pass get REDUCED confidence
        const pass1Colors = analysis.dominantColors || [];
        const pass2Colors = pass2Analysis.dominantColors || [];

        // Helper: check if a color name matches (fuzzy — "Deep Teal" matches "Teal")
        const colorsMatch = (a: string, b: string): boolean => {
          const aLow = a.toLowerCase();
          const bLow = b.toLowerCase();
          if (aLow === bLow) return true;
          // Partial match: "deep teal" contains "teal"
          const aWords = aLow.split(/\s+/);
          const bWords = bLow.split(/\s+/);
          return aWords.some(w => w.length > 2 && bWords.some(bw => bw.includes(w) || w.includes(bw)));
        };

        // Build consensus color list
        const consensusColors: { name: string; hex: string; percentage: number; consensus: 'both' | 'pass1' | 'pass2' }[] = [];

        // First, add colors from pass 1
        for (const c1 of pass1Colors) {
          const matchInPass2 = pass2Colors.find((c2: any) => colorsMatch(c1.name, c2.name));
          if (matchInPass2) {
            // CONSENSUS — color found in BOTH passes → keep it with averaged percentage
            consensusColors.push({
              name: c1.name,
              hex: c1.hex,
              percentage: Math.round((c1.percentage + matchInPass2.percentage) / 2),
              consensus: 'both',
            });
          } else {
            // Only in pass 1 → lower confidence
            consensusColors.push({
              name: c1.name,
              hex: c1.hex,
              percentage: Math.round(c1.percentage * 0.5),
              consensus: 'pass1',
            });
          }
        }

        // Add colors only in pass 2 (not already matched)
        for (const c2 of pass2Colors) {
          const alreadyAdded = consensusColors.some(cc => colorsMatch(cc.name, c2.name));
          if (!alreadyAdded) {
            consensusColors.push({
              name: c2.name,
              hex: c2.hex,
              percentage: Math.round(c2.percentage * 0.5),
              consensus: 'pass2',
            });
          }
        }

        // Sort: consensus colors first (highest priority), then by percentage
        consensusColors.sort((a, b) => {
          if (a.consensus === 'both' && b.consensus !== 'both') return -1;
          if (a.consensus !== 'both' && b.consensus === 'both') return 1;
          return b.percentage - a.percentage;
        });

        // Replace dominantColors with consensus-merged colors
        analysis.dominantColors = consensusColors.slice(0, 5).map(c => ({
          name: c.name,
          hex: c.hex,
          percentage: c.percentage,
        }));

        // Also merge gender — if both passes agree, keep it; if they disagree, keep pass 1
        if (pass2Analysis.gender && pass2Analysis.gender !== analysis.gender) {
          console.log(`[Social Style] v17: Gender disagreement — Pass1: ${analysis.gender}, Pass2: ${pass2Analysis.gender}. Keeping Pass1.`);
        }

        // Merge detectedItems — use pass 2 to fill in gaps from pass 1
        if (pass2Analysis.detectedItems) {
          if (!analysis.detectedItems?.dress?.visible && pass2Analysis.detectedItems.dress?.visible) {
            analysis.detectedItems.dress = pass2Analysis.detectedItems.dress;
          }
          if (!analysis.detectedItems?.upperGarment?.visible && pass2Analysis.detectedItems.upperGarment?.visible) {
            analysis.detectedItems.upperGarment = pass2Analysis.detectedItems.upperGarment;
          }
          if (!analysis.detectedItems?.necklace?.visible && pass2Analysis.detectedItems.necklace?.visible) {
            analysis.detectedItems.necklace = pass2Analysis.detectedItems.necklace;
          }
          if (!analysis.detectedItems?.watch?.visible && pass2Analysis.detectedItems.watch?.visible) {
            analysis.detectedItems.watch = pass2Analysis.detectedItems.watch;
          }
          if (!analysis.detectedItems?.eyewear?.visible && pass2Analysis.detectedItems.eyewear?.visible) {
            analysis.detectedItems.eyewear = pass2Analysis.detectedItems.eyewear;
          }
        }

        console.log('[Social Style] v17: COLOR CONSENSUS RESULT:');
        consensusColors.slice(0, 5).forEach(c => {
          console.log(`  ${c.consensus === 'both' ? '✓' : '?'} ${c.name} (${c.percentage}%) — ${c.consensus}`);
        });
      }
    } catch (pass2Error) {
      console.warn('[Social Style] v17: Pass 2 failed, using Pass 1 results only:', pass2Error instanceof Error ? pass2Error.message : String(pass2Error));
    }

    console.log('[Social Style] === VLM ANALYSIS SUCCESS (v17 dual-pass) ===');
    console.log('[Social Style] GENDER:', analysis.gender);
    console.log('[Social Style] Colors:', analysis.dominantColors?.map((c: any) => c.name).join(', '));
    console.log('[Social Style] Clothing:', analysis.clothing?.join(', '));
    console.log('[Social Style] Accessories:', analysis.accessories?.join(', '));
    console.log('[Social Style] Detected Dress:', analysis.detectedItems?.dress?.visible ? analysis.detectedItems.dress.description : 'NOT VISIBLE');
    console.log('[Social Style] Detected Upper Garment:', analysis.detectedItems?.upperGarment?.visible ? analysis.detectedItems.upperGarment.description : 'NOT VISIBLE');
    console.log('[Social Style] Detected Necklace:', analysis.detectedItems?.necklace?.visible ? analysis.detectedItems.necklace.description : 'NOT VISIBLE');
    console.log('[Social Style] Detected Watch:', analysis.detectedItems?.watch?.visible ? analysis.detectedItems.watch.description : 'NOT VISIBLE');
    console.log('[Social Style] Detected Eyewear:', analysis.detectedItems?.eyewear?.visible ? analysis.detectedItems.eyewear.description : 'NOT VISIBLE');
    return analysis;
  } catch (error) {
    console.error('[Social Style] === VLM ANALYSIS FAILED ===');
    console.error('[Social Style] Error:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

// ============================================================
// Main POST Handler
// ============================================================

export async function POST(request: NextRequest) {
  const debugTrace: string[] = [];

  try {
    const body = await request.json();
    const { networks, googleData, facebookData, linkedinData, instagramData } = body;

    console.log('[Social Style] === REQUEST (v14) ===');
    console.log('[Social Style] Networks:', networks);
    console.log('[Social Style] LinkedIn avatar:', linkedinData?.profile?.avatar ? linkedinData.profile.avatar.substring(0, 80) + '...' : 'NONE');
    console.log('[Social Style] Google avatar:', googleData?.profile?.avatar ? googleData.profile.avatar.substring(0, 80) + '...' : 'NONE');
    console.log('[Social Style] Facebook avatar:', facebookData?.profile?.avatar ? facebookData.profile.avatar.substring(0, 80) + '...' : 'NONE');
    console.log('[Social Style] LinkedIn name:', linkedinData?.profile?.name || 'N/A');

    // ─── Step 1: VLM analysis of profile picture ───
    // v14: Check avatar URL freshness BEFORE trying VLM.
    // Facebook/LinkedIn URLs expire — detect and attempt refresh.
    let visualAnalysis: VisualAnalysis | null = null;
    const avatarUrls: string[] = [];
    const avatarUrlDiagnostics: string[] = []; // v14: Track freshness for each URL

    // v14: Build avatar URL list with freshness checks
    // Priority order: Google (most reliable) > LinkedIn > Facebook (most likely expired/blocked)
    const avatarCandidates: Array<{ url: string; source: string; accessToken?: string }> = [];

    if (googleData?.profile?.avatar) {
      avatarCandidates.push({ url: googleData.profile.avatar, source: 'google', accessToken: googleData.accessToken });
    }
    if (linkedinData?.profile?.avatar) {
      avatarCandidates.push({ url: linkedinData.profile.avatar, source: 'linkedin', accessToken: linkedinData.accessToken });
    }
    if (facebookData?.profile?.avatar) {
      avatarCandidates.push({ url: facebookData.profile.avatar, source: 'facebook', accessToken: facebookData.accessToken });
    }

    // v14: Check each URL for expiration and attempt refresh if expired
    for (const candidate of avatarCandidates) {
      const check = checkAvatarUrl(candidate.url, candidate.source);
      avatarUrlDiagnostics.push(`[${candidate.source}] ${check.freshnessNote} (expired=${check.isExpired}, blocked=${check.isLikelyBlocked})`);
      console.log(`[Social Style] v14: Avatar check [${candidate.source}]: ${check.freshnessNote}`);

      if (check.isExpired && candidate.accessToken) {
        // v14: Try to refresh the expired URL
        console.log(`[Social Style] v14: ${candidate.source} avatar URL is EXPIRED, attempting refresh...`);
        let freshUrl: string | null = null;
        if (candidate.source === 'facebook') {
          freshUrl = await refreshFacebookAvatar(candidate.accessToken);
        } else if (candidate.source === 'linkedin') {
          freshUrl = await refreshLinkedInAvatar(candidate.accessToken);
        } else if (candidate.source === 'google') {
          freshUrl = await refreshGoogleAvatar(candidate.accessToken);
        }
        if (freshUrl) {
          console.log(`[Social Style] v14: Got fresh ${candidate.source} avatar URL`);
          avatarUrls.push(freshUrl);
        } else {
          // Refresh failed — still try the expired URL (VLM provider might be able to fetch it)
          console.log(`[Social Style] v14: Refresh failed for ${candidate.source}, will try expired URL anyway`);
          avatarUrls.push(candidate.url);
        }
      } else {
        avatarUrls.push(candidate.url);
      }
    }

    // v14: Also log which social data was received (debugging incomplete frontend payloads)
    console.log('[Social Style] v14: Social data received:', {
      google: !!googleData?.profile,
      facebook: !!facebookData?.profile,
      linkedin: !!linkedinData?.profile,
      instagram: !!instagramData,
    });

    if (avatarUrls.length > 0) {
      // v14: Try each avatar URL until one succeeds
      for (let i = 0; i < avatarUrls.length; i++) {
        console.log(`[Social Style] v14: Trying avatar URL ${i + 1}/${avatarUrls.length}`);
        visualAnalysis = await analyzeProfilePicture(avatarUrls[i]);
        if (visualAnalysis) {
          console.log(`[Social Style] v14: VLM succeeded with avatar URL ${i + 1}`);
          break;
        }
        console.log(`[Social Style] v14: Avatar URL ${i + 1} failed or not-a-person, trying next...`);
      }
      debugTrace.push(`VLM: ${visualAnalysis ? 'SUCCESS' : 'FAILED/NOT_PERSON'} (tried ${avatarUrls.length} avatar(s))`);
      // v14: Add avatar freshness diagnostics to debug trace
      for (const diag of avatarUrlDiagnostics) {
        debugTrace.push(`Avatar: ${diag}`);
      }
    } else {
      debugTrace.push('VLM: SKIPPED (no avatar)');
    }

    // v12: Track which analysis source was used
    let analysisSource = 'UNKNOWN';

    // v11.2: If VLM returned null (logo/not-person), log it
    if (!visualAnalysis && avatarUrls.length > 0) {
      console.log('[Social Style] v14: VLM did not return visual analysis. Possible reasons: (1) image not a person, (2) image URL expired/blocked by CDN, (3) VLM API error. Using profile-based analysis only.');
      analysisSource = 'NO_VLM';
    } else if (visualAnalysis) {
      analysisSource = 'VLM_OK';
    }

    // v15→v16: Determine gender — multi-source detection with NO hardcoded default
    // Priority order: OAuth provider (FB > Google > LinkedIn) > VLM > Profile name > Clothing > Network signals
    // If gender truly can't be determined, we use null (gender-neutral products)
    let detectedGender: 'male' | 'female' | null = null;
    const genderSource = ['unknown'];

    // Priority 0a: OAuth-provided gender from Facebook Graph API (most reliable)
    // Facebook Graph API returns 'gender' field when requested (v15: now requested in callback)
    const facebookGenderRaw = facebookData?.gender || facebookData?.profile?.gender || null;
    if (facebookGenderRaw === 'male' || facebookGenderRaw === 'female') {
      detectedGender = facebookGenderRaw;
      genderSource[0] = 'OAUTH-FACEBOOK';
      console.log('[Social Style] v16: Gender from Facebook OAuth =', detectedGender);
    }

    // Priority 0b: OAuth-provided gender from Google People API (v16: added)
    // Google People API returns 'genders' field when user.gender.read scope is requested
    if (genderSource[0] === 'unknown') {
      const googleGenderRaw = googleData?.gender || googleData?.profile?.gender || null;
      if (googleGenderRaw === 'male' || googleGenderRaw === 'female') {
        detectedGender = googleGenderRaw;
        genderSource[0] = 'OAUTH-GOOGLE';
        console.log('[Social Style] v16: Gender from Google People API =', detectedGender);
      }
    }

    // Priority 0c: OAuth-provided gender from LinkedIn name inference (v16: added)
    // LinkedIn's OpenID Connect API doesn't provide gender, so the OAuth callback
    // infers it from the user's first name and passes it through
    if (genderSource[0] === 'unknown') {
      const linkedinGenderRaw = linkedinData?.gender || linkedinData?.profile?.gender || null;
      if (linkedinGenderRaw === 'male' || linkedinGenderRaw === 'female') {
        detectedGender = linkedinGenderRaw;
        genderSource[0] = 'OAUTH-LINKEDIN';
        console.log('[Social Style] v16: Gender from LinkedIn name inference =', detectedGender);
      }
    }

    // Priority 1: VLM visual gender detection
    if (genderSource[0] === 'unknown' && visualAnalysis?.gender && (visualAnalysis.gender === 'male' || visualAnalysis.gender === 'female')) {
      detectedGender = visualAnalysis.gender;
      genderSource[0] = 'VLM';
      console.log('[Social Style] v11.1: Gender from VLM =', detectedGender);
    } else if (genderSource[0] === 'unknown') {
      console.log('[Social Style] v15: VLM did not detect gender, trying profile inference...');
    }

    // Priority 2: Profile data inference (name-based)
    if (genderSource[0] === 'unknown') {
      const profileGender = inferGenderFromProfile(googleData, facebookData, linkedinData, instagramData);
      if (profileGender) {
        detectedGender = profileGender;
        genderSource[0] = 'PROFILE';
        console.log('[Social Style] v11.1: Gender from profile =', detectedGender);
      }
    }

    // Priority 3: Clothing-based inference from VLM results
    if (genderSource[0] === 'unknown' && visualAnalysis) {
      const clothingStr = (visualAnalysis.clothing || []).join(' ').toLowerCase();
      const accessoryStr = (visualAnalysis.accessories || []).join(' ').toLowerCase();
      const hasMaleClothing = clothingStr.includes('shirt') || clothingStr.includes('blazer') ||
        clothingStr.includes('suit') || clothingStr.includes('tie') || clothingStr.includes('kurta') ||
        clothingStr.includes('sherwani') || clothingStr.includes('jacket') || clothingStr.includes('vest');
      const hasFemaleClothing = clothingStr.includes('dress') || clothingStr.includes('gown') ||
        clothingStr.includes('saree') || clothingStr.includes('kaftan') || clothingStr.includes('lehenga');
      const hasFemaleAcc = accessoryStr.includes('necklace') || accessoryStr.includes('earring') ||
        accessoryStr.includes('bangle') || accessoryStr.includes('bindi');
      const hasMaleAcc = accessoryStr.includes('tie') || accessoryStr.includes('cufflink') ||
        accessoryStr.includes('pocket square');

      if (hasMaleClothing || hasMaleAcc) {
        detectedGender = 'male';
        genderSource[0] = 'CLOTHING';
        console.log('[Social Style] v11.1: Gender from clothing = MALE');
      } else if (hasFemaleClothing || hasFemaleAcc) {
        detectedGender = 'female';
        genderSource[0] = 'CLOTHING';
        console.log('[Social Style] v11.1: Gender from clothing = FEMALE');
      }
    }

    // v15: NO hardcoded default! If we can't determine gender, it stays null.
    // This triggers gender-neutral product selection (mix of male + female categories).
    // Previously v14.1 defaulted to 'male' which gave female users wrong products.

    debugTrace.push(`Gender: ${detectedGender || 'NEUTRAL'} (source: ${genderSource[0]})`);
    console.log('[Social Style] v15: FINAL gender =', detectedGender || 'NEUTRAL (gender-neutral products)', '| source =', genderSource[0]);

    // ─── Step 2: Build profile summary ───
    const profileSummary = buildProfileSummary(networks, googleData, facebookData, linkedinData, instagramData, visualAnalysis);

    // ─── Step 3: AI style analysis ───
    let aiResponse: any = null;
    const MAX_RETRIES = 2;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const categoryList = AVAILABLE_CATEGORIES.join(', ');

        // v15: Build gender-specific category rules (handles null = gender-neutral)
        const genderCategoryRules = detectedGender === 'male'
          ? `
MALE GENDER DETECTED — CRITICAL CATEGORY RULES:
- Do NOT recommend "Designer Dresses" — this person is MALE
- Do NOT recommend "Gold Necklaces" — typically for female customers
- Do NOT recommend "Designer Handbags" — typically for female customers
- Do NOT recommend "Fine Jewelry", "Gemstone Jewelry", "Diamond Collection" — typically for female customers
- INSTEAD, recommend these MALE-APPROPRIATE categories:
  - If SHIRT/BLAZER/SUIT is visible → "Designer Shirts" or "Bespoke Tailoring" (match: 90-97)
  - If WATCH is visible → "Luxury Watches" for analog/mechanical or "Smart Watches" for smartwatch (match: 90-97)
  - If EYEWEAR is visible → "Premium Eyewear" (match: 90-97)
  - "Premium Leather" (briefcase, wallet) is excellent for men (match: 80-90)
  - "Statement Accessories" (cufflinks, tie pins) for men (match: 78-85)
  - "Bespoke Tailoring" for formal/professional men (match: 85-95)
  - "Handcrafted Shoes" (oxford, loafer) for men (match: 78-85)
`
          : detectedGender === 'female'
          ? `
FEMALE GENDER DETECTED — CATEGORY RULES:
- Do NOT recommend "Bespoke Tailoring" or "Designer Shirts" — typically for male customers
- Do NOT recommend "Statement Accessories" (cufflinks, tie pins) — typically for male customers
- If DRESS is visible → "Designer Dresses" (match: 90-97)
- If NECKLACE is visible (especially gold) → "Gold Necklaces" (match: 90-97)
- If WATCH is visible → "Smart Watches" for smartwatch/digital or "Luxury Watches" for analog (match: 90-97)
- If EYEWEAR is visible → "Premium Eyewear" (match: 90-97)
- "Fine Jewelry" complements elegant women's style (match: 80-88)
- "Designer Handbags" for women (match: 78-85)
- "Diamond Collection" or "Gemstone Jewelry" for special occasions (match: 75-85)
`
          : `
GENDER NOT DETECTED — GENDER-NEUTRAL CATEGORY RULES:
- Gender could not be determined, so recommend GENDER-NEUTRAL categories:
  - "Premium Eyewear" — universally appealing (match: 85-95)
  - "Designer Fragrances" or "Artisan Perfumes" — gender-neutral luxury (match: 78-90)
  - "Silk & Cashmere" — premium fabrics for everyone (match: 78-88)
  - "Luxury Skincare" — universal self-care (match: 75-85)
  - "Luxury Sleepwear" — universal comfort (match: 75-85)
- Also include a BALANCED MIX from gendered categories:
  - ONE from "Luxury Watches" or "Smart Watches" (match: 80-90)
  - ONE from "Handcrafted Shoes" (match: 78-85)
- Do NOT heavily weight strongly gendered categories (Designer Dresses, Bespoke Tailoring, Fine Jewelry, Statement Accessories)
`;

        // Build detected items summary for the AI prompt
        let detectedItemsPrompt = '';
        if (visualAnalysis?.detectedItems) {
          const di = visualAnalysis.detectedItems;
          const items: string[] = [];
          if (di.dress?.visible) items.push(`DRESS: ${di.dress.description} (Color: ${di.dress.color}, Style: ${di.dress.style}) — MUST recommend "Designer Dresses" category`);
          if (di.upperGarment?.visible) items.push(`UPPER GARMENT: ${di.upperGarment.description} (Color: ${di.upperGarment.color}, Style: ${di.upperGarment.style}) — MUST recommend "Designer Shirts" or "Bespoke Tailoring" category`);
          if (di.necklace?.visible) items.push(`NECKLACE: ${di.necklace.description} (Material: ${di.necklace.material}, Style: ${di.necklace.style}) — MUST recommend "Gold Necklaces" category`);
          if (di.watch?.visible) items.push(`WATCH: ${di.watch.description} (Type: ${di.watch.type}, Color: ${di.watch.color}) — MUST recommend "Smart Watches" if smartwatch/digital, or "Luxury Watches" if analog/mechanical`);
          if (di.eyewear?.visible) items.push(`EYEWEAR: ${di.eyewear.description} (Frame: ${di.eyewear.frameColor}, Shape: ${di.eyewear.frameShape}) — MUST recommend "Premium Eyewear" category`);
          detectedItemsPrompt = items.join('\n');
        }

        const aiResult = await aiChat([
          {
            role: 'system',
            content: `You are a luxury fashion AI stylist for "3 Boxes Luxury". You analyze profile pictures to recommend products that MATCH what the person is wearing.

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
}

=== MOST IMPORTANT RULE — GENDER-AWARE DETECTED ITEMS ===

The detected gender is: **${detectedGender ? detectedGender.toUpperCase() : 'UNKNOWN (use gender-neutral recommendations)'}**

${genderCategoryRules}

=== COLOR RULES — MANDATORY (STRICT — VIOLATION IS A CRITICAL ERROR) ===
- You MUST copy the EXACT dominant colors from the visual analysis into colorPreferences
- The color with the HIGHEST percentage in visual analysis MUST have the HIGHEST affinity
- Do NOT invent new colors that are NOT in the visual analysis. This is the #1 error to avoid.
- Do NOT replace "Deep Teal" with "Sapphire Blue", "Navy Blue", "Coral", "Ruby Red" or any other color
- Do NOT add complementary/suggested colors that were not detected in the outfit
- The FIRST 3-4 colors in colorPreferences MUST be the EXACT colors from visual analysis dominantColors
- You may add at most 1-2 complementary colors AFTER the visual analysis colors, but ONLY if they genuinely complement the detected outfit
- Using wrong colors that don't match the outfit is a CRITICAL ERROR — the user can see their own photo and will notice wrong colors

=== CATEGORY RULES ===
- Categories MUST come from this EXACT list: ${categoryList}
- Do NOT recommend categories outside this list
- Give HIGHEST match scores to categories matching VISIBLE items AND appropriate for the detected gender
- NEVER recommend women's categories (Designer Dresses, Gold Necklaces, Designer Handbags) for MALE users
- NEVER recommend men's categories (Designer Shirts, Bespoke Tailoring, Statement Accessories) for FEMALE users unless appropriate

=== PRODUCT RULES ===
- 6 entries, each from the available category list
- Products MUST be gender-appropriate
- Use the EXACT same category names from the available list

Return ONLY the JSON, no markdown, no code fences.`
          },
          {
            role: 'user',
            content: `Analyze this user's style (Gender: ${detectedGender || 'unknown — use gender-neutral recommendations'}):\n\n${profileSummary}\n\n${detectedItemsPrompt ? `=== DETECTED ITEMS IN PROFILE PICTURE (HIGHEST PRIORITY) ===\n${detectedItemsPrompt}` : '(No detected items)'}`
          }
        ]);

        const rawContent = aiResult.choices?.[0]?.message?.content || '';
        let cleanedContent = rawContent.trim();
        if (cleanedContent.startsWith('```')) {
          cleanedContent = cleanedContent.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        }
        aiResponse = JSON.parse(cleanedContent);
        console.log('[Social Style] AI analysis successful (attempt', attempt, ')');
        analysisSource = visualAnalysis ? 'VLM+AI' : 'AI_ONLY';
        break;
      } catch (aiError) {
        console.error(`[Social Style] AI attempt ${attempt} FAILED:`, aiError instanceof Error ? aiError.message : String(aiError));
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.error('[Social Style] ALL AI ATTEMPTS FAILED — using enhanced fallback');
          aiResponse = generateEnhancedFallback(visualAnalysis, detectedGender);
          analysisSource = visualAnalysis ? 'VLM+FALLBACK' : 'DYNAMIC_FALLBACK';
        }
      }
    }

    // ─── Step 4: Validate and normalize ───
    const rawCategories = Array.isArray(aiResponse?.recommendedCategories)
      ? aiResponse.recommendedCategories.slice(0, 5).map((c: any) => ({
          name: String(c.name || 'Unknown'),
          match: typeof c.match === 'number' ? Math.min(99, Math.max(50, c.match)) : 70,
          reason: String(c.reason || 'Matches your style profile'),
        }))
      : (detectedGender ? generateDynamicFallback(detectedGender).recommendedCategories : generateDynamicFallback('female').recommendedCategories);

    // v11: Filter out gender-inappropriate categories
    const validatedCategories = rawCategories.map((cat: { name: string; match: number; reason: string }) => {
      let catName = cat.name;
      const hasProducts = AVAILABLE_CATEGORIES.some(ac => ac.toLowerCase() === catName.toLowerCase());
      if (!hasProducts) {
        catName = mapToAvailableCategory(catName);
      }

      // v15: Gender filtering — replace inappropriate categories (only when gender IS known)
      if (detectedGender === 'male') {
        const femaleOnly = ['designer dresses', 'gold necklaces', 'designer handbags', 'gemstone jewelry', 'fine jewelry', 'diamond collection'];
        if (femaleOnly.includes(catName.toLowerCase())) {
          // Replace with male-appropriate category
          const maleAlternatives = ['Bespoke Tailoring', 'Designer Shirts', 'Premium Leather', 'Statement Accessories', 'Luxury Watches'];
          const existingCats = new Set(rawCategories.map((c: any) => c.name.toLowerCase()));
          const replacement = maleAlternatives.find(mc => !existingCats.has(mc.toLowerCase()));
          if (replacement) {
            console.log(`[Social Style] v15 FIX: Replaced "${catName}" with "${replacement}" for male user`);
            catName = replacement;
          }
        }
      } else if (detectedGender === 'female') {
        const maleOnly = ['designer shirts', 'bespoke tailoring', 'statement accessories'];
        if (maleOnly.includes(catName.toLowerCase())) {
          const femaleAlternatives = ['Designer Dresses', 'Gold Necklaces', 'Fine Jewelry', 'Designer Handbags'];
          const existingCats = new Set(rawCategories.map((c: any) => c.name.toLowerCase()));
          const replacement = femaleAlternatives.find(fc => !existingCats.has(fc.toLowerCase()));
          if (replacement) {
            console.log(`[Social Style] v15 FIX: Replaced "${catName}" with "${replacement}" for female user`);
            catName = replacement;
          }
        }
      }
      // v15: When gender is null (unknown), DON'T filter — allow mixed categories

      return { ...cat, name: catName };
    });

    // v15: Resolve effective gender for fallback generation
    // When gender is null (unknown), use 'female' as fallback base for colors/tags
    // but the product recommendations will be gender-neutral
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
      // v11: Color override from VLM (same as v10)
      colorPreferences: visualAnalysis?.dominantColors?.length
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
      recommendedCategories: validatedCategories,
    };

    // ─── Step 5: Build product recommendations (gender-aware) ───
    const products = buildProductRecommendations(aiResponse, analysis.recommendedCategories, visualAnalysis, detectedGender);

    debugTrace.push(`Gender: ${detectedGender} (source: ${genderSource[0]})`);
    debugTrace.push(`Categories: ${analysis.recommendedCategories.map((c: any) => c.name).join(', ')}`);
    debugTrace.push(`Products: ${products.map((p: any) => p.name).join(', ')}`);
    debugTrace.push(`AnalysisSource: ${analysisSource}`);

    return NextResponse.json({ analysis, products, _debug: debugTrace, _analysisSource: analysisSource });
  } catch (error) {
    console.error('[Social Style] Analysis error:', error);
    // v12: Always call generateDynamicFallback() per-request — never reuse a static constant
    const fallbackAnalysis = generateDynamicFallback('female');
    return NextResponse.json({ analysis: fallbackAnalysis, products: [], _debug: ['FATAL_ERROR: ' + (error instanceof Error ? error.message : String(error))], _analysisSource: 'FATAL_ERROR' });
  }
}

// ─── Map unknown category to closest available ───

function mapToAvailableCategory(unknownCategory: string): string {
  const lower = unknownCategory.toLowerCase();

  for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const isMatch = keywords.some(kw => lower.includes(kw) || kw.split(' ')[0] === lower.split(' ')[0]);
    if (isMatch && AVAILABLE_CATEGORIES.includes(catName)) return catName;
  }

  const words = lower.split(/\s+/);
  for (const word of words) {
    if (word.length < 3) continue;
    for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(kw => kw.includes(word) || word.includes(kw)) && AVAILABLE_CATEGORIES.includes(catName)) return catName;
    }
  }

  return 'Fine Jewelry';
}

// ─── Build product recommendations (v13: ANALYSIS-DRIVEN, no randomness) ───
// v13 REWRITE: Products are now selected by SCORING against detected colors & styles.
// Same analysis = same products. Different profile = different products. No random picks.
//
// How it works:
// 1. Extract detected colors + style keywords from VLM/AI analysis
// 2. For each recommended category, score ALL products in that category
//    by how well their color/style tags match the user's detected profile
// 3. Pick the HIGHEST scoring product (deterministic)
// This means: A user with "navy blazer + burgundy tie" gets navy/burgundy products,
// while a user with "white shirt + brown belt" gets white/brown products.

function buildProductRecommendations(
  aiResponse: any,
  recommendedCategories: { name: string; match: number; reason: string }[],
  visualAnalysis: VisualAnalysis | null,
  gender: 'male' | 'female' | null
): any[] {
  // ─── Step 1: Build user's color + style profile from ALL available signals ───
  const detectedColors: string[] = [];  // lowercase color names detected from profile
  const detectedStyles: string[] = [];  // lowercase style keywords detected from profile
  const detectedFormality: string[] = []; // formality hints from detected items

  // From VLM visual analysis — THE PRIMARY SIGNAL
  if (visualAnalysis) {
    // Dominant colors (highest priority — these are from the actual outfit)
    if (Array.isArray(visualAnalysis.dominantColors)) {
      for (const dc of visualAnalysis.dominantColors) {
        const colorName = String(dc.name || '').toLowerCase();
        if (colorName) detectedColors.push(colorName);
        // Also add individual words from color names like "deep teal" → "deep", "teal"
        for (const word of colorName.split(/\s+/)) {
          if (word.length > 2 && !detectedColors.includes(word)) detectedColors.push(word);
        }
      }
    }

    // Style keywords from VLM
    if (Array.isArray(visualAnalysis.styleKeywords)) {
      for (const kw of visualAnalysis.styleKeywords) {
        const style = String(kw).toLowerCase();
        if (style) detectedStyles.push(style);
      }
    }

    // Detected items → formality + style hints
    if (visualAnalysis.detectedItems) {
      const di = visualAnalysis.detectedItems;

      if (di.upperGarment?.visible) {
        const color = (di.upperGarment.color || '').toLowerCase();
        const style = (di.upperGarment.style || '').toLowerCase();
        if (color) {
          detectedColors.push(color);
          for (const w of color.split(/\s+/)) { if (w.length > 2) detectedColors.push(w); }
        }
        if (style) {
          detectedStyles.push(style);
          for (const w of style.split(/\s+/)) { if (w.length > 2) detectedStyles.push(w); }
        }
        // Formality inference from upper garment
        if (style.includes('formal') || style.includes('business') || style.includes('suit')) detectedFormality.push('formal');
        else if (style.includes('smart') || style.includes('smart-casual')) detectedFormality.push('smart-casual');
        else if (style.includes('casual')) detectedFormality.push('casual');
      }

      if (di.dress?.visible) {
        const color = (di.dress.color || '').toLowerCase();
        const style = (di.dress.style || '').toLowerCase();
        if (color) {
          detectedColors.push(color);
          for (const w of color.split(/\s+/)) { if (w.length > 2) detectedColors.push(w); }
        }
        if (style) {
          detectedStyles.push(style);
          for (const w of style.split(/\s+/)) { if (w.length > 2) detectedStyles.push(w); }
        }
        if (style.includes('ethnic') || style.includes('embroidered') || style.includes('traditional')) detectedFormality.push('ethnic');
        else if (style.includes('formal')) detectedFormality.push('formal');
        else if (style.includes('evening')) detectedFormality.push('evening');
        else if (style.includes('casual')) detectedFormality.push('casual');
      }

      if (di.watch?.visible) {
        const color = (di.watch.color || '').toLowerCase();
        if (color) {
          detectedColors.push(color);
          for (const w of color.split(/\s+/)) { if (w.length > 2) detectedColors.push(w); }
        }
      }

      if (di.eyewear?.visible) {
        const frameColor = (di.eyewear.frameColor || '').toLowerCase();
        if (frameColor) {
          detectedColors.push(frameColor);
          for (const w of frameColor.split(/\s+/)) { if (w.length > 2) detectedColors.push(w); }
        }
      }

      if (di.necklace?.visible) {
        const material = (di.necklace.material || '').toLowerCase();
        if (material) {
          detectedColors.push(material);  // "gold", "silver", "rose gold"
          for (const w of material.split(/\s+/)) { if (w.length > 2) detectedColors.push(w); }
        }
      }
    }

    // Clothing descriptions → color/style hints
    if (Array.isArray(visualAnalysis.clothing)) {
      for (const item of visualAnalysis.clothing) {
        const desc = String(item).toLowerCase();
        // Extract color words from clothing descriptions
        const colorWords = desc.match(/\b(white|black|navy|blue|grey|gray|charcoal|brown|tan|beige|burgundy|maroon|wine|red|green|teal|gold|silver|camel|ivory|cream|pink|rose|coral|sage|olive|khaki|rust|copper|champagne|midnight|slate)\b/g);
        if (colorWords) detectedColors.push(...colorWords);
      }
    }

    // Accessories → style hints
    if (Array.isArray(visualAnalysis.accessories)) {
      for (const acc of visualAnalysis.accessories) {
        const desc = String(acc).toLowerCase();
        if (desc.includes('gold') || desc.includes('champagne')) detectedColors.push('gold', 'warm');
        if (desc.includes('silver') || desc.includes('steel')) detectedColors.push('silver', 'cool');
        if (desc.includes('rose gold')) detectedColors.push('rose gold', 'pink', 'warm');
      }
    }
  }

  // From AI chat analysis — SECONDARY SIGNAL
  if (Array.isArray(aiResponse?.colorPreferences)) {
    for (const cp of aiResponse.colorPreferences) {
      const colorName = String(cp.name || '').toLowerCase();
      if (colorName) {
        detectedColors.push(colorName);
        for (const w of colorName.split(/\s+/)) { if (w.length > 2) detectedColors.push(w); }
      }
    }
  }
  if (Array.isArray(aiResponse?.styleProfile?.tags)) {
    for (const tag of aiResponse.styleProfile.tags) {
      detectedStyles.push(String(tag).toLowerCase());
    }
  }

  // Deduplicate
  const uniqueDetectedColors = [...new Set(detectedColors.filter(c => c.length > 2))];
  const uniqueDetectedStyles = [...new Set(detectedStyles.filter(s => s.length > 2))];
  const uniqueDetectedFormality = [...new Set(detectedFormality)];

  console.log('[Social Style v13] Detected colors:', uniqueDetectedColors.join(', '));
  console.log('[Social Style v13] Detected styles:', uniqueDetectedStyles.join(', '));
  console.log('[Social Style v13] Detected formality:', uniqueDetectedFormality.join(', '));

  // ─── Step 2: Build category list (same as before — gender-aware) ───
  const aiCategories: { category: string; reason: string }[] = [];

  if (Array.isArray(aiResponse?.recommendedProducts)) {
    for (const rp of aiResponse.recommendedProducts.slice(0, 6)) {
      const catName = String(rp.category || '');
      const validatedCat = AVAILABLE_CATEGORIES.some(ac => ac.toLowerCase() === catName.toLowerCase())
        ? catName
        : mapToAvailableCategory(catName);
      aiCategories.push({ category: validatedCat, reason: String(rp.reason || 'Matches your style profile') });
    }
  }

  if (aiCategories.length === 0 && recommendedCategories.length > 0) {
    for (const rc of recommendedCategories) {
      aiCategories.push({ category: rc.name, reason: rc.reason });
    }
  }

  if (aiCategories.length === 0) {
    const fallback = generateDynamicFallback(gender);
    for (const fc of fallback.recommendedCategories) {
      aiCategories.push({ category: fc.name, reason: fc.reason });
    }
  }

  // If VLM detected specific items, boost matching categories
  if (visualAnalysis?.detectedItems) {
    const di = visualAnalysis.detectedItems;
    const existingCats = new Set(aiCategories.map(ac => ac.category.toLowerCase()));

    if (gender === 'male') {
      if (di.upperGarment?.visible && !existingCats.has('designer shirts') && !existingCats.has('bespoke tailoring')) {
        const shirtStyle = (di.upperGarment.style || '').toLowerCase();
        if (shirtStyle.includes('formal') || shirtStyle.includes('business') || shirtStyle.includes('suit')) {
          aiCategories.unshift({ category: 'Bespoke Tailoring', reason: `Your ${di.upperGarment.style || 'formal'} style matches our bespoke tailoring collection` });
        } else {
          aiCategories.unshift({ category: 'Designer Shirts', reason: `Your ${di.upperGarment.style || 'smart'} style matches our premium shirt collection` });
        }
      }
      if (di.watch?.visible) {
        const watchCat = (di.watch.type?.toLowerCase().includes('smart') || di.watch.type?.toLowerCase().includes('digital') || di.watch.type?.toLowerCase().includes('fitness'))
          ? 'Smart Watches'
          : 'Luxury Watches';
        if (!existingCats.has(watchCat.toLowerCase())) {
          aiCategories.unshift({ category: watchCat, reason: `Your ${di.watch.type || ''} watch style matches our ${watchCat.toLowerCase()} collection` });
        }
      }
      if (di.eyewear?.visible && !existingCats.has('premium eyewear')) {
        aiCategories.unshift({ category: 'Premium Eyewear', reason: `Your ${di.eyewear.frameShape || ''} frames match our eyewear collection` });
      }
    } else if (gender === 'female') {
      if (di.dress?.visible && !existingCats.has('designer dresses')) {
        aiCategories.unshift({ category: 'Designer Dresses', reason: `Your ${di.dress.style || ''} dress style matches our curated dress collection` });
      }
      if (di.necklace?.visible && !existingCats.has('gold necklaces')) {
        aiCategories.unshift({ category: 'Gold Necklaces', reason: `Your ${di.necklace.material || 'gold'} necklace complements our pendant and chain collection` });
      }
      if (di.watch?.visible) {
        const watchCat = (di.watch.type?.toLowerCase().includes('smart') || di.watch.type?.toLowerCase().includes('digital') || di.watch.type?.toLowerCase().includes('fitness'))
          ? 'Smart Watches'
          : 'Luxury Watches';
        if (!existingCats.has(watchCat.toLowerCase())) {
          aiCategories.unshift({ category: watchCat, reason: `Your ${di.watch.type || ''} watch style matches our ${watchCat.toLowerCase()} collection` });
        }
      }
      if (di.eyewear?.visible && !existingCats.has('premium eyewear')) {
        aiCategories.unshift({ category: 'Premium Eyewear', reason: `Your ${di.eyewear.frameShape || ''} frames match our eyewear collection` });
      }
    } else {
      // v15: Gender unknown — use detected items regardless of gender category
      // Show whatever was actually detected in the profile picture
      if (di.upperGarment?.visible && !existingCats.has('designer shirts') && !existingCats.has('bespoke tailoring')) {
        aiCategories.unshift({ category: 'Designer Shirts', reason: `Your ${di.upperGarment.style || 'smart'} style matches our premium collection` });
      }
      if (di.dress?.visible && !existingCats.has('designer dresses')) {
        aiCategories.unshift({ category: 'Designer Dresses', reason: `Your ${di.dress.style || ''} dress style matches our curated collection` });
      }
      if (di.necklace?.visible && !existingCats.has('gold necklaces')) {
        aiCategories.unshift({ category: 'Gold Necklaces', reason: `Your ${di.necklace.material || 'gold'} necklace complements our collection` });
      }
      if (di.watch?.visible) {
        const watchCat = (di.watch.type?.toLowerCase().includes('smart') || di.watch.type?.toLowerCase().includes('digital') || di.watch.type?.toLowerCase().includes('fitness'))
          ? 'Smart Watches'
          : 'Luxury Watches';
        if (!existingCats.has(watchCat.toLowerCase())) {
          aiCategories.unshift({ category: watchCat, reason: `Your ${di.watch.type || ''} watch style matches our ${watchCat.toLowerCase()} collection` });
        }
      }
      if (di.eyewear?.visible && !existingCats.has('premium eyewear')) {
        aiCategories.unshift({ category: 'Premium Eyewear', reason: `Your ${di.eyewear.frameShape || ''} frames match our eyewear collection` });
      }
    }
  }

  // Limit to 6 categories
  const finalCategories = aiCategories.slice(0, 6);

  // Gender-filter categories
  const genderFilteredCategories = finalCategories.filter(ac => {
    const catLower = ac.category.toLowerCase();
    if (gender === 'male') {
      // v14.1: Added 'fine jewelry' and 'smart watches' — these are female-only categories
      const femaleOnly = ['designer dresses', 'gold necklaces', 'designer handbags', 'gemstone jewelry', 'diamond collection', 'fine jewelry', 'smart watches'];
      return !femaleOnly.includes(catLower);
    } else if (gender === 'female') {
      const maleOnly = ['designer shirts', 'bespoke tailoring', 'statement accessories'];
      return !maleOnly.includes(catLower);
    } else {
      // v15: Gender unknown — allow ALL categories (gender-neutral)
      return true;
    }
  });

  // Fill back to 6 with gender-appropriate categories
  // v15: When gender is null, use a MIXED set of categories from both lists
  const genderAppropriate = gender === 'male'
    ? MALE_CATEGORIES
    : gender === 'female'
      ? FEMALE_CATEGORIES
      : [...GENDER_NEUTRAL_CATEGORIES, 'Luxury Watches', 'Handcrafted Shoes', 'Designer Dresses', 'Designer Shirts'];
  const existingCatNames = new Set(genderFilteredCategories.map(ac => ac.category.toLowerCase()));
  for (const cat of genderAppropriate) {
    if (genderFilteredCategories.length >= 6) break;
    if (!existingCatNames.has(cat.toLowerCase())) {
      genderFilteredCategories.push({ category: cat, reason: `Complements your ${gender === 'male' ? 'gentleman\'s' : gender === 'female' ? 'elegant' : 'refined'} style profile` });
      existingCatNames.add(cat.toLowerCase());
    }
  }

  const usedCategories = genderFilteredCategories.slice(0, 6);

  // ─── Step 3: Score products against detected profile (v13: DETERMINISTIC) ───

  // Color synonym mapping — normalize color names so "navy blue" matches "navy", etc.
  const COLOR_SYNONYMS: Record<string, string[]> = {
    'navy': ['navy', 'dark blue', 'midnight blue', 'navy blue', 'blue'],
    'blue': ['blue', 'navy', 'sky blue', 'light blue', 'sapphire', 'pastel blue'],
    'black': ['black', 'midnight', 'dark', 'charcoal'],
    'white': ['white', 'ivory', 'cream', 'pearl', 'diamond'],
    'gold': ['gold', 'champagne', 'warm', 'champagne gold'],
    'silver': ['silver', 'grey', 'gray', 'steel', 'cool'],
    'brown': ['brown', 'tan', 'camel', 'beige', 'cognac', 'saddle', 'tortoiseshell'],
    'burgundy': ['burgundy', 'wine', 'maroon', 'deep red', 'ruby', 'red'],
    'green': ['green', 'emerald', 'teal', 'sage', 'olive'],
    'teal': ['teal', 'green', 'blue-green', 'turquoise'],
    'pink': ['pink', 'rose', 'rose gold', 'floral', 'coral'],
    'charcoal': ['charcoal', 'grey', 'gray', 'dark grey', 'slate'],
    'cream': ['cream', 'ivory', 'white', 'beige', 'pearl'],
    'camel': ['camel', 'tan', 'beige', 'brown', 'cognac'],
  };

  // Expand detected colors with their synonyms for broader matching
  const expandedDetectedColors: string[] = [...uniqueDetectedColors];
  for (const dc of uniqueDetectedColors) {
    if (COLOR_SYNONYMS[dc]) {
      expandedDetectedColors.push(...COLOR_SYNONYMS[dc]);
    }
    // Also check if any synonym group contains this color
    for (const [base, synonyms] of Object.entries(COLOR_SYNONYMS)) {
      if (synonyms.some(s => dc.includes(s) || s.includes(dc))) {
        expandedDetectedColors.push(base, ...synonyms);
      }
    }
  }
  const allColorSignals = [...new Set(expandedDetectedColors.filter(c => c.length > 2))];

  /**
   * Score a product against the user's detected profile.
   * Higher score = better match. Deterministic — no randomness.
   */
  function scoreProduct(product: ProductEntry): number {
    let score = 0;

    // COLOR MATCHING (weight: 3 — most important)
    // How many of the product's colors match the user's detected colors?
    for (const pColor of product.colors) {
      const pColorLower = pColor.toLowerCase();
      for (const signal of allColorSignals) {
        if (pColorLower === signal || pColorLower.includes(signal) || signal.includes(pColorLower)) {
          score += 3;
          break; // One match per product color is enough
        }
      }
    }

    // STYLE MATCHING (weight: 2)
    // How many of the product's styles match the user's detected styles?
    for (const pStyle of product.styles) {
      const pStyleLower = pStyle.toLowerCase();
      for (const dStyle of uniqueDetectedStyles) {
        if (pStyleLower === dStyle || pStyleLower.includes(dStyle) || dStyle.includes(pStyleLower)) {
          score += 2;
          break;
        }
      }
    }

    // FORMALITY MATCHING (weight: 2)
    // Does the product's formality match what we detected?
    if (uniqueDetectedFormality.length > 0) {
      for (const formality of uniqueDetectedFormality) {
        if (product.formality === formality) {
          score += 2;
          break;
        }
        // Partial formality matches
        if (formality === 'formal' && (product.formality === 'formal' || product.formality === 'evening')) score += 1;
        if (formality === 'smart-casual' && (product.formality === 'smart-casual' || product.formality === 'casual')) score += 1;
        if (formality === 'ethnic' && (product.formality === 'ethnic' || product.styles.some(s => s.includes('cultural') || s.includes('traditional')))) score += 2;
      }
    }

    // CATEGORY RELEVANCE BONUS (weight: 1)
    // Products whose category directly matches detected items get a small boost
    if (visualAnalysis?.detectedItems) {
      const di = visualAnalysis.detectedItems;
      if (di.watch?.visible && (product.category === 'Luxury Watches' || product.category === 'Smart Watches')) score += 1;
      if (di.eyewear?.visible && product.category === 'Premium Eyewear') score += 1;
      if (di.necklace?.visible && (product.category === 'Gold Necklaces' || product.category === 'Fine Jewelry')) score += 1;
      if (di.upperGarment?.visible && (product.category === 'Designer Shirts' || product.category === 'Bespoke Tailoring')) score += 1;
      if (di.dress?.visible && product.category === 'Designer Dresses') score += 1;
    }

    // v14.1/v15: GENDER PENALTY (weight: -10 — strong negative)
    // Products from female-only categories should NEVER appear for male users
    // and vice versa, regardless of color/style matching
    // v15: Only apply penalty when gender IS known; when null, allow all categories
    const femaleOnlyCategories = ['Designer Dresses', 'Gold Necklaces', 'Designer Handbags', 'Fine Jewelry', 'Gemstone Jewelry', 'Diamond Collection', 'Smart Watches'];
    const maleOnlyCategories = ['Designer Shirts', 'Bespoke Tailoring', 'Statement Accessories'];
    if (gender === 'male' && femaleOnlyCategories.includes(product.category)) {
      score -= 10; // Heavy penalty — this product should never be recommended to males
    }
    if (gender === 'female' && maleOnlyCategories.includes(product.category)) {
      score -= 10; // Heavy penalty — this product should never be recommended to females
    }
    // v15: When gender is null, no penalty — all categories are valid

    return score;
  }

  // ─── Step 4: Select best-matching product per category ───
  const recommendedProducts: any[] = [];
  const usedProductIds = new Set<string>();

  for (const aiCat of usedCategories) {
    const categoryLower = aiCat.category.toLowerCase();

    // Get all products in this category that haven't been used yet
    let candidates = PRODUCT_CATALOG.filter(
      (p) => p.category.toLowerCase() === categoryLower && !usedProductIds.has(p.id)
    );

    // If no exact category match, try keyword-based category mapping
    if (candidates.length === 0) {
      for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        const isMatch = keywords.some(kw => categoryLower.includes(kw) || kw.includes(categoryLower.split(' ')[0]));
        if (isMatch) {
          const keywordProducts = PRODUCT_CATALOG.filter((p) => p.category === catName && !usedProductIds.has(p.id));
          if (keywordProducts.length > 0) {
            candidates = keywordProducts;
            break;
          }
        }
      }
    }

    // Score all candidates and pick the BEST one (highest score = best match)
    let matchedProduct: ProductEntry | null = null;

    if (candidates.length > 0) {
      const scored = candidates.map(p => ({ product: p, score: scoreProduct(p) }));
      scored.sort((a, b) => b.score - a.score); // Highest score first

      console.log(`[Social Style v13] Category "${aiCat.category}" candidates:`, scored.map(s => `${s.product.name} (${s.score})`).join(', '));

      matchedProduct = scored[0].product;
    }

    // Fallback: best-scoring product from gender-appropriate categories
    if (!matchedProduct) {
      const genderProducts = PRODUCT_CATALOG.filter((p) => !usedProductIds.has(p.id) && genderAppropriate.includes(p.category));
      if (genderProducts.length > 0) {
        const scored = genderProducts.map(p => ({ product: p, score: scoreProduct(p) }));
        scored.sort((a, b) => b.score - a.score);
        matchedProduct = scored[0].product;
      }
    }

    // Last resort: any unused product
    if (!matchedProduct) {
      const anyProducts = PRODUCT_CATALOG.filter((p) => !usedProductIds.has(p.id));
      if (anyProducts.length > 0) {
        matchedProduct = anyProducts[0]; // Just pick the first available
      }
    }

    if (matchedProduct) {
      usedProductIds.add(matchedProduct.id);
      const catMatch = recommendedCategories.find(rc => rc.name.toLowerCase() === matchedProduct!.category.toLowerCase());
      recommendedProducts.push({
        id: matchedProduct.id,
        name: matchedProduct.name,
        price: matchedProduct.price,
        image: matchedProduct.image,
        reason: aiCat.reason,
        matchScore: catMatch?.match || 85,
      });
    }
  }

  // Fill up to 6 products with best-matching gender-appropriate items
  while (recommendedProducts.length < 6) {
    const genderProducts = PRODUCT_CATALOG.filter((p) => !usedProductIds.has(p.id) && genderAppropriate.includes(p.category));
    if (genderProducts.length === 0) break;

    // Score and pick the best match (deterministic)
    const scored = genderProducts.map(p => ({ product: p, score: scoreProduct(p) }));
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0].product;

    usedProductIds.add(best.id);
    recommendedProducts.push({
      id: best.id,
      name: best.name,
      price: best.price,
      image: best.image,
      reason: `Complements your ${gender === 'male' ? 'gentleman\'s' : gender === 'female' ? 'elegant' : 'refined'} style profile`,
      matchScore: 78,
    });
  }

  console.log('[Social Style v13] Final products:', recommendedProducts.map(p => `${p.name} (score-based)`).join(', '));

  return recommendedProducts;
}

// ─── Build profile summary ───

function buildProfileSummary(
  networks: string[],
  googleData?: any,
  facebookData?: any,
  linkedinData?: any,
  instagramData?: any,
  visualAnalysis?: VisualAnalysis | null
): string {
  const parts: string[] = [];
  parts.push(`Connected networks: ${(networks || []).join(', ')}`);

  if (visualAnalysis) {
    parts.push(`\n=== VISUAL ANALYSIS OF PROFILE PICTURE (HIGHEST PRIORITY) ===`);
    if (visualAnalysis.gender) parts.push(`- Detected Gender: ${visualAnalysis.gender.toUpperCase()}`);
    parts.push(`- Style Summary: ${visualAnalysis.summary}`);
    parts.push(`- Style Keywords: ${visualAnalysis.styleKeywords?.join(', ')}`);
    parts.push(`- Dominant Colors: ${visualAnalysis.dominantColors?.map((c: any) => `${c.name} (${c.hex}, ${c.percentage}%)`).join(', ')}`);
    parts.push(`- Visible Clothing: ${visualAnalysis.clothing?.join(', ')}`);
    parts.push(`- Visible Accessories: ${visualAnalysis.accessories?.join(', ')}`);

    if (visualAnalysis.detectedItems) {
      const di = visualAnalysis.detectedItems;
      parts.push(`\n=== DETECTED ITEMS (gender: ${visualAnalysis.gender || 'unknown'}) ===`);
      if (di.dress?.visible) parts.push(`- DRESS DETECTED: ${di.dress.description} | Color: ${di.dress.color} | Style: ${di.dress.style}`);
      if (di.upperGarment?.visible) parts.push(`- UPPER GARMENT DETECTED: ${di.upperGarment.description} | Color: ${di.upperGarment.color} | Style: ${di.upperGarment.style}`);
      if (di.necklace?.visible) parts.push(`- NECKLACE DETECTED: ${di.necklace.description} | Material: ${di.necklace.material} | Style: ${di.necklace.style}`);
      if (di.watch?.visible) parts.push(`- WATCH DETECTED: ${di.watch.description} | Type: ${di.watch.type} | Color: ${di.watch.color}`);
      if (di.eyewear?.visible) parts.push(`- EYEWEAR DETECTED: ${di.eyewear.description} | Frame: ${di.eyewear.frameColor} | Shape: ${di.eyewear.frameShape}`);
    }

    parts.push(`\nCRITICAL COLOR RULE: The colorPreferences in your response MUST use the EXACT dominant colors listed above as the top entries. Do NOT replace them with different colors. If the visual analysis says "Deep Teal" then colorPreferences MUST include "Deep Teal" — do NOT substitute it with "Sapphire Blue", "Coral", "Ruby Red", or any other color. Gender is ${visualAnalysis.gender || 'unknown'}. recommendedCategories MUST be gender-appropriate and include categories matching detected items.`);
  }

  if (googleData?.profile) {
    parts.push(`\nGoogle: ${googleData.profile.name}${googleData.profile.email ? ' (' + googleData.profile.email + ')' : ''}`);
    if (googleData.locale) parts.push(`- Region: ${googleData.locale}`);
  }
  if (facebookData?.profile) {
    parts.push(`\nFacebook: ${facebookData.profile.name}`);
    if (facebookData.likes?.length > 0) parts.push(`- Likes: ${facebookData.likes.slice(0, 10).map((l: any) => l.name || l).join(', ')}`);
  }
  if (linkedinData?.profile) {
    parts.push(`\nLinkedIn: ${linkedinData.profile.name}`);
    // v12: Add more LinkedIn data to help AI personalize even without VLM
    if (linkedinData.profile.headline) parts.push(`- Headline: ${linkedinData.profile.headline}`);
    if (linkedinData.profile.industry) parts.push(`- Industry: ${linkedinData.profile.industry}`);
    if (linkedinData.profile.location) parts.push(`- Location: ${linkedinData.profile.location}`);
  }
  if (instagramData) {
    parts.push(`\nInstagram: ${instagramData.username || 'Connected'}`);
    if (instagramData.bio) parts.push(`- Bio: ${instagramData.bio}`);
  }

  // v12: If NO visual analysis available, add guidance for AI to personalize from profile data
  if (!visualAnalysis) {
    parts.push(`\nNOTE: No profile picture analysis available. Base your style recommendations on the person's name, profession, and social profile data above. Make the description PERSONALIZED — reference their name, profession, or industry in the style description.`);
  }

  return parts.join('\n');
}

// ─── Enhanced fallback using visual analysis (v11: gender-aware) ───

function generateEnhancedFallback(visualAnalysis?: VisualAnalysis | null, gender: 'male' | 'female' | null = null): any {
  // v15: Resolve gender for fallback purposes
  const resolvedGender: 'male' | 'female' = gender || 'female';

  if (visualAnalysis) {
    const colors = visualAnalysis.dominantColors || [];
    const di = visualAnalysis.detectedItems;

    const colorPreferences = colors.slice(0, 6).map((c, i) => ({
      name: c.name,
      hex: c.hex,
      affinity: Math.max(0.5, 1 - i * 0.08),
    }));

    const categories: { name: string; match: number; reason: string }[] = [];

    if (resolvedGender === 'male') {
      // MALE fallback categories
      if (di?.upperGarment?.visible) {
        const style = (di.upperGarment.style || '').toLowerCase();
        if (style.includes('formal') || style.includes('business') || style.includes('suit')) {
          categories.push({ name: 'Bespoke Tailoring', match: 95, reason: `Your ${di.upperGarment.style || 'formal'} style matches our bespoke tailoring` });
        }
        categories.push({ name: 'Designer Shirts', match: 93, reason: `Your ${di.upperGarment.style || 'smart'} style matches our premium shirt collection` });
      } else {
        categories.push({ name: 'Bespoke Tailoring', match: 95, reason: 'Your professional style pairs perfectly with bespoke tailoring' });
        categories.push({ name: 'Designer Shirts', match: 90, reason: 'Premium shirts that match your refined aesthetic' });
      }
      if (di?.watch?.visible) {
        const isSmart = (di.watch.type || '').toLowerCase().includes('smart') || (di.watch.type || '').toLowerCase().includes('digital');
        categories.push({
          name: isSmart ? 'Smart Watches' : 'Luxury Watches',
          match: 91,
          reason: `Your ${di.watch.type || ''} watch style matches our collection`
        });
      } else {
        categories.push({ name: 'Luxury Watches', match: 88, reason: 'A refined timepiece complements your sophisticated look' });
      }
      if (di?.eyewear?.visible) {
        categories.push({ name: 'Premium Eyewear', match: 89, reason: `Your ${di.eyewear.frameShape || ''} frames match our eyewear collection` });
      }
      // Fill remaining with male-appropriate categories
      const maleComplementary = [
        { name: 'Premium Leather', match: 82, reason: 'Quality leather goods complete a polished look' },
        { name: 'Statement Accessories', match: 78, reason: 'Cufflinks and accessories for the modern gentleman' },
        { name: 'Handcrafted Shoes', match: 80, reason: 'Handcrafted shoes for the discerning gentleman' },
        { name: 'Designer Fragrances', match: 76, reason: 'A signature scent for the modern man' },
      ];
      for (const comp of maleComplementary) {
        if (categories.length < 5 && !categories.some(c => c.name === comp.name)) {
          categories.push(comp);
        }
      }
    } else {
      // FEMALE or GENDER-NEUTRAL fallback categories
      if (di?.dress?.visible) {
        categories.push({ name: 'Designer Dresses', match: 95, reason: `Your ${di.dress.style || ''} dress style matches our curated collection` });
      }
      if (di?.necklace?.visible) {
        categories.push({ name: 'Gold Necklaces', match: 93, reason: `Your ${di.necklace.material || 'gold'} necklace pairs with our pendant collection` });
      }
      if (di?.watch?.visible) {
        const isSmart = (di.watch.type || '').toLowerCase().includes('smart') || (di.watch.type || '').toLowerCase().includes('digital');
        categories.push({
          name: isSmart ? 'Smart Watches' : 'Luxury Watches',
          match: 91,
          reason: `Your ${di.watch.type || ''} watch style matches our collection`
        });
      }
      if (di?.eyewear?.visible) {
        categories.push({ name: 'Premium Eyewear', match: 89, reason: `Your ${di.eyewear.frameShape || ''} frames match our eyewear collection` });
      }
      // Fill remaining with gender-appropriate categories
      const complementary = resolvedGender === 'female'
        ? [
            { name: 'Fine Jewelry', match: 82, reason: 'Complements your elegant accessory style' },
            { name: 'Designer Fragrances', match: 78, reason: 'Complete your look with a signature scent' },
          ]
        : [
            // v15: Gender-neutral fallback when gender is unknown
            { name: 'Premium Eyewear', match: 85, reason: 'Refined frames for any style' },
            { name: 'Designer Fragrances', match: 80, reason: 'A signature scent to complement your style' },
            { name: 'Silk & Cashmere', match: 78, reason: 'Luxurious fabrics for your wardrobe' },
          ];
      for (const comp of complementary) {
        if (categories.length < 5 && !categories.some(c => c.name === comp.name)) {
          categories.push(comp);
        }
      }
    }

    return {
      styleProfile: {
        tags: visualAnalysis.styleKeywords?.slice(0, 4) || (resolvedGender === 'male' ? ['Classic', 'Refined', 'Sophisticated', 'Modern'] : ['Elegant', 'Cultural', 'Sophisticated', 'Modern']),
        confidence: 0.88,
        description: visualAnalysis.summary || (resolvedGender === 'male'
          ? 'Your style reflects a refined appreciation for timeless elegance combined with modern sensibility.'
          : 'Your style blends traditional elegance with modern minimalism.'),
      },
      colorPreferences,
      recommendedCategories: categories,
      recommendedProducts: categories.map(c => ({ category: c.name, reason: c.reason })),
    };
  }

  return generateDynamicFallback(resolvedGender);
}
