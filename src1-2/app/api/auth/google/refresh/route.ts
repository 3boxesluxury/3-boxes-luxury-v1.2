import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// Google OAuth Token Refresh — v20.5
// ============================================================
// This endpoint refreshes the Google access token using the
// refresh token stored in an httpOnly cookie.
//
// Flow:
//   1. Frontend detects access token is expired (via google_token_expires cookie)
//   2. Frontend calls GET /api/auth/google/refresh
//   3. This route reads google_refresh_token from httpOnly cookie
//   4. Calls Google's token endpoint with grant_type=refresh_token
//   5. Returns new access token + new expiry timestamp
//   6. Frontend updates its stored token
//
// Security: refresh_token is stored in httpOnly cookie — JavaScript
// cannot read it, preventing XSS token theft.
// ============================================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

export async function GET(request: NextRequest) {
  try {
    // Read refresh token from httpOnly cookie (set by OAuth callback)
    const refreshToken = request.cookies.get('google_refresh_token')?.value;

    if (!refreshToken) {
      console.warn('[Google Refresh] No refresh token found in cookies');
      return NextResponse.json(
        { error: 'No refresh token available. Please reconnect Google.', needsReconnect: true },
        { status: 401 }
      );
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('[Google Refresh] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
      return NextResponse.json(
        { error: 'Google OAuth not configured' },
        { status: 500 }
      );
    }

    console.log('[Google Refresh] Refreshing access token...');

    // Call Google's token endpoint to get a new access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('[Google Refresh] Token refresh failed:', tokenData.error, tokenData.error_description || '');

      // If refresh token is invalid/expired, user needs to re-authenticate
      const needsReconnect = tokenData.error === 'invalid_grant' || tokenData.error === 'token_expired';
      return NextResponse.json(
        {
          error: `Token refresh failed: ${tokenData.error}`,
          needsReconnect,
        },
        { status: 401 }
      );
    }

    const newAccessToken = tokenData.access_token;
    const newExpiresIn = tokenData.expires_in || 3600;
    const newExpiresAt = Date.now() + newExpiresIn * 1000;

    console.log('[Google Refresh] ✅ Access token refreshed. Expires in:', newExpiresIn, 'seconds');

    // Update the cookies with new token + expiry
    const response = NextResponse.json({
      success: true,
      accessToken: newAccessToken,
      expiresAt: newExpiresAt,
      expiresIn: newExpiresIn,
    });

    // Update access token cookie
    response.cookies.set('google_youtube_token', newAccessToken, {
      httpOnly: false, // frontend needs to read it
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: newExpiresIn, // same as token lifetime
      path: '/',
    });

    // Update expiry timestamp cookie
    response.cookies.set('google_token_expires', String(newExpiresAt), {
      httpOnly: false, // frontend needs to read it
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    // If Google returned a new refresh token (rare but possible), update it
    if (tokenData.refresh_token) {
      response.cookies.set('google_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('[Google Refresh] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Token refresh failed unexpectedly' },
      { status: 500 }
    );
  }
}
