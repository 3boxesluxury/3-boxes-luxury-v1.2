import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helper';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const corporate = await db.corporateAccount.findUnique({
      where: { id },
    });

    if (!corporate) {
      return NextResponse.json({ error: 'Corporate account not found' }, { status: 404 });
    }

    await db.corporateAccount.update({
      where: { id },
      data: { approvalStatus: status },
    });

    // If approved, also set the linked user's approvalStatus to "approved"
    if (status === 'approved') {
      await db.user.update({
        where: { id: corporate.userId },
        data: { approvalStatus: 'approved' },
      });
    }

    if (status === 'suspended') {
      await db.user.update({
        where: { id: corporate.userId },
        data: { approvalStatus: 'suspended', isActive: false },
      });
    }

    // Create audit log
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    await db.auditLog.create({
      data: {
        action: 'corporate_status_change',
        entity: 'corporate',
        entityId: id,
        details: JSON.stringify({
          companyName: corporate.companyName,
          newStatus: status,
          previousStatus: corporate.approvalStatus,
        }),
        ipAddress: ip,
      },
    });

    return NextResponse.json({
      message: `Corporate account status updated to ${status}`,
      corporateId: id,
      status,
    });
  } catch (error) {
    console.error('Corporate status update error:', error);
    return NextResponse.json({ error: 'Failed to update corporate status' }, { status: 500 });
  }
}
