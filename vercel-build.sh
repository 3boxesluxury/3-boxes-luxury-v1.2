#!/bin/bash
set -e

# Ensure Prisma uses PostgreSQL provider
sed -i 's/provider = "sqlite"/provider = "postgresql"/g' prisma/schema.prisma

# Generate Prisma Client using Vercel env vars (DATABASE_URL + DIRECT_URL)
prisma generate

# Build Next.js
next build