#!/bin/bash
# Deploy 3 BOXES LUXURY to Vercel using the API directly
# Usage: ./vercel-api-deploy.sh YOUR_VERCEL_TOKEN

set -e

TOKEN=${1:?"Usage: $0 VERCEL_TOKEN"}
API="https://api.vercel.com"

echo "🏆 3 BOXES LUXURY - API Deployment"
echo "=================================="

# Step 1: Create a project
echo "📋 Creating Vercel project..."
PROJECT=$(curl -s -X POST "$API/v9/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "3boxes-luxury",
    "framework": "nextjs"
  }')

PROJECT_ID=$(echo "$PROJECT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Project ID: $PROJECT_ID"

# Step 2: Set environment variables
echo "📋 Setting environment variables..."

for VAR in \
  "SHOPIFY_STORE_DOMAIN:3boxesluxury-2.myshopify.com" \
  "SHOPIFY_STOREFRONT_ACCESS_TOKEN:YOUR_SHOPIFY_STOREFRONT_TOKEN" \
  "SHOPIFY_ADMIN_API_TOKEN:YOUR_SHOPIFY_ADMIN_TOKEN"
do
  KEY=$(echo "$VAR" | cut -d: -f1)
  VAL=$(echo "$VAR" | cut -d: -f2)
  echo "  Setting $KEY..."
  curl -s -X POST "$API/v9/projects/$PROJECT_ID/env" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"$KEY\",\"value\":\"$VAL\",\"type\":\"encrypted\",\"target\":[\"production\",\"preview\"]}" > /dev/null
done

echo ""
echo "✅ Project created and env vars set!"
echo ""
echo "📋 NEXT STEPS:"
echo "1. Push your code to a GitHub repository"
echo "2. Connect the repository to this Vercel project at:"
echo "   https://vercel.com/dashboard"
echo "3. Set the DATABASE_URL environment variable with your PostgreSQL URL"
echo "4. Deploy!"
