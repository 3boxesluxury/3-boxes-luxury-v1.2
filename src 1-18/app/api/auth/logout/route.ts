import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth-helper';

export async function POST(request: NextRequest) {
  try {
    const auth = await getSessionFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find and delete the session
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.headers.get('x-session-token');

    if (token) {
      await db.session.deleteMany({
        where: { token },
      });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    await db.auditLog.create({
      data: {
        userId: auth.userId,
        action: 'logout',
        entity: 'user',
        entityId: auth.userId,
        ipAddress: ip,
        userAgent,
      },
    });

    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
