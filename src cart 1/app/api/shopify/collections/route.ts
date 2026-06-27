import { NextRequest, NextResponse } from 'next/server';
import { getShopifyCollections, getShopifyCollectionProducts, shopifyProductToAppProduct } from '@/lib/shopify/client';

/**
 * GET /api/shopify/collections
 * Fetch collections from Shopify
 * Query params: handle (optional - get products in a specific collection)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const handle = searchParams.get('handle');

    if (handle) {
      const collection = await getShopifyCollectionProducts(handle);
      if (!collection) {
        return NextResponse.json(
          { error: 'Collection not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        collection: {
          ...collection,
          products: collection.products.map(shopifyProductToAppProduct),
        },
        source: 'shopify',
      });
    }

    const collections = await getShopifyCollections();
    return NextResponse.json({ collections, source: 'shopify' });
  } catch (error: any) {
    console.error('Shopify collections API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Shopify collections', details: error.message },
      { status: 500 }
    );
  }
}
