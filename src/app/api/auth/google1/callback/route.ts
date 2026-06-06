import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// Google OAuth Callback Route - Production-Ready
// ============================================================
// Handles the OAuth callback from Google.
// 1. Exchanges authorization code for access token
// 2. Fetches user profile from Google
// 3. Creates/finds user via /api/auth/social
// 4. Redirects to app with token params
// 5. Sets auth cookies for middleware
// ============================================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

// Detect the correct redirect URI based on environment
function getRedirectUri(requestUrl: string): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;
  }
  try {
    const url = new URL(requestUrl);
    return `${url.origin}/api/auth/google/callback`;
  } catch {
    return 'https://3-boxes-luxury-v1-2.vercel.app/api/auth/google/callback';
  }
}

// Get the app URL for redirects
function getAppUrl(requestUrl: string): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  try {
    const url = new URL(requestUrl);
    return url.origin;
  } catch {
    return 'https://3-boxes-luxury-v1-2.vercel.app';
  }
}

// Create a fallback JWT (no dependency on @/lib/sessions)
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

  try {
    const { searchParams } = new URL(requestUrl);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // User denied permission
    if (error) {
      console.log('[Google Auth] User denied permission:', error);
      return NextResponse.redirect(`${appUrl}/?auth=denied`);
    }

    if (!code) {
      console.log('[Google Auth] No authorization code received');
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=no_code`);
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
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=token_fetch_failed`);
    }

    if (tokenData.error) {
      console.error('[Google Auth] Token exchange error:', tokenData.error);
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=token_error&msg=${encodeURIComponent(tokenData.error_description || tokenData.error)}`);
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      console.error('[Google Auth] No access token in response:', tokenData);
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=no_access_token`);
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
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=profile_fetch_failed`);
    }

    if (profileData.error) {
      console.error('[Google Auth] Profile fetch error:', profileData.error);
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=profile_error`);
    }

    const googleId = profileData.id;
    const name = profileData.name || 'Google User';
    const email = profileData.email || null;
    const avatar = profileData.picture || null;

    if (!googleId) {
      console.error('[Google Auth] No Google ID in profile');
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=no_google_id`);
    }

    console.log('[Google Auth] Profile received:', { googleId, name, email: email || '(not provided)' });

    // ============================================================
    // Step 3: Try multiple auth strategies (in order of preference)
    // ============================================================

    // Strategy A: Try the existing /api/auth/social endpoint
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
        const user = socialData.user;
        const jwtToken = socialData.token;

        console.log('[Google Auth] Strategy A (social endpoint) SUCCESS for:', user.name);

        // Build redirect URL with token params
        const redirectUrl = new URL(appUrl);
        redirectUrl.searchParams.set('token', jwtToken);
        redirectUrl.searchParams.set('userId', user.id || '');
        redirectUrl.searchParams.set('userName', user.name || name);
        redirectUrl.searchParams.set('userEmail', user.email || '');
        redirectUrl.searchParams.set('userRole', user.role || 'user');
        redirectUrl.searchParams.set('authProvider', 'google');
        if (socialData.isNewUser) {
          redirectUrl.searchParams.set('isNewUser', 'true');
        }

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

        return response;
      }

      console.warn('[Google Auth] Strategy A failed:', socialData.error || socialData.message || 'unknown error');
    } catch (socialError) {
      console.warn('[Google Auth] Strategy A (social endpoint) exception:', socialError);
    }

    // Strategy B: Try direct DB access via dynamic import
    try {
      const { db } = await import('@/lib/db');

      const userEmail = email || `google_${googleId}@3boxesluxury.com`;

      // Find existing user by social ID
      let user = await db.user.findFirst({
        where: { socialProvider: 'google', socialId: googleId },
      });

      // Try to find by email and link accounts
      if (!user && email) {
        user = await db.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });
        if (user) {
          user = await db.user.update({
            where: { id: user.id },
            data: {
              socialProvider: 'google',
              socialId: googleId,
              ...(avatar && !user.avatar ? { avatar } : {}),
            },
          });
        }
      }

      // Check user status
      if (user) {
        if ('isActive' in user && !user.isActive) {
          return NextResponse.redirect(`${appUrl}/?auth=deactivated`);
        }
        if ('approvalStatus' in user) {
          if (user.approvalStatus === 'pending') {
            return NextResponse.redirect(`${appUrl}/?auth=pending`);
          }
          if (user.approvalStatus === 'rejected') {
            return NextResponse.redirect(`${appUrl}/?auth=rejected`);
          }
        }

        // Update avatar if missing
        if (avatar && 'avatar' in user && !user.avatar) {
          await db.user.update({
            where: { id: user.id },
            data: { avatar },
          }).catch(() => {});
        }

        // Generate JWT
        const jwtToken = await createFallbackJWT({
          type: 'session',
          userId: user.id,
          email: user.email,
          name: user.name,
          role: 'role' in user ? user.role : 'user',
          authProvider: 'google',
        });

        if (!jwtToken) {
          return NextResponse.redirect(`${appUrl}/?auth=error&reason=jwt_failed`);
        }

        console.log('[Google Auth] Strategy B (direct DB) SUCCESS for:', user.name);

        const redirectUrl = new URL(appUrl);
        redirectUrl.searchParams.set('token', jwtToken);
        redirectUrl.searchParams.set('userId', user.id);
        redirectUrl.searchParams.set('userName', user.name);
        redirectUrl.searchParams.set('userEmail', user.email);
        redirectUrl.searchParams.set('userRole', 'role' in user ? user.role : 'user');
        redirectUrl.searchParams.set('authProvider', 'google');

        const response = NextResponse.redirect(redirectUrl.toString());
        response.cookies.set('auth-token', jwtToken, {
          httpOnly: true, secure: true, sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, path: '/',
        });
        response.cookies.set('auth-provider', 'google', {
          httpOnly: false, secure: true, sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, path: '/',
        });
        return response;
      }

      // Create new user
      const newUserData: any = {
        email: userEmail.toLowerCase().trim(),
        name: name,
        password: null,
        role: 'user',
        avatar: avatar,
        socialProvider: 'google',
        socialId: googleId,
        approvalStatus: 'approved',
        isActive: true,
        emailVerified: !!email,
        phoneVerified: false,
        twoFactorEnabled: false,
      };

      const newUser = await db.user.create({
        data: newUserData,
      });

      const jwtToken = await createFallbackJWT({
        type: 'session',
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role || 'user',
        authProvider: 'google',
      });

      if (!jwtToken) {
        return NextResponse.redirect(`${appUrl}/?auth=error&reason=jwt_failed`);
      }

      console.log('[Google Auth] Strategy B (direct DB) NEW USER:', newUser.name);

      const redirectUrl = new URL(appUrl);
      redirectUrl.searchParams.set('token', jwtToken);
      redirectUrl.searchParams.set('userId', newUser.id);
      redirectUrl.searchParams.set('userName', newUser.name);
      redirectUrl.searchParams.set('userEmail', newUser.email);
      redirectUrl.searchParams.set('userRole', newUser.role || 'user');
      redirectUrl.searchParams.set('authProvider', 'google');
      redirectUrl.searchParams.set('isNewUser', 'true');

      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.set('auth-token', jwtToken, {
        httpOnly: true, secure: true, sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, path: '/',
      });
      response.cookies.set('auth-provider', 'google', {
        httpOnly: false, secure: true, sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, path: '/',
      });
      return response;

    } catch (dbError) {
      console.warn('[Google Auth] Strategy B (direct DB) failed:', dbError);
    }

    // Strategy C: Fallback - Direct JWT without database
    console.log('[Google Auth] Falling back to Strategy C (direct JWT)');
    const fallbackToken = await createFallbackJWT({
      type: 'session',
      userId: `google_${googleId}`,
      email: email || `google_${googleId}@3boxesluxury.com`,
      name: name,
      role: 'user',
      authProvider: 'google',
    });

    if (!fallbackToken) {
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=jwt_failed`);
    }

    const redirectUrl = new URL(appUrl);
    redirectUrl.searchParams.set('token', fallbackToken);
    redirectUrl.searchParams.set('userName', name);
    redirectUrl.searchParams.set('userEmail', email || `google_${googleId}@3boxesluxury.com`);
    redirectUrl.searchParams.set('userRole', 'user');
    redirectUrl.searchParams.set('authProvider', 'google');
    redirectUrl.searchParams.set('isNewUser', 'true');

    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.set('auth-token', fallbackToken, {
      httpOnly: true, secure: true, sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, path: '/',
    });
    response.cookies.set('auth-provider', 'google', {
      httpOnly: false, secure: true, sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, path: '/',
    });
    return response;

  } catch (error) {
    console.error('[Google Auth] Unexpected callback error:', error);
    return NextResponse.redirect(`${appUrl}/?auth=error&reason=unexpected`);
  }
}
