import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// Facebook OAuth Callback Route - V7 (Fixed for Vercel)
// ============================================================
// This file MUST be at: src/app/api/auth/facebook/callback/route.ts
//
// URL params use auth_token, auth_id, auth_name, auth_email,
// auth_role, auth_provider — matching OAuthCallbackHandler.
//
// Reads oauth_return_to cookie to redirect back to the correct
// page (e.g. /?view=social-style) after OAuth.
// ============================================================

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';

function getRedirectUri(requestUrl: string): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/facebook/callback`;
  }
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/facebook/callback`;
  }
  try {
    const url = new URL(requestUrl);
    return `${url.origin}/api/auth/facebook/callback`;
  } catch {
    return 'https://3-boxes-luxury-v1-2.vercel.app/api/auth/facebook/callback';
  }
}

function getAppUrl(requestUrl: string): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  try {
    const url = new URL(requestUrl);
    return url.origin;
  } catch {
    return 'https://3-boxes-luxury-v1-2.vercel.app';
  }
}

async function createFallbackJWT(payload: object): Promise<string | null> {
  try {
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || '3boxes-dev-secret-key';
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = request.url;
  const appUrl = getAppUrl(requestUrl);
  const redirectUri = getRedirectUri(requestUrl);

  // Read oauth_return_to cookie to know where to redirect after auth
  const returnTo = request.cookies.get('oauth_return_to')?.value || '/';

  try {
    const { searchParams } = new URL(requestUrl);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorReason = searchParams.get('error_reason');

    if (error) {
      console.log('[FB Auth] User denied permission:', error, errorReason);
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', 'Permission denied');
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      response.cookies.delete('oauth_state_facebook');
      return response;
    }

    if (!code) {
      console.log('[FB Auth] No authorization code received');
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', 'No authorization code');
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      response.cookies.delete('oauth_state_facebook');
      return response;
    }

    console.log('[FB Auth] Received authorization code, exchanging for token...');

    // Step 1: Exchange code for access token
    let tokenData: any;
    try {
      const tokenResponse = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`,
        { method: 'GET' }
      );
      tokenData = await tokenResponse.json();
    } catch (fetchError) {
      console.error('[FB Auth] Token exchange fetch failed:', fetchError);
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', 'Token exchange failed');
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      return response;
    }

    if (tokenData.error) {
      console.error('[FB Auth] Token exchange error:', tokenData.error);
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', tokenData.error?.message || tokenData.error?.type || 'Token error');
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      return response;
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      console.error('[FB Auth] No access token in response');
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', 'No access token received');
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      return response;
    }

    console.log('[FB Auth] Token received, fetching user profile...');

    // Step 2: Get user profile from Facebook
    let profileData: any;
    try {
      const profileResponse = await fetch(
        `https://graph.facebook.com/v19.0/me?fields=id,name,email,picture.width(200).height(200)&access_token=${accessToken}`,
        { method: 'GET' }
      );
      profileData = await profileResponse.json();
    } catch (fetchError) {
      console.error('[FB Auth] Profile fetch failed:', fetchError);
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', 'Profile fetch failed');
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      return response;
    }

    if (profileData.error) {
      console.error('[FB Auth] Profile fetch error:', profileData.error);
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', profileData.error?.message || 'Profile error');
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      return response;
    }

    const facebookId = profileData.id;
    const name = profileData.name || 'Facebook User';
    const email = profileData.email || null;
    const avatar = profileData.picture?.data?.url || null;

    if (!facebookId) {
      console.error('[FB Auth] No Facebook ID in profile');
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', 'No Facebook ID');
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      return response;
    }

    console.log('[FB Auth] Profile received:', { facebookId, name, email: email || '(not provided)' });

    // Step 3: Try /api/auth/social endpoint
    let jwtToken: string | null = null;
    let userId: string = `fb_${facebookId}`;
    let userRole: string = 'user';
    let isNewUser: boolean = false;

    try {
      const socialRes = await fetch(`${appUrl}/api/auth/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'facebook',
          socialId: facebookId,
          email: email || `fb_${facebookId}@3boxesluxury.com`,
          name: name,
          avatar: avatar,
        }),
      });

      const socialData = await socialRes.json();

      if (socialRes.ok && socialData.token) {
        jwtToken = socialData.token;
        userId = socialData.user?.id || userId;
        userRole = socialData.user?.role || 'user';
        isNewUser = !!socialData.isNewUser;
        console.log('[FB Auth] Social endpoint SUCCESS for:', name);
      } else {
        console.warn('[FB Auth] Social endpoint failed:', socialData.error || 'unknown');
      }
    } catch (socialError) {
      console.warn('[FB Auth] Social endpoint exception:', socialError);
    }

    // Fallback: Direct JWT without database
    if (!jwtToken) {
      console.log('[FB Auth] Falling back to direct JWT');
      jwtToken = await createFallbackJWT({
        type: 'session',
        userId: `fb_${facebookId}`,
        email: email || `fb_${facebookId}@3boxesluxury.com`,
        name: name,
        role: 'user',
        authProvider: 'facebook',
      });
      isNewUser = true;
    }

    if (!jwtToken) {
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', 'JWT creation failed');
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      return response;
    }

    // Build redirect URL using parameter names that match OAuthCallbackHandler
    const redirectUrl = new URL(returnTo, appUrl);
    redirectUrl.searchParams.set('auth_token', jwtToken);
    redirectUrl.searchParams.set('auth_id', userId);
    redirectUrl.searchParams.set('auth_name', name);
    redirectUrl.searchParams.set('auth_email', email || `fb_${facebookId}@3boxesluxury.com`);
    redirectUrl.searchParams.set('auth_role', userRole);
    redirectUrl.searchParams.set('auth_provider', 'facebook');
    if (isNewUser) {
      redirectUrl.searchParams.set('isNewUser', 'true');
    }

    console.log('[FB Auth] Redirecting to:', redirectUrl.pathname);

    const response = NextResponse.redirect(redirectUrl.toString());

    // Set auth cookies
    response.cookies.set('auth-token', jwtToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    response.cookies.set('auth-provider', 'facebook', {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    // Clean up OAuth cookies
    response.cookies.delete('oauth_return_to');
    response.cookies.delete('oauth_state_facebook');

    return response;

  } catch (error) {
    console.error('[FB Auth] Unexpected callback error:', error);
    const redirectUrl = new URL(returnTo, appUrl);
    redirectUrl.searchParams.set('auth_error', 'Unexpected error');
    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.delete('oauth_return_to');
    return response;
  }
}
