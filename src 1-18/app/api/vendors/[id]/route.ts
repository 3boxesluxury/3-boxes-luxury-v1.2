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

// PUT /api/vendors/[id] - Update vendor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  const { id } = await params;

  try {
    const body = await request.json();
    const existing = await db.vendor.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
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
      const existingSlug = await db.vendor.findFirst({
        where: { slug, id: { not: id } },
      });
      while (existingSlug) {
        slug = `${baseSlug}-${slugCounter}`;
        slugCounter++;
        const check = await db.vendor.findFirst({
          where: { slug, id: { not: id } },
        });
        if (!check) break;
      }
      updateData.slug = slug;
    }
    if (body.contactName !== undefined) updateData.contactName = body.contactName || null;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.address !== undefined) updateData.address = body.address || null;
    if (body.gstNumber !== undefined) updateData.gstNumber = body.gstNumber || null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const vendor = await db.vendor.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(vendor);
  } catch (err) {
    console.error('Error updating vendor:', err);
    return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 });
  }
}

// DELETE /api/vendors/[id] - Delete vendor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  const { id } = await params;

  try {
    const existing = await db.vendor.findUnique({
      where: { id },
      include: { products: true, invoices: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    if (existing.products.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vendor with associated products. Remove products first.' },
        { status: 400 }
      );
    }

    // Nullify vendor reference on invoices before deleting
    await db.invoice.updateMany({
      where: { vendorId: id },
      data: { vendorId: null },
    });

    await db.vendor.delete({ where: { id } });

    return NextResponse.json({ message: 'Vendor deleted successfully' });
  } catch (err) {
    console.error('Error deleting vendor:', err);
    return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 });
  }
}
