import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-helper'

// GET /api/admin/orders - List all orders with pagination, filtering, search
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request)
    if (error) return error

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const where: Record<string, unknown> = {}

    // Filter by status
    if (status) {
      where.status = status
    }

    // Search by email or order number
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { orderNumber: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
      ]
    }

    // Build order by
    const validSortFields = ['createdAt', 'total', 'status', 'email', 'orderNumber']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt'
    const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc'

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  images: true,
                },
              },
            },
          },
        },
        orderBy: { [sortField]: orderDirection },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.order.count({ where }),
    ])

    // Compute summary stats
    const [totalOrders, pendingOrders, processingOrders, shippedOrders, deliveredOrders, cancelledOrders] = await Promise.all([
      db.order.count(),
      db.order.count({ where: { status: 'pending' } }),
      db.order.count({ where: { status: 'processing' } }),
      db.order.count({ where: { status: 'shipped' } }),
      db.order.count({ where: { status: 'delivered' } }),
      db.order.count({ where: { status: 'cancelled' } }),
    ])

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        total: totalOrders,
        pending: pendingOrders,
        processing: processingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
      },
    })
  } catch (err) {
    console.error('Error fetching admin orders:', err)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
