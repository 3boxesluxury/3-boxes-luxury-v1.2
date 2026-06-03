#!/bin/bash
set -e

# Switch Prisma to PostgreSQL provider
sed -i 's/provider = "sqlite"/provider = "postgresql"/g' prisma/schema.prisma

# Check if DATA_SOURCE is set to 'shopify' (Shopify-only mode, no DB needed)
if [ "${DATA_SOURCE:-}" = "shopify" ]; then
  echo "🛍️  DATA_SOURCE=shopify — Using Shopify-only mode (no database dependency)"
  export DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
  sed -i 's|url      = env("DATABASE_URL")|url      = "postgresql://user:password@localhost:5432/mydb"|g' prisma/schema.prisma
  echo "DATABASE_URL=postgresql://user:password@localhost:5432/mydb" > .env
  prisma generate
  echo "✅ Shopify-only mode ready. All product/category data comes from Shopify Admin API."
# Check if POSTGRES_PRISMA_URL is actually set and starts with postgresql://
elif echo "${POSTGRES_PRISMA_URL:-}" | grep -q "^postgres"; then
  export DATABASE_URL="$POSTGRES_PRISMA_URL"
  echo "DATABASE_URL=$POSTGRES_PRISMA_URL" > .env
  echo "✅ Postgres DB detected, pushing schema and seeding..."
  prisma generate
  prisma db push --accept-data-loss
  npx tsx prisma/seed.ts
else
  export DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
  # Hardcode the URL in the schema so prisma doesn't need env var during next build
  sed -i 's|url      = env("DATABASE_URL")|url      = "postgresql://user:password@localhost:5432/mydb"|g' prisma/schema.prisma
  echo "DATABASE_URL=postgresql://user:password@localhost:5432/mydb" > .env
  echo "⚠️  No valid POSTGRES_PRISMA_URL set — using Shopify fallback for data"
  prisma generate
fi

# Build Next.js
next build
