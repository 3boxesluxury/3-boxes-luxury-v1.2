import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helper';

// GET /api/admin/campaigns - List all campaigns across all corporate accounts
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || '';
    const corporateId = searchParams.get('corporateId') || '';
    const search = searchParams.get('search') || '';

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (corporateId) where.corporateId = corporateId;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { occasion: { contains: search } },
      ];
    }

    const [campaigns, total] = await Promise.all([
      db.corporateCampaign.findMany({
        where,
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
