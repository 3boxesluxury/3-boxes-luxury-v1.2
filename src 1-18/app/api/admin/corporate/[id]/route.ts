import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helper';

// PUT /api/admin/corporate/[id] - Approve/reject corporate accounts
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;

  try {
    const body = await request.json();
    const { approvalStatus, creditLimit, discountPercent, notes } = body;

    // Validate approvalStatus
    if (approvalStatus && !['approved', 'rejected'].includes(approvalStatus)) {
      return NextResponse.json(
        { error: 'Invalid approvalStatus. Must be "approved" or "rejected"' },
        { status: 400 }
      );
    }

    // Find the corporate account
    const corporateAccount = await db.corporateAccount.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!corporateAccount) {
      return NextResponse.json(
        { error: 'Corporate account not found' },
        { status: 404 }
      );
    }

    // Update in a transaction to keep both in sync
    const result = await db.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {};
      if (approvalStatus !== undefined) updateData.approvalStatus = approvalStatus;
      if (creditLimit !== undefined) updateData.creditLimit = Number(creditLimit);
      if (discountPercent !== undefined) updateData.discountPercent = Number(discountPercent);
      if (notes !== undefined) updateData.notes = notes?.trim() || null;

      const updated = await tx.corporateAccount.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              isActive: true,
              approvalStatus: true,
            },
          },
          _count: {
            select: { campaigns: true },
          },
        },
      });

      // Also update the linked User's approvalStatus to match
      if (approvalStatus) {
        await tx.user.update({
          where: { id: corporateAccount.userId },
          data: { approvalStatus },
        });

        // Update the included user in response
        updated.user.approvalStatus = approvalStatus;
      }

      return updated;
    });

    const { _count, ...accountData } = result;
    return NextResponse.json({
      account: {
        ...accountData,
        campaignCount: _count.campaigns,
      },
    });
  } catch (err) {
    console.error('Error updating corporate account:', err);
    return NextResponse.json(
      { error: 'Failed to update corporate account' },
      { status: 500 }
    );
  }
}
