import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

async function verifyAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive || session.user.role !== 'admin') return null;
  return session;
}

// GET: Reports with type parameter
export async function GET(req: NextRequest) {
  try {
    const session = await verifyAdmin(req);
    if (!session) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'revenue';

    switch (type) {
      case 'revenue':
        return await revenueReport();
      case 'orders':
        return await ordersReport();
      case 'products':
        return await productsReport();
      case 'users':
        return await usersReport();
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin reports error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

async function revenueReport() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [dailyRevenue, monthlyRevenue, totalRevenue, avgOrderValue] = await Promise.all([
    // Daily revenue for last 30 days
    db.order.findMany({
      where: { createdAt: { gte: thirtyDaysAgo }, status: { not: 'cancelled' } },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    // Monthly revenue for last 6 months
    db.order.findMany({
      where: { createdAt: { gte: sixMonthsAgo }, status: { not: 'cancelled' } },
      select: { total: true, createdAt: true },
    }),
    // Total revenue
    db.order.aggregate({
      _sum: { total: true, shipping: true, tax: true, discount: true },
      where: { status: { not: 'cancelled' } },
    }),
    // Average order value
    db.order.aggregate({
      _avg: { total: true },
      where: { status: { not: 'cancelled' } },
    }),
  ]);

  // Group daily revenue
  const dailyMap = new Map<string, { revenue: number; orders: number }>();
  for (const o of dailyRevenue) {
    const day = new Date(o.createdAt).toISOString().split('T')[0];
    const existing = dailyMap.get(day) || { revenue: 0, orders: 0 };
    existing.revenue += o.total;
    existing.orders += 1;
    dailyMap.set(day, existing);
  }

  // Group monthly revenue
  const monthlyMap = new Map<string, { revenue: number; orders: number }>();
  for (const o of monthlyRevenue) {
    const d = new Date(o.createdAt);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthlyMap.get(monthKey) || { revenue: 0, orders: 0 };
    existing.revenue += o.total;
    existing.orders += 1;
    monthlyMap.set(monthKey, existing);
  }

  return NextResponse.json({
    type: 'revenue',
    totalRevenue: totalRevenue._sum.total || 0,
    totalShipping: totalRevenue._sum.shipping || 0,
    totalTax: totalRevenue._sum.tax || 0,
    totalDiscount: totalRevenue._sum.discount || 0,
    avgOrderValue: avgOrderValue._avg.total || 0,
    daily: Array.from(dailyMap.entries()).map(([date, data]) => ({ date, ...data })),
    monthly: Array.from(monthlyMap.entries()).map(([month, data]) => ({ month, ...data })),
  });
}

async function ordersReport() {
  const [ordersByStatus, ordersByDelivery, recentOrders, orderStats] = await Promise.all([
    db.order.groupBy({
      by: ['status'],
      _count: { status: true },
      _sum: { total: true },
    }),
    db.order.groupBy({
      by: ['deliveryType'],
      _count: { deliveryType: true },
    }),
    db.order.count(),
    db.order.aggregate({
      _avg: { total: true },
      _sum: { total: true },
    }),
  ]);

  return NextResponse.json({
    type: 'orders',
    totalOrders: recentOrders,
    avgOrderValue: orderStats._avg.total || 0,
    totalRevenue: orderStats._sum.total || 0,
    byStatus: ordersByStatus.map(o => ({
      status: o.status,
      count: o._count.status,
      revenue: o._sum.total || 0,
    })),
    byDeliveryType: ordersByDelivery.map(o => ({
      deliveryType: o.deliveryType,
      count: o._count.deliveryType,
    })),
  });
}

async function productsReport() {
  const [topSelling, lowStock, byCategory, totalProducts, featuredCount, outOfStock] = await Promise.all([
    db.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, price: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    }),
    db.product.findMany({
      where: { stock: { lt: 5 } },
      take: 20,
      orderBy: { stock: 'asc' },
      select: { id: true, name: true, stock: true, price: true, category: { select: { name: true } } },
    }),
    db.product.groupBy({
      by: ['categoryId'],
      _count: { categoryId: true },
      _sum: { price: true },
    }),
    db.product.count(),
    db.product.count({ where: { featured: true } }),
    db.product.count({ where: { stock: 0 } }),
  ]);

  // Get product details for top selling
  const topProductIds = topSelling.map(t => t.productId);
  const topProducts = await db.product.findMany({
    where: { id: { in: topProductIds } },
    select: { id: true, name: true, price: true, category: { select: { name: true } } },
  });
  const topProductMap = Object.fromEntries(topProducts.map(p => [p.id, p]));

  // Get category names
  const categoryIds = byCategory.map(c => c.categoryId);
  const categories = await db.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });
  const categoryMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

  return NextResponse.json({
    type: 'products',
    totalProducts,
    featuredCount,
    outOfStock,
    topSelling: topSelling.map(t => ({
      id: t.productId,
      name: topProductMap[t.productId]?.name || 'Unknown',
      price: topProductMap[t.productId]?.price || 0,
      category: topProductMap[t.productId]?.category?.name || 'Unknown',
      totalSold: t._sum.quantity || 0,
      totalRevenue: (t._sum.quantity || 0) * (t._sum.price || 0),
    })),
    lowStock: lowStock.map(p => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      price: p.price,
      category: p.category.name,
    })),
    byCategory: byCategory.map(c => ({
      category: categoryMap[c.categoryId] || 'Unknown',
      count: c._count.categoryId,
      avgPrice: c._sum.price ? c._sum.price / c._count.categoryId : 0,
    })),
  });
}

async function usersReport() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [byRole, recentUsers, totalUsers, activeUsers, newUsers30d] = await Promise.all([
    db.user.groupBy({
      by: ['role'],
      _count: { role: true },
    }),
    db.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    db.user.count(),
    db.user.count({ where: { isActive: true } }),
    db.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
  ]);

  // Group new users by day
  const dailyMap = new Map<string, number>();
  for (const u of recentUsers) {
    const day = new Date(u.createdAt).toISOString().split('T')[0];
    dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
  }

  return NextResponse.json({
    type: 'users',
    totalUsers,
    activeUsers,
    inactiveUsers: totalUsers - activeUsers,
    newUsers30d,
    byRole: byRole.map(r => ({
      role: r.role,
      count: r._count.role,
    })),
    daily: Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count })),
  });
}
