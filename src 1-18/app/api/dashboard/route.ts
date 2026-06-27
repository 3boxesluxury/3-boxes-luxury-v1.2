import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date() || !session.user.isActive) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const role = session.user.role;

    // Common stats
    const [
      totalProducts,
      totalCategories,
      totalOrders,
      totalUsers,
      recentOrders,
      totalRevenue,
      ordersByStatus,
      productsByCategory,
      lowStockProducts,
      recentUsers,
    ] = await Promise.all([
      db.product.count(),
      db.category.count(),
      db.order.count(),
      db.user.count(),
      db.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { items: { take: 1 } },
      }),
      db.order.aggregate({ _sum: { total: true } }),
      db.order.groupBy({ by: ['status'], _count: { status: true } }),
      db.product.groupBy({ by: ['categoryId'], _count: { categoryId: true } }),
      db.product.findMany({
        where: { stock: { lte: 5 } },
        take: 10,
        orderBy: { stock: 'asc' },
      }),
      db.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      }),
    ]);

    // Get category names for productsByCategory
    const categoryIds = productsByCategory.map(p => p.categoryId);
    const categories = await db.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const categoryMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

    const stats = {
      totalProducts,
      totalCategories,
      totalOrders,
      totalUsers,
      totalRevenue: totalRevenue._sum.total || 0,
      ordersByStatus: ordersByStatus.map(o => ({ status: o.status, count: o._count.status })),
      productsByCategory: productsByCategory.map(p => ({
        category: categoryMap[p.categoryId] || 'Unknown',
        count: p._count.categoryId,
      })),
      lowStockProducts: lowStockProducts.map(p => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        price: p.price,
      })),
      recentOrders: recentOrders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        email: o.email,
        total: o.total,
        status: o.status,
        paymentStatus: o.paymentStatus,
        createdAt: o.createdAt,
        itemCount: o.items.length,
      })),
      recentUsers,
    };

    // Role-specific data
    if (role === 'admin') {
      const usersByRole = await db.user.groupBy({ by: ['role'], _count: { role: true } });
      return NextResponse.json({
        ...stats,
        role: 'admin',
        usersByRole: usersByRole.map(u => ({ role: u.role, count: u._count.role })),
      });
    }

    if (role === 'agent') {
      const pendingOrders = await db.order.count({ where: { status: 'pending' } });
      const processingOrders = await db.order.count({ where: { status: 'processing' } });
      return NextResponse.json({
        ...stats,
        role: 'agent',
        pendingOrders,
        processingOrders,
      });
    }

    if (role === 'team') {
      const featuredProducts = await db.product.count({ where: { featured: true } });
      const outOfStock = await db.product.count({ where: { stock: 0 } });
      return NextResponse.json({
        ...stats,
        role: 'team',
        featuredProducts,
        outOfStock,
      });
    }

    // Default user stats
    const userOrders = await db.order.findMany({
      where: { email: session.user.email },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({
      ...stats,
      role: 'user',
      userOrders,
      userTotalSpent: userOrders.reduce((sum, o) => sum + o.total, 0),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}
