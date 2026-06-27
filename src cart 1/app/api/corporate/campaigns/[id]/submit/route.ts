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
    include: {
      _count: {
        select: { recipients: true },
      },
    },
  });

  if (!campaign) {
    return { error: NextResponse.json({ error: 'Campaign not found' }, { status: 404 }), user: null, campaign: null };
  }

  return { error: null, user: session, corporateAccount, campaign };
}

// POST /api/corporate/campaigns/[id]/submit - Submit campaign for approval
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, campaign } = await verifyCorporateAndCampaign(request, id);
  if (error) return error;

  try {
    // Can only submit draft campaigns
    if (campaign!.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft campaigns can be submitted for approval' },
        { status: 400 }
      );
    }

    // Must have at least 1 recipient
    const recipientCount = campaign!._count.recipients;
    if (recipientCount === 0) {
      return NextResponse.json(
        { error: 'Campaign must have at least one recipient before submitting for approval' },
        { status: 400 }
      );
    }

    const updatedCampaign = await db.corporateCampaign.update({
      where: { id: campaign!.id },
      data: {
        status: 'pending_approval',
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

    const { _count, ...campaignData } = updatedCampaign;
    return NextResponse.json({
      message: 'Campaign submitted for approval',
      campaign: {
        ...campaignData,
        recipientCount: _count.recipients,
      },
    });
  } catch (err) {
    console.error('Error submitting campaign:', err);
    return NextResponse.json(
      { error: 'Failed to submit campaign for approval' },
      { status: 500 }
    );
  }
}
