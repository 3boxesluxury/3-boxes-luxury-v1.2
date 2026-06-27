import { NextResponse } from 'next/server';
import { isShopifyConfigured, testStorefrontConnection } from '@/lib/shopify/client';
import { testAdminConnection } from '@/lib/shopify/admin-client';
import { db } from '@/lib/db';

/**
 * GET /api/shopify/status
 * Returns the Shopify connection status for both Storefront and Admin APIs,
 * along with local product counts.
 */
export async function GET() {
  try {
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN || '3boxesluxury-2.myshopify.com';

    // Check Storefront API
    const storefrontConfigured = isShopifyConfigured();
    let storefrontResult: { configured: boolean; connected: boolean; shopName?: string; error?: string };

    if (storefrontConfigured) {
      const test = await testStorefrontConnection();
      storefrontResult = {
        configured: true,
        connected: test.connected,
        shopName: test.shopName,
        error: test.error,
      };
    } else {
      storefrontResult = {
        configured: false,
        connected: false,
        error: 'Shopify Storefront API token not configured',
      };
    }

    // Check Admin API
    const adminConfigured = !!(process.env.SHOPIFY_ADMIN_TOKEN && process.env.SHOPIFY_ADMIN_TOKEN.length > 0);
    let adminResult: { configured: boolean; connected: boolean; shopName?: string; error?: string };

    if (adminConfigured) {
      const test = await testAdminConnection();
      adminResult = {
        configured: true,
        connected: test.success,
        shopName: test.shop?.name,
        error: test.error,
      };
    } else {
      adminResult = {
        configured: false,
        connected: false,
        error: 'Shopify Admin API token not configured',
      };
    }

    // Count products with Shopify variant IDs
    const totalProducts = await db.product.count();
    const productsWithShopifyId = await db.product.count({
      where: {
        shopifyVariantId: { not: null },
      },
    });

    return NextResponse.json({
      storefrontApi: storefrontResult,
      adminApi: adminResult,
      storeDomain,
      productsWithShopifyId,
      totalProducts,
    });
  } catch (error: unknown) {
    console.error('Error checking Shopify status:', error);
    const message = error instanceof Error ? error.message : 'Unknown error checking Shopify status';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
