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

// GET /api/vendors - List vendors
export async function GET(request: NextRequest) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const search = searchParams.get('search') || '';
  const isActive = searchParams.get('isActive');

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { contactName: { contains: search } },
      { email: { contains: search } },
    ];
  }
  if (isActive !== null && isActive !== undefined && isActive !== '') {
    where.isActive = isActive === 'true';
  }

  const [vendors, total] = await Promise.all([
    db.vendor.findMany({
      where,
      include: {
        _count: { select: { products: true, invoices: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.vendor.count({ where }),
  ]);

  return NextResponse.json({
    vendors,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

// POST /api/vendors - Create vendor
export async function POST(request: NextRequest) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { name, contactName, email, phone, address, gstNumber, isActive } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Auto-generate slug from name
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    let slug = baseSlug;
    let slugCounter = 1;
    while (await db.vendor.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${slugCounter}`;
      slugCounter++;
    }

    const vendor = await db.vendor.create({
      data: {
        name,
        slug,
        contactName: contactName || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        gstNumber: gstNumber || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(vendor, { status: 201 });
  } catch (err) {
    console.error('Error creating vendor:', err);
    return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 });
  }
}
