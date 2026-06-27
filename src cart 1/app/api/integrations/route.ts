import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionAsync } from '@/lib/sessions';

async function verifyAdmin(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const user = await getSessionAsync(auth?.replace('Bearer ', '') ?? '');
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  if (user.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null };
  return { error: null, user };
}

// GET /api/integrations - List all platform integrations with product counts and last sync info
export async function GET(request: NextRequest) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  try {
    const integrations = await db.platformIntegration.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        syncLogs: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    // Get actual product counts per platform
    const productCounts = await db.product.groupBy({
      by: ['platform'],
      where: { isExternal: true, platform: { not: null } },
      _count: { id: true },
    });

    const countMap = new Map(
      productCounts.map((p) => [p.platform!, p._count.id])
    );

    const result = integrations.map((integration) => {
      const actualCount = countMap.get(integration.slug) || 0;
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
        lastSync: integration.syncLogs[0]
          ? {
              id: integration.syncLogs[0].id,
              type: integration.syncLogs[0].type,
              status: integration.syncLogs[0].status,
              productsFound: integration.syncLogs[0].productsFound,
              productsAdded: integration.syncLogs[0].productsAdded,
              productsUpdated: integration.syncLogs[0].productsUpdated,
              error: integration.syncLogs[0].error,
              startedAt: integration.syncLogs[0].startedAt,
              completedAt: integration.syncLogs[0].completedAt,
            }
          : null,
      };
    });

    return NextResponse.json({ integrations: result });
  } catch (err) {
    console.error('Error fetching integrations:', err);
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}

// POST /api/integrations - Create a new platform integration
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
      categories,
      affiliateTag,
      commission,
      maxProducts,
      autoSync,
      syncInterval,
    } = body;

    if (!name || !slug || !baseUrl) {
      return NextResponse.json(
        { error: 'Name, slug, and baseUrl are required' },
        { status: 400 }
      );
    }

    // Check uniqueness
    const existingByName = await db.platformIntegration.findUnique({
      where: { name },
    });
    if (existingByName) {
      return NextResponse.json(
        { error: `Integration with name "${name}" already exists` },
        { status: 409 }
      );
    }

    const existingBySlug = await db.platformIntegration.findUnique({
      where: { slug },
    });
    if (existingBySlug) {
      return NextResponse.json(
        { error: `Integration with slug "${slug}" already exists` },
        { status: 409 }
      );
    }

    const integration = await db.platformIntegration.create({
      data: {
        name,
        slug,
        baseUrl,
        logo: logo || null,
        categories: JSON.stringify(categories || []),
        affiliateTag: affiliateTag || null,
        commission: commission ? parseFloat(commission) : 0,
        maxProducts: maxProducts ? parseInt(maxProducts) : 500,
        autoSync: autoSync !== undefined ? autoSync : true,
        syncInterval: syncInterval ? parseInt(syncInterval) : 3600,
        isActive: true,
        syncStatus: 'idle',
        productCount: 0,
      },
    });

    return NextResponse.json(
      {
        ...integration,
        categories: JSON.parse(integration.categories || '[]'),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Error creating integration:', err);
    return NextResponse.json(
      { error: 'Failed to create integration' },
      { status: 500 }
    );
  }
}
