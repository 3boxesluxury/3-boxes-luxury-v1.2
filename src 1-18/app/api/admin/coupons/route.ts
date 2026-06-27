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

// GET: List all coupons
export async function GET(req: NextRequest) {
  try {
    const session = await verifyAdmin(req);
    if (!session) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const coupons = await db.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    return NextResponse.json({
      coupons: coupons.map(c => ({
        ...c,
        status: c.isActive && c.validTo > now && (c.usageLimit === null || c.usedCount < c.usageLimit)
          ? 'active'
          : c.validTo <= now
            ? 'expired'
            : !c.isActive
              ? 'inactive'
              : 'used_up',
      })),
    });
  } catch (error) {
    console.error('Admin coupons GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
  }
}

// POST: Create coupon
export async function POST(req: NextRequest) {
  try {
    const session = await verifyAdmin(req);
    if (!session) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json();
    const { code, type, value, minOrder, maxDiscount, usageLimit, validFrom, validTo, isActive } = body;

    if (!code || !type || value === undefined || !validTo) {
      return NextResponse.json({ error: 'Code, type, value, and validTo are required' }, { status: 400 });
    }

    const existing = await db.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 400 });
    }

    const coupon = await db.coupon.create({
      data: {
        code: code.toUpperCase(),
        type,
        value: parseFloat(value),
        minOrder: minOrder ? parseFloat(minOrder) : 0,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validTo: new Date(validTo),
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error) {
    console.error('Admin coupons POST error:', error);
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }
}

// PATCH: Update coupon
export async function PATCH(req: NextRequest) {
  try {
    const session = await verifyAdmin(req);
    if (!session) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json();
    const { id, ...fields } = body;

    if (!id) return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 });

    // Check code uniqueness if changing
    if (fields.code) {
      const existing = await db.coupon.findFirst({ where: { code: fields.code.toUpperCase(), NOT: { id } } });
      if (existing) return NextResponse.json({ error: 'Coupon code already in use' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (fields.code !== undefined) data.code = fields.code.toUpperCase();
    if (fields.type !== undefined) data.type = fields.type;
    if (fields.value !== undefined) data.value = parseFloat(fields.value);
    if (fields.minOrder !== undefined) data.minOrder = parseFloat(fields.minOrder);
    if (fields.maxDiscount !== undefined) data.maxDiscount = fields.maxDiscount ? parseFloat(fields.maxDiscount) : null;
    if (fields.usageLimit !== undefined) data.usageLimit = fields.usageLimit ? parseInt(fields.usageLimit) : null;
    if (fields.validFrom !== undefined) data.validFrom = new Date(fields.validFrom);
    if (fields.validTo !== undefined) data.validTo = new Date(fields.validTo);
    if (fields.isActive !== undefined) data.isActive = fields.isActive;

    const coupon = await db.coupon.update({ where: { id }, data });

    return NextResponse.json({ coupon });
  } catch (error) {
    console.error('Admin coupons PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 });
  }
}

// DELETE: Delete coupon
export async function DELETE(req: NextRequest) {
  try {
    const session = await verifyAdmin(req);
    if (!session) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 });

    await db.coupon.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin coupons DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
  }
}
