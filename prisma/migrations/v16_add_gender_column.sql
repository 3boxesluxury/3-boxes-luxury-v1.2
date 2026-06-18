-- ============================================================
-- v16 Migration: Add gender column to User table
-- ============================================================
-- This migration adds a nullable `gender` column to the User table.
-- Values: "male", "female", or NULL (unknown/not specified).
--
-- Since the project uses PostgreSQL, run:
--   npx prisma db push          (development — auto-applies schema changes)
--   npx prisma migrate dev      (development — creates migration file)
--   npx prisma migrate deploy   (production — applies pending migrations)
--
-- Or run this SQL directly on your PostgreSQL database.
-- ============================================================

-- PostgreSQL
ALTER TABLE "User" ADD COLUMN "gender" TEXT;

-- SQLite (if using SQLite for local dev)
-- ALTER TABLE User ADD COLUMN gender TEXT;

-- MySQL (if using MySQL)
-- ALTER TABLE `User` ADD COLUMN `gender` VARCHAR(20) DEFAULT NULL;
