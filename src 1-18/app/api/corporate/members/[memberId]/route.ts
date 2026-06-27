import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth-helper';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const auth = await getSessionFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { role, status } = body;

    const user = await db.user.findUnique({
      where: { id: auth.userId },
    });

    if (user?.corporateRole !== 'corporate_admin') {
      return NextResponse.json({ error: 'Only corporate admins can update members' }, { status: 403 });
    }

    const member = await db.corporateMember.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (role) {
      const validRoles = ['corporate_admin', 'finance_user', 'campaign_manager'];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      updateData.role = role;

      // Also update user's corporateRole
      if (member.userId) {
        await db.user.update({
          where: { id: member.userId },
          data: { corporateRole: role },
        });
      }
    }

    if (status) {
      const validStatuses = ['pending', 'active', 'suspended'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateData.status = status;
      if (status === 'active' && !member.joinedAt) {
        updateData.joinedAt = new Date();
      }
    }

    const updatedMember = await db.corporateMember.update({
      where: { id: memberId },
      data: updateData,
    });

    return NextResponse.json({ member: updatedMember });
  } catch (error) {
    console.error('Update corporate member error:', error);
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const auth = await getSessionFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await db.user.findUnique({
      where: { id: auth.userId },
    });

    if (user?.corporateRole !== 'corporate_admin') {
      return NextResponse.json({ error: 'Only corporate admins can remove members' }, { status: 403 });
    }

    await db.corporateMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Delete corporate member error:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
