import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth-helper'

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      )
    }

    // Allow access only if user is admin or requesting their own orders
    if (user.role !== 'admin' && user.email !== email.toLowerCase().trim()) {
      return NextResponse.json(
        { error: 'Forbidden: You can only view your own orders' },
        { status: 403 }
      )
    }

    const orders = await db.order.findMany({
      where: { email },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Transform orders for frontend
    const transformed = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      email: order.email,
      status: order.status,
      subtotal: order.subtotal,
      shipping: order.shipping,
      tax: order.tax,
      discount: order.discount,
      total: order.total,
      deliveryType: order.deliveryType,
      giftWrapping: order.giftWrapping,
      giftWrapStyle: order.giftWrapStyle,
      couponCode: order.couponCode,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      estimatedDelivery: order.estimatedDelivery,
      createdAt: order.createdAt,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      items: order.items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
      })),
    }))

    return NextResponse.json({ orders: transformed })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
