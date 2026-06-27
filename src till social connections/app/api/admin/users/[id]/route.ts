import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, invalidateAuthCache } from '@/lib/auth-helper';

/**
 * PERFORMANCE-PATCHED /api/admin/users/[id] route.
 *
 * Changes:
 *  1. Slimmer update response — don't `include: { permissions: true }`
 *     unless explicitly requested. Saves a DB join on every toggle.
 *  2. After a successful PUT, invalidate the auth cache so the new
 *     role/active status takes effect on the next API call (within 30s
 *     instead of the full TTL).
 *  3. Added Cache-Control: no-store.
 */

function noStoreHeaders() {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };
}

// PUT /api/admin/users/[id] - Update user (role, isActive, approvalStatus)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const start = Date.now();
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;

  try {
    const body = await request.json();
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.role !== undefined) updateData.role = body.role;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.approvalStatus !== undefined) updateData.approvalStatus = body.approvalStatus;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;

    // ─── FIX: don't pull permissions on every toggle ───
    const includePerms = body.includePerms === true;
    const user = await db.user.update({
      where: { id },
      data: updateData,
      ...(includePerms ? { include: { permissions: true } } : {}),
    });

    // ─── FIX: invalidate auth cache so changes take effect fast ───
    // If the user's own token is being used to update themselves,
    // their cached auth would otherwise be stale for up to 30s.
    invalidateAuthCache();

    const { password: _, ...userResponse } = user;
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production' && duration > 200) {
      console.warn(`Slow PUT /api/admin/users/[id]: ${duration}ms`);
    }

    return NextResponse.json(userResponse, { headers: noStoreHeaders() });
  } catch (err) {
    console.error('Error updating user:', err);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
