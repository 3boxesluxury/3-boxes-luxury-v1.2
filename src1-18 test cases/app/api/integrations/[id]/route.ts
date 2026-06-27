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

// GET /api/integrations/[id] - Get single integration with sync logs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  try {
    const { id } = await params;

    const integration = await db.platformIntegration.findUnique({
      where: { id },
      include: {
        syncLogs: {
          orderBy: { startedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Get actual product count
    const productCount = await db.product.count({
      where: { isExternal: true, platform: integration.slug },
    });

    return NextResponse.json({
      ...integration,
      categories: JSON.parse(integration.categories || '[]'),
      productCount,
      syncLogs: integration.syncLogs.map((log) => ({
        ...log,
      })),
    });
  } catch (err) {
    console.error('Error fetching integration:', err);
    return NextResponse.json(
      { error: 'Failed to fetch integration' },
      { status: 500 }
    );
  }
}

// PUT /api/integrations/[id] - Update integration settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.platformIntegration.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Check uniqueness if name or slug is being changed
    if (body.name && body.name !== existing.name) {
      const dup = await db.platformIntegration.findUnique({ where: { name: body.name } });
      if (dup) {
        return NextResponse.json(
          { error: `Integration with name "${body.name}" already exists` },
          { status: 409 }
        );
      }
    }
    if (body.slug && body.slug !== existing.slug) {
      const dup = await db.platformIntegration.findUnique({ where: { slug: body.slug } });
      if (dup) {
        return NextResponse.json(
          { error: `Integration with slug "${body.slug}" already exists` },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'name', 'slug', 'baseUrl', 'logo', 'isActive',
      'autoSync', 'syncInterval', 'affiliateTag',
      'commission', 'maxProducts',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'commission') {
          updateData[field] = parseFloat(body[field]);
        } else if (field === 'syncInterval' || field === 'maxProducts') {
          updateData[field] = parseInt(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    if (body.categories !== undefined) {
      updateData.categories = JSON.stringify(body.categories);
    }

    const updated = await db.platformIntegration.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ...updated,
      categories: JSON.parse(updated.categories || '[]'),
    });
  } catch (err) {
    console.error('Error updating integration:', err);
    return NextResponse.json(
      { error: 'Failed to update integration' },
      { status: 500 }
    );
  }
}

// DELETE /api/integrations/[id] - Delete integration and optionally remove its external products
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const removeProducts = searchParams.get('removeProducts') === 'true';

    const existing = await db.platformIntegration.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Optionally remove all external products from this platform
    let deletedProductCount = 0;
    if (removeProducts) {
      const result = await db.product.deleteMany({
        where: {
          isExternal: true,
          platform: existing.slug,
        },
      });
      deletedProductCount = result.count;
    } else {
      // Just mark products as syncStatus: removed instead of deleting
      await db.product.updateMany({
        where: {
          isExternal: true,
          platform: existing.slug,
        },
        data: {
          syncStatus: 'removed',
        },
      });
    }

    // Delete the integration (cascades sync logs)
    await db.platformIntegration.delete({ where: { id } });

    return NextResponse.json({
      message: `Integration "${existing.name}" deleted`,
      deletedProductCount,
      productsAction: removeProducts ? 'deleted' : 'marked_removed',
    });
  } catch (err) {
    console.error('Error deleting integration:', err);
    return NextResponse.json(
      { error: 'Failed to delete integration' },
      { status: 500 }
    );
  }
}
