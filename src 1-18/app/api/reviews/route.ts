import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/reviews - List reviews for a product or all reviews
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const reviews = await db.review.findMany({
      where: productId ? { productId } : {},
      include: {
        product: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const total = await db.review.count({
      where: productId ? { productId } : {},
    })

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    console.error('Error fetching reviews:', err)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

// POST /api/reviews - Create a review
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, orderId, userName, rating, title, comment } = body

    if (!productId || !userName || !rating || !comment) {
      return NextResponse.json(
        { error: 'productId, userName, rating, and comment are required' },
        { status: 400 }
      )
    }

    const ratingNum = parseInt(String(rating))
    if (ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    let verified = false
    if (orderId) {
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      })
      if (order) {
        const hasProduct = order.items.some((item) => item.productId === productId)
        if (hasProduct && order.status === 'delivered') {
          verified = true
        }
      }
    }

    const review = await db.review.create({
      data: {
        productId,
        orderId: orderId || null,
        userName,
        rating: ratingNum,
        title: title || null,
        comment,
        verified,
      },
      include: {
        product: {
          select: { id: true, name: true, slug: true },
        },
      },
    })

    // Update product rating
    const reviewStats = await db.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    })

    await db.product.update({
      where: { id: productId },
      data: {
        rating: reviewStats._avg.rating ?? 0,
        reviewCount: reviewStats._count.rating,
      },
    })

    return NextResponse.json({ review }, { status: 201 })
  } catch (err) {
    console.error('Error creating review:', err)
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    )
  }
}
