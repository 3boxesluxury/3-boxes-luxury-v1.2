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

// GET /api/inventory - List inventory logs
export async function GET(request: NextRequest) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const type = searchParams.get('type') || '';
  const productId = searchParams.get('productId') || '';

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (productId) where.productId = productId;

  const [logs, total] = await Promise.all([
    db.inventoryLog.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productNumber: true,
            sku: true,
            stock: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.inventoryLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

// POST /api/inventory - Adjust stock (in/out/adjustment/return)
export async function POST(request: NextRequest) {
  const { error, user } = await verifyAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { productId, type, quantity, note } = body;

    if (!productId || !type || !quantity) {
      return NextResponse.json(
        { error: 'productId, type, and quantity are required' },
        { status: 400 }
      );
    }

    const validTypes = ['in', 'out', 'adjustment', 'return'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const qty = parseInt(quantity);

    // Calculate new stock
    let newStock = product.stock;
    switch (type) {
      case 'in':
      case 'return':
        newStock += qty;
        break;
      case 'out':
        newStock -= qty;
        break;
      case 'adjustment':
        newStock = qty; // adjustment sets absolute value
        break;
    }

    if (newStock < 0) {
      return NextResponse.json(
        { error: 'Insufficient stock for this operation' },
        { status: 400 }
      );
    }

    // Create log and update product stock in a transaction
    const [log] = await db.$transaction([
      db.inventoryLog.create({
        data: {
          productId,
          type,
          quantity: qty,
          note: note || `${type} by ${user.name}`,
        },
      }),
      db.product.update({
        where: { id: productId },
        data: { stock: newStock },
      }),
    ]);

    const logResponse = await db.inventoryLog.findUnique({
      where: { id: log.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productNumber: true,
            sku: true,
            stock: true,
          },
        },
      },
    });

    return NextResponse.json(logResponse, { status: 201 });
  } catch (err) {
    console.error('Error adjusting inventory:', err);
    return NextResponse.json({ error: 'Failed to adjust inventory' }, { status: 500 });
  }
}
