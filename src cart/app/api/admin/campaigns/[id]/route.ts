import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helper';

// GET /api/admin/campaigns/[id] - Get campaign details with recipients
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;

  try {
    const campaign = await db.corporateCampaign.findUnique({
      where: { id },
      include: {
        corporate: {
          select: {
            id: true,
            companyName: true,
            slug: true,
            approvalStatus: true,
            contactName: true,
            contactEmail: true,
          },
        },
        product: {
          select: { id: true, name: true, slug: true, price: true },
        },
        recipients: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const { recipients, ...campaignData } = campaign;
    return NextResponse.json({
      campaign: {
        ...campaignData,
        recipientCount: recipients.length,
        recipients,
      },
    });
  } catch (err) {
    console.error('Error fetching campaign details:', err);
    return NextResponse.json(
      { error: 'Failed to fetch campaign details' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/campaigns/[id] - Approve/reject/manage campaigns
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;

  try {
    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = ['approved', 'rejected', 'in_progress', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Find the campaign
    const campaign = await db.corporateCampaign.findUnique({
      where: { id },
      include: {
        corporate: {
          select: {
            id: true,
            companyName: true,
            slug: true,
            approvalStatus: true,
            contactName: true,
            contactEmail: true,
          },
        },
        _count: {
          select: { recipients: true },
        },
        product: {
          select: { id: true, name: true, slug: true, price: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Validate status transitions
    const allowedTransitions: Record<string, string[]> = {
      pending_approval: ['approved', 'rejected'],
      approved: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      draft: ['cancelled'],
      rejected: [],
      completed: [],
      cancelled: [],
    };

    const allowed = allowedTransitions[campaign.status];
    if (!allowed || !allowed.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition campaign from "${campaign.status}" to "${status}"` },
        { status: 400 }
      );
    }

    const updatedCampaign = await db.corporateCampaign.update({
      where: { id },
      data: { status },
      include: {
        corporate: {
          select: {
            id: true,
            companyName: true,
            slug: true,
            approvalStatus: true,
            contactName: true,
            contactEmail: true,
          },
        },
        _count: {
          select: { recipients: true },
        },
        product: {
          select: { id: true, name: true, slug: true, price: true },
        },
      },
    });

    const { _count, ...campaignData } = updatedCampaign;
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
