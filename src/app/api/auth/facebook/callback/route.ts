import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// Facebook OAuth Callback Route - V3 (Production-Ready)
// ============================================================
// SELF-CONTAINED - Does NOT import @/lib/sessions or @/lib/db
// at the top level, which was causing 404 errors on Vercel.
//
// Instead, it uses dynamic imports with fallback:
// 1. Try @/lib/db + @/lib/sessions (proper DB-backed auth)
// 2. Try /api/auth/social endpoint (reuse existing working route)
// 3. Fall back to direct JWT (works without DB)
//
// Also sets auth cookies so the existing auth middleware works.
// ============================================================

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '1638724140532761';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || 'f6faeeafe9b64e31719894476129b4ee';

// Detect the correct redirect URI based on environment
function getRedirectUri(requestUrl: string): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/facebook/callback`;
  }
  try {
    const url = new URL(requestUrl);
    return `${url.origin}/api/auth/facebook/callback`;
  } catch {
    return 'https://3boxes-luxury-v12.vercel.app/api/auth/facebook/callback';
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
    return 'https://3boxes-luxury-v12.vercel.app';
  }
}

// Create a JWT token (fallback - no dependency on @/lib/sessions)
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
    const errorReason = searchParams.get('error_reason');

    // User denied permission
    if (error) {
      console.log('[FB Auth] User denied permission:', error, errorReason);
      return NextResponse.redirect(`${appUrl}/?auth=denied`);
    }

    if (!code) {
      console.log('[FB Auth] No authorization code received');
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=no_code`);
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
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=token_fetch_failed`);
    }

    if (tokenData.error) {
      console.error('[FB Auth] Token exchange error:', tokenData.error);
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=token_error&msg=${encodeURIComponent(tokenData.error.message || 'unknown')}`);
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      console.error('[FB Auth] No access token in response:', tokenData);
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=no_access_token`);
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
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=profile_fetch_failed`);
    }

    if (profileData.error) {
      console.error('[FB Auth] Profile fetch error:', profileData.error);
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=profile_error&msg=${encodeURIComponent(profileData.error.message || 'unknown')}`);
    }

    const facebookId = profileData.id;
    const name = profileData.name || 'Facebook User';
    const email = profileData.email || null;
    const avatar = profileData.picture?.data?.url || null;

    if (!facebookId) {
      console.error('[FB Auth] No Facebook ID in profile');
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=no_facebook_id`);
    }

    console.log('[FB Auth] Profile received:', { facebookId, name, email: email || '(not provided)' });

    // ============================================================
    // Step 3: Try multiple auth strategies (in order of preference)
    // ============================================================

    // Strategy A: Try the existing /api/auth/social endpoint
    // This reuses the WORKING social login flow already deployed
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
        const user = socialData.user;
        const jwtToken = socialData.token;

        console.log('[FB Auth] Strategy A (social endpoint) SUCCESS for:', user.name);

        // Build redirect URL with token params + set cookies
        const redirectUrl = new URL(appUrl);
        redirectUrl.searchParams.set('token', jwtToken);
        redirectUrl.searchParams.set('userId', user.id || '');
        redirectUrl.searchParams.set('userName', user.name || name);
        redirectUrl.searchParams.set('userEmail', user.email || '');
        redirectUrl.searchParams.set('userRole', user.role || 'user');
        redirectUrl.searchParams.set('authProvider', 'facebook');
        if (socialData.isNewUser) {
          redirectUrl.searchParams.set('isNewUser', 'true');
        }

        const response = NextResponse.redirect(redirectUrl.toString());

        // Set auth cookies for middleware-based auth
        response.cookies.set('auth-token', jwtToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: '/',
        });
        response.cookies.set('auth-provider', 'facebook', {
          httpOnly: false,
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        });

        return response;
      }

      console.warn('[FB Auth] Strategy A failed:', socialData.error || socialData.message || 'unknown error');
    } catch (socialError) {
      console.warn('[FB Auth] Strategy A (social endpoint) exception:', socialError);
    }

    // Strategy B: Try direct DB access via dynamic import
    try {
      const { db } = await import('@/lib/db');
      const { generateToken, createSession, generateAccessToken } = await import('@/lib/sessions');

      const userEmail = email || `fb_${facebookId}@3boxesluxury.com`;

      // Find existing user by social ID
      let user = await db.user.findFirst({
        where: { socialProvider: 'facebook', socialId: facebookId },
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
              socialProvider: 'facebook',
              socialId: facebookId,
              ...(avatar && !user.avatar ? { avatar } : {}),
            },
          });
        }
      }

      // Check user status
      if (user) {
        if (!user.isActive) {
          return NextResponse.redirect(`${appUrl}/?auth=deactivated`);
        }
        if (user.approvalStatus === 'pending') {
          return NextResponse.redirect(`${appUrl}/?auth=pending`);
        }
        if (user.approvalStatus === 'rejected') {
          return NextResponse.redirect(`${appUrl}/?auth=rejected`);
        }

        // Update avatar if missing
        if (avatar && !user.avatar) {
          await db.user.update({
            where: { id: user.id },
            data: { avatar },
          }).catch(() => {});
        }

        // Create session
        const token = generateToken();
        try {
          await createSession(token, {
            id: user.id, email: user.email, name: user.name,
            role: user.role, avatar: avatar || user.avatar,
            isActive: user.isActive, approvalStatus: user.approvalStatus,
            emailVerified: user.emailVerified, phoneVerified: user.phoneVerified,
            twoFactorEnabled: user.twoFactorEnabled,
          });
        } catch (sessionErr) {
          console.warn('[FB Auth] DB session creation failed:', sessionErr);
        }

        // Generate JWT
        const jwtToken = generateAccessToken({
          id: user.id, email: user.email, name: user.name,
          role: user.role, avatar: avatar || user.avatar,
          isActive: user.isActive, approvalStatus: user.approvalStatus,
          emailVerified: user.emailVerified, phoneVerified: user.phoneVerified,
          twoFactorEnabled: user.twoFactorEnabled,
        });

        console.log('[FB Auth] Strategy B (direct DB) SUCCESS for:', user.name);

        const redirectUrl = new URL(appUrl);
        redirectUrl.searchParams.set('token', jwtToken);
        redirectUrl.searchParams.set('userId', user.id);
        redirectUrl.searchParams.set('userName', user.name);
        redirectUrl.searchParams.set('userEmail', user.email);
        redirectUrl.searchParams.set('userRole', user.role);
        redirectUrl.searchParams.set('authProvider', 'facebook');

        const response = NextResponse.redirect(redirectUrl.toString());
        response.cookies.set('auth-token', jwtToken, {
          httpOnly: true, secure: true, sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, path: '/',
        });
        response.cookies.set('auth-provider', 'facebook', {
          httpOnly: false, secure: true, sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, path: '/',
        });
        return response;
      }

      // Create new user
      const newUser = await db.user.create({
        data: {
          email: userEmail.toLowerCase().trim(),
          name: name,
          password: null,
          role: 'user',
          avatar: avatar,
          socialProvider: 'facebook',
          socialId: facebookId,
          approvalStatus: 'approved',
          isActive: true,
          emailVerified: !!email,
          phoneVerified: false,
          twoFactorEnabled: false,
        },
      });

      // Default permissions
      for (const perm of ['orders.own', 'cart.manage', 'wishlist.manage', 'profile.own']) {
        await db.userPermission.create({
          data: { userId: newUser.id, permission: perm },
        }).catch(() => {});
      }

      // Create session + JWT
      const token = generateToken();
      try {
        await createSession(token, {
          id: newUser.id, email: newUser.email, name: newUser.name,
          role: newUser.role, avatar: newUser.avatar,
          isActive: newUser.isActive, approvalStatus: newUser.approvalStatus,
          emailVerified: newUser.emailVerified, phoneVerified: newUser.phoneVerified,
          twoFactorEnabled: newUser.twoFactorEnabled,
        });
      } catch (sessionErr) {
        console.warn('[FB Auth] DB session creation for new user failed:', sessionErr);
      }

      const jwtToken = generateAccessToken({
        id: newUser.id, email: newUser.email, name: newUser.name,
        role: newUser.role, avatar: newUser.avatar,
        isActive: newUser.isActive, approvalStatus: newUser.approvalStatus,
        emailVerified: newUser.emailVerified, phoneVerified: newUser.phoneVerified,
        twoFactorEnabled: newUser.twoFactorEnabled,
      });

      console.log('[FB Auth] Strategy B (direct DB) NEW USER:', newUser.name);

      const redirectUrl = new URL(appUrl);
      redirectUrl.searchParams.set('token', jwtToken);
      redirectUrl.searchParams.set('userId', newUser.id);
      redirectUrl.searchParams.set('userName', newUser.name);
      redirectUrl.searchParams.set('userEmail', newUser.email);
      redirectUrl.searchParams.set('userRole', newUser.role);
      redirectUrl.searchParams.set('authProvider', 'facebook');
      redirectUrl.searchParams.set('isNewUser', 'true');

      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.set('auth-token', jwtToken, {
        httpOnly: true, secure: true, sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, path: '/',
      });
      response.cookies.set('auth-provider', 'facebook', {
        httpOnly: false, secure: true, sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, path: '/',
      });
      return response;

    } catch (dbError) {
      console.warn('[FB Auth] Strategy B (direct DB) failed:', dbError);
    }

    // Strategy C: Fallback - Direct JWT without database
    console.log('[FB Auth] Falling back to Strategy C (direct JWT)');
    const fallbackToken = await createFallbackJWT({
      type: 'session',
      userId: `fb_${facebookId}`,
      email: email || `fb_${facebookId}@3boxesluxury.com`,
      name: name,
      role: 'user',
      authProvider: 'facebook',
    });

    if (!fallbackToken) {
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=jwt_failed`);
    }

    const redirectUrl = new URL(appUrl);
    redirectUrl.searchParams.set('token', fallbackToken);
    redirectUrl.searchParams.set('userName', name);
    redirectUrl.searchParams.set('userEmail', email || `fb_${facebookId}@3boxesluxury.com`);
    redirectUrl.searchParams.set('userRole', 'user');
    redirectUrl.searchParams.set('authProvider', 'facebook');
    redirectUrl.searchParams.set('isNewUser', 'true');

    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.set('auth-token', fallbackToken, {
      httpOnly: true, secure: true, sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, path: '/',
    });
    response.cookies.set('auth-provider', 'facebook', {
      httpOnly: false, secure: true, sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, path: '/',
    });
    return response;

  } catch (error) {
    console.error('[FB Auth] Unexpected callback error:', error);
    return NextResponse.redirect(`https://3boxes-luxury-v12.vercel.app/?auth=error&reason=unexpected`);
  }
}
