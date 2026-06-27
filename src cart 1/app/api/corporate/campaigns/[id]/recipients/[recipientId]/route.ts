import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionAsync } from '@/lib/sessions';

async function verifyCorporateAndCampaignAndRecipient(
  request: NextRequest,
  campaignId: string,
  recipientId: string
) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  const session = await getSessionAsync(token ?? '');

  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null, campaign: null, recipient: null };
  }

  if (session.role !== 'corporate') {
    return { error: NextResponse.json({ error: 'Forbidden. Corporate access required.' }, { status: 403 }), user: null, campaign: null, recipient: null };
  }

  const corporateAccount = await db.corporateAccount.findUnique({
    where: { userId: session.id },
  });

  if (!corporateAccount) {
    return { error: NextResponse.json({ error: 'Corporate account not found' }, { status: 404 }), user: null, campaign: null, recipient: null };
  }

  const campaign = await db.corporateCampaign.findFirst({
    where: {
      id: campaignId,
      corporateId: corporateAccount.id,
    },
  });

  if (!campaign) {
    return { error: NextResponse.json({ error: 'Campaign not found' }, { status: 404 }), user: null, campaign: null, recipient: null };
  }

  const recipient = await db.campaignRecipient.findFirst({
    where: {
      id: recipientId,
      campaignId: campaign.id,
    },
  });

  if (!recipient) {
    return { error: NextResponse.json({ error: 'Recipient not found' }, { status: 404 }), user: null, campaign: null, recipient: null };
  }

  return { error: null, user: session, corporateAccount, campaign, recipient };
}

// PUT /api/corporate/campaigns/[id]/recipients/[recipientId] - Update recipient
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recipientId: string }> }
) {
  const { id, recipientId } = await params;
  const { error, campaign, recipient } = await verifyCorporateAndCampaignAndRecipient(request, id, recipientId);
  if (error) return error;

  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      designation,
      department,
      address,
      city,
      state,
      zipCode,
      productId,
      budget,
      message,
      giftStatus,
    } = body;

    // Validate giftStatus if provided
    if (giftStatus !== undefined) {
      const validStatuses = ['pending', 'ordered', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(giftStatus)) {
        return NextResponse.json(
          { error: `Invalid giftStatus. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate email if provided
    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
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

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (designation !== undefined) updateData.designation = designation?.trim() || null;
    if (department !== undefined) updateData.department = department?.trim() || null;
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (city !== undefined) updateData.city = city?.trim() || null;
    if (state !== undefined) updateData.state = state?.trim() || null;
    if (zipCode !== undefined) updateData.zipCode = zipCode?.trim() || null;
    if (productId !== undefined) updateData.productId = productId || null;
    if (budget !== undefined) updateData.budget = budget ? Number(budget) : null;
    if (message !== undefined) updateData.message = message?.trim() || null;
    if (giftStatus !== undefined) updateData.giftStatus = giftStatus;

    const updated = await db.campaignRecipient.update({
      where: { id: recipient!.id },
      data: updateData,
      include: {
        product: {
          select: { id: true, name: true, slug: true, images: true, price: true },
        },
      },
    });

    return NextResponse.json({ recipient: updated });
  } catch (err) {
    console.error('Error updating recipient:', err);
    return NextResponse.json(
      { error: 'Failed to update recipient' },
      { status: 500 }
    );
  }
}

// DELETE /api/corporate/campaigns/[id]/recipients/[recipientId] - Remove a recipient
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recipientId: string }> }
) {
  const { id, recipientId } = await params;
  const { error, campaign, recipient } = await verifyCorporateAndCampaignAndRecipient(request, id, recipientId);
  if (error) return error;

  try {
    // Only allow removing recipients from draft campaigns
    if (campaign!.status !== 'draft') {
      return NextResponse.json(
        { error: 'Recipients can only be removed from draft campaigns' },
        { status: 400 }
      );
    }

    await db.campaignRecipient.delete({
      where: { id: recipient!.id },
    });

    return NextResponse.json({
      message: 'Recipient removed successfully',
    });
  } catch (err) {
    console.error('Error deleting recipient:', err);
    return NextResponse.json(
      { error: 'Failed to remove recipient' },
      { status: 500 }
    );
  }
}
