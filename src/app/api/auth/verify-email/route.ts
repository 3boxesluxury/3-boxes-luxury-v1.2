import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Verification token is required' }, { status: 400 });
    }

    const user = await db.user.findFirst({
      where: {
        emailVerifyToken: token,
        emailVerifyExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiry: null,
      },
    });

    // If this is a corporate user and email is now verified, keep approval status as pending
    // Admin needs to separately approve the corporate account

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'email_verified',
        entity: 'user',
        entityId: user.id,
        ipAddress: ip,
        userAgent,
      },
    });

    return NextResponse.json({
      message: 'Email verified successfully',
      email: user.email,
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
