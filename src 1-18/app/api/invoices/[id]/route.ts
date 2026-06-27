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

// GET /api/invoices/[id] - Get single invoice
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  const { id } = await params;
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      vendor: true,
      items: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

// PUT /api/invoices/[id] - Update invoice
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  const { id } = await params;

  try {
    const body = await request.json();
    const existing = await db.invoice.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.vendorId !== undefined) updateData.vendorId = body.vendorId || null;
    if (body.orderId !== undefined) updateData.orderId = body.orderId || null;
    if (body.amount !== undefined) {
      updateData.amount = parseFloat(body.amount);
      updateData.total = parseFloat(body.amount) + (body.tax !== undefined ? parseFloat(body.tax) : existing.tax);
    }
    if (body.tax !== undefined) {
      updateData.tax = parseFloat(body.tax);
      updateData.total = (body.amount !== undefined ? parseFloat(body.amount) : existing.amount) + parseFloat(body.tax);
    }
    if (body.status !== undefined) updateData.status = body.status;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.notes !== undefined) updateData.notes = body.notes;

    // Handle paid date automatically
    if (body.status === 'paid' && existing.status !== 'paid') {
      updateData.paidDate = new Date();
    }

    // Handle items update
    if (body.items !== undefined) {
      // Delete existing items and recreate
      await db.invoiceItem.deleteMany({ where: { invoiceId: id } });
      if (body.items.length > 0) {
        updateData.items = {
          create: body.items.map((item: { description: string; quantity: number; unitPrice: number }) => ({
            description: item.description,
            quantity: item.quantity || 1,
            unitPrice: parseFloat(String(item.unitPrice)),
            amount: (item.quantity || 1) * parseFloat(String(item.unitPrice)),
          })),
        };
      }
    }

    const invoice = await db.invoice.update({
      where: { id },
      data: updateData,
      include: {
        vendor: true,
        items: true,
      },
    });

    return NextResponse.json(invoice);
  } catch (err) {
    console.error('Error updating invoice:', err);
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}
