import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helper';

// GET /api/admin/corporate - List all corporate accounts with approval status
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const approvalStatus = searchParams.get('approvalStatus') || '';

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { contactEmail: { contains: search } },
        { contactName: { contains: search } },
        { slug: { contains: search } },
      ];
    }
    if (approvalStatus) where.approvalStatus = approvalStatus;

    const [accounts, total] = await Promise.all([
      db.corporateAccount.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              isActive: true,
              approvalStatus: true,
              createdAt: true,
            },
          },
          _count: {
            select: { campaigns: true },
          },
          branding: {
            select: { id: true, logoUrl: true, primaryColor: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.corporateAccount.count({ where }),
    ]);

    const accountsFormatted = accounts.map(({ _count, ...account }) => ({
      ...account,
      campaignCount: _count.campaigns,
    }));

    return NextResponse.json({
      accounts: accountsFormatted,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Error fetching corporate accounts:', err);
    return NextResponse.json(
      { error: 'Failed to fetch corporate accounts' },
      { status: 500 }
    );
  }
}
