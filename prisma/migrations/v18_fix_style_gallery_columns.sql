-- ═══════════════════════════════════════════════════════════════
-- v18 FIX: Update style_gallery table to match the API code
-- ═══════════════════════════════════════════════════════════════
--
-- Run this in Supabase SQL Editor to fix the existing style_gallery
-- table. The previous migration created it with a `status` TEXT column,
-- but the API code at /api/style-gallery/route.ts uses `isApproved`
-- BOOLEAN instead. This script:
--   1. Adds the `isApproved` BOOLEAN column (default false)
--   2. Migrates data: status='approved' → isApproved=true
--   3. Drops the `status` column
--   4. Replaces the old index with a composite index on (isApproved, isActive)
--
-- Safe to re-run (uses IF EXISTS / IF NOT EXISTS).
-- ═══════════════════════════════════════════════════════════════

-- Step 1: Add isApproved column (idempotent)
ALTER TABLE "style_gallery"
    ADD COLUMN IF NOT EXISTS "isApproved" BOOLEAN NOT NULL DEFAULT FALSE;

-- Step 2: Migrate data from status → isApproved (one-time, safe)
UPDATE "style_gallery"
SET "isApproved" = TRUE
WHERE "status" = 'approved';

UPDATE "style_gallery"
SET "isApproved" = FALSE
WHERE "status" IN ('pending', 'rejected')
  OR "status" IS NULL;

-- Step 3: Drop the old status column and its index (idempotent)
DROP INDEX IF EXISTS "idx_style_gallery_status";
ALTER TABLE "style_gallery" DROP COLUMN IF EXISTS "status";

-- Step 4: Create the proper composite index (idempotent)
CREATE INDEX IF NOT EXISTS "idx_style_gallery_status"
    ON "style_gallery" ("isApproved", "isActive");

-- ═══════════════════════════════════════════════════════════════
-- ✅ VERIFICATION — should show columns: id, userId, productId,
--    userName, aiGeneratedImage, originalSelfie, rating,
--    reviewTitle, reviewComment, consentGiven, isApproved,
--    isActive, createdAt, updatedAt
--    (NO "status" column should appear)
-- ═══════════════════════════════════════════════════════════════
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'style_gallery'
  AND table_schema = 'public'
ORDER BY ordinal_position;
