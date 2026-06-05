import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchShopifyProducts } from '@/lib/shopify'
import { getStaticProductById } from '@/lib/static-products'

// Platform slug to logo URL mapping
const PLATFORM_LOGO_MAP: Record<string, string> = {
  myntra: '/logos/myntra.png',
  nykaa: '/logos/nykaa.png',
  amazon: '/logos/amazon.png',
  flipkart: '/logos/flipkart.png',
  caratlane: '/logos/caratlane.png',
  tanishq: '/logos/tanishq.png',
  bluestone: '/logos/bluestone.png',
  voylla: '/logos/voylla.png',
}

// Unified product shape for both DB and Shopify sources
interface ProductResult {
  id: string
  name: string
  slug: string
  description: string
  price: number
  compareAtPrice: number | null
  images: string
  category: { name: string; slug: string }
  stock: number
  rating: number
  reviewCount: number
  featured: boolean
  tags: string | null
  deliveryEstimate: string | null
  platform: string | null
  isExternal: boolean
  sourceUrl: string | null
  affiliateUrl: string | null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // On Vercel serverless, SQLite DB is not accessible — skip DB and go straight to Shopify
    const isVercel = !!process.env.VERCEL

    // Try database first (skip on Vercel)
    let product: ProductResult | null = null
    if (!isVercel) {
      try {
        const dbProduct = await db.product.findUnique({
          where: { id },
          include: { category: true },
        })
        if (dbProduct) {
          product = {
            id: dbProduct.id,
            name: dbProduct.name,
            slug: dbProduct.slug,
            description: dbProduct.description,
            price: dbProduct.price,
            compareAtPrice: dbProduct.compareAtPrice,
            images: dbProduct.images,
            category: { name: dbProduct.category.name, slug: dbProduct.category.slug },
            stock: dbProduct.stock,
            rating: dbProduct.rating,
            reviewCount: dbProduct.reviewCount,
            featured: dbProduct.featured,
            tags: dbProduct.tags,
            deliveryEstimate: dbProduct.deliveryEstimate,
            platform: dbProduct.platform,
            isExternal: dbProduct.isExternal,
            sourceUrl: dbProduct.sourceUrl,
            affiliateUrl: dbProduct.affiliateUrl,
          }
        }
      } catch (dbError) {
        console.warn('[Product API] Database unavailable, trying Shopify fallback for id:', id)
      }
    }

    // If not in DB (or on Vercel), try Shopify fallback
    if (!product) {
      try {
        const shopifyProducts = await fetchShopifyProducts()
        const sp = shopifyProducts.find(p => p.id === id)
        if (sp) {
          product = {
            id: sp.id,
            name: sp.name,
            slug: sp.slug,
            description: sp.description,
            price: sp.price,
            compareAtPrice: sp.compareAtPrice,
            images: JSON.stringify(sp.images),
            category: { name: sp.category, slug: sp.categorySlug },
            stock: sp.stock,
            rating: sp.rating,
            reviewCount: sp.reviewCount,
            featured: sp.featured,
            tags: JSON.stringify(sp.tags),
            deliveryEstimate: sp.deliveryEstimate || '3-5 business days',
            platform: sp.platform,
            isExternal: sp.isExternal,
            sourceUrl: sp.sourceUrl,
            affiliateUrl: sp.affiliateUrl,
          }
        }
      } catch (shopifyError) {
        console.error('[Product API] Shopify fallback also failed:', shopifyError)
      }
    }

    // If not in DB or Shopify, try static products (Corporate Gifts, Office, New Arrivals)
    if (!product) {
      const staticProduct = getStaticProductById(id)
      if (staticProduct) {
        product = {
          id: staticProduct.id,
          name: staticProduct.name,
          slug: staticProduct.slug,
          description: staticProduct.description,
          price: staticProduct.price,
          compareAtPrice: staticProduct.compareAtPrice,
          images: JSON.stringify(staticProduct.images),
          category: { name: staticProduct.category, slug: staticProduct.categorySlug },
          stock: staticProduct.stock,
          rating: staticProduct.rating,
          reviewCount: staticProduct.reviewCount,
          featured: staticProduct.featured,
          tags: JSON.stringify(staticProduct.tags),
          deliveryEstimate: staticProduct.deliveryEstimate || '3-5 business days',
          platform: staticProduct.platform,
          isExternal: staticProduct.isExternal,
          sourceUrl: staticProduct.sourceUrl,
          affiliateUrl: staticProduct.affiliateUrl,
        }
      }
    }

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Transform for frontend
    const transformed = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      images: JSON.parse(product.images || '[]') as string[],
      category: product.category.name,
      categorySlug: product.category.slug,
      stock: product.stock,
      rating: product.rating,
      reviewCount: product.reviewCount,
      featured: product.featured,
      tags: JSON.parse(product.tags || '[]') as string[],
      deliveryEstimate: product.deliveryEstimate || '3-5 business days',
      // Platform fields
      platform: product.platform,
      isExternal: product.isExternal,
      sourceUrl: product.sourceUrl,
      affiliateUrl: product.affiliateUrl,
      platformLogo: product.platform ? (PLATFORM_LOGO_MAP[product.platform] || null) : null,
    }

    return NextResponse.json({ product: transformed })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}
