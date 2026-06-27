import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { validatePassword } from '@/lib/password-validator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, otp, phone, newPassword } = body;

    if (!newPassword) {
      return NextResponse.json({ error: 'New password is required' }, { status: 400 });
    }

    // Validate password strength
    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: 'Password does not meet requirements', details: passwordCheck.errors },
        { status: 400 }
      );
    }

    let userId: string | null = null;

    if (token) {
      // Email-based reset
      const user = await db.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: { gt: new Date() },
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Invalid or expired reset token' },
          { status: 400 }
        );
      }

      userId = user.id;
    } else if (otp && phone) {
      // Phone-based reset
      const user = await db.user.findFirst({
        where: {
          phone: phone.trim(),
          otpCode: otp,
          otpExpiry: { gt: new Date() },
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Invalid OTP or phone number' },
          { status: 400 }
        );
      }

      userId = user.id;
    } else {
      return NextResponse.json(
        { error: 'Reset token or OTP + phone is required' },
        { status: 400 }
      );
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user: set new password, clear reset fields
    await db.user.update({
      where: { id: userId! },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        otpCode: null,
        otpExpiry: null,
      },
    });

    // Create audit log
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    await db.auditLog.create({
      data: {
        userId: userId!,
        action: 'password_reset',
        entity: 'user',
        entityId: userId!,
        details: JSON.stringify({ method: token ? 'email' : 'phone' }),
        ipAddress: ip,
        userAgent,
      },
    });

    // Delete all existing sessions for this user (force re-login)
    await db.session.deleteMany({
      where: { userId: userId! },
    });

    return NextResponse.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
