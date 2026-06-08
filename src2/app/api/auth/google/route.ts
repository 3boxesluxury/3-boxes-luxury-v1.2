import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

/**
 * Get the base URL for the application.
 * Checks NEXT_PUBLIC_APP_URL first, then NEXT_PUBLIC_BASE_URL,
 * then falls back to the request origin.
 */
function getBaseUrl(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  return request.nextUrl.origin;
}

/**
 * GET /api/auth/google
 * Initiates Google OAuth flow - redirects user to Google login page
 * Supports ?returnTo=/path to redirect back after login
 */
export async function GET(request: NextRequest) {
  const BASE_URL = getBaseUrl(request);
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/';

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
  googleAuthUrl.searchParams.set('scope', 'openid profile email');
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

  return response;
}
