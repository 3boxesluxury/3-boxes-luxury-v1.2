import { NextRequest, NextResponse } from 'next/server';
import { createShopifyCheckout, isShopifyConfigured } from '@/lib/shopify/client';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || '3boxesluxury-2.myshopify.com';

/**
 * POST /api/shopify/checkout
 * Create a Shopify checkout URL with an optional return_to parameter.
 *
 * Strategy:
 * 1. If Storefront API is configured, use checkoutCreate mutation (preferred).
 *    This gives us a checkout ID we can track, and the webUrl supports return_to.
 * 2. Otherwise, fall back to the cart permalink approach with ?return_to= appended.
 *
 * Body: {
 *   items: [{ variantId: string, quantity: number }],
 *   returnUrl?: string  // URL to redirect to after checkout completion
 * }
 *
 * variantId can be:
 *   - Full GID: "gid://shopify/ProductVariant/53520287105297"
 *   - Numeric ID: "53520287105297"
 *
 * Returns: { checkoutUrl, source, method, checkoutId?, itemCount }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, returnUrl } = body as {
      items: Array<{ variantId: string; quantity: number }>;
      returnUrl?: string;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      );
    }

    // Resolve the return URL: explicit param > env variable > default
    const resolvedReturnUrl =
      returnUrl ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      '';

    // --- Strategy 1: Storefront API checkoutCreate (preferred) ---
    if (isShopifyConfigured()) {
      try {
        // Build custom attributes if we have a return URL
        const customAttributes = resolvedReturnUrl
          ? [{ key: 'return_to', value: resolvedReturnUrl }]
          : undefined;

        const checkout = await createShopifyCheckout(items, customAttributes);

        // If we have a return URL and it's not already in the webUrl, append it
        let checkoutUrl = checkout.webUrl;
        if (resolvedReturnUrl && !checkoutUrl.includes('return_to=')) {
          const separator = checkoutUrl.includes('?') ? '&' : '?';
          checkoutUrl = `${checkoutUrl}${separator}return_to=${encodeURIComponent(resolvedReturnUrl)}`;
        }

        return NextResponse.json({
          checkoutUrl,
          source: 'shopify',
          method: 'storefront-api',
          checkoutId: checkout.id,
          itemCount: items.length,
        });
      } catch (storefrontError: unknown) {
        const message =
          storefrontError instanceof Error
            ? storefrontError.message
            : 'Unknown Storefront API error';
        console.warn(
          'Storefront API checkout failed, falling back to cart permalink:',
          message
        );
        // Fall through to cart permalink approach
      }
    }

    // --- Strategy 2: Cart permalink fallback ---
    const cartItems = items.map((item: { variantId: string; quantity: number }) => {
      let numericId = item.variantId;

      // Extract numeric ID from GID format
      if (numericId.startsWith('gid://shopify/ProductVariant/')) {
        numericId = numericId.replace('gid://shopify/ProductVariant/', '');
      }

      const quantity = item.quantity || 1;

      return `${numericId}:${quantity}`;
    });

    // Build the cart permalink URL
    const cartPath = cartItems.join(',');
    let checkoutUrl = `https://${SHOPIFY_DOMAIN}/cart/${cartPath}`;

    // Append return_to query parameter for cart permalink
    if (resolvedReturnUrl) {
      checkoutUrl = `${checkoutUrl}?return_to=${encodeURIComponent(resolvedReturnUrl)}`;
    }

    return NextResponse.json({
      checkoutUrl,
      source: 'shopify',
      method: 'cart-permalink',
      itemCount: items.length,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('Shopify checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout', details: message },
      { status: 500 }
    );
  }
}
