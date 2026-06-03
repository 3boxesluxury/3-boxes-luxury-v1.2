import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-helper'

// GET /api/offers - List all offers (admin) or active offers (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Try to authenticate as admin
    const authHeader = request.headers.get('authorization')
    let isAdmin = false
    if (authHeader) {
      const result = await requireAdmin(request)
      if (!result.error) isAdmin = true
    }

    const now = new Date()
    const where: Record<string, unknown> = {}

    // Public users only see active offers within date range
    if (!isAdmin) {
      where.isActive = true
      where.validFrom = { lte: now }
      where.validTo = { gte: now }
    }

    const [offers, total] = await Promise.all([
      db.offer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.offer.count({ where }),
    ])

    return NextResponse.json({
      offers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    console.error('Error fetching offers:', err)
    return NextResponse.json(
      { error: 'Failed to fetch offers' },
      { status: 500 }
    )
  }
}

// POST /api/offers - Create offer (admin only)
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request)
    if (error) return error

    const body = await request.json()
    const { title, description, code, type, value, minOrder, maxDiscount, validFrom, validTo, usageLimit } = body

    if (!title || !code || !type || value === undefined || !validFrom || !validTo) {
      return NextResponse.json(
        { error: 'title, code, type, value, validFrom, and validTo are required' },
        { status: 400 }
      )
    }

    if (!['percentage', 'fixed'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be "percentage" or "fixed"' },
        { status: 400 }
      )
    }

    // Check if code already exists
    const existing = await db.offer.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json(
        { error: 'Offer code already exists' },
        { status: 409 }
      )
    }

    const offer = await db.offer.create({
      data: {
        title,
        description: description || undefined,
        code: code.toUpperCase(),
        type,
        value: parseFloat(value),
        minOrder: minOrder ? parseFloat(minOrder) : undefined,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : undefined,
        validFrom: new Date(validFrom),
        validTo: new Date(validTo),
        usageLimit: usageLimit ? parseInt(usageLimit) : undefined,
      },
    })

    return NextResponse.json({ offer }, { status: 201 })
  } catch (err) {
    console.error('Error creating offer:', err)
    return NextResponse.json(
      { error: 'Failed to create offer' },
      { status: 500 }
    )
  }
}

// PUT /api/offers - Update offer (admin only)
export async function PUT(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request)
    if (error) return error

    const body = await request.json()
    const { id, ...fields } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Offer ID is required' },
        { status: 400 }
      )
    }

    const offer = await db.offer.findUnique({ where: { id } })
    if (!offer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (fields.title !== undefined) updateData.title = fields.title
    if (fields.description !== undefined) updateData.description = fields.description
    if (fields.code !== undefined) updateData.code = fields.code.toUpperCase()
    if (fields.type !== undefined) {
      if (!['percentage', 'fixed'].includes(fields.type)) {
        return NextResponse.json(
          { error: 'Type must be "percentage" or "fixed"' },
          { status: 400 }
        )
      }
      updateData.type = fields.type
    }
    if (fields.value !== undefined) updateData.value = parseFloat(fields.value)
    if (fields.minOrder !== undefined) updateData.minOrder = fields.minOrder ? parseFloat(fields.minOrder) : null
    if (fields.maxDiscount !== undefined) updateData.maxDiscount = fields.maxDiscount ? parseFloat(fields.maxDiscount) : null
    if (fields.validFrom !== undefined) updateData.validFrom = new Date(fields.validFrom)
    if (fields.validTo !== undefined) updateData.validTo = new Date(fields.validTo)
    if (fields.isActive !== undefined) updateData.isActive = fields.isActive
    if (fields.usageLimit !== undefined) updateData.usageLimit = fields.usageLimit ? parseInt(fields.usageLimit) : null

    const updatedOffer = await db.offer.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ offer: updatedOffer })
  } catch (err) {
    console.error('Error updating offer:', err)
    return NextResponse.json(
      { error: 'Failed to update offer' },
      { status: 500 }
    )
  }
}

// DELETE /api/offers - Delete offer (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request)
    if (error) return error

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Offer ID is required' },
        { status: 400 }
      )
    }

    const offer = await db.offer.findUnique({ where: { id } })
    if (!offer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      )
    }

    await db.offer.delete({ where: { id } })

    return NextResponse.json({ message: 'Offer deleted successfully' })
  } catch (err) {
    console.error('Error deleting offer:', err)
    return NextResponse.json(
      { error: 'Failed to delete offer' },
      { status: 500 }
    )
  }
}
