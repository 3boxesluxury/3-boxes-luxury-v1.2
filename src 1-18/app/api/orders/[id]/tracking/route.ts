import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth-helper'

// GET /api/orders/[id]/tracking - Get all tracking events for an order
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

    // Verify order exists
    const order = await db.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        email: true,
        status: true,
        deliveryType: true,
        estimatedDelivery: true,
        trackingNumber: true,
        trackingUrl: true,
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
        { error: 'Forbidden: You can only view tracking for your own orders' },
        { status: 403 }
      )
    }

    // Get tracking events sorted by timestamp
    const trackingEvents = await db.orderTrackingEvent.findMany({
      where: { orderId: id },
      orderBy: { timestamp: 'asc' },
    })

    // Determine current status description
    const statusDescriptions: Record<string, string> = {
      pending: 'Order placed, awaiting payment',
      confirmed: 'Payment confirmed, order being processed',
      processing: 'Order is being prepared',
      shipped: 'Order has been shipped',
      out_for_delivery: 'Order is out for delivery',
      delivered: 'Order has been delivered',
      cancelled: 'Order has been cancelled',
    }

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        statusDescription: statusDescriptions[order.status] || order.status,
        deliveryType: order.deliveryType,
        estimatedDelivery: order.estimatedDelivery,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
      },
      events: trackingEvents.map((event) => ({
        id: event.id,
        status: event.status,
        description: event.description,
        location: event.location,
        timestamp: event.timestamp,
      })),
    })
  } catch (error) {
    console.error('Error fetching tracking events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tracking events' },
      { status: 500 }
    )
  }
}
