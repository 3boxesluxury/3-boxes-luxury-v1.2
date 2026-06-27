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

// POST /api/inventory/[productId] - Get inventory details for specific product
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  const { productId } = await params;

  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      vendor: true,
    },
  });

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const logs = await db.inventoryLog.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // Calculate inventory summary
  const totalIn = logs
    .filter((l) => l.type === 'in' || l.type === 'return')
    .reduce((sum, l) => sum + l.quantity, 0);
  const totalOut = logs
    .filter((l) => l.type === 'out')
    .reduce((sum, l) => sum + l.quantity, 0);

  return NextResponse.json({
    product: {
      id: product.id,
      productNumber: product.productNumber,
      name: product.name,
      sku: product.sku,
      currentStock: product.stock,
      reorderLevel: product.reorderLevel,
      costPrice: product.costPrice,
      category: product.category,
      vendor: product.vendor,
      isLowStock: product.stock <= product.reorderLevel,
    },
    summary: {
      totalIn,
      totalOut,
      currentStock: product.stock,
      lastAdjusted: logs[0]?.createdAt || null,
    },
    logs,
  });
}
