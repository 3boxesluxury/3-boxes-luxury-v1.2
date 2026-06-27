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

// GET /api/accounting - List account entries with running balance
export async function GET(request: NextRequest) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const type = searchParams.get('type') || '';
  const category = searchParams.get('category') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (category) where.category = category;
  if (startDate || endDate) {
    const createdAt: Record<string, Date> = {};
    if (startDate) createdAt.gte = new Date(startDate);
    if (endDate) createdAt.lte = new Date(endDate);
    where.createdAt = createdAt;
  }

  const [entries, total] = await Promise.all([
    db.accountEntry.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.accountEntry.count({ where }),
  ]);

  // Calculate running balance
  let runningBalance = 0;
  const entriesWithBalance = entries.map((entry) => {
    if (entry.type === 'credit') {
      runningBalance += entry.amount;
    } else {
      runningBalance -= entry.amount;
    }
    return {
      ...entry,
      runningBalance: Math.round(runningBalance * 100) / 100,
    };
  });

  // Get overall summary using aggregation (efficient)
  const [creditAgg, debitAgg] = await Promise.all([
    db.accountEntry.aggregate({ _sum: { amount: true }, where: { ...where, type: 'credit' } }),
    db.accountEntry.aggregate({ _sum: { amount: true }, where: { ...where, type: 'debit' } }),
  ]);
  const totalCredits = creditAgg._sum.amount || 0;
  const totalDebits = debitAgg._sum.amount || 0;

  return NextResponse.json({
    entries: entriesWithBalance,
    summary: {
      totalCredits: Math.round(totalCredits * 100) / 100,
      totalDebits: Math.round(totalDebits * 100) / 100,
      balance: Math.round((totalCredits - totalDebits) * 100) / 100,
    },
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

// POST /api/accounting - Create entry with auto-generated ACC-XXXXX number
export async function POST(request: NextRequest) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { type, category, amount, description, reference } = body;

    if (!type || !category || !amount || !description) {
      return NextResponse.json(
        { error: 'Type, category, amount, and description are required' },
        { status: 400 }
      );
    }

    const validTypes = ['debit', 'credit'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be debit or credit' },
        { status: 400 }
      );
    }

    const validCategories = ['sales', 'purchase', 'expense', 'refund', 'tax', 'other'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    // Auto-generate entry number: ACC-XXXXX
    const lastEntry = await db.accountEntry.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { entryNumber: true },
    });
    let nextNum = 10001;
    if (lastEntry?.entryNumber) {
      const lastNum = parseInt(lastEntry.entryNumber.replace('ACC-', ''));
      nextNum = lastNum + 1;
    }
    const entryNumber = `ACC-${nextNum}`;

    const entry = await db.accountEntry.create({
      data: {
        entryNumber,
        type,
        category,
        amount: parseFloat(amount),
        description,
        reference: reference || null,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error('Error creating account entry:', err);
    return NextResponse.json({ error: 'Failed to create account entry' }, { status: 500 });
  }
}
