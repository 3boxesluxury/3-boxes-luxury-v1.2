import { NextRequest, NextResponse } from 'next/server';

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '';

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
 * GET /api/auth/facebook
 * Initiates Facebook OAuth flow - redirects user to Facebook login page
 * Supports ?returnTo=/path to redirect back after login
 */
export async function GET(request: NextRequest) {
  const BASE_URL = getBaseUrl(request);
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/';

  if (!FACEBOOK_APP_ID) {
    const redirectUrl = new URL(returnTo, BASE_URL);
    redirectUrl.searchParams.set('auth_error', 'Facebook login is not configured. Please set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in your Vercel environment variables.');
    return NextResponse.redirect(redirectUrl.toString());
  }

  const callbackUrl = `${BASE_URL}/api/auth/facebook/callback`;
  const state = crypto.randomUUID();

  const facebookAuthUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  facebookAuthUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
  facebookAuthUrl.searchParams.set('redirect_uri', callbackUrl);
  facebookAuthUrl.searchParams.set('state', state);
  facebookAuthUrl.searchParams.set('scope', 'email,public_profile');
  facebookAuthUrl.searchParams.set('response_type', 'code');

  const response = NextResponse.redirect(facebookAuthUrl.toString());
  response.cookies.set('oauth_state_facebook', state, {
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
