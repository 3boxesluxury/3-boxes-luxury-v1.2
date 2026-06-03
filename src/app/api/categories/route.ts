import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchShopifyCategories } from '@/lib/shopify'

export async function GET() {
  // ─── Check data source preference ───
  // On Vercel serverless, SQLite DB is not accessible, so always use Shopify
  const dataSource = process.env.DATA_SOURCE // 'shopify' to skip DB, 'database' for DB-first (default)
  const preferShopify = dataSource === 'shopify' || !!process.env.VERCEL

  // ─── Shopify-only path (no DB, no duplication) ───
  if (preferShopify) {
    try {
      const shopifyCategories = await fetchShopifyCategories()

      return NextResponse.json({
        categories: shopifyCategories,
        source: 'shopify',
      })
    } catch (shopifyError) {
      console.error('[Categories API] Shopify fetch failed:', shopifyError)
      return NextResponse.json(
        { error: 'Failed to fetch categories from Shopify' },
        { status: 500 }
      )
    }
  }

  // ─── DB-first path (default, with Shopify fallback) ───
  try {
    // Fetch only top-level categories (parentId is null), ordered by `order` field
    const categories = await db.category.findMany({
      where: { parentId: null },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
        children: {
          orderBy: { order: 'asc' },
          include: {
            _count: {
              select: { products: true },
            },
          },
        },
      },
    })

    const transformed = categories.map((cat) => {
      // For parent categories, show total product count including subcategories
      const totalProductCount =
        cat._count.products +
        cat.children.reduce((sum, child) => sum + child._count.products, 0)

      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        image: cat.image,
        productCount: totalProductCount,
        parentId: cat.parentId,
        order: cat.order,
        children: cat.children.map((child) => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          description: child.description,
          image: child.image,
          productCount: child._count.products,
          parentId: child.parentId,
          order: child.order,
        })),
      }
    })

    return NextResponse.json({
      categories: transformed,
      source: 'database',
    })
  } catch (dbError) {
    console.warn('[Categories API] Database query failed, falling back to Shopify:', dbError)

    // ─── Fallback to Shopify Admin API ───
    try {
      const shopifyCategories = await fetchShopifyCategories()

      return NextResponse.json({
        categories: shopifyCategories,
        source: 'shopify',
      })
    } catch (shopifyError) {
      console.error('[Categories API] Shopify fallback also failed:', shopifyError)
      return NextResponse.json(
        { error: 'Failed to fetch categories from both database and Shopify' },
        { status: 500 }
      )
    }
  }
}
