import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const categorySlug = searchParams.get('category')

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    // Get the current product
    const currentProduct = await db.product.findUnique({
      where: { id: productId },
      include: { category: true },
    })

    if (!currentProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const catSlug = categorySlug || currentProduct.category.slug

    // Define complementary categories for each product type
    const complementaryCategories: Record<string, string[]> = {
      'watches': ['jewelry', 'leather-goods'],
      'jewelry': ['sarees', 'fashion', 'watches'],
      'leather-goods': ['watches', 'fashion'],
      'fragrances': ['jewelry', 'fashion'],
      'fashion': ['jewelry', 'fragrances', 'leather-goods'],
      'home-living': ['fragrances', 'jewelry'],
      'sarees': ['jewelry', 'fragrances'],
      'toys': ['fragrances', 'home-living'],
      'romantic-gifts': ['jewelry', 'fragrances', 'couple-gifts'],
      'couple-gifts': ['romantic-gifts', 'jewelry', 'fragrances'],
      'mens-shirts': ['watches', 'leather-goods', 'fragrances'],
    }

    const relatedCats = complementaryCategories[catSlug] || ['jewelry', 'fragrances']

    // Fetch products from complementary categories
    const suggestions = await db.product.findMany({
      where: {
        id: { not: productId },
        category: { slug: { in: relatedCats } },
        stock: { gt: 0 },
      },
      include: { category: true },
      take: 6,
      orderBy: { rating: 'desc' },
    })

    const transformed = suggestions.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      images: JSON.parse(p.images || '[]') as string[],
      category: p.category.name,
      categorySlug: p.category.slug,
      rating: p.rating,
      stock: p.stock,
    }))

    // Generate AI-style suggestion reasons based on the product and category
    const suggestionReasons: Record<string, string> = {}

    for (const s of transformed) {
      const sCat = s.categorySlug
      if (catSlug === 'sarees' && sCat === 'jewelry') {
        suggestionReasons[s.id] = 'Perfect jewelry to complement your saree look'
      } else if (catSlug === 'sarees' && sCat === 'fragrances') {
        suggestionReasons[s.id] = 'Complete your ensemble with an elegant fragrance'
      } else if (catSlug === 'jewelry' && sCat === 'sarees') {
        suggestionReasons[s.id] = 'Pair this jewelry with a beautiful saree'
      } else if (catSlug === 'jewelry' && sCat === 'fashion') {
        suggestionReasons[s.id] = 'Style this jewelry with designer fashion'
      } else if (catSlug === 'watches' && sCat === 'leather-goods') {
        suggestionReasons[s.id] = 'Complete your look with a premium leather bag'
      } else if (catSlug === 'watches' && sCat === 'jewelry') {
        suggestionReasons[s.id] = 'Pair your watch with matching jewelry'
      } else if (catSlug === 'mens-shirts' && sCat === 'watches') {
        suggestionReasons[s.id] = 'Elevate your outfit with a luxury timepiece'
      } else if (catSlug === 'mens-shirts' && sCat === 'leather-goods') {
        suggestionReasons[s.id] = 'Carry a premium leather bag to complete the look'
      } else if (catSlug === 'fashion' && sCat === 'jewelry') {
        suggestionReasons[s.id] = 'Accent your outfit with stunning jewelry'
      } else if (catSlug === 'fashion' && sCat === 'fragrances') {
        suggestionReasons[s.id] = 'Finish your look with a signature scent'
      } else if (['romantic-gifts', 'couple-gifts'].includes(catSlug) && sCat === 'jewelry') {
        suggestionReasons[s.id] = 'Add sparkle to your gift with fine jewelry'
      } else {
        suggestionReasons[s.id] = `Pairs beautifully with ${currentProduct.category.name.toLowerCase()}`
      }
    }

    return NextResponse.json({
      suggestions: transformed,
      reasons: suggestionReasons,
    })
  } catch (error) {
    console.error('Error fetching combo suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    )
  }
}
