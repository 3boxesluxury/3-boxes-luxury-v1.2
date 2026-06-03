#!/bin/bash
# ============================================================
# 3 BOXES LUXURY - Vercel Deployment Script
# ============================================================
# This script deploys the complete Next.js application to Vercel
# 
# PREREQUISITES:
# 1. Node.js 18+ installed
# 2. Vercel CLI installed: npm i -g vercel
# 3. A Vercel account (free at vercel.com/signup)
# 4. A PostgreSQL database (recommended: Vercel Postgres, Neon, or Supabase)
#
# USAGE:
#   chmod +x deploy-to-vercel.sh
#   ./deploy-to-vercel.sh
# ============================================================

set -e

echo "🏆 3 BOXES LUXURY - Vercel Deployment"
echo "====================================="
echo ""

# Step 1: Check prerequisites
echo "📋 Step 1: Checking prerequisites..."

if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm i -g vercel
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Step 2: Login to Vercel
echo "📋 Step 2: Logging in to Vercel..."
vercel whoami 2>/dev/null || vercel login
echo ""

# Step 3: Get PostgreSQL URL
echo "📋 Step 3: Database Setup"
echo "You need a PostgreSQL database for Vercel deployment."
echo "Options:"
echo "  1. Vercel Postgres (recommended) - Create at https://vercel.com/dashboard/stores"
echo "  2. Neon (free tier) - Create at https://neon.tech"
echo "  3. Supabase (free tier) - Create at https://supabase.com"
echo ""
read -p "Enter your PostgreSQL connection URL: " DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Database URL is required. Exiting."
    exit 1
fi
echo ""

# Step 4: Deploy to Vercel
echo "📋 Step 4: Deploying to Vercel..."
echo ""

# Set environment variables
vercel env add DATABASE_URL production <<< "$DATABASE_URL" 2>/dev/null || \
vercel env add DATABASE_URL <<< "$DATABASE_URL"

vercel env add SHOPIFY_STORE_DOMAIN production <<< "3boxesluxury-2.myshopify.com" 2>/dev/null || \
vercel env add SHOPIFY_STORE_DOMAIN <<< "3boxesluxury-2.myshopify.com"

vercel env add SHOPIFY_STOREFRONT_ACCESS_TOKEN production <<< "YOUR_SHOPIFY_STOREFRONT_TOKEN" 2>/dev/null || \
vercel env add SHOPIFY_STOREFRONT_ACCESS_TOKEN <<< "YOUR_SHOPIFY_STOREFRONT_TOKEN"

vercel env add SHOPIFY_ADMIN_API_TOKEN production <<< "YOUR_SHOPIFY_ADMIN_TOKEN" 2>/dev/null || \
vercel env add SHOPIFY_ADMIN_API_TOKEN <<< "YOUR_SHOPIFY_ADMIN_TOKEN"

echo ""
echo "🚀 Deploying..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 NEXT STEPS:"
echo "1. Set up your PostgreSQL database and run migrations:"
echo "   DATABASE_URL=\"your-postgresql-url\" npx prisma migrate deploy"
echo "   DATABASE_URL=\"your-postgresql-url\" npx prisma db seed"
echo ""
echo "2. Visit your Vercel dashboard to configure custom domain:"
echo "   https://vercel.com/dashboard"
echo ""
echo "3. Connect your Shopify store domain to point to Vercel"
