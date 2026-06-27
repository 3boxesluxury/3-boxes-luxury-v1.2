import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/payments/create-session - Create a payment session for an order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, provider } = body

    if (!orderId || !provider) {
      return NextResponse.json(
        { error: 'orderId and provider are required' },
        { status: 400 }
      )
    }

    if (!['razorpay', 'stripe'].includes(provider)) {
      return NextResponse.json(
        { error: 'Provider must be "razorpay" or "stripe"' },
        { status: 400 }
      )
    }

    // Look up the order
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { paymentSessions: true },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Verify payment is pending
    if (order.paymentStatus === 'paid') {
      return NextResponse.json(
        { error: 'Order has already been paid' },
        { status: 400 }
      )
    }

    if (order.paymentStatus === 'refunded') {
      return NextResponse.json(
        { error: 'Order payment has been refunded' },
        { status: 400 }
      )
    }

    // Check if there's already an active session for this provider
    const existingSession = order.paymentSessions.find(
      (s) => s.provider === provider && (s.status === 'created' || s.status === 'attempted')
    )

    if (existingSession) {
      // Return existing session data
      const existingMetadata = existingSession.metadata ? JSON.parse(existingSession.metadata) : {}

      if (provider === 'razorpay') {
        return NextResponse.json({
          sessionId: existingSession.id,
          provider: existingSession.provider,
          status: existingSession.status,
          razorpay_order_id: existingSession.providerSessionId,
          amount: existingSession.amount * 100,
          currency: 'INR',
          key_id: 'rzp_test_mock_key_3BL',
          ...existingMetadata,
        })
      } else {
        return NextResponse.json({
          sessionId: existingSession.id,
          provider: existingSession.provider,
          status: existingSession.status,
          session_id: existingSession.providerSessionId,
          payment_url: `https://checkout.stripe.com/mock/${existingSession.providerSessionId}`,
          ...existingMetadata,
        })
      }
    }

    // Create a new payment session
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    const providerSessionId = provider === 'razorpay'
      ? `rp_order_${Date.now()}_${random}`
      : `cs_${Date.now()}_${random}`

    const paymentSession = await db.paymentSession.create({
      data: {
        orderId: order.id,
        provider,
        providerSessionId,
        amount: order.total,
        currency: 'INR',
        status: 'created',
        method: provider,
        metadata: provider === 'razorpay'
          ? JSON.stringify({
              razorpay_order_id: providerSessionId,
              amount: order.total * 100,
              currency: 'INR',
              key_id: 'rzp_test_mock_key_3BL',
            })
          : JSON.stringify({
              session_id: providerSessionId,
              payment_url: `https://checkout.stripe.com/mock/${providerSessionId}`,
            }),
      },
    })

    if (provider === 'razorpay') {
      return NextResponse.json({
        sessionId: paymentSession.id,
        provider: paymentSession.provider,
        status: paymentSession.status,
        razorpay_order_id: providerSessionId,
        amount: order.total * 100,
        currency: 'INR',
        key_id: 'rzp_test_mock_key_3BL',
      }, { status: 201 })
    } else {
      return NextResponse.json({
        sessionId: paymentSession.id,
        provider: paymentSession.provider,
        status: paymentSession.status,
        session_id: providerSessionId,
        payment_url: `https://checkout.stripe.com/mock/${providerSessionId}`,
      }, { status: 201 })
    }
  } catch (error) {
    console.error('Error creating payment session:', error)
    return NextResponse.json(
      { error: 'Failed to create payment session' },
      { status: 500 }
    )
  }
}
