import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// Google OAuth Initiation Route — v20.3: Added birthday scope
// ============================================================
// CHANGES from v17:
//   - Added 'https://www.googleapis.com/auth/user.birthday.read' scope
//   - This allows fetching user's birthday from People API
//   - Birthday used for age-appropriate recommendations + birthday gifts
// Previous v17 changes:
//   - Added 'https://www.googleapis.com/auth/youtube.readonly' scope
//   - YouTube data used for personalized fashion video recommendations
// ============================================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * GET /api/auth/google
 * Initiates Google OAuth flow - redirects user to Google login page
 * Supports ?returnTo=/path to redirect back after login
 * Supports ?action=connect for social media integration (links provider without changing main auth)
 */
export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/';
  const action = request.nextUrl.searchParams.get('action') || 'login'; // 'login' or 'connect'

  if (!GOOGLE_CLIENT_ID) {
    const redirectUrl = new URL(returnTo, BASE_URL);
    redirectUrl.searchParams.set('auth_error', 'Google login is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your Vercel environment variables.');
    return NextResponse.redirect(redirectUrl.toString());
  }

  const callbackUrl = `${BASE_URL}/api/auth/google/callback`;
  const state = crypto.randomUUID();

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  googleAuthUrl.searchParams.set('redirect_uri', callbackUrl);
  googleAuthUrl.searchParams.set('state', state);

  // v20.3: Added user.birthday.read scope for birthday from People API
  // Scopes:
  //   openid, profile, email — basic identity
  //   user.gender.read — gender from People API (v16)
  //   youtube.readonly — read subscriptions, liked videos (v17)
  //   user.birthday.read — birthday from People API (v20.3)
  googleAuthUrl.searchParams.set('scope',
    'openid profile email https://www.googleapis.com/auth/user.gender.read https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/user.birthday.read'
  );
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('prompt', 'consent');

  const response = NextResponse.redirect(googleAuthUrl.toString());
  response.cookies.set('oauth_state_google', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  response.cookies.set('oauth_return_to', returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  response.cookies.set('oauth_action', action, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return response;
}
