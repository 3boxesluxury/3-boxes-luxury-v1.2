-- ═══════════════════════════════════════════════════════════════
-- COMBINED MIGRATION + VERIFICATION SCRIPT
-- Paste this ENTIRE block into Supabase SQL Editor and click Run
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. style_gallery ──────────────────────────────────────────
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
    "status"             TEXT NOT NULL DEFAULT 'pending',
    "isActive"           BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_style_gallery_userId"    ON "style_gallery" ("userId");
CREATE INDEX IF NOT EXISTS "idx_style_gallery_status"    ON "style_gallery" ("status");
CREATE INDEX IF NOT EXISTS "idx_style_gallery_productId" ON "style_gallery" ("productId");

-- ─── 2. doc_vault_password ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "doc_vault_password" (
    "id"        TEXT PRIMARY KEY,
    "docId"     TEXT NOT NULL UNIQUE,
    "password"  TEXT NOT NULL,
    "setBy"     TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. corporate_recipient (must come before campaign_recipient) ─
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
    "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_corp_recipient_corporateId" ON "corporate_recipient" ("corporateId");
CREATE INDEX IF NOT EXISTS "idx_corp_recipient_email"       ON "corporate_recipient" ("email");

-- ─── 4. corporate_campaign ─────────────────────────────────────
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
    "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_corp_campaign_corporateId" ON "corporate_campaign" ("corporateId");
CREATE INDEX IF NOT EXISTS "idx_corp_campaign_status"     ON "corporate_campaign" ("status");
CREATE INDEX IF NOT EXISTS "idx_corp_campaign_productId"  ON "corporate_campaign" ("productId");

-- ─── 5. corporate_campaign_recipient (join table) ──────────────
CREATE TABLE IF NOT EXISTS "corporate_campaign_recipient" (
    "id"          TEXT PRIMARY KEY,
    "campaignId"  TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "status"      TEXT NOT NULL DEFAULT 'pending',
    "sentAt"      TIMESTAMPTZ,
    "deliveredAt" TIMESTAMPTZ,
    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "uniq_ccr_campaign_recipient" UNIQUE ("campaignId", "recipientId")
);
CREATE INDEX IF NOT EXISTS "idx_ccr_campaignId"  ON "corporate_campaign_recipient" ("campaignId");
CREATE INDEX IF NOT EXISTS "idx_ccr_recipientId" ON "corporate_campaign_recipient" ("recipientId");

-- ─── 6. exchange_rate ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "exchange_rate" (
    "id"        TEXT PRIMARY KEY,
    "base"      TEXT NOT NULL,
    "quote"     TEXT NOT NULL,
    "rate"      DOUBLE PRECISION NOT NULL,
    "fetchedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "uniq_exchange_rate_base_quote" UNIQUE ("base", "quote")
);
CREATE INDEX IF NOT EXISTS "idx_exchange_rate_base_quote" ON "exchange_rate" ("base", "quote");

-- ═══════════════════════════════════════════════════════════════
-- ✅ VERIFICATION — this should return 6 rows when all tables exist
-- ═══════════════════════════════════════════════════════════════
SELECT tablename, 'created' AS status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'style_gallery',
    'doc_vault_password',
    'corporate_campaign',
    'corporate_campaign_recipient',
    'corporate_recipient',
    'exchange_rate'
)
ORDER BY tablename;
