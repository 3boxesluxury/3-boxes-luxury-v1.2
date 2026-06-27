import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/search/suggestions?q=<query>&limit=8
 *
 * Returns product-name autocomplete suggestions FROM THE DATABASE ONLY.
 * No Shopify fallback — only products that exist in your local/Supabase DB
 * are suggested. Used by the desktop & mobile search-box dropdowns.
 *
 * Response shape:
 *   {
 *     suggestions: [
 *       { name: string, slug: string, price: number, image: string|null, category: string }
 *     ],
 *     source: 'database'
 *   }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '8', 10), 20);

    // Empty query → return most popular / featured products (helpful UX)
    if (!q || q.length < 1) {
      const popular = await db.product.findMany({
        where: { isExternal: false, syncStatus: 'active' },
        include: { category: { select: { name: true, slug: true } } },
        orderBy: [{ featured: 'desc' }, { rating: 'desc' }, { reviewCount: 'desc' }],
        take: limit,
      });
      return NextResponse.json({
        suggestions: popular.map(formatSuggestion),
        source: 'database',
      });
    }

    // DB-only search — never falls back to Shopify.
    // Match against name (highest priority), description, sku, tags.
    const products = await db.product.findMany({
      where: {
        isExternal: false,
        syncStatus: 'active',
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { tags: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: { category: { select: { name: true, slug: true } } },
      orderBy: [{ featured: 'desc' }, { rating: 'desc' }],
      take: limit,
    });

    return NextResponse.json({
      suggestions: products.map(formatSuggestion),
      source: 'database',
    });
  } catch (error) {
    console.error('[Search Suggestions API] error:', error);
    // On any error (including DB unreachable), return empty list — never Shopify.
    return NextResponse.json({ suggestions: [], source: 'database' });
  }
}

function formatSuggestion(p: any) {
  let image: string | null = null;
  try {
    const imgs = p.images ? JSON.parse(p.images) : [];
    if (Array.isArray(imgs) && imgs.length > 0) image = imgs[0];
  } catch {
    image = null;
  }
  return {
    name: p.name,
    slug: p.slug,
    price: p.price,
    compareAtPrice: p.compareAtPrice ?? null,
    image,
    category: p.category?.name ?? null,
    categorySlug: p.category?.slug ?? null,
  };
}
