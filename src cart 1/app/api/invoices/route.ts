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

// GET /api/invoices - List invoices
export async function GET(request: NextRequest) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const status = searchParams.get('status') || '';
  const vendorId = searchParams.get('vendorId') || '';

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (vendorId) where.vendorId = vendorId;

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where,
      include: {
        vendor: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.invoice.count({ where }),
  ]);

  return NextResponse.json({
    invoices,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

// POST /api/invoices - Create invoice with auto-generated INV-XXXXX number
export async function POST(request: NextRequest) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { vendorId, orderId, amount, tax, items, dueDate, notes, status } = body;

    if (!amount) {
      return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
    }

    // Auto-generate invoice number: INV-XXXXX
    const lastInvoice = await db.invoice.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true },
    });
    let nextNum = 10001;
    if (lastInvoice?.invoiceNumber) {
      const lastNum = parseInt(lastInvoice.invoiceNumber.replace('INV-', ''));
      nextNum = lastNum + 1;
    }
    const invoiceNumber = `INV-${nextNum}`;

    const parsedAmount = parseFloat(amount);
    const parsedTax = tax ? parseFloat(tax) : 0;
    const total = parsedAmount + parsedTax;

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        vendorId: vendorId || null,
        orderId: orderId || null,
        amount: parsedAmount,
        tax: parsedTax,
        total,
        status: status || 'draft',
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
        items: items?.length
          ? {
              create: items.map((item: { description: string; quantity: number; unitPrice: number }) => ({
                description: item.description,
                quantity: item.quantity || 1,
                unitPrice: parseFloat(String(item.unitPrice)),
                amount: (item.quantity || 1) * parseFloat(String(item.unitPrice)),
              })),
            }
          : undefined,
      },
      include: {
        vendor: true,
        items: true,
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (err) {
    console.error('Error creating invoice:', err);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}
