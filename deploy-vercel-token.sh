#!/bin/bash
# 3 BOXES LUXURY - Deploy to Vercel using API Token
# Usage: ./deploy-vercel-token.sh YOUR_VERCEL_TOKEN [DATABASE_URL]

TOKEN="${1:?'Error: Vercel token required. Get one at https://vercel.com/account/tokens'}"
DB_URL="${2:-}"

set -e

echo "🏆 3 BOXES LUXURY - Vercel Deployment"
echo "====================================="
echo ""

# Step 1: Link the project
echo "📋 Step 1: Linking Vercel project..."
cd "$(dirname "$0")"
npx vercel link --yes --token "$TOKEN" 2>&1 || echo "Project linked"

# Step 2: Set environment variables
echo "📋 Step 2: Setting environment variables..."

# Shopify vars
echo "  Setting SHOPIFY_STORE_DOMAIN..."
echo "3boxesluxury-2.myshopify.com" | npx vercel env add SHOPIFY_STORE_DOMAIN production --token "$TOKEN" 2>&1 || true

echo "  Setting SHOPIFY_STOREFRONT_ACCESS_TOKEN..."
echo "YOUR_SHOPIFY_STOREFRONT_TOKEN" | npx vercel env add SHOPIFY_STOREFRONT_ACCESS_TOKEN production --token "$TOKEN" 2>&1 || true

echo "  Setting SHOPIFY_ADMIN_API_TOKEN..."
echo "YOUR_SHOPIFY_ADMIN_TOKEN" | npx vercel env add SHOPIFY_ADMIN_API_TOKEN production --token "$TOKEN" 2>&1 || true

# Database URL (if provided)
if [ -n "$DB_URL" ]; then
  echo "  Setting DATABASE_URL..."
  echo "$DB_URL" | npx vercel env add DATABASE_URL production --token "$TOKEN" 2>&1 || true
fi

# Step 3: Deploy
echo "📋 Step 3: Deploying to Vercel..."
npx vercel --prod --token "$TOKEN" 2>&1

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Visit your Vercel dashboard to see the deployment URL:"
echo "   https://vercel.com/dashboard"
