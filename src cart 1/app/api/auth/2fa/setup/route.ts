import { NextRequest, NextResponse } from 'next/server';
import { getSessionAsync } from '@/lib/sessions';
import { db } from '@/lib/db';
import crypto from 'crypto';

/**
 * Generate a base32-encoded random secret for TOTP.
 */
function generateBase32Secret(): string {
  const bytes = crypto.randomBytes(20);
  return base32Encode(bytes);
}

/**
 * Base32 encode a buffer (RFC 4648).
 */
function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  let result = '';

  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }

  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5);
    if (chunk.length < 5) break;
    const index = parseInt(chunk, 2);
    result += alphabet[index];
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin session
    const auth = request.headers.get('authorization');
    const user = await getSessionAsync(auth?.replace('Bearer ', '') ?? '');

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Generate TOTP secret
    const secret = generateBase32Secret();

    // Save secret to user (but don't enable 2FA yet - that happens on verify)
    await db.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret },
    });

    // Generate otpauth URL
    const issuer = encodeURIComponent('3 BOXES LUXURY');
    const accountName = encodeURIComponent(user.email);
    const otpauthUrl = `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    return NextResponse.json({
      secret,
      otpauthUrl,
      message: 'Scan this QR code with your authenticator app, then verify with a code to enable 2FA.',
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: 'An error occurred during 2FA setup' },
      { status: 500 }
    );
  }
}
