import { NextRequest, NextResponse } from 'next/server';
import { getShopifyCheckoutStatus, isShopifyConfigured } from '@/lib/shopify/client';

/**
 * POST /api/shopify/checkout/verify
 *
 * Verifies a Shopify checkout session by querying the Storefront API
 * for the checkout/cart status.
 *
 * Body: { checkoutId: string }
 *
 * Returns:
 * - checkout details (completed, pending, abandoned)
 * - If completed, includes the Shopify order ID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkoutId } = body as { checkoutId: string };

    if (!checkoutId) {
      return NextResponse.json(
        { error: 'checkoutId is required' },
        { status: 400 }
      );
    }

    // Check if Shopify is configured
    if (!isShopifyConfigured()) {
      return NextResponse.json(
        {
          error: 'Shopify Storefront API is not configured',
          hint: 'Set SHOPIFY_STOREFRONT_TOKEN in your environment variables.',
        },
        { status: 503 }
      );
    }

    // Query Shopify for checkout status
    const checkoutStatus = await getShopifyCheckoutStatus(checkoutId);

    if (!checkoutStatus) {
      return NextResponse.json(
        {
          error: 'Could not verify checkout status',
          checkoutId,
          status: 'unknown',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      checkoutId: checkoutStatus.id,
      status: checkoutStatus.status,
      completedAt: checkoutStatus.completedAt,
      order: checkoutStatus.order
        ? {
            id: checkoutStatus.order.id,
            name: checkoutStatus.order.name,
            processedAt: checkoutStatus.order.processedAt,
            fulfillmentStatus: checkoutStatus.order.fulfillmentStatus,
            financialStatus: checkoutStatus.order.financialStatus,
          }
        : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Shopify checkout verify error:', error);
    return NextResponse.json(
      { error: 'Failed to verify checkout', details: message },
      { status: 500 }
    );
  }
}
