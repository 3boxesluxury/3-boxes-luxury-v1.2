import { NextRequest, NextResponse } from 'next/server';

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * GET /api/auth/facebook
 * Initiates Facebook OAuth flow - redirects user to Facebook login page
 * Supports ?returnTo=/path to redirect back after login
 * Supports ?action=connect for social media integration (links provider without changing main auth)
 * Supports ?instagram=true for Instagram-specific connect (sets connect_provider=instagram in callback)
 */
export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/';
  const action = request.nextUrl.searchParams.get('action') || 'login'; // 'login' or 'connect'
  // v22.4: Read instagram flag — when user clicks "Connect Instagram", the frontend sets &instagram=true
  const isInstagram = request.nextUrl.searchParams.get('instagram') === 'true';

  if (!FACEBOOK_APP_ID) {
    // Redirect to page with error message instead of returning JSON
    // so the user sees a proper error page, not raw JSON
    const redirectUrl = new URL(returnTo, BASE_URL);
    redirectUrl.searchParams.set('auth_error', 'Facebook login is not configured. Please set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in your Vercel environment variables.');
    return NextResponse.redirect(redirectUrl.toString());
  }

  const callbackUrl = `${BASE_URL}/api/auth/facebook/callback`;
  const state = crypto.randomUUID();

  const facebookAuthUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  facebookAuthUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
  facebookAuthUrl.searchParams.set('redirect_uri', callbackUrl);
  facebookAuthUrl.searchParams.set('state', state);
  // v22.5: REMOVED user_photos, user_likes, user_birthday — these require Facebook App Review
  // and cause "Invalid Scopes" error if the app hasn't been approved for them.
  // Gender & age_range come FREE with public_profile (no extra scope needed).
  // Photos/likes/birthday can be re-added after App Review approval.
  // Valid scopes without App Review:
  // - email, public_profile: Basic identity
  // - instagram_basic: Access Instagram profile info (username, bio, profile picture)
  // - pages_show_list: List user's Facebook Pages (needed to find IG Business Account)
  // - instagram_content_publish: Publish content to Instagram (for future features)
  // - instagram_manage_insights: Access Instagram insights/analytics
  // - pages_read_engagement: Read engagement data from Pages
  facebookAuthUrl.searchParams.set('scope', 'email,public_profile,instagram_basic,pages_show_list,instagram_content_publish,instagram_manage_insights,pages_read_engagement');
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
  // v22.4: Store whether this is an Instagram-specific connect
  // When user clicks "Connect Instagram", the frontend sends &instagram=true
  // The callback reads this cookie to set connect_provider=instagram
  if (isInstagram) {
    response.cookies.set('oauth_instagram', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });
  }

  return response;
}
