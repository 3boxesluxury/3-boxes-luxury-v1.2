-- ============================================================
-- v17 Migration: Add missing tables for campaigns, recipients,
--                style gallery, doc vault, exchange rates
-- ============================================================
--
-- This migration creates 6 missing tables that the API code
-- already references but the database does not have. Without
-- them, these endpoints return HTTP 500:
--
--   GET /api/style-gallery/my?userId=1           → 500
--   GET /api/docs/vault?docId=patent-doc...      → 500
--   GET /api/admin/campaigns?...                 → 500
--   GET /api/admin/corporate?...                 → 500 (cascade — campaigns include fails)
--   GET /api/corporate/campaigns                 → 500
--   GET /api/corporate/recipients                → 500
--   GET /api/exchange-rates                      → 500
--
-- HOW TO APPLY
-- ------------
-- Option A (recommended — via Prisma):
--   npx prisma db push
--
-- Option B (manual SQL — run against your PostgreSQL DB):
--   psql "$DATABASE_URL" -f prisma/migrations/v17_add_missing_tables.sql
--
-- Option C (Vercel — add as a build step or run once after deploy):
--   npx prisma migrate deploy
--
-- All tables use TEXT primary keys (cuid) and TIMESTAMPTZ for dates
-- to match the existing Prisma schema convention.
-- ============================================================

-- ───────────────────────────────────────────────────────────────
-- 1. style_gallery — user-submitted AI-generated looks
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "style_gallery" (
    "id"                 TEXT PRIMARY KEY,
    "userId"             TEXT NOT NULL,
    "productId"          TEXT,
    "userName"           TEXT NOT NULL,
    "aiGeneratedImage"   TEXT NOT NULL,
    "originalSelfie"     TEXT,
    "rating"             INTEGER NOT NULL DEFAULT 5,
    "reviewTitle"        TEXT,
    "reviewComment"      TEXT,
    "consentGiven"       BOOLEAN NOT NULL DEFAULT FALSE,
    "isApproved"         BOOLEAN NOT NULL DEFAULT FALSE,
    "isActive"           BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "fk_style_gallery_product"
        FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "idx_style_gallery_userId"      ON "style_gallery" ("userId");
CREATE INDEX IF NOT EXISTS "idx_style_gallery_status"      ON "style_gallery" ("isApproved", "isActive");
CREATE INDEX IF NOT EXISTS "idx_style_gallery_productId"   ON "style_gallery" ("productId");


-- ───────────────────────────────────────────────────────────────
-- 2. doc_vault_password — password-protected documents
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "doc_vault_password" (
    "id"        TEXT PRIMARY KEY,
    "docId"     TEXT NOT NULL UNIQUE,
    "password"  TEXT NOT NULL,
    "setBy"     TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ───────────────────────────────────────────────────────────────
-- 3. corporate_recipient — gift recipients managed by a corporate account
--    (must exist BEFORE corporate_campaign_recipient FK)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "corporate_recipient" (
    "id"          TEXT PRIMARY KEY,
    "corporateId" TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "email"       TEXT NOT NULL,
    "phone"       TEXT,
    "department"  TEXT,
    "designation" TEXT,
    "address"     TEXT,
    "city"        TEXT,
    "state"       TEXT,
    "zipCode"     TEXT,
    "notes"       TEXT,
    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "fk_corp_recipient_corporate"
        FOREIGN KEY ("corporateId") REFERENCES "CorporateAccount"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_corp_recipient_corporateId" ON "corporate_recipient" ("corporateId");
CREATE INDEX IF NOT EXISTS "idx_corp_recipient_email"       ON "corporate_recipient" ("email");


-- ───────────────────────────────────────────────────────────────
-- 4. corporate_campaign — gift campaigns by corporate accounts
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "corporate_campaign" (
    "id"                 TEXT PRIMARY KEY,
    "corporateId"        TEXT NOT NULL,
    "name"               TEXT NOT NULL,
    "occasion"           TEXT,
    "description"        TEXT,
    "budgetPerRecipient" DOUBLE PRECISION,
    "totalBudget"        DOUBLE PRECISION,
    "status"             TEXT NOT NULL DEFAULT 'draft',
    "deliveryType"       TEXT NOT NULL DEFAULT 'bulk',
    "deliveryDate"       TIMESTAMPTZ,
    "message"            TEXT,
    "productId"          TEXT,
    "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "fk_corp_campaign_corporate"
        FOREIGN KEY ("corporateId") REFERENCES "CorporateAccount"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_corp_campaign_product"
        FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "idx_corp_campaign_corporateId" ON "corporate_campaign" ("corporateId");
CREATE INDEX IF NOT EXISTS "idx_corp_campaign_status"     ON "corporate_campaign" ("status");
CREATE INDEX IF NOT EXISTS "idx_corp_campaign_productId"  ON "corporate_campaign" ("productId");


-- ───────────────────────────────────────────────────────────────
-- 5. corporate_campaign_recipient — join table (campaign ↔ recipient)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "corporate_campaign_recipient" (
    "id"          TEXT PRIMARY KEY,
    "campaignId"  TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "status"      TEXT NOT NULL DEFAULT 'pending',
    "sentAt"      TIMESTAMPTZ,
    "deliveredAt" TIMESTAMPTZ,
    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "fk_ccr_campaign"
        FOREIGN KEY ("campaignId") REFERENCES "corporate_campaign"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_ccr_recipient"
        FOREIGN KEY ("recipientId") REFERENCES "corporate_recipient"("id") ON DELETE CASCADE,
    CONSTRAINT "uniq_ccr_campaign_recipient"
        UNIQUE ("campaignId", "recipientId")
);
CREATE INDEX IF NOT EXISTS "idx_ccr_campaignId"  ON "corporate_campaign_recipient" ("campaignId");
CREATE INDEX IF NOT EXISTS "idx_ccr_recipientId" ON "corporate_campaign_recipient" ("recipientId");


-- ───────────────────────────────────────────────────────────────
-- 6. exchange_rate — currency conversion rates
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "exchange_rate" (
    "id"        TEXT PRIMARY KEY,
    "base"      TEXT NOT NULL,
    "quote"     TEXT NOT NULL,
    "rate"      DOUBLE PRECISION NOT NULL,
    "fetchedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "uniq_exchange_rate_base_quote" UNIQUE ("base", "quote")
);
CREATE INDEX IF NOT EXISTS "idx_exchange_rate_base_quote" ON "exchange_rate" ("base", "quote");


-- ============================================================
-- Done. After running this:
--   • All 6 endpoints listed at the top will return 200 instead of 500
--   • Corporate campaigns + recipients will work end-to-end
--   • Style gallery submissions will load
--   • Doc vault password protection will work
--   • Currency conversion will work
--
-- Next step: regenerate the Prisma client so it knows about the
-- new models:
--
--   npx prisma generate
--
-- Then redeploy:
--
--   vercel --prod
-- ============================================================
