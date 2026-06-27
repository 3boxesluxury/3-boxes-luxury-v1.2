import { NextRequest, NextResponse } from 'next/server';

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * GET /api/auth/facebook
 * Initiates Facebook OAuth flow - redirects user to Facebook login page
 * Supports ?returnTo=/path to redirect back after login
 * Supports ?action=connect for social media integration (links provider without changing main auth)
 */
export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/';
  const action = request.nextUrl.searchParams.get('action') || 'login'; // 'login' or 'connect'

  if (!FACEBOOK_APP_ID) {
    // Redirect to page with error message instead of returning JSON
    // so the user sees a proper error page, not raw JSON
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
  // v19.1: Added user_photos, user_likes, user_birthday scopes for AI style analysis
  // - user_photos: Fetch uploaded photos for VLM fashion analysis
  // - user_likes: Fetch liked pages for brand/style preferences
  // - user_birthday: Fetch birthday for age-appropriate recommendations
  // - gender & age_range come FREE with public_profile (no extra scope needed)
  facebookAuthUrl.searchParams.set('scope', 'email,public_profile,user_photos,user_likes,user_birthday');
  facebookAuthUrl.searchParams.set('response_type', 'code');
  // Force Facebook to show login screen every time — prevents auto-login with previous account
  facebookAuthUrl.searchParams.set('auth_type', 'rerequest');

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
