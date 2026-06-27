import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-helper'

// POST /api/orders/[id]/refund - Process refund (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { error } = await requireAdmin(request)
    if (error) return error

    const body = await request.json()
    const { amount, reason } = body

    const order = await db.order.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Validate refund amount
    const refundAmount = amount ? parseFloat(amount) : order.total
    if (isNaN(refundAmount) || refundAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid refund amount' },
        { status: 400 }
      )
    }

    if (refundAmount > order.total) {
      return NextResponse.json(
        { error: `Refund amount cannot exceed order total of ₹${order.total}` },
        { status: 400 }
      )
    }

    // Check if already refunded
    if (order.refundStatus === 'processed') {
      return NextResponse.json(
        { error: 'Order has already been refunded' },
        { status: 400 }
      )
    }

    // Process the refund
    const updatedOrder = await db.order.update({
      where: { id },
      data: {
        refundStatus: 'processed',
        refundAmount,
        refundedAt: new Date(),
        paymentStatus: 'refunded',
        // If full refund, also cancel the order
        ...(refundAmount >= order.total ? { status: 'cancelled' } : {}),
      },
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
    })

    return NextResponse.json({
      order: updatedOrder,
      refund: {
        amount: refundAmount,
        reason: reason || undefined,
        processedAt: updatedOrder.refundedAt,
      },
    })
  } catch (err) {
    console.error('Error processing refund:', err)
    return NextResponse.json(
      { error: 'Failed to process refund' },
      { status: 500 }
    )
  }
}
