import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth-helper'

// GET /api/portfolio?productId=xxx — List approved & active portfolio entries for a product
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json(
        { error: 'productId query parameter is required' },
        { status: 400 }
      )
    }

    const portfolios = await db.customerPortfolio.findMany({
      where: {
        productId,
        isApproved: true,
        isActive: true,
        consentGiven: true,
      },
      include: {
        product: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const result = portfolios.map((p) => ({
      id: p.id,
      userName: p.userName,
      aiGeneratedImage: p.aiGeneratedImage,
      rating: p.rating,
      reviewTitle: p.reviewTitle,
      reviewComment: p.reviewComment,
      createdAt: p.createdAt,
      consentGiven: p.consentGiven,
      productName: p.product.name,
    }))

    return NextResponse.json({ portfolios: result })
  } catch (err) {
    console.error('Error fetching portfolio entries:', err)
    return NextResponse.json(
      { error: 'Failed to fetch portfolio entries' },
      { status: 500 }
    )
  }
}

// POST /api/portfolio — Submit a new portfolio entry with consent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      productId,
      userName,
      aiGeneratedImage,
      rating,
      reviewTitle,
      reviewComment,
      consentGiven,
    } = body

    // Validate required fields
    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      )
    }
    if (!userName) {
      return NextResponse.json(
        { error: 'userName is required' },
        { status: 400 }
      )
    }
    if (!aiGeneratedImage) {
      return NextResponse.json(
        { error: 'aiGeneratedImage is required' },
        { status: 400 }
      )
    }
    if (consentGiven !== true) {
      return NextResponse.json(
        { error: 'consentGiven must be true to submit a portfolio entry' },
        { status: 400 }
      )
    }

    // Validate rating if provided
    const ratingNum = rating ? parseInt(String(rating)) : 5
    if (ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Verify product exists
    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Extract userId from Authorization header if available
    const user = await getSessionFromRequest(request)

    const portfolio = await db.customerPortfolio.create({
      data: {
        productId,
        userId: user?.id || null,
        userName,
        aiGeneratedImage,
        rating: ratingNum,
        reviewTitle: reviewTitle || null,
        reviewComment: reviewComment || null,
        consentGiven: true,
        isApproved: true, // Auto-approve when consent is given
        isActive: true,
      },
      include: {
        product: {
          select: { id: true, name: true, slug: true },
        },
      },
    })

    return NextResponse.json({ portfolio }, { status: 201 })
  } catch (err) {
    console.error('Error creating portfolio entry:', err)
    return NextResponse.json(
      { error: 'Failed to create portfolio entry' },
      { status: 500 }
    )
  }
}

// DELETE /api/portfolio — Revoke consent / soft-delete portfolio entry
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { portfolioId, productId, userId } = body

    if (portfolioId) {
      // Soft delete by portfolio ID
      const portfolio = await db.customerPortfolio.findUnique({
        where: { id: portfolioId },
      })

      if (!portfolio) {
        return NextResponse.json(
          { error: 'Portfolio entry not found' },
          { status: 404 }
        )
      }

      if (!portfolio.isActive) {
        return NextResponse.json(
          { error: 'Portfolio entry is already inactive' },
          { status: 400 }
        )
      }

      await db.customerPortfolio.update({
        where: { id: portfolioId },
        data: { isActive: false },
      })

      return NextResponse.json({ success: true })
    }

    if (productId && userId) {
      // Soft delete all active portfolio entries for a product by a specific user
      const result = await db.customerPortfolio.updateMany({
        where: {
          productId,
          userId,
          isActive: true,
        },
        data: { isActive: false },
      })

      if (result.count === 0) {
        return NextResponse.json(
          { error: 'No active portfolio entries found for this product and user' },
          { status: 404 }
        )
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: 'Either portfolioId or both productId and userId are required' },
      { status: 400 }
    )
  } catch (err) {
    console.error('Error deleting portfolio entry:', err)
    return NextResponse.json(
      { error: 'Failed to delete portfolio entry' },
      { status: 500 }
    )
  }
}
