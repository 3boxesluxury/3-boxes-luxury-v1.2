import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionAsync } from '@/lib/sessions';

async function verifyCorporateAndCampaign(request: NextRequest, campaignId: string) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  const session = await getSessionAsync(token ?? '');

  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null, campaign: null };
  }

  if (session.role !== 'corporate') {
    return { error: NextResponse.json({ error: 'Forbidden. Corporate access required.' }, { status: 403 }), user: null, campaign: null };
  }

  const corporateAccount = await db.corporateAccount.findUnique({
    where: { userId: session.id },
  });

  if (!corporateAccount) {
    return { error: NextResponse.json({ error: 'Corporate account not found' }, { status: 404 }), user: null, campaign: null };
  }

  const campaign = await db.corporateCampaign.findFirst({
    where: {
      id: campaignId,
      corporateId: corporateAccount.id,
    },
  });

  if (!campaign) {
    return { error: NextResponse.json({ error: 'Campaign not found' }, { status: 404 }), user: null, campaign: null };
  }

  return { error: null, user: session, corporateAccount, campaign };
}

// GET /api/corporate/campaigns/[id]/recipients - List recipients for a campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, campaign } = await verifyCorporateAndCampaign(request, id);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const giftStatus = searchParams.get('giftStatus') || '';
    const department = searchParams.get('department') || '';

    const where: Record<string, unknown> = {
      campaignId: campaign!.id,
    };
    if (giftStatus) where.giftStatus = giftStatus;
    if (department) where.department = department;

    const [recipients, total] = await Promise.all([
      db.campaignRecipient.findMany({
        where,
        include: {
          product: {
            select: { id: true, name: true, slug: true, images: true, price: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.campaignRecipient.count({ where }),
    ]);

    return NextResponse.json({
      recipients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Error fetching recipients:', err);
    return NextResponse.json(
      { error: 'Failed to fetch recipients' },
      { status: 500 }
    );
  }
}

// POST /api/corporate/campaigns/[id]/recipients - Add recipients (single or bulk)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, campaign } = await verifyCorporateAndCampaign(request, id);
  if (error) return error;

  try {
    // Only allow adding recipients to draft campaigns
    if (campaign!.status !== 'draft') {
      return NextResponse.json(
        { error: 'Recipients can only be added to draft campaigns' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Check if bulk or single
    if (body.recipients && Array.isArray(body.recipients)) {
      // Bulk add
      const recipients = body.recipients;

      if (recipients.length === 0) {
        return NextResponse.json(
          { error: 'Recipients array cannot be empty' },
          { status: 400 }
        );
      }

      if (recipients.length > 500) {
        return NextResponse.json(
          { error: 'Maximum 500 recipients can be added at once' },
          { status: 400 }
        );
      }

      // Validate each recipient
      for (let i = 0; i < recipients.length; i++) {
        const r = recipients[i];
        if (!r.name || !r.email) {
          return NextResponse.json(
            { error: `Recipient at index ${i} is missing required fields (name, email)` },
            { status: 400 }
          );
          }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(r.email)) {
          return NextResponse.json(
            { error: `Invalid email at index ${i}: ${r.email}` },
            { status: 400 }
          );
        }
      }

      // Create all recipients
      const createData = recipients.map((r: Record<string, unknown>) => ({
        campaignId: campaign!.id,
        name: (r.name as string).trim(),
        email: (r.email as string).toLowerCase().trim(),
        phone: r.phone ? (r.phone as string).trim() : null,
        designation: r.designation ? (r.designation as string).trim() : null,
        department: r.department ? (r.department as string).trim() : null,
        address: r.address ? (r.address as string).trim() : null,
        city: r.city ? (r.city as string).trim() : null,
        state: r.state ? (r.state as string).trim() : null,
        zipCode: r.zipCode ? (r.zipCode as string).trim() : null,
        productId: r.productId ? (r.productId as string) : null,
        budget: r.budget ? Number(r.budget) : null,
        message: r.message ? (r.message as string).trim() : null,
        giftStatus: 'pending',
      }));

      const created = await db.campaignRecipient.createMany({
        data: createData,
      });

      return NextResponse.json(
        {
          message: `${created.count} recipients added successfully`,
          added: created.count,
        },
        { status: 201 }
      );
    } else {
      // Single add
      const { name, email, phone, designation, department, address, city, state, zipCode, productId, budget, message } = body;

      if (!name || !email) {
        return NextResponse.json(
          { error: 'Name and email are required' },
          { status: 400 }
        );
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
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

      const recipient = await db.campaignRecipient.create({
        data: {
          campaignId: campaign!.id,
          name: name.trim(),
          email: email.toLowerCase().trim(),
          phone: phone?.trim() || null,
          designation: designation?.trim() || null,
          department: department?.trim() || null,
          address: address?.trim() || null,
          city: city?.trim() || null,
          state: state?.trim() || null,
          zipCode: zipCode?.trim() || null,
          productId: productId || null,
          budget: budget ? Number(budget) : null,
          message: message?.trim() || null,
          giftStatus: 'pending',
        },
        include: {
          product: {
            select: { id: true, name: true, slug: true, images: true, price: true },
          },
        },
      });

      return NextResponse.json({ recipient }, { status: 201 });
    }
  } catch (err) {
    console.error('Error adding recipients:', err);
    return NextResponse.json(
      { error: 'Failed to add recipients' },
      { status: 500 }
    );
  }
}
