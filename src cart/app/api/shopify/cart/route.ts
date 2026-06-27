import { NextRequest, NextResponse } from 'next/server';
import {
  createShopifyCart,
  addToShopifyCart,
  removeFromShopifyCart,
  updateShopifyCartLines,
  getShopifyCart,
  updateShopifyCartAttributes,
  applyShopifyDiscountCode,
  isShopifyConfigured,
} from '@/lib/shopify/client';

/**
 * GET /api/shopify/cart?cartId=xxx
 * Get cart details
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cartId = searchParams.get('cartId');

    if (!cartId) {
      return NextResponse.json(
        { error: 'cartId is required' },
        { status: 400 }
      );
    }

    const cart = await getShopifyCart(cartId);

    if (!cart) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ cart, source: 'shopify' });
  } catch (error: any) {
    console.error('Shopify cart GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cart', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/shopify/cart
 * Create a new cart or add items to an existing cart
 *
 * Body for create: { action: 'create', lines?: [{ merchandiseId, quantity }] }
 * Body for add:    { action: 'add', cartId, lines: [{ merchandiseId, quantity }] }
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Shopify is configured
    if (!isShopifyConfigured()) {
      return NextResponse.json(
        { error: 'Shopify is not configured', fallback: true },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { action, cartId, lines } = body;

    switch (action) {
      case 'create': {
        const cart = await createShopifyCart(lines);
        return NextResponse.json({ cart, source: 'shopify' });
      }

      case 'add': {
        if (!cartId || !lines) {
          return NextResponse.json(
            { error: 'cartId and lines are required for add action' },
            { status: 400 }
          );
        }
        const cart = await addToShopifyCart(cartId, lines);
        return NextResponse.json({ cart, source: 'shopify' });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action for POST. Use: create, add' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Shopify cart POST error:', error);
    return NextResponse.json(
      { error: 'Failed to modify cart', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/shopify/cart
 * Update cart: add lines, update quantities, remove lines, update attributes, apply discount
 *
 * Body:
 *   { action: 'addLines', cartId, lines: [{ merchandiseId, quantity }] }
 *   { action: 'updateLines', cartId, lines: [{ id, quantity }] }
 *   { action: 'removeLines', cartId, lineIds: [string] }
 *   { action: 'updateAttributes', cartId, attributes: [{ key, value }], note?: string }
 *   { action: 'applyDiscount', cartId, discountCodes: [string] }
 */
export async function PATCH(request: NextRequest) {
  try {
    if (!isShopifyConfigured()) {
      return NextResponse.json(
        { error: 'Shopify is not configured', fallback: true },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { action, cartId } = body;

    if (!cartId) {
      return NextResponse.json(
        { error: 'cartId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'addLines': {
        const { lines } = body;
        if (!lines) {
          return NextResponse.json(
            { error: 'lines are required for addLines action' },
            { status: 400 }
          );
        }
        const cart = await addToShopifyCart(cartId, lines);
        return NextResponse.json({ cart, source: 'shopify' });
      }

      case 'updateLines': {
        const { lines } = body;
        if (!lines) {
          return NextResponse.json(
            { error: 'lines are required for updateLines action' },
            { status: 400 }
          );
        }
        const cart = await updateShopifyCartLines(cartId, lines);
        return NextResponse.json({ cart, source: 'shopify' });
      }

      case 'removeLines': {
        const { lineIds } = body;
        if (!lineIds) {
          return NextResponse.json(
            { error: 'lineIds are required for removeLines action' },
            { status: 400 }
          );
        }
        const cart = await removeFromShopifyCart(cartId, lineIds);
        return NextResponse.json({ cart, source: 'shopify' });
      }

      case 'updateAttributes': {
        const { attributes, note } = body;
        if (!attributes) {
          return NextResponse.json(
            { error: 'attributes are required for updateAttributes action' },
            { status: 400 }
          );
        }
        const cart = await updateShopifyCartAttributes(cartId, attributes, note);
        return NextResponse.json({ cart, source: 'shopify' });
      }

      case 'applyDiscount': {
        const { discountCodes } = body;
        if (!discountCodes) {
          return NextResponse.json(
            { error: 'discountCodes are required for applyDiscount action' },
            { status: 400 }
          );
        }
        const cart = await applyShopifyDiscountCode(cartId, discountCodes);
        return NextResponse.json({ cart, source: 'shopify' });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action for PATCH. Use: addLines, updateLines, removeLines, updateAttributes, applyDiscount' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Shopify cart PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update cart', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/shopify/cart
 * Remove items from cart
 *
 * Body: { cartId, lineIds: [string] }
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!isShopifyConfigured()) {
      return NextResponse.json(
        { error: 'Shopify is not configured', fallback: true },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { cartId, lineIds } = body;

    if (!cartId || !lineIds) {
      return NextResponse.json(
        { error: 'cartId and lineIds are required' },
        { status: 400 }
      );
    }

    const cart = await removeFromShopifyCart(cartId, lineIds);
    return NextResponse.json({ cart, source: 'shopify' });
  } catch (error: any) {
    console.error('Shopify cart DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to remove from cart', details: error.message },
      { status: 500 }
    );
  }
}
