import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth-helper';

export async function GET(req: NextRequest) {
  try {
    // Authenticate using JWT-aware auth helper
    const authResult = await authenticate(req);
    if (authResult.error) {
      return authResult.error;
    }

    const authUser = authResult.user;
    if (authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Try to fetch real stats from DB
    try {
      const [
        totalProducts,
        totalCategories,
        totalOrders,
        totalUsers,
        totalRevenue,
        ordersByStatus,
        lowStockProducts,
        recentOrders,
        recentUsers,
        topSellingProducts,
      ] = await Promise.all([
        db.product.count(),
        db.category.count(),
        db.order.count(),
        db.user.count(),
        db.order.aggregate({ _sum: { total: true } }),
        db.order.groupBy({ by: ['status'], _count: { status: true } }),
        db.product.findMany({
          where: { stock: { lt: 5 } },
          take: 10,
          orderBy: { stock: 'asc' },
          select: { id: true, name: true, stock: true, price: true, images: true },
        }),
        db.order.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { items: true },
        }),
        db.user.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
        }),
        db.orderItem.groupBy({
          by: ['productId'],
          _sum: { quantity: true },
          _avg: { price: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 10,
        }),
      ]);

      // Get product details for top selling
      const topProductIds = topSellingProducts.map(t => t.productId);
      const topProducts = await db.product.findMany({
        where: { id: { in: topProductIds } },
        select: { id: true, name: true, price: true, images: true, category: { select: { name: true } } },
      });
      const topProductMap = Object.fromEntries(topProducts.map(p => [p.id, p]));

      // Revenue by month (last 6 months)
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const monthlyOrders = await db.order.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { total: true, createdAt: true },
      });

      const revenueByMonth: { month: string; revenue: number; orders: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        const monthOrders = monthlyOrders.filter(o => {
          const od = new Date(o.createdAt);
          return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
        });
        revenueByMonth.push({
          month: monthStr,
          revenue: monthOrders.reduce((sum, o) => sum + o.total, 0),
          orders: monthOrders.length,
        });
      }

      return NextResponse.json({
        totalRevenue: totalRevenue._sum.total || 0,
        totalOrders,
        totalUsers,
        totalProducts,
        totalCategories,
        revenueByMonth,
        ordersByStatus: ordersByStatus.map(o => ({ status: o.status, count: o._count.status })),
        topSellingProducts: topSellingProducts.map(t => ({
          id: t.productId,
          name: topProductMap[t.productId]?.name || 'Unknown',
          price: topProductMap[t.productId]?.price || 0,
          image: topProductMap[t.productId]?.images ? JSON.parse(topProductMap[t.productId].images)[0] : null,
          category: topProductMap[t.productId]?.category?.name || 'Unknown',
          totalSold: t._sum.quantity || 0,
        })),
        lowStockProducts: lowStockProducts.map(p => ({
          id: p.id,
          name: p.name,
          stock: p.stock,
          price: p.price,
          image: p.images ? JSON.parse(p.images)[0] : null,
        })),
        recentOrders: recentOrders.map(o => ({
          id: o.id,
          orderNumber: o.orderNumber,
          email: o.email,
          total: o.total,
          status: o.status,
          paymentStatus: o.paymentStatus,
          deliveryType: o.deliveryType,
          createdAt: o.createdAt,
          itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
        })),
        recentUsers: recentUsers.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          createdAt: u.createdAt,
        })),
      });
    } catch {
      // DB unavailable (Vercel serverless) — return demo stats
      return NextResponse.json(getDemoStats());
    }
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to load admin stats' }, { status: 500 });
  }
}

function getDemoStats() {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
      revenue: Math.floor(Math.random() * 50000) + 10000,
      orders: Math.floor(Math.random() * 30) + 5,
    });
  }

  return {
    totalRevenue: 245000,
    totalOrders: 142,
    totalUsers: 89,
    totalProducts: 57,
    totalCategories: 8,
    revenueByMonth: months,
    ordersByStatus: [
      { status: 'delivered', count: 98 },
      { status: 'processing', count: 25 },
      { status: 'shipped', count: 12 },
      { status: 'pending', count: 7 },
    ],
    topSellingProducts: [
      { id: '1', name: 'Diamond Necklace', price: 45000, image: '/images/products/jewelry-1.jpg', category: 'Necklaces', totalSold: 24 },
      { id: '2', name: 'Gold Watch', price: 32000, image: '/images/products/watch-1.jpg', category: 'Watches', totalSold: 18 },
      { id: '3', name: 'Pearl Earrings', price: 12000, image: '/images/products/jewelry-7.jpg', category: 'Earrings', totalSold: 15 },
    ],
    lowStockProducts: [
      { id: '1', name: 'Ruby Ring', stock: 2, price: 28000, image: '/images/products/jewelry-3.jpg' },
      { id: '2', name: 'Silver Cuff', stock: 3, price: 8500, image: '/images/products/jewelry-10.jpg' },
    ],
    recentOrders: [
      { id: '1', orderNumber: 'ORD-001', email: 'customer@example.com', total: 45000, status: 'processing', paymentStatus: 'paid', deliveryType: 'standard', createdAt: new Date().toISOString(), itemCount: 1 },
      { id: '2', orderNumber: 'ORD-002', email: 'vip@example.com', total: 78000, status: 'delivered', paymentStatus: 'paid', deliveryType: 'express', createdAt: new Date(Date.now() - 86400000).toISOString(), itemCount: 3 },
    ],
    recentUsers: [
      { id: '1', name: 'Priya Sharma', email: 'priya@example.com', role: 'user', isActive: true, createdAt: new Date().toISOString() },
      { id: '2', name: 'Raj Patel', email: 'raj@example.com', role: 'user', isActive: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
    ],
    _demo: true,
  };
}
