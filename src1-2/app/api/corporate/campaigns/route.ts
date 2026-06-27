import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionAsync } from '@/lib/sessions';

async function verifyCorporate(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  const session = await getSessionAsync(token ?? '');

  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  }

  if (session.role !== 'corporate') {
    return { error: NextResponse.json({ error: 'Forbidden. Corporate access required.' }, { status: 403 }), user: null };
  }

  const corporateAccount = await db.corporateAccount.findUnique({
    where: { userId: session.id },
  });

  if (!corporateAccount) {
    return { error: NextResponse.json({ error: 'Corporate account not found' }, { status: 404 }), user: null };
  }

  return { error: null, user: session, corporateAccount };
}

// GET /api/corporate/campaigns - List all campaigns with recipient counts
export async function GET(request: NextRequest) {
  const { error, corporateAccount } = await verifyCorporate(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || '';

    const where: Record<string, unknown> = {
      corporateId: corporateAccount!.id,
    };
    if (status) where.status = status;

    const [campaigns, total] = await Promise.all([
      db.corporateCampaign.findMany({
        where,
        include: {
          _count: {
            select: { recipients: true },
          },
          product: {
            select: { id: true, name: true, slug: true, images: true, price: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.corporateCampaign.count({ where }),
    ]);

    const campaignsFormatted = campaigns.map(({ _count, ...campaign }) => ({
      ...campaign,
      recipientCount: _count.recipients,
    }));

    return NextResponse.json({
      campaigns: campaignsFormatted,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Error fetching campaigns:', err);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

// POST /api/corporate/campaigns - Create a new campaign
export async function POST(request: NextRequest) {
  const { error, corporateAccount } = await verifyCorporate(request);
  if (error) return error;

  try {
    const body = await request.json();
    const {
      name,
      occasion,
      description,
      budgetPerRecipient,
      totalBudget,
      deliveryType,
      deliveryDate,
      message,
      productId,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Campaign name is required' },
        { status: 400 }
      );
    }

    // Validate deliveryType if provided
    if (deliveryType && !['bulk', 'individual'].includes(deliveryType)) {
      return NextResponse.json(
        { error: 'Invalid deliveryType. Must be one of: bulk, individual' },
        { status: 400 }
      );
    }

    // Validate productId if provided
    if (productId) {
      const product = await db.product.findUnique({ where: { id: productId } });
      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
    }

    const campaign = await db.corporateCampaign.create({
      data: {
        corporateId: corporateAccount!.id,
        name: name.trim(),
        occasion: occasion?.trim() || null,
        description: description?.trim() || null,
        budgetPerRecipient: budgetPerRecipient || null,
        totalBudget: totalBudget || null,
        status: 'draft',
        deliveryType: deliveryType || 'bulk',
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        message: message?.trim() || null,
        productId: productId || null,
      },
      include: {
        _count: {
          select: { recipients: true },
        },
        product: {
          select: { id: true, name: true, slug: true, images: true, price: true },
        },
      },
    });

    const { _count, ...campaignData } = campaign;
    return NextResponse.json(
      {
        campaign: {
          ...campaignData,
          recipientCount: _count.recipients,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Error creating campaign:', err);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
