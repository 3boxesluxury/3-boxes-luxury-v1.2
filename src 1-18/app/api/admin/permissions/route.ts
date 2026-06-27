import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helper';

// GET /api/admin/permissions - List permissions for a user
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId query parameter is required' }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { permissions: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: user.permissions.map((p) => p.permission),
  });
}

// POST /api/admin/permissions - Update permissions for a user
export async function POST(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { userId, permissions } = body;

    if (!userId || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'userId and permissions array are required' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete existing permissions and create new ones in a transaction
    await db.$transaction([
      db.userPermission.deleteMany({ where: { userId } }),
      db.userPermission.createMany({
        data: permissions.map((permission: string) => ({
          userId,
          permission,
        })),
      }),
    ]);

    const updatedUser = await db.user.findUnique({
      where: { id: userId },
      include: { permissions: true },
    });

    return NextResponse.json({
      userId: updatedUser!.id,
      email: updatedUser!.email,
      name: updatedUser!.name,
      role: updatedUser!.role,
      permissions: updatedUser!.permissions.map((p) => p.permission),
    });
  } catch (err) {
    console.error('Error updating permissions:', err);
    return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 });
  }
}
