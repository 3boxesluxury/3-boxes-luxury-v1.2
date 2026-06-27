import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionAsync } from '@/lib/sessions';

async function verifyAdmin(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const user = await getSessionAsync(auth?.replace('Bearer ', '') ?? '');
  if (!user) return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  if (user.role !== 'admin') return { error: Response.json({ error: 'Forbidden' }, { status: 403 }), user: null };
  return { error: null, user };
}

// GET /api/affiliate/stats — Get affiliate click stats
export async function GET(request: NextRequest) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d, all

    // Calculate date range
    let startDate: Date | null = null;
    const now = new Date();
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = null;
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const whereClause = startDate ? { clickedAt: { gte: startDate } } : {};

    // Total clicks
    const totalClicks = await db.affiliateClick.count({ where: whereClause });

    // Clicks by platform
    const clicksByPlatformRaw = await db.affiliateClick.groupBy({
      by: ['platform'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const clicksByPlatform = clicksByPlatformRaw.map((item) => ({
      platform: item.platform,
      clicks: item._count.id,
    }));

    // Clicks by product (top 20)
    const clicksByProductRaw = await db.affiliateClick.groupBy({
      by: ['productId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    // Enrich with product info
    const clicksByProduct = await Promise.all(
      clicksByProductRaw.map(async (item) => {
        const product = await db.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, slug: true, platform: true, price: true, images: true },
        });
        return {
          productId: item.productId,
          product: product ? {
            ...product,
            images: JSON.parse(product.images || '[]'),
          } : null,
          clicks: item._count.id,
        };
      })
    );

    // Clicks by date (last N days)
    const allClicks = await db.affiliateClick.findMany({
      where: whereClause,
      select: { clickedAt: true },
      orderBy: { clickedAt: 'asc' },
    });

    // Group clicks by date
    const clicksByDateMap = new Map<string, number>();
    for (const click of allClicks) {
      const dateKey = click.clickedAt.toISOString().split('T')[0]; // YYYY-MM-DD
      clicksByDateMap.set(dateKey, (clicksByDateMap.get(dateKey) || 0) + 1);
    }

    // Fill in missing dates for the period
    const clicksByDate: { date: string; clicks: number }[] = [];
    if (startDate) {
      const daysDiff = Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      for (let i = daysDiff; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateKey = date.toISOString().split('T')[0];
        clicksByDate.push({
          date: dateKey,
          clicks: clicksByDateMap.get(dateKey) || 0,
        });
      }
    } else {
      // All time - just return what we have
      for (const [date, clicks] of clicksByDateMap) {
        clicksByDate.push({ date, clicks });
      }
    }

    // Clicks by referral code
    const clicksByReferralRaw = await db.affiliateClick.groupBy({
      by: ['referralCode'],
      where: { ...whereClause, referralCode: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const clicksByReferral = clicksByReferralRaw.map((item) => ({
      referralCode: item.referralCode,
      clicks: item._count.id,
    }));

    // Estimated commission (sum of product commissions * clicks — rough estimate)
    let estimatedCommission = 0;
    for (const item of clicksByProductRaw) {
      const product = await db.product.findUnique({
        where: { id: item.productId },
        select: { price: true, commission: true },
      });
      if (product?.commission && product.price) {
        estimatedCommission += (product.price * product.commission / 100) * item._count.id;
      }
    }

    return Response.json({
      period,
      totalClicks,
      clicksByPlatform,
      clicksByProduct,
      clicksByDate,
      clicksByReferral,
      estimatedCommission: Math.round(estimatedCommission * 100) / 100,
    });
  } catch (err) {
    console.error('Error fetching affiliate stats:', err);
    return Response.json({ error: 'Failed to fetch affiliate stats' }, { status: 500 });
  }
}
