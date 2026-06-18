import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth-api'

// GET /api/style-gallery/[id] — get a single gallery image
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const image = await db.customerPortfolio.findUnique({
      where: { id },
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

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    // Anyone can view approved+active images; only admin can view non-approved
    if (!image.isApproved || !image.isActive) {
      const user = await verifyAuth(request)
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Image not found' }, { status: 404 })
      }
    }

    return NextResponse.json({ image })
  } catch (error) {
    console.error('Style Gallery [id] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch gallery image' }, { status: 500 })
  }
}

// PATCH /api/style-gallery/[id] — update a gallery image (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const existing = await db.customerPortfolio.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    // Build update data from allowed fields
    const updateData: any = {}
    if (body.isApproved !== undefined) updateData.isApproved = body.isApproved
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    if (body.reviewTitle !== undefined) updateData.reviewTitle = body.reviewTitle
    if (body.reviewComment !== undefined) updateData.reviewComment = body.reviewComment
    if (body.rating !== undefined) {
      if (body.rating < 1 || body.rating > 5) {
        return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
      }
      updateData.rating = body.rating
    }
    if (body.userName !== undefined) updateData.userName = body.userName

    const updated = await db.customerPortfolio.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ image: updated })
  } catch (error) {
    console.error('Style Gallery [id] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update gallery image' }, { status: 500 })
  }
}

// DELETE /api/style-gallery/[id] — delete a gallery image (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
    }

    const { id } = await params

    const existing = await db.customerPortfolio.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    await db.customerPortfolio.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Style Gallery [id] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete gallery image' }, { status: 500 })
  }
}
