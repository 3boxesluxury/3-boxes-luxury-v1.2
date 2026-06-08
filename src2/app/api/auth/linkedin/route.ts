import { NextRequest, NextResponse } from 'next/server';

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';

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
 * GET /api/auth/linkedin
 * Initiates LinkedIn OAuth flow - redirects user to LinkedIn login page
 * Supports ?returnTo=/path to redirect back after login
 */
export async function GET(request: NextRequest) {
  const BASE_URL = getBaseUrl(request);
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/';

  if (!LINKEDIN_CLIENT_ID) {
    const redirectUrl = new URL(returnTo, BASE_URL);
    redirectUrl.searchParams.set('auth_error', 'LinkedIn login is not configured. Please set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in your Vercel environment variables.');
    return NextResponse.redirect(redirectUrl.toString());
  }

  const callbackUrl = `${BASE_URL}/api/auth/linkedin/callback`;
  const state = crypto.randomUUID();

  const linkedinAuthUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  linkedinAuthUrl.searchParams.set('response_type', 'code');
  linkedinAuthUrl.searchParams.set('client_id', LINKEDIN_CLIENT_ID);
  linkedinAuthUrl.searchParams.set('redirect_uri', callbackUrl);
  linkedinAuthUrl.searchParams.set('state', state);
  linkedinAuthUrl.searchParams.set('scope', 'openid profile email');

  const response = NextResponse.redirect(linkedinAuthUrl.toString());
  response.cookies.set('oauth_state_linkedin', state, {
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
