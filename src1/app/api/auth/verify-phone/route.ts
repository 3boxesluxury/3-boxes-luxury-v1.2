import { NextRequest, NextResponse } from 'next/server';
import { getSessionAsync } from '@/lib/sessions';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    // Get user from DB to check phone verification data
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has a phone number set
    if (!dbUser.phone) {
      return NextResponse.json(
        { error: 'No phone number associated with this account' },
        { status: 400 }
      );
    }

    // Check if phone is already verified
    if (dbUser.phoneVerified) {
      return NextResponse.json(
        { error: 'Phone number is already verified' },
        { status: 400 }
      );
    }

    // Check if verification code exists
    if (!dbUser.phoneVerifyCode) {
      return NextResponse.json(
        { error: 'No verification code found. Please request a new code.' },
        { status: 400 }
      );
    }

    // Check if code has expired
    if (!dbUser.phoneVerifyExpiry || dbUser.phoneVerifyExpiry < new Date()) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    // Check if code matches
    if (dbUser.phoneVerifyCode !== code) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 401 }
      );
    }

    // Mark phone as verified and clear verification data
    await db.user.update({
      where: { id: user.id },
      data: {
        phoneVerified: true,
        phoneVerifyCode: null,
        phoneVerifyExpiry: null,
      },
    });

    return NextResponse.json({
      message: 'Phone number verified successfully',
      phoneVerified: true,
    });
  } catch (error) {
    console.error('Phone verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred during phone verification' },
      { status: 500 }
    );
  }
}
