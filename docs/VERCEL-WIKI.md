# 3 BOXES LUXURY — Vercel Deployment Wiki

> **Quick reference wiki for deploying and managing the 3 BOXES LUXURY platform on Vercel.**
> For the full technical documentation, see [VERCEL-DEPLOYMENT-GUIDE.md](./VERCEL-DEPLOYMENT-GUIDE.md).

---

## 🚀 Quick Deploy (Shopify-Only Mode)

This is the recommended deployment method. No PostgreSQL database required.

```bash
# 1. Create a new Vercel project
npx vercel projects add 3boxes-luxury-test --token YOUR_TOKEN

# 2. Set environment variables
# Using Vercel REST API:
curl -X POST "https://api.vercel.com/v9/projects/3boxes-luxury-test/env" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"DATA_SOURCE","value":"shopify","target":["production","preview","development"],"type":"plain"}'

curl -X POST "https://api.vercel.com/v9/projects/3boxes-luxury-test/env" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"SHOPIFY_STORE_DOMAIN","value":"3boxesluxury-2.myshopify.com","target":["production","preview","development"],"type":"plain"}'

curl -X POST "https://api.vercel.com/v9/projects/3boxes-luxury-test/env" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"SHOPIFY_ADMIN_API_TOKEN","value":"YOUR_SHOPIFY_ADMIN_TOKEN","target":["production","preview","development"],"type":"plain"}'

curl -X POST "https://api.vercel.com/v9/projects/3boxes-luxury-test/env" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"JWT_SECRET","value":"your-secret-key","target":["production","preview","development"],"type":"plain"}'

# 3. Link and deploy
rm -rf .vercel
echo "y" | npx vercel link --token YOUR_TOKEN --project 3boxes-luxury-test
npx vercel --prod --token YOUR_TOKEN --yes
```

---

## 🌐 Deployment Links

| Environment | URL | Data Source | Notes |
|-------------|-----|-------------|-------|
| **Production** | https://my-project-sepia-seven-42.vercel.app/ | DB + Shopify fallback | Original deployment with PostgreSQL |
| **Test (Shopify-only)** | https://3boxes-luxury-test.vercel.app/ | Shopify only | No DB dependency, no duplications |
| **Local Development** | http://localhost:3000 | SQLite | Full features including AI try-on |

---

## 🔑 Demo Login Credentials

| Email | Password | Role | Dashboard Access |
|-------|----------|------|------------------|
| admin@3boxesluxury.com | admin123 | Admin | Full admin dashboard |
| user@3boxesluxury.com | user123 | User | User profile, orders, wishlist |
| agent@3boxesluxury.com | agent123 | Agent | Orders, customers, reports |
| team@3boxesluxury.com | team123 | Team | Products, inventory, reports |
| corporate@3boxesluxury.com | corporate123 | Corporate | Campaigns, branding, recipients |

---

## 🛍️ Shopify Integration

### Confirmation: YES, all products can be ported to Shopify

The 3 BOXES LUXURY platform is already a **Shopify headless storefront**. Here's what this means:

| Feature | Status | How It Works |
|---------|--------|--------------|
| **Product catalog** | ✅ Working | Fetched from Shopify Admin API (`/products.json`) |
| **Categories** | ✅ Working | Derived from Shopify collections + product types |
| **Product images** | ✅ Working | Served from Shopify CDN (`cdn.shopify.com`) |
| **Category images** | ✅ Working | Local fallbacks when Shopify has no collection image |
| **Search** | ✅ Working | Client-side filtering of Shopify products |
| **Pricing** | ✅ Working | From Shopify variant prices |
| **Stock** | ✅ Working | From Shopify inventory quantities |

### How Products Get to Shopify

1. **Add products in Shopify Admin** → https://3boxesluxury-2.myshopify.com/admin
2. Products appear on the website within **5 minutes** (cache TTL)
3. Set the **Product Type** field to match category names (e.g., "Jewelry", "Sarees", "Watches")
4. Add product tags for search filtering
5. Upload product images in Shopify Admin

### Category Assignment (Product Type → Category)

| Product Type (Shopify) | Category (Website) | Slug |
|----------------------|-------------------|------|
| jewelry, jewellery, rings, necklaces, earrings, bracelets, bangles, chains, anklets, pendants | Jewelry | jewelry |
| watches, watch | Watches | watches |
| sarees, saree | Sarees | sarees |
| men's shirts, shirts | Men's Shirts & T-Shirts | mens-shirts-t-shirts |
| fashion, accessories | Fashion | fashion |
| fragrances, fragrance, perfume | Fragrances | fragrances |
| leather goods, leather | Leather Goods | leather-goods |
| home & living, home | Home & Living | home-living |
| couple friendly gifts, couple gifts, gift sets | Couple Friendly Gifts | couple-friendly-gifts |
| romantic gifts, romantic, gift boxes | Romantic Gifts | romantic-gifts |
| toys, toy | Toys | toys |

---

## 📦 Environment Variables

### Required (Shopify-Only Mode)

| Variable | Value | Purpose |
|----------|-------|---------|
| `DATA_SOURCE` | `shopify` | Skip DB, use Shopify directly (eliminates duplications) |
| `SHOPIFY_STORE_DOMAIN` | `3boxesluxury-2.myshopify.com` | Store domain |
| `SHOPIFY_ADMIN_API_TOKEN` | `YOUR_SHOPIFY_ADMIN_TOKEN` | Admin API access |
| `JWT_SECRET` | (any strong string) | Token signing for demo auth |

### Optional (For Full Features)

| Variable | Purpose |
|----------|---------|
| `POSTGRES_PRISMA_URL` | PostgreSQL for orders, sessions, user data |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Storefront API (alternative to Admin API) |
| `ZAI_PROXY_URL` | Public proxy for AI virtual try-on |
| `ZAI_BASE_URL` / `ZAI_API_KEY` | Direct AI service configuration |
| `NEXT_PUBLIC_BASE_URL` | Self-referencing URL |

---

## 🔧 DATA_SOURCE Modes

### `DATA_SOURCE=shopify` (Recommended for Vercel)

- ✅ No product duplications (Shopify is the single source of truth)
- ✅ No database dependency
- ✅ All products, categories, images work
- ✅ Demo auth works
- ⚠️ AI try-on uses canvas overlay fallback
- ❌ No order persistence
- ❌ No payment processing

### `DATA_SOURCE` not set (Default, DB-first)

- ✅ Full features if PostgreSQL is configured
- ⚠️ Possible product duplications if DB is seeded AND Shopify is accessible
- ✅ AI try-on works if ZAI proxy is reachable
- ✅ Orders, payments, sessions work
- ⚠️ Falls back to Shopify if DB fails

---

## 🤖 AI Virtual Try-On

### On Local Development (Full AI)
- ZAI SDK connects directly to AI service
- 4 generation strategies with VLM analysis
- Watermarked with "3BOXES GIFTS - AI Style Preview"

### On Vercel (Canvas Fallback)
- AI service at `172.25.136.193:8080` is NOT reachable from serverless
- **Canvas overlay fallback** creates a composite image client-side:
  - User's selfie as base image
  - Product image overlaid at bottom-right
  - Product name label
  - "3BOXES GIFTS · Style Preview" watermark
- To enable full AI on Vercel, set `ZAI_PROXY_URL` to a public endpoint

---

## 🏗️ Architecture Summary

```
┌─────────────────────────────────────────────────────┐
│                3 BOXES LUXURY                        │
│                                                     │
│  Frontend (Next.js 16 SPA)                          │
│  ├── Zustand (client-side routing)                  │
│  ├── TanStack Query (data fetching)                  │
│  ├── shadcn/ui + Tailwind CSS 4                     │
│  └── Framer Motion (animations)                     │
│                                                     │
│  Backend (60+ API Routes)                           │
│  ├── Products/Categories → Shopify Admin API        │
│  ├── Auth → Demo users (JWT) or DB                  │
│  ├── AI Try-On → ZAI SDK or Canvas fallback         │
│  └── Orders/Payments → PostgreSQL (if available)    │
│                                                     │
│  Data Sources                                       │
│  ├── Shopify Admin API (products, categories)       │
│  ├── Prisma ORM (SQLite local / PostgreSQL Vercel)  │
│  └── ZAI SDK (AI image generation)                  │
└─────────────────────────────────────────────────────┘
```

---

## 📝 Migration to Shopify as Full Platform

If you want to use Shopify as the complete e-commerce platform:

1. **All product management happens in Shopify Admin**
   - Add/edit/delete products at https://3boxesluxury-2.myshopify.com/admin
   - Set product types, tags, images, pricing, inventory
   - Products appear on the website automatically

2. **For checkout, use Shopify's native checkout**
   - Instead of the custom `/api/checkout` route
   - Create a Shopify checkout session via Storefront API
   - Redirect users to Shopify's secure checkout page

3. **For payments, use Shopify Payments**
   - Built-in payment processing
   - Supports credit cards, UPI, net banking, wallets
   - No need for custom Razorpay/Stripe integration

4. **For shipping, use Shopify Shipping**
   - Built-in shipping rates and tracking
   - Integration with major carriers

This approach eliminates the need for PostgreSQL entirely and makes Shopify the single source of truth for all e-commerce operations.

---

## 🔄 Switching Between Production and Test

To deploy to the **production** project (3boxes-luxury):

```bash
rm -rf .vercel
echo "y" | npx vercel link --token YOUR_TOKEN --project 3boxes-luxury
npx vercel --prod --token YOUR_TOKEN --yes
```

To deploy to the **test** project (3boxes-luxury-test):

```bash
rm -rf .vercel
echo "y" | npx vercel link --token YOUR_TOKEN --project 3boxes-luxury-test
npx vercel --prod --token YOUR_TOKEN --yes
```

---

## 🐛 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Product duplications | DB + Shopify both returning data | Set `DATA_SOURCE=shopify` |
| AI try-on not working | AI service unreachable from Vercel | Set `ZAI_PROXY_URL` or use canvas fallback |
| Admin login failing | DB unavailable on Vercel | Use demo credentials (auto-fallback) |
| Images not loading | External image CORS | Image proxy handles this |
| Build fails | Prisma schema mismatch | `vercel-build.sh` handles SQLite→PostgreSQL switch |
| HMR errors | Missing component imports | Ensure all imports in page.tsx reference existing files |

---

*Last updated: May 2025*
