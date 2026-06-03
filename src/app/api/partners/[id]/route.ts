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

// GET /api/partners/[id] — Get single partner with sync logs and category maps
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
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    // Get category maps separately (avoids Prisma client cache issues with newer relations)
    const categoryMaps = await db.partnerCategoryMap.findMany({
      where: { integrationId: id },
    });

    // Get actual product count
    const productCount = await db.product.count({
      where: { isExternal: true, platform: integration.slug },
    });

    return Response.json({
      ...integration,
      categories: JSON.parse(integration.categories || '[]'),
      productCount,
      syncLogs: integration.syncLogs,
      categoryMaps,
    });
  } catch (err) {
    console.error('Error fetching partner:', err);
    return Response.json({ error: 'Failed to fetch partner' }, { status: 500 });
  }
}

// PUT /api/partners/[id] — Update partner integration
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
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    // Check uniqueness if name or slug is being changed
    if (body.name && body.name !== existing.name) {
      const dup = await db.platformIntegration.findUnique({ where: { name: body.name } });
      if (dup) {
        return Response.json(
          { error: `Partner with name "${body.name}" already exists` },
          { status: 409 }
        );
      }
    }
    if (body.slug && body.slug !== existing.slug) {
      const dup = await db.platformIntegration.findUnique({ where: { slug: body.slug } });
      if (dup) {
        return Response.json(
          { error: `Partner with slug "${body.slug}" already exists` },
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
          updateData[field] = parseFloat(String(body[field]));
        } else if (field === 'syncInterval' || field === 'maxProducts') {
          updateData[field] = parseInt(String(body[field]));
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

    return Response.json({
      ...updated,
      categories: JSON.parse(updated.categories || '[]'),
    });
  } catch (err) {
    console.error('Error updating partner:', err);
    return Response.json({ error: 'Failed to update partner' }, { status: 500 });
  }
}

// DELETE /api/partners/[id] — Delete partner and optionally its external products
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
      return Response.json({ error: 'Partner not found' }, { status: 404 });
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

    // Delete the integration (cascades sync logs and category maps)
    await db.platformIntegration.delete({ where: { id } });

    return Response.json({
      message: `Partner "${existing.name}" deleted`,
      deletedProductCount,
      productsAction: removeProducts ? 'deleted' : 'marked_removed',
    });
  } catch (err) {
    console.error('Error deleting partner:', err);
    return Response.json({ error: 'Failed to delete partner' }, { status: 500 });
  }
}
