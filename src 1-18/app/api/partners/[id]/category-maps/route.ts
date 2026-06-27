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

// GET /api/partners/[id]/category-maps — Get category mappings for a partner
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
    });

    if (!integration) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const categoryMaps = await db.partnerCategoryMap.findMany({
      where: { integrationId: id },
      orderBy: { partnerCatName: 'asc' },
    });

    // Enrich with local category names
    const enrichedMaps = await Promise.all(
      categoryMaps.map(async (cm) => {
        let localCategory = null;
        if (cm.localCatId) {
          const cat = await db.category.findUnique({ where: { id: cm.localCatId } });
          if (cat) {
            localCategory = { id: cat.id, name: cat.name, slug: cat.slug };
          }
        }
        return {
          ...cm,
          localCategory,
        };
      })
    );

    return Response.json({ categoryMaps: enrichedMaps });
  } catch (err) {
    console.error('Error fetching category maps:', err);
    return Response.json({ error: 'Failed to fetch category maps' }, { status: 500 });
  }
}

// POST /api/partners/[id]/category-maps — Create/update category mapping
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { partnerCatName, partnerCatSlug, localCatId } = body;

    if (!partnerCatName) {
      return Response.json(
        { error: 'partnerCatName is required' },
        { status: 400 }
      );
    }

    const integration = await db.platformIntegration.findUnique({
      where: { id },
    });

    if (!integration) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    // Validate localCatId if provided
    if (localCatId) {
      const localCat = await db.category.findUnique({ where: { id: localCatId } });
      if (!localCat) {
        return Response.json(
          { error: `Local category with id "${localCatId}" not found` },
          { status: 400 }
        );
      }
    }

    // Auto-generate slug from name if not provided
    const catSlug = partnerCatSlug || partnerCatName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if mapping already exists (unique constraint on integrationId + partnerCatSlug)
    const existing = await db.partnerCategoryMap.findUnique({
      where: {
        integrationId_partnerCatSlug: {
          integrationId: id,
          partnerCatSlug: catSlug,
        },
      },
    });

    if (existing) {
      // Update existing mapping
      const updated = await db.partnerCategoryMap.update({
        where: { id: existing.id },
        data: {
          partnerCatName,
          localCatId: localCatId || null,
        },
      });

      let localCategory = null;
      if (updated.localCatId) {
        const cat = await db.category.findUnique({ where: { id: updated.localCatId } });
        if (cat) localCategory = { id: cat.id, name: cat.name, slug: cat.slug };
      }

      return Response.json({
        categoryMap: { ...updated, localCategory },
        action: 'updated',
      });
    }

    // Create new mapping
    const categoryMap = await db.partnerCategoryMap.create({
      data: {
        integrationId: id,
        partnerCatName,
        partnerCatSlug: catSlug,
        localCatId: localCatId || null,
      },
    });

    let localCategory = null;
    if (categoryMap.localCatId) {
      const cat = await db.category.findUnique({ where: { id: categoryMap.localCatId } });
      if (cat) localCategory = { id: cat.id, name: cat.name, slug: cat.slug };
    }

    return Response.json(
      {
        categoryMap: { ...categoryMap, localCategory },
        action: 'created',
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Error creating/updating category map:', err);
    return Response.json({ error: 'Failed to create/update category map' }, { status: 500 });
  }
}
