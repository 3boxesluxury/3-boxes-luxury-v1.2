import { NextRequest, NextResponse } from 'next/server';
import { getSessionAsync } from '@/lib/sessions';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Verify session
    const auth = request.headers.get('authorization');
    const user = await getSessionAsync(auth?.replace('Bearer ', '') ?? '');

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Try to fetch fresh user data from DB with permissions
    try {
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        include: {
          permissions: {
            select: {
              id: true,
              permission: true,
            },
          },
        },
      });

      if (dbUser) {
        return NextResponse.json({
          user: {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
            avatar: dbUser.avatar,
            phone: dbUser.phone,
            isActive: dbUser.isActive,
            emailVerified: dbUser.emailVerified,
            phoneVerified: dbUser.phoneVerified,
            twoFactorEnabled: dbUser.twoFactorEnabled,
            approvalStatus: dbUser.approvalStatus,
            socialProvider: dbUser.socialProvider,
            createdAt: dbUser.createdAt,
            updatedAt: dbUser.updatedAt,
          },
          permissions: dbUser.permissions.map((p) => p.permission),
        });
      }
    } catch {
      // DB unavailable — return session user data (sufficient for Vercel)
    }

    // Return session user data when DB is not available (Vercel serverless)
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        phone: null,
        isActive: true,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        approvalStatus: user.approvalStatus,
        socialProvider: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      permissions: getDemoPermissions(user.role),
      _demo: true,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching profile' },
      { status: 500 }
    );
  }
}

// Default permissions per role (used when DB is unavailable)
function getDemoPermissions(role: string): string[] {
  const rolePermissions: Record<string, string[]> = {
    admin: ['products.manage', 'orders.manage', 'users.approve', 'users.manage', 'reports.view', 'settings.manage', 'inventory.manage'],
    user: ['orders.own', 'cart.manage', 'wishlist.manage', 'profile.own'],
    agent: ['orders.view', 'orders.manage', 'products.view', 'customers.view', 'reports.view'],
    team: ['orders.view', 'products.view', 'inventory.manage', 'reports.view'],
    corporate: ['corporate.manage', 'campaigns.manage', 'branding.manage', 'recipients.manage'],
  };
  return rolePermissions[role] || [];
}
