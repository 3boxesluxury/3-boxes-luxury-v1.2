# 3 BOXES LUXURY — Vercel Deployment Guide

> **Comprehensive technical documentation for deploying the 3 BOXES LUXURY luxury e-commerce platform to Vercel.**
> Last updated: March 2026

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Environment Variables Required](#environment-variables-required)
3. [Vercel Configuration](#vercel-configuration)
4. [Data Flow on Vercel](#data-flow-on-vercel)
5. [Dual Source Architecture (DB + Shopify)](#dual-source-architecture-db--shopify)
6. [Shopify Integration Details](#shopify-integration-details)
7. [AI Virtual Try-On on Vercel](#ai-virtual-try-on-on-vercel)
8. [Authentication on Vercel](#authentication-on-vercel)
9. [Deployment Steps](#deployment-steps)
10. [Troubleshooting](#troubleshooting)
11. [Production vs Test Deployment](#production-vs-test-deployment)
12. [Shopify as Full Platform](#shopify-as-full-platform)

---

## Architecture Overview

3 BOXES LUXURY is a full-stack luxury e-commerce platform built with modern web technologies. The application is designed with a **dual-source data architecture** that enables seamless operation both locally (with SQLite) and on Vercel (with Shopify Admin API as the primary data source).

### Core Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Next.js (App Router) | 16.x | SPA with Zustand state-based routing |
| Language | TypeScript | 5.x | Strict typing throughout |
| Styling | Tailwind CSS + shadcn/ui | 4.x | New York style, Lucide icons |
| Database | Prisma ORM (SQLite local / PostgreSQL Vercel) | 6.x | Schema auto-switches in build |
| Authentication | Custom JWT + Session-based | - | Demo user fallback on Vercel |
| State Management | Zustand (client) + TanStack Query (server) | 5.x | LocalStorage persistence |
| AI Service | ZAI SDK (z-ai-web-dev-sdk) | 0.0.17+ | Virtual try-on feature |
| Animations | Framer Motion | 12.x | Page transitions, hover effects |
| Image Processing | Sharp | 0.34.x | Watermarking on try-on images |

### Application Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js 16 App Router                 │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Page.tsx   │  │  Components  │  │    Hooks     │  │
│  │  (SPA Root)  │  │ (shadcn/ui)  │  │ (useStore)   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │          │
│         └────────┬────────┴──────────────────┘          │
│                  │                                      │
│         ┌───────▼────────┐                              │
│         │  Zustand Store  │  ← Client-side routing      │
│         │  (State Mgmt)   │    (View: home|product|...)  │
│         └───────┬────────┘                              │
│                 │                                        │
│  ┌──────────────▼──────────────────────────────────┐    │
│  │              60+ API Routes                      │    │
│  │  /api/products  /api/auth  /api/orders  ...     │    │
│  └───────┬──────────────────┬──────────────────┘    │
│          │                  │                         │
│   ┌──────▼──────┐   ┌──────▼───────┐                │
│   │  Prisma DB  │   │   Shopify    │                │
│   │ (SQLite/PG) │   │  Admin API   │                │
│   └─────────────┘   └──────────────┘                │
│                                                      │
│   ┌──────────────┐   ┌──────────────┐                │
│   │   ZAI SDK    │   │   Sharp      │                │
│   │  (AI Try-On) │   │ (Watermark)  │                │
│   └──────────────┘   └──────────────┘                │
└──────────────────────────────────────────────────────┘
```

### API Routes (60+)

The application exposes a comprehensive set of API routes covering all major functionality:

| Category | Routes | Notes |
|----------|--------|-------|
| **Products** | `/api/products`, `/api/products/[id]`, `/api/products/fix-images` | DB-first, Shopify fallback |
| **Categories** | `/api/categories` | DB-first, Shopify fallback |
| **Auth** | `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/session`, `/api/auth/refresh`, `/api/auth/social`, `/api/auth/2fa/*`, `/api/auth/otp/*`, `/api/auth/verify-*`, `/api/auth/approve`, `/api/auth/forgot-password`, `/api/auth/reset-password`, `/api/auth/users` | JWT + session, demo fallback |
| **Cart** | `/api/cart` | Session-based cart |
| **Orders** | `/api/orders`, `/api/orders/[id]`, `/api/orders/[id]/invoice`, `/api/orders/[id]/tracking`, `/api/orders/[id]/refund` | Requires DB |
| **Checkout** | `/api/checkout`, `/api/checkout/estimate` | Requires DB |
| **Payments** | `/api/payments/create-session`, `/api/payments/verify`, `/api/payment-methods` | Razorpay/Stripe |
| **Corporate** | `/api/corporate/login`, `/api/corporate/register`, `/api/corporate/profile`, `/api/corporate/branding`, `/api/corporate/members/*`, `/api/corporate/campaigns/*`, `/api/corporate/recipients/*` | Full gifting portal |
| **AI** | `/api/try-on`, `/api/try-on/status`, `/api/ai-assistant` | ZAI SDK + proxy |
| **Admin** | `/api/admin/products`, `/api/admin/users`, `/api/admin/orders`, `/api/admin/categories`, `/api/admin/corporate/*`, `/api/admin/dashboard`, `/api/admin/stats`, `/api/admin/reports`, `/api/admin/audit-logs`, `/api/admin/sessions`, `/api/admin/permissions`, `/api/admin/role-permissions`, `/api/admin/api-logs`, `/api/admin/campaigns/*`, `/api/admin/coupons`, `/api/admin/share-doc` | Admin dashboard |
| **Search** | `/api/search` | Products + categories |
| **Wishlist** | `/api/wishlist` | User wishlist |
| **Reviews** | `/api/reviews` | Product reviews |
| **Inventory** | `/api/inventory`, `/api/inventory/[productId]` | Stock management |
| **Partners** | `/api/partners`, `/api/partners/[id]/*` | Platform integrations |
| **Integrations** | `/api/integrations`, `/api/integrations/discover`, `/api/integrations/sync`, `/api/integrations/[id]` | Platform sync |
| **Vendors** | `/api/vendors`, `/api/vendors/[id]` | Vendor management |
| **Invoices** | `/api/invoices`, `/api/invoices/[id]` | Billing |
| **Accounting** | `/api/accounting` | Financial entries |
| **Offers** | `/api/offers`, `/api/offers/validate`, `/api/coupons/validate` | Coupon/discount system |
| **Wiki** | `/api/wiki`, `/api/wiki/[id]` | Internal documentation |
| **Support** | `/api/support-tickets`, `/api/support-tickets/[id]/*`, `/api/support/*` | Help desk |
| **Affiliates** | `/api/affiliate/click`, `/api/affiliate/stats` | Affiliate tracking |
| **Gift** | `/api/gift-recommend`, `/api/combo-suggestions` | Gift recommendations |
| **i18n/Currency** | `/api/geo`, `/api/exchange-rates`, `/api/currency/rates` | Multi-currency support |
| **Product Import** | `/api/product-import/search`, `/api/product-import/scrape`, `/api/product-import/import` | Product scraping |
| **Image Proxy** | `/api/image-proxy` | CORS-safe image serving |

---

## Environment Variables Required

All environment variables must be configured in the Vercel project settings (via `vercel env add` or the Vercel Dashboard).

### Database Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes (Vercel) | `file:./db/custom.db` (local) | PostgreSQL connection string for Vercel |
| `POSTGRES_PRISMA_URL` | Recommended | — | PostgreSQL URL used by `vercel-build.sh` to detect PG availability |

> **Important:** On Vercel, `DATABASE_URL` must point to a PostgreSQL database. SQLite only works in local development.

**Example PostgreSQL connection string:**
```
postgresql://username:password@host:5432/database?schema=public&sslmode=require
```

**Recommended providers:** Neon, Supabase, or Vercel Postgres.

### Shopify Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SHOPIFY_STORE_DOMAIN` | Yes | `3boxesluxury-2.myshopify.com` | Shopify store domain |
| `SHOPIFY_ADMIN_API_TOKEN` | Yes | `YOUR_SHOPIFY_ADMIN_TOKEN` | Admin API access token |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Optional | `YOUR_SHOPIFY_STOREFRONT_TOKEN` | Storefront API token |

> **Note:** The default values are hardcoded as fallbacks in `src/lib/shopify.ts`, but setting them as environment variables is strongly recommended for security and flexibility.

### AI Virtual Try-On Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ZAI_BASE_URL` | No | — | ZAI service base URL (e.g., `http://172.25.136.193:8080/v1`) |
| `ZAI_API_KEY` | No | — | ZAI API key |
| `ZAI_CHAT_ID` | No | — | ZAI chat session ID |
| `ZAI_TOKEN` | No | — | ZAI authentication token |
| `ZAI_USER_ID` | No | — | ZAI user identifier |
| `ZAI_PROXY_URL` | **Critical for Vercel** | — | Public proxy URL for AI service from Vercel |

> **Important:** The ZAI service at `172.25.136.193:8080` is an internal IP that is **not reachable** from Vercel serverless functions. You MUST set `ZAI_PROXY_URL` to point to a publicly accessible proxy endpoint that forwards requests to the AI service.

### Application Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Recommended | `3boxes-secret-key` | Secret key for JWT token signing |
| `NEXT_PUBLIC_BASE_URL` | Optional | — | Self-referencing URL for server-side image fetching |
| `DATA_SOURCE` | Optional | — | Set to `shopify` to use Shopify-only mode (avoids product duplication) |

### Setting Environment Variables on Vercel

```bash
# Using Vercel CLI
vercel env add DATABASE_URL production
vercel env add SHOPIFY_STORE_DOMAIN production
vercel env add SHOPIFY_ADMIN_API_TOKEN production
vercel env add JWT_SECRET production
vercel env add ZAI_PROXY_URL production
vercel env add DATA_SOURCE production

# Or bulk-set via the Vercel Dashboard:
# Project → Settings → Environment Variables
```

---

## Vercel Configuration

### vercel.json

The project root contains a `vercel.json` that configures the Vercel build:

```json
{
  "buildCommand": "bash vercel-build.sh",
  "installCommand": "bun install",
  "framework": "nextjs",
  "regions": ["bom1"]
}
```

| Setting | Value | Purpose |
|---------|-------|---------|
| `buildCommand` | `bash vercel-build.sh` | Custom build script that handles Prisma provider switching |
| `installCommand` | `bun install` | Uses Bun as the package manager |
| `framework` | `nextjs` | Vercel framework preset |
| `regions` | `bom1` | Mumbai, India (closest to target market) |

### vercel-build.sh

The custom build script handles the SQLite → PostgreSQL provider switch:

```bash
#!/bin/bash
set -e

# Step 1: Switch Prisma from SQLite to PostgreSQL provider
sed -i 's/provider = "sqlite"/provider = "postgresql"/g' prisma/schema.prisma

# Step 2: Check if PostgreSQL URL is configured
if echo "${POSTGRES_PRISMA_URL:-}" | grep -q "^postgres"; then
  export DATABASE_URL="$POSTGRES_PRISMA_URL"
  echo "DATABASE_URL=$POSTGRES_PRISMA_URL" > .env
  echo "✅ Postgres DB detected, pushing schema and seeding..."
  prisma generate
  prisma db push --accept-data-loss
  npx tsx prisma/seed.ts
else
  # No valid PG URL — build with dummy URL, rely on Shopify fallback
  export DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
  sed -i 's|url      = env("DATABASE_URL")|url      = "postgresql://user:password@localhost:5432/mydb"|g' prisma/schema.prisma
  echo "DATABASE_URL=postgresql://user:password@localhost:5432/mydb" > .env
  echo "⚠️  No valid POSTGRES_PRISMA_URL set — using Shopify fallback for data"
  prisma generate
fi

# Step 3: Build Next.js
next build
```

**Build flow:**

```
┌─────────────────────────────────┐
│         vercel-build.sh          │
├─────────────────────────────────┤
│                                 │
│  1. sed: sqlite → postgresql    │
│     in prisma/schema.prisma     │
│                                 │
│  2. POSTGRES_PRISMA_URL set?    │
│     ├── YES → Set DATABASE_URL  │
│     │         prisma generate   │
│     │         prisma db push    │
│     │         npx tsx seed.ts   │
│     │                           │
│     └── NO  → Dummy URL        │
│               prisma generate   │
│               (Shopify fallback)│
│                                 │
│  3. next build                  │
│                                 │
└─────────────────────────────────┘
```

### Package.json Build Script

The `package.json` also contains a `vercel-build` script as an alternative:

```json
{
  "scripts": {
    "vercel-build": "sed -i 's/provider = \"sqlite\"/provider = \"postgresql\"/g' prisma/schema.prisma && prisma generate && next build"
  }
}
```

This is simpler but does not handle PostgreSQL seeding. The `vercel-build.sh` is preferred.

---

## Data Flow on Vercel

The application uses a **graceful degradation** pattern where every data-fetching API route tries the database first and falls back to an alternative source if the database is unavailable.

### Products API Flow

```
GET /api/products?category=jewelry&search=ring&page=1&limit=12

┌──────────────────────┐
│  Try Prisma DB       │
│  db.product.findMany │
└──────────┬───────────┘
           │
     ┌─────▼──────┐     ┌──────────────────────┐
     │  Success?  │──NO─►│  Fallback: Shopify   │
     └─────┬──────┘     │  Admin API            │
           │YES          │  fetchShopifyProducts │
           │              └──────────┬───────────┘
     ┌─────▼──────┐                │
     │ Return DB  │          ┌─────▼──────┐
     │ products   │          │ Transform  │
     │ source:    │          │ & filter   │
     │ "database" │          │ source:    │
     └────────────┘          │ "shopify"  │
                             └────────────┘
```

**Response format** (identical for both sources):

```json
{
  "products": [
    {
      "id": "shopify-1234567890",
      "name": "Diamond Necklace",
      "slug": "diamond-necklace",
      "description": "...",
      "price": 28000,
      "compareAtPrice": 35000,
      "images": ["https://cdn.shopify.com/..."],
      "category": "Jewelry",
      "categorySlug": "jewelry",
      "stock": 5,
      "rating": 4.8,
      "reviewCount": 42,
      "featured": true,
      "tags": ["diamond", "necklace"],
      "occasions": [],
      "recipientTypes": [],
      "relationships": [],
      "deliveryEstimate": "3-5 business days",
      "platform": null,
      "isExternal": false,
      "sourceUrl": null,
      "affiliateUrl": null,
      "platformLogo": null,
      "commission": null,
      "syncStatus": "active"
    }
  ],
  "total": 42,
  "page": 1,
  "totalPages": 4,
  "source": "shopify"
}
```

### Categories API Flow

```
GET /api/categories

┌──────────────────────┐
│  Try Prisma DB       │
│  db.category.findMany│
└──────────┬───────────┘
           │
     ┌─────▼──────┐     ┌──────────────────────────┐
     │  Success?  │──NO─►│  Fallback: Shopify        │
     └─────┬──────┘     │  Custom + Smart Collections│
           │YES          │  + Product type mapping    │
     ┌─────▼──────┐     └──────────┬───────────────┘
     │ Return DB  │           ┌─────▼──────┐
     │ categories │           │ Transform  │
     │ source:    │           │ source:    │
     │ "database" │           │ "shopify"  │
     └────────────┘           └────────────┘
```

### Auth API Flow

```
POST /api/auth/login { email, password }

┌──────────────────────┐
│  Try Prisma DB       │
│  db.user.findUnique  │
└──────────┬───────────┘
           │
     ┌─────▼──────┐     ┌──────────────────────┐
     │  Found?    │──NO─►│  Demo User Fallback  │
     └─────┬──────┘     │  Hardcoded users     │
           │YES          │  JWT token (7 day)   │
     ┌─────▼──────┐     └──────────┬───────────┘
     │ bcrypt      │           ┌─────▼──────┐
     │ verify      │           │ Return     │
     │ + Session   │           │ demo user  │
     │ token       │           │ + JWT      │
     └────────────┘           │ _demo: true│
                              └────────────┘
```

### AI Try-On API Flow

```
POST /api/try-on { productId, selfieData }

┌──────────────────────────┐
│  Check AI Availability   │
│  isZAIAvailable()        │
└──────────┬───────────────┘
           │
     ┌─────▼──────────┐
     │  mode = "ai"?  │─── ZAI SDK directly
     │                 │
     │  mode = "proxy"│─── ZAI_PROXY_URL
     │                 │
     │  mode = "unavail"│── 503 Error
     └─────────────────┘

GET /api/try-on/status → { available, mode }
```

### Orders/Checkout/Payments Flow

```
POST /api/orders, /api/checkout, /api/payments/*

┌──────────────────────┐
│  Try Prisma DB       │
│  (No Shopify fallback)│
└──────────┬───────────┘
           │
     ┌─────▼──────┐
     │  Success?  │──NO─► Error 500/503
     └─────┬──────┘
           │YES
     ┌─────▼──────┐
     │ Return     │
     │ result     │
     └────────────┘
```

> **Warning:** Orders, checkout, and payment routes have NO Shopify fallback. They require a working PostgreSQL database.

---

## Dual Source Architecture (DB + Shopify)

### How It Works

The dual-source architecture is the backbone of the application's resilience. Every read-only data endpoint follows the same pattern:

1. **API routes try the database first** via Prisma ORM
2. **If the DB query fails** (caught in the `catch` block), they fall back to the Shopify Admin API
3. **Shopify data is transformed** to match the same response format as DB data, ensuring frontend compatibility
4. **Products get a `shopify-{id}` prefix** (e.g., `shopify-8765432109`) to avoid ID collisions with database products
5. **5-minute in-memory cache** for Shopify API responses to reduce API call volume

### Code Pattern (Products API)

```typescript
// src/app/api/products/route.ts (simplified)
export async function GET(request: NextRequest) {
  // ─── Try database first ───
  try {
    const products = await db.product.findMany({ where, include: { category: true } });
    return NextResponse.json({ products, source: 'database' });
  } catch (dbError) {
    // ─── Fallback to Shopify Admin API ───
    try {
      const shopifyProducts = await fetchShopifyProducts();
      // Apply same filters, sorting, pagination
      const result = filterAndPaginateShopifyProducts(shopifyProducts, params);
      return NextResponse.json({ ...result, source: 'shopify' });
    } catch (shopifyError) {
      return NextResponse.json(
        { error: 'Failed to fetch products from both database and Shopify' },
        { status: 500 }
      );
    }
  }
}
```

### Shopify Product ID Transformation

When products come from Shopify, their IDs are prefixed to prevent collisions:

```typescript
// In src/lib/shopify.ts
const transformed = products.map((p) => ({
  id: `shopify-${p.id}`,     // "shopify-8765432109"
  name: p.title,
  slug: p.handle || toSlug(p.title),
  // ... rest of fields
}));
```

### In-Memory Cache

```typescript
// src/lib/shopify.ts
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

let productsCache: CacheEntry<ShopifyProductTransformed[]> | null = null;
let categoriesCache: CacheEntry<ShopifyCategoryTransformed[]> | null = null;

function isCacheValid<T>(cache: CacheEntry<T> | null): cache is CacheEntry<T> {
  return cache !== null && Date.now() - cache.timestamp < CACHE_TTL;
}
```

> **Note:** This cache is per-serverless-function-instance. On Vercel, each function invocation may hit a different instance, so cache hits are not guaranteed. However, the Next.js `fetch` with `revalidate: 300` provides a secondary caching layer.

### Known Issues

#### Product Duplication

**Problem:** If PostgreSQL is configured AND seeded with the seed script, products appear from **BOTH** the database AND Shopify, causing duplication. The products API returns database products (from the `try` block) without checking Shopify, so this only happens if the same product exists in both sources with different IDs.

**Solution:** On Vercel, use Shopify-only mode by setting the environment variable:

```bash
DATA_SOURCE=shopify
```

This tells the application to skip the database query for read operations and go directly to Shopify. (Note: This requires implementing a `DATA_SOURCE` check in the API routes — currently the fallback is automatic based on DB errors.)

#### Alternative: Don't Seed on Vercel

If you want to use PostgreSQL on Vercel but avoid duplication, simply don't seed the database. Let the Shopify API be the source of truth for products and categories, and only use PostgreSQL for orders, users, sessions, and other transactional data.

---

## Shopify Integration Details

### Store Configuration

| Setting | Value |
|---------|-------|
| Store | `3boxesluxury-2.myshopify.com` |
| API | Admin REST API |
| Version | `2024-10` |
| Auth | `X-Shopify-Access-Token` header |
| Base URL | `https://3boxesluxury-2.myshopify.com/admin/api/2024-10` |

### API Endpoints Used

| Endpoint | Purpose | Cache TTL |
|----------|---------|-----------|
| `/products.json?limit=250&status=active` | Fetch all active products | 5 minutes |
| `/custom_collections.json?limit=250` | Fetch custom collections | 5 minutes |
| `/smart_collections.json?limit=250` | Fetch smart collections | 5 minutes |
| `/products/count.json` | Health check (is Shopify available?) | N/A |

### Product Type → Category Mapping

The Shopify integration maps product types to application categories using a comprehensive mapping table with 60+ entries:

```typescript
// src/lib/shopify.ts (excerpt)
const PRODUCT_TYPE_TO_CATEGORY: Record<string, { name: string; slug: string }> = {
  // Jewelry variants
  'jewelry': { name: 'Jewelry', slug: 'jewelry' },
  'jewellery': { name: 'Jewelry', slug: 'jewelry' },
  'fine jewellery': { name: 'Jewelry', slug: 'jewelry' },
  'rings': { name: 'Jewelry', slug: 'jewelry' },
  'necklaces': { name: 'Jewelry', slug: 'jewelry' },
  'earrings': { name: 'Jewelry', slug: 'jewelry' },
  'bracelets': { name: 'Jewelry', slug: 'jewelry' },
  'bangles': { name: 'Jewelry', slug: 'jewelry' },
  'chains': { name: 'Jewelry', slug: 'jewelry' },
  'anklets': { name: 'Jewelry', slug: 'jewelry' },
  'pendants': { name: 'Jewelry', slug: 'jewelry' },
  'brooches': { name: 'Jewelry', slug: 'jewelry' },

  // Other categories
  'watches': { name: 'Watches', slug: 'watches' },
  'sarees': { name: 'Sarees', slug: 'sarees' },
  "men's shirts": { name: "Men's Shirts & T-Shirts", slug: 'mens-shirts-t-shirts' },
  'fashion': { name: 'Fashion', slug: 'fashion' },
  'fragrances': { name: 'Fragrances', slug: 'fragrances' },
  'leather goods': { name: 'Leather Goods', slug: 'leather-goods' },
  'home & living': { name: 'Home & Living', slug: 'home-living' },
  'couple friendly gifts': { name: 'Couple Friendly Gifts', slug: 'couple-friendly-gifts' },
  'romantic gifts': { name: 'Romantic Gifts', slug: 'romantic-gifts' },
  'toys': { name: 'Toys', slug: 'toys' },
  // ... and 40+ more mappings
};
```

**Matching algorithm:**
1. Direct case-insensitive match against the mapping table
2. Partial match (substring contains)
3. Fallback: create a new category from the product type string

### Category-Based Fallback Images

When Shopify products have no images, the system assigns category-appropriate placeholder images:

```typescript
// Deterministic selection: same product always gets the same image
function getFallbackImages(categorySlug: string, productId: number): string[] {
  const pool = CATEGORY_FALLBACK_IMAGES[categorySlug];
  if (pool && pool.length > 0) {
    const idx = productId % pool.length;
    const images = [pool[idx]];
    if (pool.length > 1) {
      const secondIdx = (productId + 1) % pool.length;
      if (secondIdx !== idx) images.push(pool[secondIdx]);
    }
    return images;
  }
  return ['/images/placeholder.jpg'];
}
```

**Category image pools:**

| Category | Images | Count |
|----------|--------|-------|
| Jewelry | `/images/products/jewelry-{1..10}.jpg` + alt | 11 |
| Watches | `/images/products/watch-{1..4}.jpg` + alt | 6 |
| Sarees | `/images/products/saree-{1..10}.jpg` | 10 |
| Men's Shirts | `/images/products/mens-shirt-{1..10}.jpg` | 10 |
| Fashion | `/images/products/fashion-{1..3}.jpg` + alt | 4 |
| Fragrances | `/images/products/fragrance-{1..3}.jpg` + alt | 4 |
| Leather Goods | `/images/products/leather-{1..3}.jpg` + alt | 5 |
| Home & Living | `/images/products/home-{1..3}.jpg` + alt | 4 |
| Couple Gifts | `/images/products/couple-{1..3}.jpg` | 3 |
| Romantic Gifts | `/images/products/romantic-{1..3}.jpg` | 3 |
| Toys | `/images/products/toy-{1..3}.jpg` | 3 |

### Collections as Categories

Shopify collections (both custom and smart) are used as the primary source for category data:

```typescript
// Fetch both types of collections
const [customData, smartData, products] = await Promise.all([
  shopifyFetch('/custom_collections.json', { limit: '250' }),
  shopifyFetch('/smart_collections.json', { limit: '250' }),
  fetchShopifyProducts(),  // for product counts
]);

// Build category map from collections
// Skip "frontpage" and "uncategorized"
// Count products per category
// Remove empty product-type-only categories
```

### Shopify Fetch Helper

```typescript
async function shopifyFetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${SHOPIFY_API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 300 }, // Next.js cache: 5 minutes
  });

  if (!response.ok) {
    throw new Error(`Shopify API error (${response.status}): ${text}`);
  }

  return response.json();
}
```

---

## AI Virtual Try-On on Vercel

### Architecture

The AI Virtual Try-On feature uses the ZAI SDK (`z-ai-web-dev-sdk`) to generate realistic images of users wearing products. The pipeline involves:

1. **VLM Analysis** — Analyze the user's selfie and product image using `glm-4v-plus` vision model
2. **Image Generation** — Try multiple strategies with increasing fallback
3. **Watermarking** — Apply "3BOXES GIFTS - AI Style Preview" watermark using Sharp
4. **Suggestions** — Fetch complementary product suggestions

### Generation Strategies

The try-on pipeline tries 4 strategies in order, stopping at the first success:

| Strategy | Priority | Images Used | Face Score | Product Score | Description |
|----------|----------|-------------|------------|---------------|-------------|
| `edit-both` | 1st | Selfie + Product | 7/10 | 7/10 | Combine both images in a single edit |
| `edit-selfie` | 2nd | Selfie only | 8/10 | 6/10 | Edit the selfie with text description |
| `edit-product` | 3rd | Product only | 6/10 | 8/10 | Edit the product image with person description |
| `create-detailed` | 4th | None (text-to-image) | 5/10 | 5/10 | Generate from VLM descriptions alone |

**Best result selection:**
```typescript
const best = results.reduce((a, b) => {
  const sa = a.faceScore * 0.6 + a.productScore * 0.4;  // 60% face, 40% product
  const sb = b.faceScore * 0.6 + b.productScore * 0.4;
  return sb > sa ? b : a;
});
```

### VLM Analysis

Before generation, the system analyzes both images:

```typescript
// Person analysis prompt (glm-4v-plus model)
const VLM_PERSON_PROMPT = `Analyze this person's face and appearance in EXACT detail for a virtual try-on. Describe:
1. Face shape, skin tone (with undertone)
2. Hair: color, texture, length, style
3. Body type and build
4. Current expression, pose
5. Any distinctive features`;

// Product analysis prompt
const VLM_PRODUCT_PROMPT = `Describe this fashion/luxury product in EXACT detail for a virtual try-on. Describe:
1. Type and name
2. EXACT primary color
3. Secondary colors and accents
4. Pattern type
5. Material and texture
6. Key design details
7. How it would be worn`;
```

### Watermarking

All generated images are watermarked with the "3BOXES GIFTS" brand using Sharp:

```typescript
// src/lib/watermark.ts
// Creates a semi-transparent SVG watermark at the bottom-right corner
// Contains: "3BOXES GIFTS" (gold gradient) + "AI Style Preview" (subtext)
// Scaled based on image dimensions
// Attempts to use the logo PNG from /public/images/logo.png
// Falls back to text-only watermark if logo unavailable
```

### Availability Check

The `/api/try-on/status` endpoint provides a lightweight availability check:

```typescript
// Returns:
{ available: true, mode: 'ai' }      // Direct ZAI access
{ available: true, mode: 'proxy' }    // Via proxy
{ available: false, message: '...' }  // Unavailable
```

### Problem: ZAI Service Not Reachable from Vercel

The ZAI AI service runs at `172.25.136.193:8080`, which is an **internal/private IP address**. Vercel serverless functions cannot reach internal IPs.

**Health check logic:**
```typescript
// src/lib/zai.ts
const isInternalIP = baseUrl.includes('172.25.') || baseUrl.includes('192.168.')
  || baseUrl.includes('10.') || baseUrl.includes('localhost');

if (isInternalIP) {
  // Try direct health check (will fail on Vercel)
  await fetch(`${healthUrl}/dashboard/`, { signal: controller.signal });
}
```

### Solution: ZAI_PROXY_URL

Set the `ZAI_PROXY_URL` environment variable to a publicly accessible endpoint that proxies requests to the AI service:

```bash
# Example: Using a proxy deployed on a VPS or tunnel service
ZAI_PROXY_URL=https://your-proxy.example.com
```

**How the proxy works:**

```
┌──────────┐      ┌──────────────┐      ┌───────────────────┐
│  Vercel  │─────►│  Proxy URL   │─────►│  ZAI AI Service   │
│ Function │      │  (public)    │      │  172.25.136.193   │
│          │◄─────│              │◄─────│  :8080            │
└──────────┘      └──────────────┘      └───────────────────┘
```

The try-on route automatically detects when the direct AI service is unreachable and falls back to the proxy:

```typescript
// src/app/api/try-on/route.ts
const aiCheck = await isZAIAvailable();
const proxyUrl = process.env.ZAI_PROXY_URL;

if ((aiCheck.mode === 'proxy' || !aiCheck.available) && proxyUrl) {
  // Forward the entire request to the proxy
  const proxyResponse = await fetch(`${proxyUrl}/api/try-on`, {
    method: 'POST',
    headers: proxyHeaders,
    body: JSON.stringify(body),
  });
  return NextResponse.json(await proxyResponse.json());
}

if (!aiCheck.available) {
  return NextResponse.json({
    error: 'Virtual try-on is currently unavailable...',
    code: 'AI_SERVICE_UNAVAILABLE',
  }, { status: 503 });
}
```

### Setting Up the Proxy

Options for creating a publicly accessible proxy:

1. **Deploy the included `mini-services/ai-proxy`** on a VPS or cloud server that can reach `172.25.136.193:8080`
2. **Use ngrok or similar tunnel** to expose the AI service
3. **Use Cloudflare Tunnel** for a more permanent solution
4. **Deploy a simple Node.js proxy** on any server with access to the AI service

---

## Authentication on Vercel

### Architecture

The authentication system uses a **JWT + session-based** approach with graceful fallback to demo users when the database is unavailable.

### Authentication Flow

```
Login Request
     │
     ▼
┌──────────────────┐
│ db.user.findUnique│
└────────┬─────────┘
         │
    ┌────▼─────┐
    │ DB User  │──── YES ──► bcrypt compare ──► Session token
    │ Found?   │
    └────┬─────┘
         │ NO
         ▼
┌──────────────────┐
│ Demo User Match  │──── YES ──► JWT sign (7d) ──► Demo session
│ (hardcoded)      │
└────────┬─────────┘
         │ NO
         ▼
    401 Unauthorized
```

### Demo Users

When the database is unavailable (e.g., Vercel without PostgreSQL), the system falls back to these hardcoded demo users:

| Email | Password | Role | Permissions |
|-------|----------|------|-------------|
| `admin@3boxesluxury.com` | `admin123` | `admin` | Full access (products, orders, users, reports, settings, inventory) |
| `user@3boxesluxury.com` | `user123` | `user` | Own orders, cart, wishlist, profile |
| `agent@3boxesluxury.com` | `agent123` | `agent` | Orders, products, customers, reports |
| `team@3boxesluxury.com` | `team123` | `team` | Orders, products, inventory, reports |
| `corporate@3boxesluxury.com` | `corporate123` | `corporate` | Corporate, campaigns, branding, recipients |

### JWT Token Structure

For demo users, the JWT token contains:

```typescript
{
  type: 'session',
  userId: 'demo-admin',        // demo-{email_prefix}
  email: 'admin@3boxesluxury.com',
  name: 'Admin',
  role: 'admin',
  permissions: ['products.manage', 'orders.manage', ...],
  // exp: 7 days from now
}
```

### Session vs JWT

| Aspect | DB User | Demo User |
|--------|---------|-----------|
| Authentication | bcrypt compare | Plain text compare |
| Token type | Session token (random) | JWT (signed) |
| Session storage | DB Session table | In-memory only |
| Persistence | Survives restarts | Lost on function restart |
| Token verification | DB lookup | JWT verify (no DB) |
| Flag | None | `_demo: true` in response |

### JWT_SECRET

The `JWT_SECRET` environment variable is used to sign and verify JWT tokens. If not set, it defaults to `3boxes-secret-key`.

> **Security Note:** Always set a strong, unique `JWT_SECRET` in production. The default value should never be used in a live environment.

---

## Deployment Steps

### Prerequisites

- Node.js 18+ or Bun 1.x
- Vercel CLI (`npm i -g vercel`)
- A Vercel account
- PostgreSQL database (Neon, Supabase, or Vercel Postgres)
- Shopify Admin API credentials

### Step-by-Step Guide

#### 1. Install Vercel CLI

```bash
npm i -g vercel
```

#### 2. Login to Vercel

```bash
vercel login
```

#### 3. Set Up PostgreSQL Database

Choose one of the following providers:

| Provider | Free Tier | Setup |
|----------|-----------|-------|
| **Neon** | 0.5 GB | [neon.tech](https://neon.tech) — Create project, get connection string |
| **Supabase** | 500 MB | [supabase.com](https://supabase.com) — Create project, get connection string |
| **Vercel Postgres** | 256 MB | Vercel Dashboard → Storage → Create Database |

**Connection string format:**
```
postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```

#### 4. Link the Project

```bash
cd /home/z/my-project
vercel link
```

Follow the prompts to connect to your Vercel project.

#### 5. Set Environment Variables

```bash
# Required
vercel env add POSTGRES_PRISMA_URL production
# Enter your PostgreSQL connection string

vercel env add SHOPIFY_STORE_DOMAIN production
# Enter: 3boxesluxury-2.myshopify.com

vercel env add SHOPIFY_ADMIN_API_TOKEN production
# Enter: YOUR_SHOPIFY_ADMIN_TOKEN

vercel env add JWT_SECRET production
# Enter a strong random string

# Recommended
vercel env add ZAI_PROXY_URL production
# Enter your AI proxy URL (if using virtual try-on)

vercel env add DATA_SOURCE production
# Enter: shopify (to use Shopify-only mode)

# Optional
vercel env add SHOPIFY_STOREFRONT_ACCESS_TOKEN production
vercel env add NEXT_PUBLIC_BASE_URL production
vercel env add ZAI_BASE_URL production
vercel env add ZAI_API_KEY production
vercel env add ZAI_CHAT_ID production
vercel env add ZAI_TOKEN production
vercel env add ZAI_USER_ID production
```

#### 6. Deploy

```bash
vercel --prod
```

The deployment will:
1. Run `bash vercel-build.sh`
2. Switch Prisma from SQLite to PostgreSQL
3. Push the schema to PostgreSQL
4. Seed the database (if `POSTGRES_PRISMA_URL` is valid)
5. Build the Next.js application
6. Deploy to Vercel's Mumbai region (bom1)

#### 7. Verify Deployment

```bash
# Check the deployed URL
curl https://your-app.vercel.app/api/categories

# Check try-on status
curl https://your-app.vercel.app/api/try-on/status

# Test login
curl -X POST https://your-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@3boxesluxury.com","password":"admin123"}'
```

### Deployment Without PostgreSQL

If you want to deploy without PostgreSQL (using Shopify as the sole data source):

1. **Do NOT set** `POSTGRES_PRISMA_URL`
2. The build script will detect no valid PostgreSQL URL
3. Prisma will be configured with a dummy URL for `prisma generate` to succeed
4. All product/category data will come from Shopify
5. Auth will use demo users only
6. Orders, checkout, and payments will NOT work

---

## Troubleshooting

### HMR Errors During Development

**Symptom:** Hot Module Replacement errors in the browser console.

**Solution:** Ensure all imported components exist in `src/components/ui/`. Check that:
- All shadcn/ui component files are present
- No circular imports exist
- TypeScript types are correct

### Product Duplications

**Symptom:** Products appear twice in the listing — once from the database, once from Shopify.

**Solution:**
1. Set `DATA_SOURCE=shopify` in Vercel environment variables
2. Or, don't seed the database on Vercel (remove the seeding step from `vercel-build.sh`)
3. Or, clear the PostgreSQL database and rely solely on Shopify

### AI Try-On Not Working

**Symptom:** Virtual try-on returns 503 or "AI_SERVICE_UNAVAILABLE" error.

**Diagnosis:**
1. Check `/api/try-on/status` endpoint:
   ```bash
   curl https://your-app.vercel.app/api/try-on/status
   ```
2. If `available: false`, the AI service is not reachable

**Solutions:**
1. **Set `ZAI_PROXY_URL`** to a publicly accessible proxy endpoint
2. Deploy the `mini-services/ai-proxy` service on a server that can reach the ZAI service
3. Ensure the proxy correctly forwards `/api/try-on` and `/api/try-on/status` requests
4. For `.space-z.ai` domains, the proxy must include the `Abc` header

### Admin Login Failing

**Symptom:** Cannot log in to the admin dashboard.

**Diagnosis:**
1. Check if PostgreSQL is connected:
   ```bash
   curl -X POST https://your-app.vercel.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@3boxesluxury.com","password":"admin123"}'
   ```
2. If response includes `_demo: true`, the database is unavailable

**Solutions:**
1. Use demo credentials if DB is unavailable
2. Verify `POSTGRES_PRISMA_URL` is correct
3. Check that the database was seeded during build
4. Ensure the database is accessible from Vercel's network

### Images Not Loading

**Symptom:** Product images show broken or placeholder images.

**Diagnosis:**
1. Check browser console for 403/CORS errors from Shopify CDN
2. Verify the `next.config.ts` image configuration allows remote images

**Solutions:**
1. Verify Shopify CDN domains are accessible (`cdn.shopify.com`)
2. Check that `next.config.ts` allows all remote image hosts:
   ```typescript
   images: {
     remotePatterns: [{ protocol: 'https', hostname: '**' }],
   }
   ```
3. For local images, ensure `/public/images/products/` directory is deployed

### Build Failures

**Symptom:** Vercel build fails with Prisma or TypeScript errors.

**Diagnosis:**
1. Check the Vercel build logs for specific errors
2. Verify `vercel-build.sh` is executable and correct

**Solutions:**
1. Ensure `POSTGRES_PRISMA_URL` is a valid PostgreSQL connection string
2. Check that `prisma generate` succeeds with the PostgreSQL provider
3. Verify TypeScript errors are suppressed in `next.config.ts`:
   ```typescript
   typescript: { ignoreBuildErrors: true }
   ```
4. If Prisma schema fails, check that the `sed` command in `vercel-build.sh` correctly switches providers

### Database Connection Issues

**Symptom:** API routes return 500 errors with database-related messages.

**Solutions:**
1. Verify the PostgreSQL connection string includes `?sslmode=require`
2. Check that the database server allows connections from Vercel's IP range
3. For Neon: ensure the database is not in a "suspended" state
4. For Supabase: check that the project is not paused
5. Ensure `DATABASE_URL` is set in the Vercel environment (not just `POSTGRES_PRISMA_URL`)

### Sharp Module Errors

**Symptom:** Build fails with errors related to the `sharp` native module.

**Solution:** Sharp should work on Vercel's serverless functions. If issues occur:
1. Ensure `sharp` is in `dependencies` (not `devDependencies`)
2. Try adding to `vercel.json`:
   ```json
   { "functions": { "api/try-on/route.ts": { "memory": 1024 } } }
   ```

---

## Production vs Test Deployment

### Current Production

| Environment | URL | Notes |
|-------------|-----|-------|
| Production | `https://my-project-sepia-seven-42.vercel.app/` | Main deployment |

### Recommended Setup

For a professional deployment workflow, use **separate Vercel projects** with different environment variables:

| Environment | Project Name | DB | Data Source | AI Proxy | Purpose |
|-------------|-------------|----|-------------|----------|---------|
| Production | `3boxes-luxury` | Production PG | Shopify | Production proxy | Live site |
| Staging | `3boxes-luxury-staging` | Staging PG | Shopify | Staging proxy | Pre-release testing |
| Preview | Automatic | None (Shopify) | Shopify | None | PR previews |

### Creating a Staging Environment

```bash
# Create a separate Vercel project for staging
vercel --scope your-team

# Set different environment variables
vercel env add POSTGRES_PRISMA_URL preview
vercel env add JWT_SECRET preview  # Different from production!

# Deploy to staging
vercel  # Without --prod flag = preview deployment
```

### Environment Variable Best Practices

1. **Never share `JWT_SECRET`** between environments
2. **Use different Shopify tokens** if running multiple stores
3. **Staging AI proxy** should point to a non-production AI service
4. **Database URLs** should be completely separate
5. Use Vercel's **Environment** feature: Production / Preview / Development

---

## Shopify as Full Platform

### Can all products be ported to Shopify?

**Yes.** The 3 BOXES LUXURY Shopify store already has products configured. The Next.js headless storefront displays these products through the Shopify Admin API.

### Current State

- The Shopify store at `3boxesluxury-2.myshopify.com` is **actively populated** with products
- The Next.js application acts as a **headless storefront** (headless commerce pattern)
- Products are fetched in real-time via the Shopify Admin REST API
- No data sync is needed — Shopify is the source of truth

### Architecture: Headless Commerce

```
┌──────────────────────┐      ┌──────────────────────┐
│                      │      │                      │
│   Next.js Frontend   │─────►│  Shopify Admin API   │
│   (Vercel)           │      │  (Data Source)       │
│                      │◄─────│                      │
│   - Product display  │      │  - Product catalog   │
│   - Cart & checkout  │      │  - Collections       │
│   - User accounts    │      │  - Inventory levels  │
│   - AI try-on        │      │  - Pricing           │
│                      │      │                      │
└──────────────────────┘      └──────────────────────┘
```

### What Works on Shopify-Only Mode

| Feature | Works? | Notes |
|---------|--------|-------|
| Product listing | ✅ | Via Shopify Admin API |
| Category browsing | ✅ | Via Shopify collections |
| Product search | ✅ | Client-side filtering |
| Product detail view | ✅ | Full product data |
| Cart | ⚠️ | In-memory only (no persistence) |
| Authentication | ⚠️ | Demo users only |
| Checkout | ❌ | Requires DB for orders |
| Payment | ❌ | Requires DB for payment sessions |
| Order tracking | ❌ | Requires DB |
| Admin dashboard | ⚠️ | Limited (no data persistence) |
| AI try-on | ⚠️ | Requires ZAI proxy |
| Corporate gifting | ❌ | Requires DB for campaigns |
| Wishlist | ⚠️ | In-memory only |
| Reviews | ❌ | Requires DB |

### Making Shopify-Only Mode Fully Functional

To make the application fully functional without a database, you would need to:

1. **Implement Shopify Storefront API** for cart, checkout, and customer accounts
2. **Use Shopify's native checkout** instead of custom checkout
3. **Use Shopify customer accounts** instead of custom auth
4. **Keep PostgreSQL for** corporate gifting, campaigns, and admin data that Shopify doesn't handle

### No Code Changes Needed

The current codebase already supports Shopify as the primary data source on Vercel. The dual-source architecture automatically falls back to Shopify when the database is unavailable. The storefront **IS** the Shopify integration — this is the headless commerce pattern.

---

## Appendix: File Structure Reference

### Key Configuration Files

```
/home/z/my-project/
├── vercel.json              # Vercel build configuration
├── vercel-build.sh          # Custom build script (SQLite → PG switch)
├── next.config.ts           # Next.js configuration
├── package.json             # Dependencies and scripts
├── prisma/
│   ├── schema.prisma        # Database schema (SQLite by default)
│   ├── seed.ts              # Main seed script (categories, products, users)
│   └── seed-users.ts        # User-only seed script
├── src/
│   ├── lib/
│   │   ├── db.ts            # Prisma client singleton
│   │   ├── shopify.ts       # Shopify Admin API client
│   │   ├── zai.ts           # ZAI AI service client
│   │   ├── store.ts         # Zustand state management
│   │   ├── sessions.ts      # Session management
│   │   ├── watermark.ts     # Sharp-based watermarking
│   │   ├── auth-helper.ts   # Auth utilities
│   │   ├── currency.ts      # Multi-currency support
│   │   └── ...              # Other utility files
│   ├── app/
│   │   ├── page.tsx         # SPA root page
│   │   ├── layout.tsx       # Root layout
│   │   └── api/             # 60+ API routes
│   │       ├── products/
│   │       ├── categories/
│   │       ├── auth/
│   │       ├── orders/
│   │       ├── try-on/
│   │       ├── corporate/
│   │       ├── admin/
│   │       └── ...
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   └── ...              # Application components
│   └── hooks/               # Custom React hooks
├── public/
│   ├── images/
│   │   ├── products/        # Product images
│   │   ├── categories/      # Category images
│   │   └── logos/           # Partner platform logos
│   └── ...
└── mini-services/
    └── ai-proxy/            # AI proxy service (for local sandbox)
```

### Prisma Schema Models (35+)

The database schema includes 35+ models covering:

- **Product Catalog:** Category, Product, ProductVariant, ProductImage
- **Shopping:** Cart, CartItem, WishlistItem
- **Orders:** Order, OrderItem, OrderTrackingEvent, PaymentSession, OrderInvoice
- **Users:** User, UserPermission, Session, AuditLog
- **Corporate Gifting:** CorporateAccount, CorporateMember, CorporateBranding, CorporateCampaign, CampaignRecipient
- **Platform Integration:** PlatformIntegration, SyncLog, PartnerCategoryMap
- **Financial:** Vendor, Invoice, InvoiceItem, AccountEntry, PaymentMethod, Offer
- **Content:** WikiDocument, AgentDocShare, Review
- **Support:** SupportTicket, SupportTicketMessage
- **Affiliates:** AffiliateClick
- **i18n:** CurrencyRate, GeoCountry

---

> **Document Version:** 1.0
> **Generated from source code analysis:** March 2026
> **Project:** 3 BOXES LUXURY — Luxury E-Commerce Platform
