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

// GET /api/corporate/campaigns/[id] - Get single campaign with recipients
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, corporateAccount } = await verifyCorporate(request);
  if (error) return error;

  const { id } = await params;

  try {
    const campaign = await db.corporateCampaign.findFirst({
      where: {
        id,
        corporateId: corporateAccount!.id,
      },
      include: {
        recipients: {
          orderBy: { createdAt: 'desc' },
        },
        product: {
          select: { id: true, name: true, slug: true, images: true, price: true },
        },
        _count: {
          select: { recipients: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const { _count, ...campaignData } = campaign;
    return NextResponse.json({
      campaign: {
        ...campaignData,
        recipientCount: _count.recipients,
      },
    });
  } catch (err) {
    console.error('Error fetching campaign:', err);
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

// PUT /api/corporate/campaigns/[id] - Update campaign
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, corporateAccount } = await verifyCorporate(request);
  if (error) return error;

  const { id } = await params;

  try {
    // Verify campaign belongs to this corporate account
    const existing = await db.corporateCampaign.findFirst({
      where: {
        id,
        corporateId: corporateAccount!.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

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
      status,
    } = body;

    // Validate status transitions
    if (status !== undefined) {
      const validStatuses = ['draft', 'pending_approval', 'approved', 'in_progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }

      // Corporate users can only transition: draft → pending_approval, or cancel
      const allowedTransitions: Record<string, string[]> = {
        draft: ['pending_approval', 'cancelled'],
        pending_approval: ['cancelled'],
      };

      const allowed = allowedTransitions[existing.status];
      if (!allowed || !allowed.includes(status)) {
        return NextResponse.json(
          { error: `Cannot transition campaign from "${existing.status}" to "${status}"` },
          { status: 400 }
        );
      }
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

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (occasion !== undefined) updateData.occasion = occasion?.trim() || null;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (budgetPerRecipient !== undefined) updateData.budgetPerRecipient = budgetPerRecipient;
    if (totalBudget !== undefined) updateData.totalBudget = totalBudget;
    if (deliveryType !== undefined) updateData.deliveryType = deliveryType;
    if (deliveryDate !== undefined) updateData.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
    if (message !== undefined) updateData.message = message?.trim() || null;
    if (productId !== undefined) updateData.productId = productId || null;
    if (status !== undefined) updateData.status = status;

    const campaign = await db.corporateCampaign.update({
      where: { id },
      data: updateData,
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
    return NextResponse.json({
      campaign: {
        ...campaignData,
        recipientCount: _count.recipients,
      },
    });
  } catch (err) {
    console.error('Error updating campaign:', err);
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

// DELETE /api/corporate/campaigns/[id] - Delete a draft campaign only
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, corporateAccount } = await verifyCorporate(request);
  if (error) return error;

  const { id } = await params;

  try {
    const existing = await db.corporateCampaign.findFirst({
      where: {
        id,
        corporateId: corporateAccount!.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (existing.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft campaigns can be deleted' },
        { status: 400 }
      );
    }

    await db.corporateCampaign.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Campaign deleted successfully',
    });
  } catch (err) {
    console.error('Error deleting campaign:', err);
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
