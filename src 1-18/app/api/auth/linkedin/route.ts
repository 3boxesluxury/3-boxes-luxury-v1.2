import { NextRequest, NextResponse } from 'next/server';

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * GET /api/auth/linkedin
 * Initiates LinkedIn OAuth flow - redirects user to LinkedIn login page
 * Supports ?returnTo=/path to redirect back after login
 * Supports ?action=connect for social media integration (links provider without changing main auth)
 */
export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/';
  const action = request.nextUrl.searchParams.get('action') || 'login'; // 'login' or 'connect'

  if (!LINKEDIN_CLIENT_ID) {
    // Redirect to page with error message instead of returning JSON
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
  // Force LinkedIn to show login screen every time — prevents auto-login with previous account
  linkedinAuthUrl.searchParams.set('prompt', 'consent');

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
  // Store the action so the callback knows whether to create a new session (login)
  // or just link the provider without changing auth (connect)
  response.cookies.set('oauth_action', action, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return response;
}
