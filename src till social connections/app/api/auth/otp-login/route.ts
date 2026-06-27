import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateTokenPair, generateToken, createSession } from '@/lib/sessions';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limiter';
import { validateInput, otpLoginSchema } from '@/lib/validations/auth';
import { decrypt } from '@/lib/encryption';
import { addApiLog, getClientIpFromRequest } from '@/lib/api-logger';

const OTP_EXPIRY_MINUTES = 5;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Rate limiting
    const rateLimit = checkRateLimit('otp-login', ip);
    if (!rateLimit.allowed) {
      addApiLog({
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/api/auth/otp-login',
        statusCode: 429,
        responseTime: Date.now() - startTime,
        ip,
        userAgent,
        error: 'Rate limit exceeded',
      });
      return rateLimitResponse(rateLimit);
    }

    const body = await request.json();

    // Zod input validation
    const validation = validateInput(otpLoginSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    const { phone, otp, requestId } = validation.data;

    // Step 1: Request OTP
    if (phone && !otp) {
      // Try to find user by phone - need to check all users since phone may be encrypted
      const users = await db.user.findMany({
        where: { phone: { not: null } },
      });

      // Find user with matching phone (decrypt and compare)
      const user = users.find((u) => {
        const decryptedPhone = decrypt(u.phone);
        return decryptedPhone === phone.trim();
      });

      if (!user) {
        return NextResponse.json(
          { error: 'No account found with this phone number' },
          { status: 404 }
        );
      }

      if (!user.isActive) {
        return NextResponse.json(
          { error: 'Account is deactivated' },
          { status: 403 }
        );
      }

      if (user.approvalStatus === 'rejected' || user.approvalStatus === 'suspended') {
        return NextResponse.json(
          { error: `Account is ${user.approvalStatus}. Please contact support.` },
          { status: 403 }
        );
      }

      // Check account lock
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        const remainingMin = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / (60 * 1000));
        return NextResponse.json(
          { error: `Account is locked. Try again in ${remainingMin} minutes.` },
          { status: 423 }
        );
      }

      // Generate 6-digit OTP with 5-minute expiry
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      await db.user.update({
        where: { id: user.id },
        data: { otpCode, otpExpiry },
      });

      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'otp_login_request',
          entity: 'user',
          entityId: user.id,
          details: JSON.stringify({ phone: phone.trim() }),
          ipAddress: ip,
          userAgent,
        },
      });

      // For MVP: return OTP in response
      return NextResponse.json({
        message: 'OTP sent to your phone number',
        requestId: user.id,
        otp: otpCode, // MVP only
        expiresIn: OTP_EXPIRY_MINUTES * 60,
      });
    }

    // Step 2: Verify OTP and login
    if (requestId && otp) {
      const user = await db.user.findUnique({
        where: { id: requestId },
      });

      if (!user) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
      }

      if (user.otpCode !== otp) {
        return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
      }

      // Enforce 5-minute OTP expiry
      if (!user.otpExpiry || user.otpExpiry < new Date()) {
        return NextResponse.json(
          { error: 'OTP has expired. Please request a new one.' },
          { status: 400 }
        );
      }

      if (user.approvalStatus === 'pending') {
        return NextResponse.json(
          { error: 'Your account is pending admin approval.' },
          { status: 403 }
        );
      }

      if (user.approvalStatus === 'rejected' || user.approvalStatus === 'suspended') {
        return NextResponse.json(
          { error: `Account is ${user.approvalStatus}.` },
          { status: 403 }
        );
      }

      // Check if 2FA is required
      if (user.twoFactorEnabled || user.twoFactorRequired) {
        return NextResponse.json({
          requiresTwoFactor: true,
          userId: user.id,
        });
      }

      // Clear OTP fields and reset failed attempts
      await db.user.update({
        where: { id: user.id },
        data: {
          otpCode: null,
          otpExpiry: null,
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
          lastLoginIp: ip,
          lastLoginDevice: userAgent,
        },
      });

      // Get user permissions
      const userWithPerms = await db.user.findUnique({
        where: { id: user.id },
        include: { permissions: { select: { permission: true } } },
      });
      const permissions = userWithPerms?.permissions.map((p) => p.permission) || [];

      // Generate JWT token pair
      const tokenPair = await generateTokenPair(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          isActive: user.isActive,
          approvalStatus: user.approvalStatus,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          twoFactorEnabled: user.twoFactorEnabled,
        },
        permissions
      );

      // Legacy session for backward compatibility
      const legacyToken = generateToken();
      await db.session.create({
        data: {
          token: legacyToken,
          userId: user.id,
          ipAddress: ip,
          userAgent,
          deviceInfo: userAgent.substring(0, 200),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          lastActivity: new Date(),
        },
      });

      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'otp_login_success',
          entity: 'user',
          entityId: user.id,
          ipAddress: ip,
          userAgent,
        },
      });

      addApiLog({
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/api/auth/otp-login',
        statusCode: 200,
        responseTime: Date.now() - startTime,
        ip,
        userAgent,
        userId: user.id,
      });

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          phone: user.phone,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          phoneVerified: true,
          twoFactorEnabled: user.twoFactorEnabled,
          approvalStatus: user.approvalStatus,
          adminRole: user.adminRole,
          corporateRole: user.corporateRole,
          permissions,
        },
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        accessExpiresAt: tokenPair.accessExpiresAt,
        refreshExpiresAt: tokenPair.refreshExpiresAt,
        token: legacyToken,
      });
    }

    return NextResponse.json({ error: 'Invalid request. Provide phone or requestId + otp.' }, { status: 400 });
  } catch (error) {
    console.error('OTP login error:', error);

    addApiLog({
      timestamp: new Date().toISOString(),
      method: 'POST',
      path: '/api/auth/otp-login',
      statusCode: 500,
      responseTime: Date.now() - startTime,
      ip,
      userAgent,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
