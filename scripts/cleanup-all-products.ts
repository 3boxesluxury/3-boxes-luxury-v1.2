/**
 * scripts/cleanup-all-products.ts
 *
 * Deletes ALL products, categories, and vendors from your Prisma database.
 * Also deletes related records (cart items, order items, inventory logs,
 * wishlist items, portfolio items) to satisfy foreign-key constraints.
 *
 * ─── Usage ──────────────────────────────────────────────────────────────────
 *   bun run scripts/cleanup-all-products.ts
 *   (or: npx tsx scripts/cleanup-all-products.ts)
 *
 * ─── What gets deleted ──────────────────────────────────────────────────────
 *   1. CartItem        (references Product)
 *   2. OrderItem       (references Product)
 *   3. InventoryLog    (references Product)
 *   4. WishlistItem    (references Product)
 *   5. CustomerPortfolio (references Product)
 *   6. Product         (the main target)
 *   7. Category        (optional — controlled by DELETE_CATEGORIES flag below)
 *   8. Vendor          (optional — controlled by DELETE_VENDORS flag below)
 *
 * ─── Safety ─────────────────────────────────────────────────────────────────
 *   - Asks for confirmation before deleting (type "DELETE" to proceed)
 *   - Or set CONFIRM_DELETE=true env var to skip the prompt
 *   - Runs everything inside a transaction — if any step fails, NOTHING is deleted
 *
 * ─── After running ──────────────────────────────────────────────────────────
 *   Run `bun run scripts/import-scraped-products.ts` to import fresh products
 *   from the 3boxesgifts.com scrape.
 */

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

// ─── Configuration flags ────────────────────────────────────────────────────
// Set these to true if you also want to delete all categories and vendors.
// Default: true (since the user said "delete everything")
const DELETE_CATEGORIES = process.env.DELETE_CATEGORIES !== 'false'; // default true
const DELETE_VENDORS = process.env.DELETE_VENDORS !== 'false'; // default true

// ─── Helpers ────────────────────────────────────────────────────────────────
function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🗑️  CLEANUP: Delete ALL products from your Prisma database');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log();
  console.log('⚠️  WARNING: This will PERMANENTLY DELETE the following records:');
  console.log('   - All CartItem records');
  console.log('   - All OrderItem records');
  console.log('   - All InventoryLog records');
  console.log('   - All WishlistItem records');
  console.log('   - All CustomerPortfolio records');
  console.log('   - All Product records');
  if (DELETE_CATEGORIES) console.log('   - All Category records');
  if (DELETE_VENDORS) console.log('   - All Vendor records');
  console.log();
  console.log('   Users, Orders, Sessions, and other non-product data will be PRESERVED.');
  console.log();

  // Show current counts before deletion
  console.log('📊 Current counts in your database:');
  const [
    cartItems, orderItems, inventoryLogs, wishlistItems,
    portfolioItems, products, categories, vendors,
  ] = await Promise.all([
    prisma.cartItem.count(),
    prisma.orderItem.count(),
    prisma.inventoryLog.count(),
    prisma.wishlistItem.count(),
    prisma.customerPortfolio.count(),
    prisma.product.count(),
    prisma.category.count(),
    prisma.vendor.count(),
  ]);
  console.log(`   CartItem:           ${cartItems}`);
  console.log(`   OrderItem:          ${orderItems}`);
  console.log(`   InventoryLog:       ${inventoryLogs}`);
  console.log(`   WishlistItem:       ${wishlistItems}`);
  console.log(`   CustomerPortfolio:  ${portfolioItems}`);
  console.log(`   Product:            ${products}`);
  console.log(`   Category:           ${categories}`);
  console.log(`   Vendor:             ${vendors}`);
  console.log();

  // Confirm
  const skipConfirm = process.env.CONFIRM_DELETE === 'true';
  if (!skipConfirm) {
    const answer = await ask('❓ Type DELETE to confirm (or anything else to cancel): ');
    if (answer.trim().toUpperCase() !== 'DELETE') {
      console.log('✋ Cancelled. No records were deleted.');
      return;
    }
  } else {
    console.log('⏭️  Skipping confirmation (CONFIRM_DELETE=true)');
  }
  console.log();

  // ─── Delete in transaction (atomic — all or nothing) ─────────────────────
  console.log('🚀 Starting deletion (in a transaction)...');
  const result = await prisma.$transaction(async (tx) => {
    const deleted = {} as Record<string, number>;

    // Step 1: Delete child records that reference Product
    console.log('   Deleting CartItem...');
    deleted.cartItem = await tx.cartItem.deleteMany({});
    console.log(`      ✓ ${deleted.cartItem.count} CartItem deleted`);

    console.log('   Deleting OrderItem...');
    deleted.orderItem = await tx.orderItem.deleteMany({});
    console.log(`      ✓ ${deleted.orderItem.count} OrderItem deleted`);

    console.log('   Deleting InventoryLog...');
    deleted.inventoryLog = await tx.inventoryLog.deleteMany({});
    console.log(`      ✓ ${deleted.inventoryLog.count} InventoryLog deleted`);

    console.log('   Deleting WishlistItem...');
    deleted.wishlistItem = await tx.wishlistItem.deleteMany({});
    console.log(`      ✓ ${deleted.wishlistItem.count} WishlistItem deleted`);

    console.log('   Deleting CustomerPortfolio...');
    deleted.portfolio = await tx.customerPortfolio.deleteMany({});
    console.log(`      ✓ ${deleted.portfolio.count} CustomerPortfolio deleted`);

    // Step 2: Delete Products
    console.log('   Deleting Product...');
    deleted.product = await tx.product.deleteMany({});
    console.log(`      ✓ ${deleted.product.count} Product deleted`);

    // Step 3: Delete Categories (optional)
    if (DELETE_CATEGORIES) {
      console.log('   Deleting Category...');
      deleted.category = await tx.category.deleteMany({});
      console.log(`      ✓ ${deleted.category.count} Category deleted`);
    }

    // Step 4: Delete Vendors (optional)
    if (DELETE_VENDORS) {
      console.log('   Deleting Vendor...');
      deleted.vendor = await tx.vendor.deleteMany({});
      console.log(`      ✓ ${deleted.vendor.count} Vendor deleted`);
    }

    return deleted;
  });

  console.log();
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ✅ CLEANUP COMPLETE — all deletions succeeded');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log();
  console.log('📊 Deletion summary:');
  console.log(`   CartItem:           ${result.cartItem?.count || 0}`);
  console.log(`   OrderItem:          ${result.orderItem?.count || 0}`);
  console.log(`   InventoryLog:       ${result.inventoryLog?.count || 0}`);
  console.log(`   WishlistItem:       ${result.wishlistItem?.count || 0}`);
  console.log(`   CustomerPortfolio:  ${result.portfolio?.count || 0}`);
  console.log(`   Product:            ${result.product?.count || 0}`);
  if (DELETE_CATEGORIES) console.log(`   Category:           ${result.category?.count || 0}`);
  if (DELETE_VENDORS) console.log(`   Vendor:             ${result.vendor?.count || 0}`);
  console.log();
  console.log('👉 Next step: run `bun run scripts/import-scraped-products.ts`');
  console.log('   to import the freshly-scraped products from 3boxesgifts.com');
}

main()
  .catch((error) => {
    console.error();
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('  ❌ CLEANUP FAILED — transaction rolled back, nothing was deleted');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error();
    console.error('Error details:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
