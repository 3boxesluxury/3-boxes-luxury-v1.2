import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helper';

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    // Only show non-expired sessions
    where.expiresAt = { gt: new Date() };

    const [sessions, total] = await Promise.all([
      db.session.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, name: true, role: true },
          },
        },
        orderBy: { lastActivity: 'desc' },
        skip,
        take: limit,
      }),
      db.session.count({ where }),
    ]);

    return NextResponse.json({
      sessions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Sessions error:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const session = await db.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await db.session.delete({
      where: { id: sessionId },
    });

    // Create audit log
    if (adminCheck.user) {
      await db.auditLog.create({
        data: {
          action: 'session_revoked',
          entity: 'session',
          entityId: sessionId,
          details: JSON.stringify({ revokedUserId: session.userId }),
        },
      });
    }

    return NextResponse.json({ message: 'Session revoked successfully' });
  } catch (error) {
    console.error('Session revoke error:', error);
    return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 });
  }
}
