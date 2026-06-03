# 3 BOXES LUXURY - Vercel Deployment Guide

## Quick Deploy (5 minutes)

### Step 1: Get a Vercel Account & Token

1. Go to **https://vercel.com/signup** and create a free account
2. Go to **https://vercel.com/account/tokens** and create a new token
3. Copy the token (you'll need it below)

### Step 2: Create a PostgreSQL Database

You need a PostgreSQL database for the app. Choose one:

**Option A: Vercel Postgres (Recommended)**
1. Go to https://vercel.com/dashboard/stores
2. Click "Create Database" → "Postgres"
3. Copy the connection string (POSTGRES_URL)

**Option B: Neon (Free)**
1. Go to https://neon.tech/signup
2. Create a new project
3. Copy the connection string

**Option C: Supabase (Free)**
1. Go to https://supabase.com
2. Create a new project
3. Go to Settings → Database → Copy connection string

### Step 3: Deploy

Run this command in your terminal:

```bash
cd /home/z/my-project
npx vercel --token YOUR_VERCEL_TOKEN --yes
```

### Step 4: Set Environment Variables

After the first deployment, set these environment variables in the Vercel dashboard:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your PostgreSQL connection string |
| `SHOPIFY_STORE_DOMAIN` | `3boxesluxury-2.myshopify.com` |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | `YOUR_SHOPIFY_STOREFRONT_TOKEN` |
| `SHOPIFY_ADMIN_API_TOKEN` | `YOUR_SHOPIFY_ADMIN_TOKEN` |

Or use the CLI:
```bash
npx vercel env add DATABASE_URL --token YOUR_VERCEL_TOKEN
npx vercel env add SHOPIFY_STORE_DOMAIN --token YOUR_VERCEL_TOKEN
npx vercel env add SHOPIFY_STOREFRONT_ACCESS_TOKEN --token YOUR_VERCEL_TOKEN
npx vercel env add SHOPIFY_ADMIN_API_TOKEN --token YOUR_VERCEL_TOKEN
```

### Step 5: Run Database Migrations

```bash
DATABASE_URL="your-postgresql-url" npx prisma migrate deploy
DATABASE_URL="your-postgresql-url" npx prisma db seed
```

### Step 6: Redeploy

```bash
npx vercel --prod --token YOUR_VERCEL_TOKEN
```

## How It Works

- The project uses **SQLite locally** (for development) and **PostgreSQL on Vercel** (for production)
- The `vercel.json` build command automatically switches the Prisma provider from SQLite to PostgreSQL during Vercel's build process
- All Shopify Storefront API features work without the database
- The database is needed for: users, orders, admin, agent, corporate portals

## Custom Domain

To connect your Shopify store domain:
1. Go to your Vercel project settings → Domains
2. Add your custom domain
3. Update your DNS records to point to Vercel

