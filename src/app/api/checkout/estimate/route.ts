import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Shipping cost calculation helper
function calculateShipping(subtotal: number, deliveryType: string): number {
  switch (deliveryType) {
    case 'express':
      return 150
    case 'same-day':
      return 250
    case 'scheduled':
      return 100
    case 'standard':
    default:
      return subtotal > 500 ? 0 : 50
  }
}

// Validate coupon and calculate discount
async function calculateDiscount(couponCode: string | undefined, subtotal: number): Promise<{ discount: number; couponValid: boolean; couponError?: string }> {
  if (!couponCode) return { discount: 0, couponValid: false }

  const offer = await db.offer.findUnique({
    where: { code: couponCode.toUpperCase() },
  })

  if (!offer) return { discount: 0, couponValid: false, couponError: 'Invalid coupon code' }
  if (!offer.isActive) return { discount: 0, couponValid: false, couponError: 'This coupon is no longer active' }

  const now = new Date()
  if (offer.validFrom > now) return { discount: 0, couponValid: false, couponError: 'This coupon is not yet active' }
  if (offer.validTo < now) return { discount: 0, couponValid: false, couponError: 'This coupon has expired' }
  if (offer.usageLimit !== null && offer.usedCount >= offer.usageLimit)
    return { discount: 0, couponValid: false, couponError: 'This coupon has reached its usage limit' }
  if (offer.minOrder !== null && subtotal < offer.minOrder)
    return { discount: 0, couponValid: false, couponError: `Minimum order amount is ₹${offer.minOrder}` }

  let discount = 0
  if (offer.type === 'percentage') {
    discount = (subtotal * offer.value) / 100
    if (offer.maxDiscount !== null) discount = Math.min(discount, offer.maxDiscount)
  } else if (offer.type === 'fixed') {
    discount = offer.value
  }

  discount = Math.min(discount, subtotal)
  discount = Math.round(discount * 100) / 100

  return { discount, couponValid: true }
}

// POST /api/checkout/estimate - Calculate checkout estimate without creating order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      items,
      deliveryType = 'standard',
      couponCode,
    } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      )
    }

    // Verify products and calculate subtotal
    let subtotal = 0
    const itemBreakdown: Array<{
      productId: string
      name: string
      price: number
      quantity: number
      variantId?: string | null
      variantName?: string | null
      total: number
    }> = []

    for (const item of items) {
      const product = await db.product.findUnique({
        where: { id: item.productId },
      })

      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.productId}` },
          { status: 404 }
        )
      }

      let price = product.price
      let variantName: string | null = null

      // If variant specified, use variant price
      if (item.variantId) {
        const variant = await db.productVariant.findUnique({
          where: { id: item.variantId },
        })
        if (!variant || variant.productId !== product.id) {
          return NextResponse.json(
            { error: `Variant not found: ${item.variantId}` },
            { status: 404 }
          )
        }
        price = variant.price > 0 ? variant.price : product.price
        const attrs = JSON.parse(variant.attributes || '{}')
        variantName = variant.name || Object.values(attrs).join(' / ') || null
      }

      const itemTotal = price * item.quantity
      subtotal += itemTotal

      itemBreakdown.push({
        productId: product.id,
        name: product.name,
        price,
        quantity: item.quantity,
        variantId: item.variantId || null,
        variantName,
        total: Math.round(itemTotal * 100) / 100,
      })
    }

    subtotal = Math.round(subtotal * 100) / 100

    // Calculate discount
    const { discount, couponValid, couponError } = await calculateDiscount(couponCode, subtotal)

    // Calculate shipping
    const shipping = calculateShipping(subtotal, deliveryType)

    // Calculate tax (8% of subtotal)
    const tax = Math.round(subtotal * 0.08 * 100) / 100

    // Calculate total
    const total = Math.round((subtotal + shipping + tax - discount) * 100) / 100

    // Calculate estimated delivery
    const now = new Date()
    let estimatedDelivery: string
    switch (deliveryType) {
      case 'same-day':
        estimatedDelivery = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString()
        break
      case 'express':
        estimatedDelivery = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()
        break
      case 'scheduled':
        estimatedDelivery = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        break
      default:
        estimatedDelivery = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString()
    }

    return NextResponse.json({
      estimate: {
        subtotal,
        shipping,
        tax,
        taxRate: '8%',
        discount,
        total,
        deliveryType,
        estimatedDelivery,
        coupon: couponCode
          ? {
              code: couponCode.toUpperCase(),
              valid: couponValid,
              error: couponError || null,
              discount,
            }
          : null,
        itemBreakdown,
      },
    })
  } catch (error) {
    console.error('Error calculating checkout estimate:', error)
    return NextResponse.json(
      { error: 'Failed to calculate estimate' },
      { status: 500 }
    )
  }
}
