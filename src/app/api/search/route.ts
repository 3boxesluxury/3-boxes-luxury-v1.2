import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { searchShopifyProducts, fetchShopifyProducts, type ShopifyProductTransformed } from '@/lib/shopify';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const category = searchParams.get('category');
    const minPrice = parseFloat(searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '999999');
    const occasion = searchParams.get('occasion');
    const recipient = searchParams.get('recipient');
    const sort = searchParams.get('sort') || 'relevance';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // On Vercel serverless, SQLite DB is not accessible — use Shopify directly
    const isVercel = !!process.env.VERCEL;

    if (isVercel) {
      return await searchFromShopify(q, category, minPrice, maxPrice, occasion, recipient, sort, page, limit);
    }

    // ─── DB-first path (local dev) with Shopify fallback ───
    try {
      const where: Record<string, unknown>[] = [];

      if (q) {
        where.push({
          OR: [
            { name: { contains: q } },
            { description: { contains: q } },
            { sku: { contains: q } },
            { tags: { contains: q } },
          ],
        });
      }

      if (category) {
        where.push({
          category: { slug: category },
        });
      }

      if (minPrice > 0 || maxPrice < 999999) {
        where.push({
          price: { gte: minPrice, lte: maxPrice },
        });
      }

      if (occasion) {
        where.push({
          occasions: { contains: occasion },
        });
      }

      if (recipient) {
        where.push({
          recipientTypes: { contains: recipient },
        });
      }

      const products = await db.product.findMany({
        where: where.length > 0 ? { AND: where } : undefined,
        include: {
          category: { select: { name: true, slug: true } },
        },
        orderBy: sort === 'price_asc' ? { price: 'asc' }
          : sort === 'price_desc' ? { price: 'desc' }
          : sort === 'rating' ? { rating: 'desc' }
          : sort === 'newest' ? { createdAt: 'desc' }
          : { featured: 'desc' },
        skip,
        take: limit,
      });

      const total = await db.product.count({
        where: where.length > 0 ? { AND: where } : undefined,
      });

      const formattedProducts = products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        images: p.images ? JSON.parse(p.images) : [],
        category: p.category.name,
        categorySlug: p.category.slug,
        stock: p.stock,
        stockStatus: p.stockStatus,
        rating: p.rating,
        reviewCount: p.reviewCount,
        featured: p.featured,
        tags: p.tags ? JSON.parse(p.tags || '[]') : [],
        occasions: p.occasions ? JSON.parse(p.occasions || '[]') : [],
        recipientTypes: p.recipientTypes ? JSON.parse(p.recipientTypes || '[]') : [],
        deliveryEstimate: p.deliveryEstimate,
        isExternal: p.isExternal,
        platform: p.platform,
        affiliateUrl: p.affiliateUrl,
      }));

      let aiSuggestions: string[] = [];
      if (q) {
        aiSuggestions = getAiSuggestions(q);
      }

      return NextResponse.json({
        products: formattedProducts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        query: q,
        aiSuggestions,
        source: 'database',
      });
    } catch (dbError) {
      console.warn('[Search API] Database query failed, falling back to Shopify:', dbError);
      return await searchFromShopify(q, category, minPrice, maxPrice, occasion, recipient, sort, page, limit);
    }
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

// ─── Shopify search helper ───

async function searchFromShopify(
  q: string, category: string | null,
  minPrice: number, maxPrice: number,
  occasion: string | null, recipient: string | null,
  sort: string, page: number, limit: number
) {
  try {
    let products: ShopifyProductTransformed[];

    if (q) {
      products = await searchShopifyProducts(q);
    } else {
      products = await fetchShopifyProducts();
    }

    // Apply filters
    if (category) {
      products = products.filter(p => p.categorySlug === category);
    }
    if (minPrice > 0) {
      products = products.filter(p => p.price >= minPrice);
    }
    if (maxPrice < 999999) {
      products = products.filter(p => p.price <= maxPrice);
    }
    if (occasion) {
      products = products.filter(p => p.occasions.includes(occasion));
    }
    if (recipient) {
      products = products.filter(p => p.recipientTypes.includes(recipient));
    }

    // Sort
    switch (sort) {
      case 'price_asc':
        products.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        products.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        products.sort((a, b) => b.rating - a.rating);
        break;
      default:
        break;
    }

    const total = products.length;
    const paginated = products.slice((page - 1) * limit, page * limit);

    const formattedProducts = paginated.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      images: p.images,
      category: p.category,
      categorySlug: p.categorySlug,
      stock: p.stock,
      rating: p.rating,
      reviewCount: p.reviewCount,
      featured: p.featured,
      tags: p.tags,
      occasions: p.occasions,
      recipientTypes: p.recipientTypes,
      deliveryEstimate: p.deliveryEstimate,
      isExternal: p.isExternal,
      platform: p.platform,
      affiliateUrl: p.affiliateUrl,
    }));

    let aiSuggestions: string[] = [];
    if (q) {
      aiSuggestions = getAiSuggestions(q);
    }

    return NextResponse.json({
      products: formattedProducts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      query: q,
      aiSuggestions,
      source: 'shopify',
    });
  } catch (shopifyError) {
    console.error('[Search API] Shopify search also failed:', shopifyError);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

function getAiSuggestions(q: string): string[] {
  const lowerQ = q.toLowerCase();
  const occasionKeywords = ['birthday', 'anniversary', 'wedding', 'diwali', 'christmas', 'valentine', 'mother', 'father', 'housewarming', 'farewell'];
  const recipientKeywords = ['him', 'her', 'couple', 'kids', 'parents', 'friend', 'colleague', 'boss', 'wife', 'husband', 'girlfriend', 'boyfriend', 'mom', 'dad'];

  const detectedOccasions = occasionKeywords.filter(o => lowerQ.includes(o));
  const detectedRecipients = recipientKeywords.filter(r => lowerQ.includes(r));
  const budgetMatch = lowerQ.match(/under\s*₹?(\d+)|below\s*₹?(\d+)|less\s*than\s*₹?(\d+)/);

  const suggestions: string[] = [];
  if (detectedOccasions.length > 0) suggestions.push(`Occasion detected: ${detectedOccasions.join(', ')}`);
  if (detectedRecipients.length > 0) suggestions.push(`Recipient: ${detectedRecipients.join(', ')}`);
  if (budgetMatch) suggestions.push(`Budget: under ₹${budgetMatch[1] || budgetMatch[2] || budgetMatch[3]}`);
  return suggestions;
}
