import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limiter';
import { validateInput, forgotPasswordSchema } from '@/lib/validations/auth';
import { addApiLog, getClientIpFromRequest } from '@/lib/api-logger';
import { sendPasswordResetEmail, send2FAEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Rate limiting
    const rateLimit = checkRateLimit('forgot-password', ip);
    if (!rateLimit.allowed) {
      addApiLog({
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/api/auth/forgot-password',
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
    const validation = validateInput(forgotPasswordSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    const { email, phone } = validation.data;

    if (email) {
      const user = await db.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (user) {
        const crypto = await import('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

        await db.user.update({
          where: { id: user.id },
          data: { resetToken, resetTokenExpiry },
        });

        await db.auditLog.create({
          data: {
            userId: user.id,
            action: 'forgot_password_request',
            entity: 'user',
            entityId: user.id,
            details: JSON.stringify({ method: 'email' }),
            ipAddress: ip,
            userAgent,
          },
        });

        // Actually send the password reset email
        const emailSent = await sendPasswordResetEmail(user.email, resetToken);
        if (!emailSent) {
          console.warn('[Forgot Password] Failed to send reset email to:', user.email);
        }

        addApiLog({
          timestamp: new Date().toISOString(),
          method: 'POST',
          path: '/api/auth/forgot-password',
          statusCode: 200,
          responseTime: Date.now() - startTime,
          ip,
          userAgent,
          userId: user.id,
        });

        return NextResponse.json({
          message: 'If an account exists with this email, a reset link has been sent.',
          emailSent,
          // Only include resetToken in dev mode for testing
          ...(process.env.NODE_ENV !== 'production' ? { resetToken, email: user.email } : {}),
        });
      }

      addApiLog({
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/api/auth/forgot-password',
        statusCode: 200,
        responseTime: Date.now() - startTime,
        ip,
        userAgent,
      });

      return NextResponse.json({
        message: 'If an account exists with this email, a reset link has been sent.',
      });
    }

    if (phone) {
      // Find user by phone - may be encrypted
      const users = await db.user.findMany({
        where: { phone: { not: null } },
      });

      const { decrypt } = await import('@/lib/encryption');
      const user = users.find((u) => {
        const decryptedPhone = decrypt(u.phone);
        return decryptedPhone === phone.trim();
      });

      if (user) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        await db.user.update({
          where: { id: user.id },
          data: { otpCode: otp, otpExpiry },
        });

        await db.auditLog.create({
          data: {
            userId: user.id,
            action: 'forgot_password_request',
            entity: 'user',
            entityId: user.id,
            details: JSON.stringify({ method: 'phone' }),
            ipAddress: ip,
            userAgent,
          },
        });

        // Also send OTP via email if user has an email on file
        if (user.email) {
          const emailSent = await send2FAEmail(user.email, otp);
          if (!emailSent) {
            console.warn('[Forgot Password] Failed to send OTP email to:', user.email);
          }
        }

        addApiLog({
          timestamp: new Date().toISOString(),
          method: 'POST',
          path: '/api/auth/forgot-password',
          statusCode: 200,
          responseTime: Date.now() - startTime,
          ip,
          userAgent,
          userId: user.id,
        });

        return NextResponse.json({
          message: 'If an account exists with this phone, an OTP has been sent.',
          // Only include OTP in dev mode for testing
          ...(process.env.NODE_ENV !== 'production' ? { otp, phone: user.phone } : {}),
        });
      }

      addApiLog({
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/api/auth/forgot-password',
        statusCode: 200,
        responseTime: Date.now() - startTime,
        ip,
        userAgent,
      });

      return NextResponse.json({
        message: 'If an account exists with this phone, an OTP has been sent.',
      });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Forgot password error:', error);

    addApiLog({
      timestamp: new Date().toISOString(),
      method: 'POST',
      path: '/api/auth/forgot-password',
      statusCode: 500,
      responseTime: Date.now() - startTime,
      ip,
      userAgent,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
