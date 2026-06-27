import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helper';

// GET /api/admin/products/[id] - Get single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;
  const product = await db.product.findUnique({
    where: { id },
    include: {
      category: true,
      vendor: true,
      inventoryLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const productResponse = {
    ...product,
    images: JSON.parse(product.images),
    tags: product.tags ? JSON.parse(product.tags) : null,
  };

  return NextResponse.json(productResponse);
}

// PUT /api/admin/products/[id] - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;

  try {
    const body = await request.json();
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) {
      updateData.name = body.name;
      // Regenerate slug if name changes
      const baseSlug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      let slug = baseSlug;
      let slugCounter = 1;
      const existingSlug = await db.product.findFirst({
        where: { slug, id: { not: id } },
      });
      while (existingSlug) {
        slug = `${baseSlug}-${slugCounter}`;
        slugCounter++;
        const check = await db.product.findFirst({
          where: { slug, id: { not: id } },
        });
        if (!check) break;
      }
      updateData.slug = slug;
    }
    if (body.description !== undefined) updateData.description = body.description;
    if (body.price !== undefined) updateData.price = parseFloat(body.price);
    if (body.compareAtPrice !== undefined) updateData.compareAtPrice = body.compareAtPrice ? parseFloat(body.compareAtPrice) : null;
    if (body.costPrice !== undefined) updateData.costPrice = body.costPrice ? parseFloat(body.costPrice) : null;
    if (body.sku !== undefined) updateData.sku = body.sku;
    if (body.images !== undefined) updateData.images = JSON.stringify(body.images);
    if (body.categoryId !== undefined) {
      // Resolve categoryId — may be a Shopify-style synthetic ID
      let resolvedId = body.categoryId;
      const directMatch = await db.category.findUnique({ where: { id: body.categoryId } });
      if (!directMatch) {
        let slugLookup: string | null = null;
        if (body.categoryId.startsWith('shopify-parent-')) {
          slugLookup = body.categoryId.replace('shopify-parent-', '');
        } else if (body.categoryId.startsWith('shopify-cat-')) {
          slugLookup = body.categoryId.replace('shopify-cat-', '');
        } else if (body.categoryId.startsWith('shopify-col-')) {
          slugLookup = body.categoryId.replace('shopify-col-', '');
        } else {
          slugLookup = body.categoryId;
        }
        if (slugLookup) {
          const bySlug = await db.category.findUnique({ where: { slug: slugLookup } });
          if (bySlug) {
            resolvedId = bySlug.id;
          } else {
            const allCats = await db.category.findMany();
            const fuzzy = allCats.find(c => {
              const cs = c.slug.toLowerCase().replace(/[^a-z0-9]/g, '');
              const ls = slugLookup!.toLowerCase().replace(/[^a-z0-9]/g, '');
              return cs === ls || cs.includes(ls) || ls.includes(cs);
            });
            if (fuzzy) resolvedId = fuzzy.id;
          }
        }
      }
      updateData.categoryId = resolvedId;
    }
    if (body.subCategoryId !== undefined) {
      // Resolve subCategoryId — may be a Shopify-style synthetic ID
      let resolvedSubId = body.subCategoryId || null;
      if (resolvedSubId && resolvedSubId !== 'none') {
        const directSubMatch = await db.category.findUnique({ where: { id: resolvedSubId } });
        if (!directSubMatch) {
          let subSlugLookup: string | null = null;
          if (resolvedSubId.startsWith('shopify-cat-')) {
            subSlugLookup = resolvedSubId.replace('shopify-cat-', '');
          } else if (resolvedSubId.startsWith('shopify-col-')) {
            subSlugLookup = resolvedSubId.replace('shopify-col-', '');
          } else if (resolvedSubId.startsWith('shopify-parent-')) {
            subSlugLookup = resolvedSubId.replace('shopify-parent-', '');
          } else {
            subSlugLookup = resolvedSubId;
          }
          if (subSlugLookup) {
            const bySlug = await db.category.findUnique({ where: { slug: subSlugLookup } });
            if (bySlug) {
              resolvedSubId = bySlug.id;
            } else {
              const allCats = await db.category.findMany();
              const fuzzy = allCats.find(c => {
                const cs = c.slug.toLowerCase().replace(/[^a-z0-9]/g, '');
                const ls = subSlugLookup!.toLowerCase().replace(/[^a-z0-9]/g, '');
                return cs === ls || cs.includes(ls) || ls.includes(cs);
              });
              if (fuzzy) resolvedSubId = fuzzy.id;
              else resolvedSubId = null;
            }
          }
        }
      }
      updateData.subCategoryId = resolvedSubId;
    }
    if (body.stock !== undefined) updateData.stock = parseInt(body.stock);
    if (body.reorderLevel !== undefined) updateData.reorderLevel = parseInt(body.reorderLevel);
    if (body.featured !== undefined) updateData.featured = body.featured;
    if (body.tags !== undefined) updateData.tags = body.tags ? JSON.stringify(body.tags) : null;
    if (body.vendorId !== undefined) updateData.vendorId = body.vendorId || null;
    if (body.sourceUrl !== undefined) updateData.sourceUrl = body.sourceUrl || null;
    if (body.platform !== undefined) updateData.platform = body.platform || null;

    const product = await db.product.update({
      where: { id },
      data: updateData,
      include: { category: true, vendor: true },
    });

    const productResponse = {
      ...product,
      images: JSON.parse(product.images),
      tags: product.tags ? JSON.parse(product.tags) : null,
    };

    return NextResponse.json(productResponse);
  } catch (err) {
    console.error('Error updating product:', err);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE /api/admin/products/[id] - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;

  try {
    const existing = await db.product.findUnique({
      where: { id },
      include: { cartItems: true, orderItems: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (existing.cartItems.length > 0 || existing.orderItems.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete product with existing cart items or orders' },
        { status: 400 }
      );
    }

    await db.inventoryLog.deleteMany({ where: { productId: id } });
    await db.product.delete({ where: { id } });

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error deleting product:', err);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
