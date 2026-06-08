import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// LinkedIn OAuth Callback Route - V7 (Fixed for Vercel)
// ============================================================
// This file MUST be at: src/app/api/auth/linkedin/callback/route.ts
// This route DID NOT EXIST in the previous deployment!
//
// URL params use auth_token, auth_id, auth_name, auth_email,
// auth_role, auth_provider — matching OAuthCallbackHandler.
//
// Reads oauth_return_to cookie to redirect back to the correct
// page (e.g. /?view=social-style) after OAuth.
// ============================================================

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || '';

function getRedirectUri(requestUrl: string): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linkedin/callback`;
  }
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/linkedin/callback`;
  }
  try {
    const url = new URL(requestUrl);
    return `${url.origin}/api/auth/linkedin/callback`;
  } catch {
    return 'https://3-boxes-luxury-v1-2.vercel.app/api/auth/linkedin/callback';
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
    const errorDescription = searchParams.get('error_description');

    if (error) {
      console.log('[LinkedIn Auth] User denied permission:', error, errorDescription);
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', errorDescription || error);
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      response.cookies.delete('oauth_state_linkedin');
      return response;
    }

    if (!code) {
      console.log('[LinkedIn Auth] No authorization code received');
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', 'No authorization code');
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      response.cookies.delete('oauth_state_linkedin');
      return response;
    }

    console.log('[LinkedIn Auth] Received authorization code, exchanging for token...');

    // Step 1: Exchange code for access token
    let tokenData: any;
    try {
      const tokenResponse = await fetch(
        'https://www.linkedin.com/oauth/v2/accessToken',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            client_id: LINKEDIN_CLIENT_ID,
            client_secret: LINKEDIN_CLIENT_SECRET,
            redirect_uri: redirectUri,
          }),
        }
      );
      tokenData = await tokenResponse.json();
    } catch (fetchError) {
      console.error('[LinkedIn Auth] Token exchange fetch failed:', fetchError);
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', 'Token exchange failed');
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      return response;
    }

    if (tokenData.error) {
      console.error('[LinkedIn Auth] Token exchange error:', tokenData.error, tokenData.error_description);
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', tokenData.error_description || tokenData.error);
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      return response;
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      console.error('[LinkedIn Auth] No access token in response');
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', 'No access token received');
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      return response;
    }

    console.log('[LinkedIn Auth] Token received, fetching user profile...');

    // Step 2: Get user profile from LinkedIn using OpenID Connect
    // LinkedIn's OpenID Connect userinfo endpoint
    let profileData: any;
    try {
      const profileResponse = await fetch(
        'https://api.linkedin.com/v2/userinfo',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      profileData = await profileResponse.json();
    } catch (fetchError) {
      console.error('[LinkedIn Auth] Profile fetch failed:', fetchError);
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', 'Profile fetch failed');
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      return response;
    }

    if (profileData.error) {
      console.error('[LinkedIn Auth] Profile fetch error:', profileData.error);
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', 'Profile error');
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      return response;
    }

    // LinkedIn OpenID Connect returns: sub, name, given_name, family_name, email, picture
    const linkedinId = profileData.sub;
    const name = profileData.name || `${profileData.given_name || ''} ${profileData.family_name || ''}`.trim() || 'LinkedIn User';
    const email = profileData.email || null;
    const avatar = profileData.picture || null;

    if (!linkedinId) {
      console.error('[LinkedIn Auth] No LinkedIn ID in profile');
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set('auth_error', 'No LinkedIn ID');
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_return_to');
      return response;
    }

    console.log('[LinkedIn Auth] Profile received:', { linkedinId, name, email: email || '(not provided)' });

    // Step 3: Try /api/auth/social endpoint
    let jwtToken: string | null = null;
    let userId: string = `linkedin_${linkedinId}`;
    let userRole: string = 'user';
    let isNewUser: boolean = false;

    try {
      const socialRes = await fetch(`${appUrl}/api/auth/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'linkedin',
          socialId: linkedinId,
          email: email || `linkedin_${linkedinId}@3boxesluxury.com`,
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
        console.log('[LinkedIn Auth] Social endpoint SUCCESS for:', name);
      } else {
        console.warn('[LinkedIn Auth] Social endpoint failed:', socialData.error || 'unknown');
      }
    } catch (socialError) {
      console.warn('[LinkedIn Auth] Social endpoint exception:', socialError);
    }

    // Fallback: Direct JWT without database
    if (!jwtToken) {
      console.log('[LinkedIn Auth] Falling back to direct JWT');
      jwtToken = await createFallbackJWT({
        type: 'session',
        userId: `linkedin_${linkedinId}`,
        email: email || `linkedin_${linkedinId}@3boxesluxury.com`,
        name: name,
        role: 'user',
        authProvider: 'linkedin',
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
    redirectUrl.searchParams.set('auth_email', email || `linkedin_${linkedinId}@3boxesluxury.com`);
    redirectUrl.searchParams.set('auth_role', userRole);
    redirectUrl.searchParams.set('auth_provider', 'linkedin');
    if (isNewUser) {
      redirectUrl.searchParams.set('isNewUser', 'true');
    }

    console.log('[LinkedIn Auth] Redirecting to:', redirectUrl.pathname);

    const response = NextResponse.redirect(redirectUrl.toString());

    // Set auth cookies
    response.cookies.set('auth-token', jwtToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    response.cookies.set('auth-provider', 'linkedin', {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    // Clean up OAuth cookies
    response.cookies.delete('oauth_return_to');
    response.cookies.delete('oauth_state_linkedin');

    return response;

  } catch (error) {
    console.error('[LinkedIn Auth] Unexpected callback error:', error);
    const redirectUrl = new URL(returnTo, appUrl);
    redirectUrl.searchParams.set('auth_error', 'Unexpected error');
    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.delete('oauth_return_to');
    return response;
  }
}
