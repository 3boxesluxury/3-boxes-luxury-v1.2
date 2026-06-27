import { NextRequest, NextResponse } from 'next/server';
import { getShopifyProducts, searchShopifyProducts, shopifyProductToAppProduct } from '@/lib/shopify/client';

/**
 * GET /api/shopify/products
 * Fetch products from Shopify Storefront API
 * Query params: limit, cursor, search
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const cursor = searchParams.get('cursor') || undefined;
    const search = searchParams.get('search') || undefined;

    let result;

    if (search) {
      const products = await searchShopifyProducts(search, limit);
      result = {
        products: products.map(shopifyProductToAppProduct),
        source: 'shopify',
      };
    } else {
      const { products, pageInfo } = await getShopifyProducts(limit, cursor);
      result = {
        products: products.map(shopifyProductToAppProduct),
        pageInfo,
        source: 'shopify',
      };
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Shopify products API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Shopify products', details: error.message },
      { status: 500 }
    );
  }
}
