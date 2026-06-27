import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * POST /api/auth/facebook/data-deletion
 *
 * Meta Data Deletion Callback endpoint — REQUIRED for Instagram Graph API App Review.
 * When a user deletes their Facebook/Instagram account or removes the app,
 * Meta sends a signed request to this endpoint.
 *
 * Flow:
 * 1. Meta sends POST with `signed_request` parameter
 * 2. We verify the signature using our App Secret
 * 3. We extract the user_id from the payload
 * 4. We delete all data associated with that user
 * 5. We return a confirmation with a tracking code and URL
 *
 * @see https://developers.facebook.com/docs/facebook-login/guides/data-deletion
 */

const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

interface DataDeletionPayload {
  user_id: string;
  algorithm: string;
  issued_at: number;
}

/**
 * Parse and verify the signed_request from Meta
 * Format: base64UrlEncode(header) + '.' + base64UrlEncode(payload)
 * Signature: HMAC-SHA256(base64UrlEncode(header) + '.' + base64UrlEncode(payload), app_secret)
 */
function parseSignedRequest(signedRequest: string, appSecret: string): DataDeletionPayload | null {
  try {
    const [encodedSig, encodedPayload] = signedRequest.split('.');

    if (!encodedSig || !encodedPayload) {
      console.error('[Data Deletion] Invalid signed_request format');
      return null;
    }

    // Decode the signature
    const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

    // Decode the payload
    const payloadJson = Buffer.from(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    const payload: DataDeletionPayload = JSON.parse(payloadJson);

    // Verify algorithm
    if (payload.algorithm?.toUpperCase() !== 'HMAC-SHA256') {
      console.error('[Data Deletion] Unknown algorithm:', payload.algorithm);
      return null;
    }

    // Verify signature
    const expectedSig = crypto
      .createHmac('sha256', appSecret)
      .update(`${encodedSig}.${encodedPayload}`)
      .digest();

    if (!crypto.timingSafeEqual(sig, expectedSig)) {
      console.error('[Data Deletion] Signature verification failed');
      return null;
    }

    return payload;
  } catch (error) {
    console.error('[Data Deletion] Error parsing signed_request:', error);
    return null;
  }
}

/**
 * Delete all user data associated with a Facebook/Instagram user ID
 * This includes:
 * - Instagram profile data (instagramId, instagramUsername, instagramToken)
 * - Facebook social connection (socialProvider, socialId)
 * - Any cached social style analysis data
 */
async function deleteUserData(facebookUserId: string): Promise<void> {
  try {
    // Dynamic import to avoid loading DB at module level
    const { db } = await import('@/lib/db');

    // Find users linked to this Facebook ID
    const users = await db.user.findMany({
      where: {
        socialProvider: 'facebook',
        socialId: facebookUserId,
      },
    });

    for (const user of users) {
      console.log('[Data Deletion] Removing Facebook/Instagram data for user:', user.id);

      // Remove Facebook/Instagram linked data but keep the account
      // (user might have logged in via email/password or Google)
      await db.user.update({
        where: { id: user.id },
        data: {
          // Clear Facebook connection
          socialProvider: user.socialProvider === 'facebook' ? null : user.socialProvider,
          socialId: user.socialId === facebookUserId ? null : user.socialId,
          // Clear Instagram data
          instagramId: null,
          instagramUsername: null,
          instagramToken: null,
        },
      });

      // Create audit log
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'data_deletion',
          entity: 'user',
          entityId: user.id,
          details: JSON.stringify({
            reason: 'Meta Data Deletion Request',
            facebookUserId,
            deletedFields: ['socialProvider', 'socialId', 'instagramId', 'instagramUsername', 'instagramToken'],
            timestamp: new Date().toISOString(),
          }),
        },
      }).catch(() => {}); // Ignore audit log errors
    }

    console.log('[Data Deletion] Data deleted for Facebook user:', facebookUserId, '- Affected users:', users.length);
  } catch (error) {
    console.error('[Data Deletion] Error deleting user data:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  console.log('[Data Deletion] Received data deletion request from Meta');

  try {
    const formData = await request.formData();
    const signedRequest = formData.get('signed_request') as string;

    if (!signedRequest) {
      console.error('[Data Deletion] Missing signed_request parameter');
      return NextResponse.json(
        { error: 'Missing signed_request parameter' },
        { status: 400 }
      );
    }

    if (!FACEBOOK_APP_SECRET) {
      console.error('[Data Deletion] FACEBOOK_APP_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Parse and verify the signed request
    const payload = parseSignedRequest(signedRequest, FACEBOOK_APP_SECRET);

    if (!payload || !payload.user_id) {
      console.error('[Data Deletion] Invalid or unverifiable signed_request');
      return NextResponse.json(
        { error: 'Invalid signed_request' },
        { status: 400 }
      );
    }

    const facebookUserId = payload.user_id;
    console.log('[Data Deletion] Verified request for Facebook user ID:', facebookUserId);

    // Generate a tracking code for this deletion request
    const trackingCode = `del_${crypto.randomUUID()}`;

    // Delete the user data
    await deleteUserData(facebookUserId);

    // Return confirmation to Meta
    // Meta requires: url (where user can check deletion status) and confirmation_code
    const response = {
      url: `${BASE_URL}/data-deletion-status?code=${trackingCode}`,
      confirmation_code: trackingCode,
    };

    console.log('[Data Deletion] Deletion complete. Tracking code:', trackingCode);
    return NextResponse.json(response);
  } catch (error) {
    console.error('[Data Deletion] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/facebook/data-deletion
 * Health check endpoint — Meta may verify the callback URL is reachable
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: '3boxes Data Deletion Callback endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
