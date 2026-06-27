import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, subtotal } = body

    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'Coupon code is required' },
        { status: 400 }
      )
    }

    if (!subtotal || subtotal <= 0) {
      return NextResponse.json(
        { valid: false, error: 'Invalid subtotal' },
        { status: 400 }
      )
    }

    const coupon = await db.coupon.findUnique({
      where: { code },
    })

    if (!coupon) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid coupon code',
        discount: 0,
      })
    }

    if (!coupon.isActive) {
      return NextResponse.json({
        valid: false,
        error: 'This coupon is no longer active',
        discount: 0,
      })
    }

    const now = new Date()
    if (now < coupon.validFrom) {
      return NextResponse.json({
        valid: false,
        error: 'This coupon is not yet active',
        discount: 0,
      })
    }

    if (now > coupon.validTo) {
      return NextResponse.json({
        valid: false,
        error: 'This coupon has expired',
        discount: 0,
      })
    }

    if (subtotal < coupon.minOrder) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order amount is ₹${coupon.minOrder.toLocaleString()}`,
        discount: 0,
      })
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({
        valid: false,
        error: 'This coupon has reached its usage limit',
        discount: 0,
      })
    }

    // Calculate discount
    let discount = 0
    if (coupon.type === 'percentage') {
      discount = Math.round(subtotal * coupon.value) / 100
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount
      }
    } else {
      discount = coupon.value
    }

    // Ensure discount doesn't exceed subtotal
    discount = Math.min(discount, subtotal)

    return NextResponse.json({
      valid: true,
      discount,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minOrder: coupon.minOrder,
        maxDiscount: coupon.maxDiscount,
      },
    })
  } catch (error) {
    console.error('Error validating coupon:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to validate coupon' },
      { status: 500 }
    )
  }
}
