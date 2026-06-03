import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, getSessionFromRequest } from '@/lib/auth-helper'

// GET /api/orders/[id] - Get single order detail with items, tracking, payments, invoice
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Authenticate user
    const user = await getSessionFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
        reviews: true,
        trackingEvents: {
          orderBy: { timestamp: 'asc' },
        },
        paymentSessions: {
          orderBy: { createdAt: 'desc' },
        },
        invoice: true,
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Allow access if admin or order owner
    if (user.role !== 'admin' && user.email !== order.email) {
      return NextResponse.json(
        { error: 'Forbidden: You can only view your own orders' },
        { status: 403 }
      )
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

// PATCH /api/orders/[id] - Update order (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const body = await request.json()
    const { status, trackingNumber, trackingUrl, estimatedDelivery } = body

    const order = await db.order.findUnique({ where: { id } })
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (status !== undefined) {
      const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be one of: pending, processing, shipped, delivered, cancelled' },
          { status: 400 }
        )
      }
      updateData.status = status
    }
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber
    if (trackingUrl !== undefined) updateData.trackingUrl = trackingUrl
    if (estimatedDelivery !== undefined) updateData.estimatedDelivery = new Date(estimatedDelivery)

    const updatedOrder = await db.order.update({
      where: { id },
      data: updateData,
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

    // Create a new OrderTrackingEvent when status is updated
    if (status !== undefined && status !== order.status) {
      const statusDescriptions: Record<string, string> = {
        pending: 'Order status updated to pending',
        processing: 'Order is now being processed',
        shipped: 'Order has been shipped',
        delivered: 'Order has been delivered',
        cancelled: 'Order has been cancelled',
      }

      const locationMap: Record<string, string> = {
        pending: 'System',
        processing: 'Warehouse',
        shipped: 'Shipping Partner',
        delivered: 'Destination',
        cancelled: 'System',
      }

      await db.orderTrackingEvent.create({
        data: {
          orderId: id,
          status,
          description: statusDescriptions[status] || `Order status changed to ${status}`,
          location: locationMap[status] || 'System',
        },
      })

      // If status is shipped and tracking number provided, add a shipped event
      if (status === 'shipped' && trackingNumber) {
        await db.orderTrackingEvent.create({
          data: {
            orderId: id,
            status: 'shipped',
            description: `Package shipped with tracking number: ${trackingNumber}`,
            location: 'Fulfillment Center',
          },
        })
      }

      // If delivered, update invoice status
      if (status === 'delivered') {
        const invoice = await db.orderInvoice.findUnique({
          where: { orderId: id },
        })
        if (invoice && invoice.status !== 'paid') {
          await db.orderInvoice.update({
            where: { id: invoice.id },
            data: { status: 'paid' },
          })
        }
      }
    }

    return NextResponse.json({ order: updatedOrder })
  } catch (err) {
    console.error('Error updating order:', err)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}

// DELETE /api/orders/[id] - Cancel order (admin or order owner with email verification)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { reason, email } = body

    const order = await db.order.findUnique({ where: { id } })
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Check authorization: either admin or the order owner (verified by email)
    let isAuthorized = false

    // Try admin auth first
    try {
      const { error } = await requireAdmin(request)
      if (!error) isAuthorized = true
    } catch {
      // Not admin
    }

    // If not admin, check if email matches the order
    if (!isAuthorized) {
      if (email && order.email === email) {
        isAuthorized = true
      } else {
        return NextResponse.json(
          { error: 'Unauthorized: You can only cancel your own orders' },
          { status: 403 }
        )
      }
    }

    if (order.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Order is already cancelled' },
        { status: 400 }
      )
    }

    if (order.status === 'delivered') {
      return NextResponse.json(
        { error: 'Cannot cancel a delivered order. Use refund instead.' },
        { status: 400 }
      )
    }

    const updatedOrder = await db.order.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: reason || undefined,
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

    // Create tracking event for cancellation
    await db.orderTrackingEvent.create({
      data: {
        orderId: id,
        status: 'cancelled',
        description: reason
          ? `Order cancelled. Reason: ${reason}`
          : 'Order has been cancelled',
        location: 'System',
      },
    })

    return NextResponse.json({ order: updatedOrder })
  } catch (err) {
    console.error('Error cancelling order:', err)
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    )
  }
}
