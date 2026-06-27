import { NextRequest, NextResponse } from 'next/server';
import { getShopifyProductByHandle, shopifyProductToAppProduct } from '@/lib/shopify/client';

/**
 * GET /api/shopify/products/[handle]
 * Fetch a single product from Shopify by handle
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const product = await getShopifyProductByHandle(handle);

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found on Shopify' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      product: shopifyProductToAppProduct(product),
      source: 'shopify',
    });
  } catch (error: any) {
    console.error('Shopify product API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Shopify product', details: error.message },
      { status: 500 }
    );
  }
}
