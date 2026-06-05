import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { setOtp, DEMO_USER_MAP } from '@/lib/demo-otp-store';
import { send2FAEmailWithDetails } from '@/lib/email';

/**
 * Send (or resend) an email-based OTP for 2FA verification.
 * This is used when a user's login requires email-based 2FA.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email } = body;

    if (!userId && !email) {
      return NextResponse.json(
        { error: 'User ID or email is required' },
        { status: 400 }
      );
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    let targetEmail = email || '';

    // For demo users, use in-memory store
    if (userId && userId.startsWith('demo-')) {
      const demoData = DEMO_USER_MAP[userId];
      if (demoData) {
        targetEmail = demoData.email;
      }
      setOtp(userId, otp, targetEmail, 5);
    } else {
      // For real DB users, store OTP in DB
      try {
        if (userId) {
          const user = await db.user.findUnique({ where: { id: userId } });
          if (user) {
            const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
            await db.user.update({
              where: { id: user.id },
              data: { otpCode: otp, otpExpiry },
            });
            targetEmail = user.email;
          }
        } else if (email) {
          const user = await db.user.findUnique({ where: { email } });
          if (user) {
            const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
            await db.user.update({
              where: { id: user.id },
              data: { otpCode: otp, otpExpiry },
            });
            targetEmail = user.email;
          }
        }
      } catch (dbErr) {
        console.warn('[2FA Email OTP] DB update failed, using in-memory store:', dbErr);
        // Fallback to in-memory store
        setOtp(userId || email, otp, targetEmail, 5);
      }
    }

    // Actually send the 2FA verification code via email (non-blocking)
    if (targetEmail) {
      const resendTargetEmail = targetEmail;
      const resendOtp = otp;
      send2FAEmailWithDetails(resendTargetEmail, resendOtp).then((emailResult) => {
        if (emailResult.success) {
          console.log('[2FA Email OTP] ✅ Email sent to:', resendTargetEmail);
        } else {
          console.warn('[2FA Email OTP] ❌ Failed to send email to:', resendTargetEmail);
        }
        if (emailResult.ethereal && emailResult.previewUrl) {
          console.log('[2FA Email OTP] 📬 Ethereal preview URL:', emailResult.previewUrl);
        }
      }).catch((err) => {
        console.error('[2FA Email OTP] Email send error:', err);
      });
    }

    console.log(`[2FA Email OTP] OTP generated for ${targetEmail || userId}`);

    const maskedEmail = targetEmail
      ? targetEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')
      : 'your email';

    return NextResponse.json({
      success: true,
      message: `A verification code has been sent to ${maskedEmail}`,
      email: maskedEmail,
      // Show OTP for admin login (email not configured for real delivery yet)
      _otp: otp,
    });
  } catch (error) {
    console.error('Email OTP send error:', error);
    return NextResponse.json(
      { error: 'An error occurred while sending the verification code' },
      { status: 500 }
    );
  }
}
