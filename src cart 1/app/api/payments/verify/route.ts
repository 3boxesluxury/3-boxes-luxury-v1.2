import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth-helper'

// POST /api/payments/verify - Verify payment and mark order as paid
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, provider, paymentId, signature } = body

    if (!orderId || !provider) {
      return NextResponse.json(
        { error: 'orderId and provider are required' },
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

    // Check if already paid
    if (order.paymentStatus === 'paid') {
      return NextResponse.json(
        { error: 'Order has already been paid' },
        { status: 400 }
      )
    }

    // Find the relevant payment session
    const paymentSession = order.paymentSessions.find(
      (s) => s.provider === provider && (s.status === 'created' || s.status === 'attempted')
    )

    if (!paymentSession) {
      return NextResponse.json(
        { error: `No active payment session found for provider: ${provider}` },
        { status: 404 }
      )
    }

    // MVP: Just mark as paid (in production, verify with provider API)
    // For Razorpay, we'd verify: razorpay_order_id + razorpay_payment_id + signature
    // For Stripe, we'd verify the session via webhook

    // Generate a mock payment ID if not provided
    const verifiedPaymentId = paymentId || `pay_${provider}_${Date.now()}`

    // Update PaymentSession status to "paid"
    await db.paymentSession.update({
      where: { id: paymentSession.id },
      data: {
        status: 'paid',
        paymentId: verifiedPaymentId,
        metadata: JSON.stringify({
          ...(paymentSession.metadata ? JSON.parse(paymentSession.metadata) : {}),
          verifiedAt: new Date().toISOString(),
          signature: signature || 'mock_verified',
        }),
      },
    })

    // Update Order paymentStatus to "paid"
    await db.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'paid',
        status: 'processing',
      },
    })

    // Create AuditLog entry for payment
    const user = await getSessionFromRequest(request)
    await db.auditLog.create({
      data: {
        userId: user?.id || null,
        action: 'payment_verified',
        entity: 'order',
        entityId: order.id,
        details: JSON.stringify({
          orderId: order.id,
          orderNumber: order.orderNumber,
          provider,
          paymentId: verifiedPaymentId,
          amount: order.total,
          currency: 'INR',
        }),
      },
    })

    // Create OrderTrackingEvent with status "confirmed"
    await db.orderTrackingEvent.create({
      data: {
        orderId: order.id,
        status: 'confirmed',
        description: 'Payment confirmed. Your order is being processed.',
        location: 'Payment Gateway',
      },
    })

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentStatus: 'paid',
      orderStatus: 'processing',
      paymentId: verifiedPaymentId,
      provider,
    })
  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    )
  }
}
