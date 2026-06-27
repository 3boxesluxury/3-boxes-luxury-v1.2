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

// GET /api/partners — List all platform integrations with optional search and pagination
export async function GET(request: NextRequest) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || undefined;
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { baseUrl: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (type) {
      where.categories = { contains: type, mode: 'insensitive' };
    }
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    } else if (status === 'pending') {
      where.syncStatus = 'idle';
    } else if (status === 'suspended') {
      where.syncStatus = 'error';
    }

    const [integrations, total] = await Promise.all([
      db.platformIntegration.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          syncLogs: {
            orderBy: { startedAt: 'desc' },
            take: 5,
          },
        },
      }),
      db.platformIntegration.count({ where }),
    ]);

    const productCounts = await db.product.groupBy({
      by: ['platform'],
      where: { isExternal: true, platform: { not: null } },
      _count: { id: true },
    });

    const countMap = new Map(productCounts.map((p) => [p.platform!, p._count.id]));
    const integrationIds = integrations.map((i) => i.id);
    const allCategoryMaps = await db.partnerCategoryMap.findMany({
      where: { integrationId: { in: integrationIds } },
    });

    const categoryMapsByIntegration = new Map<string, typeof allCategoryMaps>();
    for (const cm of allCategoryMaps) {
      const list = categoryMapsByIntegration.get(cm.integrationId) || [];
      list.push(cm);
      categoryMapsByIntegration.set(cm.integrationId, list);
    }

    const result = integrations.map((integration) => {
      const actualCount = countMap.get(integration.slug) || 0;
      const maps = categoryMapsByIntegration.get(integration.id) || [];
      return {
        id: integration.id,
        name: integration.name,
        slug: integration.slug,
        baseUrl: integration.baseUrl,
        logo: integration.logo,
        isActive: integration.isActive,
        autoSync: integration.autoSync,
        syncInterval: integration.syncInterval,
        lastSyncedAt: integration.lastSyncedAt,
        syncStatus: integration.syncStatus,
        lastSyncError: integration.lastSyncError,
        categories: JSON.parse(integration.categories || '[]') as string[],
        affiliateTag: integration.affiliateTag,
        commission: integration.commission,
        maxProducts: integration.maxProducts,
        productCount: actualCount,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
        syncLogs: integration.syncLogs.map((log) => ({
          id: log.id,
          type: log.type,
          status: log.status,
          productsFound: log.productsFound,
          productsAdded: log.productsAdded,
          productsUpdated: log.productsUpdated,
          error: log.error,
          startedAt: log.startedAt,
          completedAt: log.completedAt,
        })),
        categoryMaps: maps.map((cm) => ({
          id: cm.id,
          partnerCatName: cm.partnerCatName,
          partnerCatSlug: cm.partnerCatSlug,
          localCatId: cm.localCatId,
          createdAt: cm.createdAt,
        })),
      };
    });

    return Response.json({
      partners: result,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: {
        total,
        active: integrations.filter((i) => i.isActive).length,
        pending: integrations.filter((i) => i.syncStatus === 'idle').length,
        revenue: 0,
      },
    });
  } catch (err) {
    console.error('Error fetching partners:', err);
    return Response.json({ error: 'Failed to fetch partners' }, { status: 500 });
  }
}

// POST /api/partners — Create a new platform integration
export async function POST(request: NextRequest) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const {
      name,
      slug,
      baseUrl,
      logo,
      isActive,
      autoSync,
      syncInterval,
      categories,
      affiliateTag,
      commission,
      maxProducts,
    } = body;

    if (!name || !slug || !baseUrl) {
      return Response.json(
        { error: 'Name, slug, and baseUrl are required' },
        { status: 400 }
      );
    }

    // Check uniqueness
    const existingByName = await db.platformIntegration.findUnique({
      where: { name },
    });
    if (existingByName) {
      return Response.json(
        { error: `Partner with name "${name}" already exists` },
        { status: 409 }
      );
    }

    const existingBySlug = await db.platformIntegration.findUnique({
      where: { slug },
    });
    if (existingBySlug) {
      return Response.json(
        { error: `Partner with slug "${slug}" already exists` },
        { status: 409 }
      );
    }

    const integration = await db.platformIntegration.create({
      data: {
        name,
        slug,
        baseUrl,
        logo: logo || null,
        isActive: isActive !== undefined ? isActive : true,
        autoSync: autoSync !== undefined ? autoSync : true,
        syncInterval: syncInterval ? parseInt(String(syncInterval)) : 3600,
        categories: JSON.stringify(categories || []),
        affiliateTag: affiliateTag || null,
        commission: commission ? parseFloat(String(commission)) : 0,
        maxProducts: maxProducts ? parseInt(String(maxProducts)) : 500,
        syncStatus: 'idle',
        productCount: 0,
      },
    });

    return Response.json(
      {
        ...integration,
        categories: JSON.parse(integration.categories || '[]'),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Error creating partner:', err);
    return Response.json({ error: 'Failed to create partner' }, { status: 500 });
  }
}
