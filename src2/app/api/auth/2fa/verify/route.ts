import { NextRequest, NextResponse } from 'next/server';
import { getSessionAsync, createSession } from '@/lib/sessions';
import { db } from '@/lib/db';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { verifyOtp, DEMO_USER_MAP } from '@/lib/demo-otp-store';

const JWT_SECRET = process.env.JWT_SECRET || '3boxes-secret-key';

/**
 * Verify a TOTP code against a secret.
 * Implements TOTP algorithm per RFC 6238.
 */
function verifyTOTP(secret: string, code: string, window: number = 1): boolean {
  const key = base32Decode(secret);
  const timeStep = Math.floor(Date.now() / 1000 / 30);

  for (let i = -window; i <= window; i++) {
    const step = timeStep + i;
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigUInt64BE(BigInt(step));

    const hmac = crypto.createHmac('sha1', key);
    hmac.update(timeBuffer);
    const hmacResult = hmac.digest();

    const offset = hmacResult[hmacResult.length - 1] & 0x0f;
    const binary =
      ((hmacResult[offset] & 0x7f) << 24) |
      ((hmacResult[offset + 1] & 0xff) << 16) |
      ((hmacResult[offset + 2] & 0xff) << 8) |
      (hmacResult[offset + 3] & 0xff);

    const otp = binary % 1000000;
    const otpString = otp.toString().padStart(6, '0');

    if (otpString === code) {
      return true;
    }
  }

  return false;
}

function base32Decode(str: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  str = str.toUpperCase().replace(/=+$/, '');

  let bits = '';
  for (const char of str) {
    const index = alphabet.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, enable, userId, method } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    // If this is a login 2FA verification (userId provided, no session)
    if (userId && !enable) {
      const isEmailMethod = method === 'email' || userId.startsWith('demo-');

      // ─── Email OTP Verification ───
      if (isEmailMethod) {
        let verified = false;
        let user: Awaited<ReturnType<typeof db.user.findUnique>> = null;

        // For demo users: check in-memory OTP store first
        if (userId.startsWith('demo-')) {
          const result = verifyOtp(userId, code);
          if (result.valid) {
            verified = true;
          }
        } else {
          // For real DB users: check DB for OTP
          try {
            user = await db.user.findUnique({ where: { id: userId } });
            if (user && user.otpCode && user.otpExpiry) {
              if (new Date() <= new Date(user.otpExpiry) && user.otpCode === code) {
                verified = true;
                // Clear the OTP after successful verification
                await db.user.update({
                  where: { id: user.id },
                  data: { otpCode: null, otpExpiry: null },
                }).catch(() => {});
              }
            }
          } catch (dbErr) {
            console.warn('[2FA Verify] DB lookup failed, checking in-memory store:', dbErr);
            // Fallback to in-memory store
            const result = verifyOtp(userId, code);
            if (result.valid) {
              verified = true;
            }
          }
        }

        if (!verified) {
          return NextResponse.json(
            { error: 'Invalid or expired verification code. Please try again.' },
            { status: 401 }
          );
        }

        // If user found in DB, use DB user data for session creation
        if (user) {
          if (!user.isActive) {
            return NextResponse.json(
              { error: 'Your account has been deactivated' },
              { status: 403 }
            );
          }

          const jwtToken = jwt.sign(
            { type: 'session', userId: user.id, email: user.email, name: user.name, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
          );

          try {
            await createSession(jwtToken, {
              id: user.id, email: user.email, name: user.name, role: user.role,
              avatar: user.avatar, isActive: user.isActive, approvalStatus: user.approvalStatus,
              emailVerified: user.emailVerified, phoneVerified: user.phoneVerified,
              twoFactorEnabled: user.twoFactorEnabled,
            });
          } catch (sessionError) {
            console.warn('[Auth 2FA] DB session creation failed, JWT-only auth:', sessionError);
          }

          return NextResponse.json({
            user: {
              id: user.id, email: user.email, name: user.name, role: user.role,
              avatar: user.avatar, phone: user.phone, isActive: user.isActive,
              emailVerified: user.emailVerified, phoneVerified: user.phoneVerified,
              twoFactorEnabled: user.twoFactorEnabled, approvalStatus: user.approvalStatus,
              createdAt: user.createdAt,
            },
            token: jwtToken,
            verified: true,
          });
        }

        // Demo user fallback - construct user from userId
        const demoUserData = DEMO_USER_MAP[userId];
        if (demoUserData) {
          const jwtToken = jwt.sign(
            {
              type: 'session',
              userId,
              email: demoUserData.email,
              name: demoUserData.name,
              role: demoUserData.role,
              permissions: demoUserData.permissions,
            },
            JWT_SECRET,
            { expiresIn: '7d' }
          );

          try {
            await createSession(jwtToken, {
              id: userId, email: demoUserData.email, name: demoUserData.name,
              role: demoUserData.role, avatar: null, isActive: true,
              approvalStatus: 'approved', emailVerified: true, phoneVerified: false,
              twoFactorEnabled: true,
            });
          } catch {
            console.log('[Auth 2FA] DB session creation failed, using JWT-only for demo user');
          }

          return NextResponse.json({
            user: {
              id: userId, email: demoUserData.email, name: demoUserData.name,
              role: demoUserData.role, avatar: null, phone: null, isActive: true,
              emailVerified: true, phoneVerified: false, twoFactorEnabled: true,
              approvalStatus: 'approved', createdAt: new Date().toISOString(),
            },
            token: jwtToken,
            permissions: demoUserData.permissions,
            verified: true,
            _demo: true,
          });
        }

        return NextResponse.json(
          { error: 'User not found. Please try logging in again.' },
          { status: 400 }
        );
      }

      // ─── TOTP Verification (Authenticator App) ───
      const user = await db.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        return NextResponse.json(
          { error: 'Invalid 2FA verification request' },
          { status: 400 }
        );
      }

      if (!verifyTOTP(user.twoFactorSecret, code)) {
        return NextResponse.json(
          { error: 'Invalid verification code' },
          { status: 401 }
        );
      }

      if (!user.isActive) {
        return NextResponse.json(
          { error: 'Your account has been deactivated' },
          { status: 403 }
        );
      }

      if (user.approvalStatus !== 'approved') {
        return NextResponse.json(
          { error: 'Your account is not approved', approvalStatus: user.approvalStatus },
          { status: 403 }
        );
      }

      const jwtToken = jwt.sign(
        { type: 'session', userId: user.id, email: user.email, name: user.name, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      try {
        await createSession(jwtToken, {
          id: user.id, email: user.email, name: user.name, role: user.role,
          avatar: user.avatar, isActive: user.isActive, approvalStatus: user.approvalStatus,
          emailVerified: user.emailVerified, phoneVerified: user.phoneVerified,
          twoFactorEnabled: user.twoFactorEnabled,
        });
      } catch (sessionError) {
        console.warn('[Auth 2FA] DB session creation failed, JWT-only auth:', sessionError);
      }

      return NextResponse.json({
        user: {
          id: user.id, email: user.email, name: user.name, role: user.role,
          avatar: user.avatar, phone: user.phone, isActive: user.isActive,
          emailVerified: user.emailVerified, phoneVerified: user.phoneVerified,
          twoFactorEnabled: user.twoFactorEnabled, approvalStatus: user.approvalStatus,
          createdAt: user.createdAt,
        },
        token: jwtToken,
        verified: true,
      });
    }

    // If this is enabling 2FA (session required)
    const auth = request.headers.get('authorization');
    const user = await getSessionAsync(auth?.replace('Bearer ', '') ?? '');

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser || !dbUser.twoFactorSecret) {
      return NextResponse.json(
        { error: '2FA setup not initialized. Please set up 2FA first.' },
        { status: 400 }
      );
    }

    if (!verifyTOTP(dbUser.twoFactorSecret, code)) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 401 }
      );
    }

    if (enable) {
      await db.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: true },
      });

      return NextResponse.json({
        message: 'Two-factor authentication has been enabled successfully',
        twoFactorEnabled: true,
      });
    }

    return NextResponse.json({
      message: 'Verification code is valid',
      verified: true,
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    return NextResponse.json(
      { error: 'An error occurred during 2FA verification' },
      { status: 500 }
    );
  }
}
