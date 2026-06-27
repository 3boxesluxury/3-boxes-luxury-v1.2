import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth-api'

// GET /api/admin/dashboard — admin dashboard stats
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
    }

    // Try to fetch real data from DB
    try {
      // Run basic counts in parallel
      const [totalOrders, totalRevenue, totalUsers, totalProducts, recentOrders, ordersByStatusRows] =
        await Promise.all([
          db.order.count(),
          db.order.aggregate({ _sum: { total: true } }),
          db.user.count(),
          db.product.count(),
          db.order.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              orderNumber: true,
              email: true,
              total: true,
              status: true,
              paymentStatus: true,
              createdAt: true,
            },
          }),
          db.order.groupBy({
            by: ['status'],
            _count: { status: true },
          }),
        ])

      // Revenue by month — last 6 months
      const now = new Date()
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

      const revenueRows = await db.order.findMany({
        where: {
          createdAt: { gte: sixMonthsAgo },
          status: { not: 'cancelled' },
        },
        select: { total: true, createdAt: true },
      })

      const revenueByMonth: Record<string, number> = {}
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        revenueByMonth[key] = 0
      }

      for (const row of revenueRows) {
        const key = `${row.createdAt.getFullYear()}-${String(row.createdAt.getMonth() + 1).padStart(2, '0')}`
        if (key in revenueByMonth) {
          revenueByMonth[key] += row.total
        }
      }

      // Format ordersByStatus
      const ordersByStatus: Record<string, number> = {}
      for (const row of ordersByStatusRows) {
        ordersByStatus[row.status] = row._count.status
      }

      return NextResponse.json({
        totalOrders,
        totalRevenue: totalRevenue._sum.total || 0,
        totalUsers,
        totalProducts,
        recentOrders,
        ordersByStatus,
        revenueByMonth,
      })
    } catch {
      // DB unavailable (Vercel serverless) — return demo dashboard data
      return NextResponse.json(getDemoDashboard())
    }
  } catch (error) {
    console.error('Admin dashboard GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}

function getDemoDashboard() {
  const now = new Date()
  const revenueByMonth: Record<string, number> = {}
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    revenueByMonth[key] = Math.floor(Math.random() * 50000) + 10000
  }

  return {
    totalOrders: 142,
    totalRevenue: 2450000,
    totalUsers: 89,
    totalProducts: 57,
    recentOrders: [
      { id: '1', orderNumber: 'ORD-001', email: 'customer@example.com', total: 45000, status: 'processing', paymentStatus: 'paid', createdAt: new Date().toISOString() },
      { id: '2', orderNumber: 'ORD-002', email: 'vip@example.com', total: 78000, status: 'delivered', paymentStatus: 'paid', createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: '3', orderNumber: 'ORD-003', email: 'new@example.com', total: 12000, status: 'pending', paymentStatus: 'pending', createdAt: new Date(Date.now() - 172800000).toISOString() },
    ],
    ordersByStatus: {
      delivered: 98,
      processing: 25,
      shipped: 12,
      pending: 7,
    },
    revenueByMonth,
    _demo: true,
  }
}
