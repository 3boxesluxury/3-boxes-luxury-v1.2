import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth-helper'

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
async function calculateDiscount(couponCode: string | undefined, subtotal: number): Promise<{
  discount: number
  couponValid: boolean
  offerId?: string
}> {
  if (!couponCode) return { discount: 0, couponValid: false }

  const offer = await db.offer.findUnique({
    where: { code: couponCode.toUpperCase() },
  })

  if (!offer || !offer.isActive) return { discount: 0, couponValid: false }

  const now = new Date()
  if (offer.validFrom > now || offer.validTo < now) return { discount: 0, couponValid: false }
  if (offer.usageLimit !== null && offer.usedCount >= offer.usageLimit) return { discount: 0, couponValid: false }
  if (offer.minOrder !== null && subtotal < offer.minOrder) return { discount: 0, couponValid: false }

  let discount = 0
  if (offer.type === 'percentage') {
    discount = (subtotal * offer.value) / 100
    if (offer.maxDiscount !== null) discount = Math.min(discount, offer.maxDiscount)
  } else if (offer.type === 'fixed') {
    discount = offer.value
  }

  discount = Math.min(discount, subtotal)
  discount = Math.round(discount * 100) / 100

  return { discount, couponValid: true, offerId: offer.id }
}

// Generate a unique invoice number
function generateInvoiceNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `INV-${timestamp}-${random}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      firstName,
      lastName,
      address,
      city,
      state,
      zipCode,
      country,
      phone,
      items,
      deliveryType = 'standard',
      scheduledDate,
      occasion,
      giftWrapping = false,
      giftWrapStyle,
      greetingMessage,
      hidePrice = false,
      couponCode,
      paymentMethod = 'card',
    } = body

    // Validate required fields
    if (!email || !firstName || !lastName || !address || !city || !state || !zipCode || !country) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Order must contain at least one item' },
        { status: 400 }
      )
    }

    // Validate scheduled delivery
    if (deliveryType === 'scheduled' && !scheduledDate) {
      return NextResponse.json(
        { error: 'Scheduled date is required for scheduled delivery' },
        { status: 400 }
      )
    }

    // Get authenticated user (optional)
    const user = await getSessionFromRequest(request)

    // Verify products and calculate subtotal
    let subtotal = 0
    const orderItemsData: Array<{
      productId: string
      name: string
      price: number
      quantity: number
      image: string | null
      variantId: string | null
      variantName: string | null
      giftWrapping: boolean
      greetingMessage: string | null
      hidePrice: boolean
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

      // Check stock
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
        if (variant.stock < item.quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for variant: ${variant.name}` },
            { status: 400 }
          )
        }
      } else {
        if (product.stock < item.quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for: ${product.name}` },
            { status: 400 }
          )
        }
      }

      // Determine price (variant price overrides product price if > 0)
      let price = product.price
      let variantName: string | null = null

      if (item.variantId) {
        const variant = await db.productVariant.findUnique({
          where: { id: item.variantId },
        })
        if (variant) {
          if (variant.price > 0) price = variant.price
          const attrs = JSON.parse(variant.attributes || '{}')
          variantName = variant.name || Object.values(attrs).join(' / ') || null
        }
      }

      const itemTotal = price * item.quantity
      subtotal += itemTotal

      const images: string[] = JSON.parse(product.images || '[]')

      orderItemsData.push({
        productId: product.id,
        name: product.name,
        price,
        quantity: item.quantity,
        image: images[0] || null,
        variantId: item.variantId || null,
        variantName,
        giftWrapping: item.giftWrapping || false,
        greetingMessage: item.greetingMessage || null,
        hidePrice: item.hidePrice || false,
      })
    }

    subtotal = Math.round(subtotal * 100) / 100

    // Validate coupon if provided
    let validatedDiscount = 0
    let offerId: string | undefined
    if (couponCode) {
      const result = await calculateDiscount(couponCode, subtotal)
      if (result.couponValid) {
        validatedDiscount = result.discount
        offerId = result.offerId
      }
    }

    // Calculate shipping based on delivery type
    const shipping = calculateShipping(subtotal, deliveryType)

    // Calculate tax (8% of subtotal)
    const tax = Math.round(subtotal * 0.08 * 100) / 100

    // Calculate total
    const total = Math.round((subtotal + shipping + tax - validatedDiscount) * 100) / 100

    // Calculate estimated delivery based on delivery type
    const now = new Date()
    let estimatedDelivery: Date
    switch (deliveryType) {
      case 'same-day':
        estimatedDelivery = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)
        break
      case 'express':
        estimatedDelivery = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
        break
      case 'scheduled':
        estimatedDelivery = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        break
      default:
        estimatedDelivery = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
    }

    // Generate order number
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    const orderNumber = `3BL-${timestamp}-${random}`

    // Create order with items
    const order = await db.order.create({
      data: {
        orderNumber,
        email,
        firstName,
        lastName,
        address,
        city,
        state,
        zipCode,
        country,
        phone: phone || null,
        subtotal,
        shipping,
        tax,
        discount: validatedDiscount,
        total,
        status: 'pending',
        paymentMethod,
        paymentStatus: 'pending',
        deliveryType,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        occasion: occasion || null,
        giftWrapping,
        giftWrapStyle: giftWrapping ? (giftWrapStyle || null) : null,
        greetingMessage: greetingMessage || null,
        hidePrice,
        couponCode: couponCode || null,
        estimatedDelivery,
        userId: user?.id || null,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: true,
      },
    })

    // Create OrderTrackingEvent with status "pending"
    await db.orderTrackingEvent.create({
      data: {
        orderId: order.id,
        status: 'pending',
        description: 'Order has been placed and is awaiting payment confirmation',
        location: 'Online',
      },
    })

    // Create PaymentSession record (status: "created")
    const providerSessionId = paymentMethod === 'razorpay'
      ? `rp_order_${Date.now()}_${random}`
      : paymentMethod === 'stripe'
        ? `cs_${Date.now()}_${random}`
        : `direct_${Date.now()}`

    const mockSessionData = paymentMethod === 'razorpay'
      ? {
          razorpay_order_id: providerSessionId,
          amount: total * 100,
          currency: 'INR',
          key_id: 'rzp_test_mock_key_3BL',
        }
      : paymentMethod === 'stripe'
        ? {
            session_id: providerSessionId,
            payment_url: `https://checkout.stripe.com/mock/${providerSessionId}`,
          }
        : {}

    const paymentSession = await db.paymentSession.create({
      data: {
        orderId: order.id,
        provider: paymentMethod === 'razorpay' ? 'razorpay' : paymentMethod === 'stripe' ? 'stripe' : 'direct',
        providerSessionId,
        amount: total,
        currency: 'INR',
        status: 'created',
        method: paymentMethod,
        metadata: JSON.stringify(mockSessionData),
      },
    })

    // Create OrderInvoice record
    const invoiceNumber = generateInvoiceNumber()
    const invoice = await db.orderInvoice.create({
      data: {
        orderId: order.id,
        invoiceNumber,
        amount: subtotal,
        tax,
        total,
        status: 'generated',
      },
    })

    // Increment coupon usage if valid coupon was used
    if (offerId) {
      await db.offer.update({
        where: { id: offerId },
        data: { usedCount: { increment: 1 } },
      })
    }

    // Update product stock
    for (const item of items) {
      if (item.variantId) {
        await db.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        })
      }
      await db.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      })
    }

    // Build payment session response based on provider
    const paymentSessionResponse: Record<string, unknown> = {
      id: paymentSession.id,
      provider: paymentSession.provider,
      status: paymentSession.status,
    }

    if (paymentMethod === 'razorpay') {
      paymentSessionResponse.razorpay_order_id = providerSessionId
      paymentSessionResponse.amount = total * 100
      paymentSessionResponse.currency = 'INR'
      paymentSessionResponse.key_id = 'rzp_test_mock_key_3BL'
    } else if (paymentMethod === 'stripe') {
      paymentSessionResponse.session_id = providerSessionId
      paymentSessionResponse.payment_url = `https://checkout.stripe.com/mock/${providerSessionId}`
    }

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: order.total,
      estimatedDelivery: order.estimatedDelivery,
      createdAt: order.createdAt,
      paymentSession: paymentSessionResponse,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error processing checkout:', error)
    return NextResponse.json(
      { error: 'Failed to process checkout' },
      { status: 500 }
    )
  }
}
