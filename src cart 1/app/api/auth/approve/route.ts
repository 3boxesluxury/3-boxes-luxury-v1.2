import { NextRequest, NextResponse } from 'next/server';
import { getSessionAsync } from '@/lib/sessions';
import { db } from '@/lib/db';

// Default permissions by role
const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'products.manage',
    'orders.manage',
    'users.approve',
    'users.manage',
    'reports.view',
    'settings.manage',
    'inventory.manage',
  ],
  user: [
    'orders.own',
    'cart.manage',
    'wishlist.manage',
    'profile.own',
  ],
  agent: [
    'orders.view',
    'orders.manage',
    'products.view',
    'customers.view',
    'reports.view',
  ],
  team: [
    'orders.view',
    'products.view',
    'inventory.manage',
    'reports.view',
  ],
};

export async function POST(request: NextRequest) {
  try {
    // Verify admin session
    const auth = request.headers.get('authorization');
    const user = await getSessionAsync(auth?.replace('Bearer ', '') ?? '');

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can approve users' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, action } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'User ID and action (approve/reject) are required' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Find the target user
    const targetUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Don't allow approving/rejecting already processed users
    if (targetUser.approvalStatus !== 'pending') {
      return NextResponse.json(
        { error: `User is already ${targetUser.approvalStatus}` },
        { status: 400 }
      );
    }

    // Don't allow admin to approve/reject themselves
    if (targetUser.id === user.id) {
      return NextResponse.json(
        { error: 'You cannot approve or reject your own account' },
        { status: 400 }
      );
    }

    // Update the user's approval status
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { approvalStatus: newStatus },
    });

    // If approved, ensure they have their default permissions
    if (action === 'approve') {
      const existingPermissions = await db.userPermission.findMany({
        where: { userId: targetUser.id },
      });

      if (existingPermissions.length === 0) {
        const permissions = DEFAULT_PERMISSIONS[targetUser.role] || DEFAULT_PERMISSIONS.user;
        for (const perm of permissions) {
          await db.userPermission.create({
            data: {
              userId: targetUser.id,
              permission: perm,
            },
          }).catch(() => {}); // Ignore duplicate errors
        }
      }
    }

    return NextResponse.json({
      message: `User has been ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        approvalStatus: updatedUser.approvalStatus,
        isActive: updatedUser.isActive,
      },
    });
  } catch (error) {
    console.error('User approval error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing the approval' },
      { status: 500 }
    );
  }
}
