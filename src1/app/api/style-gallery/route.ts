import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth-api'

// GET /api/style-gallery — list gallery images with filtering & pagination
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId') || undefined
    const status = searchParams.get('status') || undefined // pending | approved | rejected
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    // Build the where clause
    const where: any = {}

    // Non-admin users can only see approved + active images
    if (!user || user.role !== 'admin') {
      where.isApproved = true
      where.isActive = true
    } else {
      // Admin filtering by status
      if (status === 'pending') {
        where.isApproved = false
        where.isActive = true
      } else if (status === 'approved') {
        where.isApproved = true
        where.isActive = true
      } else if (status === 'rejected') {
        where.isActive = false
      }
    }

    if (productId) {
      where.productId = productId
    }

    const [images, total] = await Promise.all([
      db.customerPortfolio.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true,
            },
          },
        },
      }),
      db.customerPortfolio.count({ where }),
    ])

    return NextResponse.json({
      images,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Style Gallery GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch gallery images' }, { status: 500 })
  }
}

// POST /api/style-gallery — create a new gallery image (user submission)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, userName, aiGeneratedImage, originalSelfie, rating, reviewTitle, reviewComment, consentGiven } = body

    // Validate required fields
    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }
    if (!userName) {
      return NextResponse.json({ error: 'userName is required' }, { status: 400 })
    }
    if (!aiGeneratedImage) {
      return NextResponse.json({ error: 'aiGeneratedImage is required' }, { status: 400 })
    }
    if (consentGiven !== true) {
      return NextResponse.json({ error: 'consentGiven must be true to submit' }, { status: 400 })
    }

    // Verify product exists
    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // Only store originalSelfie if consent is given
    const data: any = {
      productId,
      userId: user.id,
      userName,
      aiGeneratedImage,
      rating: rating ?? 5,
      consentGiven: true,
      isApproved: false, // requires admin approval
      isActive: true,
    }

    if (originalSelfie && consentGiven) {
      data.originalSelfie = originalSelfie
    }
    if (reviewTitle) {
      data.reviewTitle = reviewTitle
    }
    if (reviewComment) {
      data.reviewComment = reviewComment
    }

    const image = await db.customerPortfolio.create({
      data,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
          },
        },
      },
    })

    return NextResponse.json({ image }, { status: 201 })
  } catch (error) {
    console.error('Style Gallery POST error:', error)
    return NextResponse.json({ error: 'Failed to create gallery image' }, { status: 500 })
  }
}
