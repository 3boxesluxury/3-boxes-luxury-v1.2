import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// Facebook OAuth Callback Route - V2 (Robust Version)
// ============================================================
// This version is SELF-CONTAINED - no dependency on @/lib/sessions
// which was causing 404 errors on Vercel.
//
// Flow:
// 1. Facebook redirects here with ?code=xxx
// 2. We exchange code for access_token
// 3. We get user profile from Facebook Graph API
// 4. We find/create user via /api/auth/social (reuse existing working route)
// 5. We redirect to home page with token in URL
// 6. page.tsx catches the token and logs the user in
// ============================================================

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '1638724140532761';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || 'f6faeeafe9b64e31719894476129b4ee';

// Detect the correct redirect URI based on environment
function getRedirectUri(requestUrl: string): string {
  // If NEXT_PUBLIC_APP_URL is set, use it
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/facebook/callback`;
  }
  // Otherwise, construct from the request URL
  try {
    const url = new URL(requestUrl);
    return `${url.origin}/api/auth/facebook/callback`;
  } catch {
    // Fallback
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
      console.log('[Facebook Auth] User denied permission:', error, errorReason);
      return NextResponse.redirect(`${appUrl}/?auth=denied`);
    }

    if (!code) {
      console.log('[Facebook Auth] No authorization code received');
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=no_code`);
    }

    console.log('[Facebook Auth] Received authorization code, exchanging for token...');

    // Step 1: Exchange code for access token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    let tokenData: any;
    try {
      const tokenResponse = await fetch(tokenUrl, { method: 'GET' });
      tokenData = await tokenResponse.json();
    } catch (fetchError) {
      console.error('[Facebook Auth] Token exchange fetch failed:', fetchError);
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=token_fetch_failed`);
    }

    if (tokenData.error) {
      console.error('[Facebook Auth] Token exchange error:', tokenData.error);
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=token_error&msg=${encodeURIComponent(tokenData.error.message || 'unknown')}`);
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      console.error('[Facebook Auth] No access token in response:', tokenData);
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=no_access_token`);
    }

    console.log('[Facebook Auth] Token received, fetching user profile...');

    // Step 2: Get user profile from Facebook
    let profileData: any;
    try {
      const profileResponse = await fetch(
        `https://graph.facebook.com/v19.0/me?fields=id,name,email,picture.width(200).height(200)&access_token=${accessToken}`,
        { method: 'GET' }
      );
      profileData = await profileResponse.json();
    } catch (fetchError) {
      console.error('[Facebook Auth] Profile fetch failed:', fetchError);
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=profile_fetch_failed`);
    }

    if (profileData.error) {
      console.error('[Facebook Auth] Profile fetch error:', profileData.error);
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=profile_error&msg=${encodeURIComponent(profileData.error.message || 'unknown')}`);
    }

    const facebookId = profileData.id;
    const name = profileData.name || 'Facebook User';
    const email = profileData.email || null;
    const avatar = profileData.picture?.data?.url || null;

    if (!facebookId) {
      console.error('[Facebook Auth] No Facebook ID in profile');
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=no_facebook_id`);
    }

    console.log('[Facebook Auth] Profile received:', { facebookId, name, email: email || '(not provided)' });

    // Step 3: Use the existing /api/auth/social endpoint to create/find user
    // This reuses the WORKING social login flow instead of duplicating logic
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

      if (!socialRes.ok || !socialData.token) {
        console.error('[Facebook Auth] Social login failed:', socialData.error || socialData.message);
        return NextResponse.redirect(`${appUrl}/?auth=error&reason=social_login_failed`);
      }

      const user = socialData.user;
      const jwtToken = socialData.token;

      console.log('[Facebook Auth] Login successful for:', user.name);

      // Redirect to home page with token and user info in URL
      // page.tsx will catch these params and log the user in
      const redirectUrl = new URL(appUrl);
      redirectUrl.searchParams.set('token', jwtToken);
      redirectUrl.searchParams.set('userId', user.id);
      redirectUrl.searchParams.set('userName', user.name);
      redirectUrl.searchParams.set('userEmail', user.email);
      redirectUrl.searchParams.set('userRole', user.role);
      redirectUrl.searchParams.set('authProvider', 'facebook');
      if (socialData.isNewUser) {
        redirectUrl.searchParams.set('isNewUser', 'true');
      }

      return NextResponse.redirect(redirectUrl.toString());

    } catch (socialError) {
      console.error('[Facebook Auth] Social API call failed:', socialError);

      // Fallback: If /api/auth/social fails, try direct JWT approach
      // This is a safety net - the user will still get logged in
      try {
        const jwt = await import('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || '3boxes-dev-secret-key';

        const fallbackToken = jwt.sign(
          {
            type: 'session',
            userId: `fb_${facebookId}`,
            email: email || `fb_${facebookId}@3boxesluxury.com`,
            name: name,
            role: 'user',
            authProvider: 'facebook',
          },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        const redirectUrl = new URL(appUrl);
        redirectUrl.searchParams.set('token', fallbackToken);
        redirectUrl.searchParams.set('userName', name);
        redirectUrl.searchParams.set('userEmail', email || `fb_${facebookId}@3boxesluxury.com`);
        redirectUrl.searchParams.set('userRole', 'user');
        redirectUrl.searchParams.set('authProvider', 'facebook');
        redirectUrl.searchParams.set('isNewUser', 'true');

        return NextResponse.redirect(redirectUrl.toString());
      } catch (jwtError) {
        console.error('[Facebook Auth] Fallback JWT creation failed:', jwtError);
        return NextResponse.redirect(`${appUrl}/?auth=error&reason=jwt_failed`);
      }
    }

  } catch (error) {
    console.error('[Facebook Auth] Unexpected callback error:', error);
    const appUrlFallback = 'https://3boxes-luxury-v12.vercel.app';
    return NextResponse.redirect(`${appUrlFallback}/?auth=error&reason=unexpected`);
  }
}
