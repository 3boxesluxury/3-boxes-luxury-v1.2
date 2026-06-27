import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/offers/validate - Validate and apply coupon
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, subtotal } = body

    if (!code || subtotal === undefined) {
      return NextResponse.json(
        { error: 'code and subtotal are required' },
        { status: 400 }
      )
    }

    const subtotalNum = parseFloat(subtotal)
    if (isNaN(subtotalNum) || subtotalNum < 0) {
      return NextResponse.json(
        { error: 'subtotal must be a valid positive number' },
        { status: 400 }
      )
    }

    // Find the offer by code
    const offer = await db.offer.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!offer) {
      return NextResponse.json(
        { valid: false, error: 'Invalid coupon code' },
        { status: 200 }
      )
    }

    // Check if offer is active
    if (!offer.isActive) {
      return NextResponse.json(
        { valid: false, error: 'This coupon is no longer active' },
        { status: 200 }
      )
    }

    const now = new Date()

    // Check date range
    if (offer.validFrom > now) {
      return NextResponse.json(
        { valid: false, error: 'This coupon is not yet active' },
        { status: 200 }
      )
    }

    if (offer.validTo < now) {
      return NextResponse.json(
        { valid: false, error: 'This coupon has expired' },
        { status: 200 }
      )
    }

    // Check usage limit
    if (offer.usageLimit !== null && offer.usedCount >= offer.usageLimit) {
      return NextResponse.json(
        { valid: false, error: 'This coupon has reached its usage limit' },
        { status: 200 }
      )
    }

    // Check minimum order
    if (offer.minOrder !== null && subtotalNum < offer.minOrder) {
      return NextResponse.json(
        { valid: false, error: `Minimum order amount is ₹${offer.minOrder}` },
        { status: 200 }
      )
    }

    // Calculate discount
    let discount = 0
    if (offer.type === 'percentage') {
      discount = (subtotalNum * offer.value) / 100
      // Apply max discount cap
      if (offer.maxDiscount !== null) {
        discount = Math.min(discount, offer.maxDiscount)
      }
    } else if (offer.type === 'fixed') {
      discount = offer.value
    }

    // Discount cannot exceed subtotal
    discount = Math.min(discount, subtotalNum)

    return NextResponse.json({
      valid: true,
      discount: Math.round(discount * 100) / 100,
      offer: {
        id: offer.id,
        title: offer.title,
        code: offer.code,
        type: offer.type,
        value: offer.value,
        minOrder: offer.minOrder,
        maxDiscount: offer.maxDiscount,
      },
    })
  } catch (err) {
    console.error('Error validating coupon:', err)
    return NextResponse.json(
      { error: 'Failed to validate coupon' },
      { status: 500 }
    )
  }
}
