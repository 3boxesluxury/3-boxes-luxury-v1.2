import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// Google OAuth Callback Route - V7 (Fixed for Vercel)
// ============================================================
// This file MUST be at: src/app/api/auth/google/callback/route.ts
//
// URL params use auth_token, auth_id, auth_name, auth_email,
// auth_role, auth_provider — matching OAuthCallbackHandler.
//
// Reads oauth_return_to cookie to redirect back to the correct
// page (e.g. /?view=social-style) after OAuth.
// ============================================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

function getRedirectUri(requestUrl: string): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;
  }
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`;
  }
  try {
    const url = new URL(requestUrl);
    return `${url.origin}/api/auth/google/callback`;
  } catch {
    return 'https://3-boxes-luxury-v1-2.vercel.app/api/auth/google/callback';
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

    if (error) {
      console.log('[Google Auth] User denied permission:', error);
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', 'Permission denied');
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      response.cookies.delete('oauth_state_google');
      return response;
    }

    if (!code) {
      console.log('[Google Auth] No authorization code received');
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', 'No authorization code');
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      response.cookies.delete('oauth_state_google');
      return response;
    }

    console.log('[Google Auth] Received authorization code, exchanging for token...');

    // Step 1: Exchange code for access token
    let tokenData: any;
    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      tokenData = await tokenResponse.json();
    } catch (fetchError) {
      console.error('[Google Auth] Token exchange fetch failed:', fetchError);
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', 'Token exchange failed');
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      return response;
    }

    if (tokenData.error) {
      console.error('[Google Auth] Token exchange error:', tokenData.error);
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', tokenData.error_description || tokenData.error);
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      return response;
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      console.error('[Google Auth] No access token in response');
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', 'No access token received');
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      return response;
    }

    console.log('[Google Auth] Token received, fetching user profile...');

    // Step 2: Get user profile from Google
    let profileData: any;
    try {
      const profileResponse = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      profileData = await profileResponse.json();
    } catch (fetchError) {
      console.error('[Google Auth] Profile fetch failed:', fetchError);
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', 'Profile fetch failed');
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      return response;
    }

    if (profileData.error) {
      console.error('[Google Auth] Profile fetch error:', profileData.error);
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', 'Profile error');
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      return response;
    }

    const googleId = profileData.id;
    const name = profileData.name || 'Google User';
    const email = profileData.email || null;
    const avatar = profileData.picture || null;

    if (!googleId) {
      console.error('[Google Auth] No Google ID in profile');
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', 'No Google ID');
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      return response;
    }

    console.log('[Google Auth] Profile received:', { googleId, name, email: email || '(not provided)' });

    // Step 3: Try /api/auth/social endpoint
    let jwtToken: string | null = null;
    let userId: string = `google_${googleId}`;
    let userRole: string = 'user';
    let isNewUser: boolean = false;

    try {
      const socialRes = await fetch(`${appUrl}/api/auth/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'google',
          socialId: googleId,
          email: email || `google_${googleId}@3boxesluxury.com`,
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
        console.log('[Google Auth] Social endpoint SUCCESS for:', name);
      } else {
        console.warn('[Google Auth] Social endpoint failed:', socialData.error || 'unknown');
      }
    } catch (socialError) {
      console.warn('[Google Auth] Social endpoint exception:', socialError);
    }

    // Fallback: Direct JWT without database
    if (!jwtToken) {
      console.log('[Google Auth] Falling back to direct JWT');
      jwtToken = await createFallbackJWT({
        type: 'session',
        userId: `google_${googleId}`,
        email: email || `google_${googleId}@3boxesluxury.com`,
        name: name,
        role: 'user',
        authProvider: 'google',
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
    redirectUrl.searchParams.set('auth_email', email || `google_${googleId}@3boxesluxury.com`);
    redirectUrl.searchParams.set('auth_role', userRole);
    redirectUrl.searchParams.set('auth_provider', 'google');
    if (isNewUser) {
      redirectUrl.searchParams.set('isNewUser', 'true');
    }

    console.log('[Google Auth] Redirecting to:', redirectUrl.pathname);

    const response = NextResponse.redirect(redirectUrl.toString());

    // Set auth cookies
    response.cookies.set('auth-token', jwtToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    response.cookies.set('auth-provider', 'google', {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    // Clean up OAuth cookies
    response.cookies.delete('oauth_return_to');
    response.cookies.delete('oauth_state_google');

    return response;

  } catch (error) {
    console.error('[Google Auth] Unexpected callback error:', error);
    const redirectUrl = new URL(returnTo, appUrl);
    redirectUrl.searchParams.set('auth_error', 'Unexpected error');
    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.delete('oauth_return_to');
    return response;
  }
}
