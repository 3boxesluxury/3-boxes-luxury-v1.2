import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession } from '@/lib/sessions';
import jwt from 'jsonwebtoken';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : '3boxes-dev-secret-key');

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Read the oauth_action cookie to determine if this is a "login" or "connect" flow
  const oauthAction = request.cookies.get('oauth_action')?.value || 'login';
  const isConnectAction = oauthAction === 'connect';

  if (error) {
    const errorMsg = error === 'access_denied'
      ? 'You denied Google access. Please try again.'
      : `Google login failed: ${error}`;
    const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
    const redirectUrl = new URL(returnTo, BASE_URL);
    redirectUrl.searchParams.set('auth_error', errorMsg);
    const resp = NextResponse.redirect(redirectUrl.toString());
    resp.cookies.delete('oauth_state_google');
    resp.cookies.delete('oauth_return_to');
    resp.cookies.delete('oauth_action');
    return resp;
  }

  if (!code || !state) {
    const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
    const redirectUrl = new URL(returnTo, BASE_URL);
    redirectUrl.searchParams.set('auth_error', 'Google login failed: missing authorization code');
    const resp = NextResponse.redirect(redirectUrl.toString());
    resp.cookies.delete('oauth_state_google');
    resp.cookies.delete('oauth_return_to');
    resp.cookies.delete('oauth_action');
    return resp;
  }

  const savedState = request.cookies.get('oauth_state_google')?.value;
  if (!savedState || savedState !== state) {
    const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
    const redirectUrl = new URL(returnTo, BASE_URL);
    redirectUrl.searchParams.set('auth_error', 'Invalid OAuth state. Please try again.');
    const resp = NextResponse.redirect(redirectUrl.toString());
    resp.cookies.delete('oauth_state_google');
    resp.cookies.delete('oauth_return_to');
    resp.cookies.delete('oauth_action');
    return resp;
  }

  try {
    // Step 1: Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${BASE_URL}/api/auth/google/callback`,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      console.error('[Google OAuth] Token exchange error:', tokenData.error);
      const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
      const redirectUrl = new URL(returnTo, BASE_URL);
      redirectUrl.searchParams.set('auth_error', 'Failed to authenticate with Google.');
      const resp = NextResponse.redirect(redirectUrl.toString());
      resp.cookies.delete('oauth_state_google');
      resp.cookies.delete('oauth_return_to');
      resp.cookies.delete('oauth_action');
      return resp;
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || null;
    const expiresIn = tokenData.expires_in || 3600; // seconds until access token expires
    const expiresAt = Date.now() + expiresIn * 1000; // timestamp when token expires

    // v20.4: Log the scopes that were actually granted by the user
    // If user.birthday.read is missing from granted scopes, People API won't return birthday
    const grantedScopes = tokenData.scope || '';
    console.log('[Google OAuth] v20.4: Granted scopes:', grantedScopes);
    console.log('[Google OAuth] v20.4: Has birthday.read scope:', grantedScopes.includes('user.birthday.read'));
    console.log('[Google OAuth] v20.4: Has youtube.readonly scope:', grantedScopes.includes('youtube.readonly'));
    console.log('[Google OAuth] v20.5: Has refresh token:', !!refreshToken, '| Token expires in:', expiresIn, 'seconds');

    // Step 2: Fetch user profile
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const profileData = await profileResponse.json();
    if (profileData.error) {
      console.error('[Google OAuth] Profile fetch error:', profileData.error);
      const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
      const redirectUrl = new URL(returnTo, BASE_URL);
      redirectUrl.searchParams.set('auth_error', 'Failed to fetch Google profile.');
      const resp = NextResponse.redirect(redirectUrl.toString());
      resp.cookies.delete('oauth_state_google');
      resp.cookies.delete('oauth_return_to');
      resp.cookies.delete('oauth_action');
      return resp;
    }

    const googleId = profileData.sub;
    const googleName = profileData.name || profileData.given_name || 'Google User';
    const googleEmail = profileData.email || null;
    const googleAvatar = profileData.picture || null;

    // v16: Fetch gender from Google People API
    // v20.2: Also fetch birthday
    // Google's oauth2/v3/userinfo endpoint does NOT return gender/birthday.
    // We need to call the People API separately with the user.gender.read and user.birthday.read scopes.
    let googleGender: string | null = null;
    let googleBirthday: string | null = null;
    try {
      const peopleResponse = await fetch('https://people.googleapis.com/v1/people/me?personFields=genders,birthdays', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const peopleData = await peopleResponse.json();
      // v20.3: Detailed debug logging for People API response
      console.log('[Google OAuth] v20.3: People API response status:', peopleResponse.status);
      console.log('[Google OAuth] v20.3: People API has genders:', !!peopleData.genders, '| has birthdays:', !!peopleData.birthdays);
      // v20.4: Log full People API response for debugging birthday issues
      console.log('[Google OAuth] v20.4: People API raw response:', JSON.stringify(peopleData).substring(0, 500));
      if (peopleData.birthdays) {
        console.log('[Google OAuth] v20.3: Birthdays array length:', peopleData.birthdays.length);
        // Log each birthday entry to see what Google returns
        for (let i = 0; i < peopleData.birthdays.length; i++) {
          const b = peopleData.birthdays[i];
          console.log(`[Google OAuth] v20.3: Birthday[${i}]:`, JSON.stringify(b));
        }
      }
      if (peopleData.error) {
        console.warn('[Google OAuth] v20.3: People API error:', JSON.stringify(peopleData.error));
      }

      if (peopleData.genders && peopleData.genders.length > 0) {
        // Google People API returns gender as 'male', 'female', or 'other'
        const rawGender = peopleData.genders[0].value?.toLowerCase();
        if (rawGender === 'male' || rawGender === 'female') {
          googleGender = rawGender;
        }
      }
      console.log('[Google OAuth] v16: Gender from People API:', googleGender || 'not provided');
      // v20.3: Parse birthday from People API — try ALL birthday entries
      // Google may return multiple birthday objects (e.g. one with year, one without)
      if (peopleData.birthdays && peopleData.birthdays.length > 0) {
        for (const bdayEntry of peopleData.birthdays) {
          const bday = bdayEntry.date;
          if (bday) {
            const month = bday.month || 0;
            const day = bday.day || 0;
            const year = bday.year || 0;
            if (month && day) {
              googleBirthday = `${month}/${day}${year ? '/' + year : ''}`;
              console.log('[Google OAuth] v20.3: Parsed birthday:', googleBirthday);
              break; // Use the first valid birthday
            }
          }
        }
      }
      console.log('[Google OAuth] v20.3: FINAL Birthday from People API:', googleBirthday || 'NOT PROVIDED');
    } catch (genderError) {
      console.warn('[Google OAuth] v20.3: Could not fetch gender/birthday from People API:', genderError);
      // Non-critical — continue without gender/birthday
    }

    if (!googleId) {
      const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
      const redirectUrl = new URL(returnTo, BASE_URL);
      redirectUrl.searchParams.set('auth_error', 'Failed to get Google user ID.');
      const resp = NextResponse.redirect(redirectUrl.toString());
      resp.cookies.delete('oauth_state_google');
      resp.cookies.delete('oauth_return_to');
      resp.cookies.delete('oauth_action');
      return resp;
    }

    const fullName = googleName || 'Google User';

    // ─── CONNECT ACTION: Link provider to current user, do NOT change auth session ───
    if (isConnectAction) {
      console.log('[Google OAuth] Connect action — linking Google provider without changing main auth');

      // Store provider info in URL params so the social-style page can read it
      // Do NOT set auth_token, auth_id, etc. — the main login session stays unchanged
      const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
      const redirectUrl = new URL(returnTo, BASE_URL);
      redirectUrl.searchParams.set('connect_provider', 'google');
      redirectUrl.searchParams.set('connect_name', fullName);
      if (googleEmail) redirectUrl.searchParams.set('connect_email', googleEmail);
      if (googleAvatar) redirectUrl.searchParams.set('connect_avatar', googleAvatar);
      redirectUrl.searchParams.set('connect_id', googleId);
      // v16: Pass gender from Google People API so social-style route can use it
      if (googleGender) redirectUrl.searchParams.set('connect_gender', googleGender);
      // v20.3: Pass birthday from Google People API (ALWAYS set, even if null — helps debug)
      if (googleBirthday) {
        redirectUrl.searchParams.set('connect_birthday', googleBirthday);
        console.log('[Google OAuth] v20.3: Set connect_birthday in URL:', googleBirthday);
      } else {
        console.warn('[Google OAuth] v20.3: No birthday to pass — connect_birthday NOT set in URL');
      }
      // v20: Pass Google access token for YouTube recommendations
      // Token has youtube.readonly scope — frontend passes it to /api/social-style
      if (accessToken) {
        redirectUrl.searchParams.set('connect_youtube_token', accessToken);
      }

      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_state_google');
      response.cookies.delete('oauth_return_to');
      response.cookies.delete('oauth_action');
      // v20.1: Store YouTube access token in a cookie (frontend reads it)
      if (accessToken) {
        response.cookies.set('google_youtube_token', accessToken, {
          httpOnly: false, // frontend needs to read it
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 3600, // 1 hour (Google access tokens expire in ~1 hour)
          path: '/',
        });
      }
      // v20.6: Store birthday in a cookie (more reliable than URL params)
      // Even if null, set empty string so frontend knows API was called
      response.cookies.set('google_birthday', googleBirthday || '', {
        httpOnly: false, // frontend needs to read it
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days (birthday doesn't change)
        path: '/',
      });
      // v21: Store gender in a cookie (more reliable than URL params, survives page reloads)
      response.cookies.set('google_gender', googleGender || '', {
        httpOnly: false, // frontend needs to read it
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });
      // v20.5: Store refresh token in httpOnly cookie (secure — JS cannot read it)
      // Used by /api/auth/google/refresh to get a new access token when it expires
      if (refreshToken) {
        response.cookies.set('google_refresh_token', refreshToken, {
          httpOnly: true, // NOT accessible from JavaScript — secure
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60, // 30 days (refresh tokens are long-lived)
          path: '/',
        });
      }
      // v20.5: Store token expiry timestamp so frontend knows when to refresh
      if (expiresAt) {
        response.cookies.set('google_token_expires', String(expiresAt), {
          httpOnly: false, // frontend needs to read it to know when to refresh
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60, // 30 days
          path: '/',
        });
      }
      return response;
    }

    // ─── LOGIN ACTION: Full login flow (original behavior) ───

    // Step 3: Find or create user
    let user = await db.user.findFirst({
      where: { socialProvider: 'google', socialId: googleId },
    });

    if (!user && googleEmail) {
      user = await db.user.findUnique({ where: { email: googleEmail.toLowerCase().trim() } });
      if (user) {
        user = await db.user.update({
          where: { id: user.id },
          data: {
            socialProvider: 'google',
            socialId: googleId,
            ...(googleAvatar && !user.avatar ? { avatar: googleAvatar } : {}),
            // v16: Persist gender from Google People API
            ...(googleGender && !user.gender ? { gender: googleGender } : {}),
          },
        });
      }
    }

    if (user) {
      if (!user.isActive) return NextResponse.redirect(`${BASE_URL}/?auth_error=${encodeURIComponent('Your account has been deactivated.')}`);
      if (user.approvalStatus === 'pending') return NextResponse.redirect(`${BASE_URL}/?auth_error=${encodeURIComponent('Your account is pending approval.')}`);
      if (user.approvalStatus === 'rejected') return NextResponse.redirect(`${BASE_URL}/?auth_error=${encodeURIComponent('Your account has been rejected.')}`);
      // v16: Update last login + persist gender if not already saved
      await db.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          ...(googleAvatar && !user.avatar ? { avatar: googleAvatar } : {}),
          ...(googleGender && !user.gender ? { gender: googleGender } : {}),
        },
      }).catch(() => {});
    } else {
      const tempEmail = googleEmail || `go_${googleId}@3boxes-social.placeholder`;
      user = await db.user.create({
        data: {
          email: googleEmail ? googleEmail.toLowerCase().trim() : tempEmail,
          name: fullName, password: null, role: 'user', avatar: googleAvatar,
          socialProvider: 'google', socialId: googleId, approvalStatus: 'approved',
          isActive: true, emailVerified: true, phoneVerified: false, twoFactorEnabled: false,
          // v16: Persist gender from Google People API
          ...(googleGender ? { gender: googleGender } : {}),
        },
      });
      const defaultPermissions = ['orders.own', 'cart.manage', 'wishlist.manage', 'profile.own'];
      for (const perm of defaultPermissions) {
        await db.userPermission.create({ data: { userId: user.id, permission: perm } }).catch(() => {});
      }
    }

    // Step 4: Generate JWT
    const jwtToken = jwt.sign(
      { type: 'session', userId: user.id, email: user.email, name: user.name, role: user.role, gender: user.gender },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Step 5: Create session
    try {
      await createSession(jwtToken, {
        id: user.id, email: user.email, name: user.name, role: user.role,
        avatar: user.avatar, gender: user.gender, isActive: user.isActive, approvalStatus: user.approvalStatus,
        emailVerified: user.emailVerified, phoneVerified: user.phoneVerified, twoFactorEnabled: user.twoFactorEnabled,
      });
    } catch (sessionError) {
      console.warn('[Google OAuth] DB session creation failed:', sessionError);
    }

    // Step 6: Audit log
    try {
      await db.auditLog.create({
        data: { userId: user.id, action: 'login', entity: 'user', entityId: user.id,
          details: JSON.stringify({ method: 'google', socialId: googleId }) },
      });
    } catch {}

    // Step 7: Redirect to frontend with token
    const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
    const redirectUrl = new URL(returnTo, BASE_URL);
    redirectUrl.searchParams.set('auth_token', jwtToken);
    redirectUrl.searchParams.set('auth_provider', 'google');
    redirectUrl.searchParams.set('auth_name', user.name);
    redirectUrl.searchParams.set('auth_email', user.email);
    redirectUrl.searchParams.set('auth_role', user.role);
    redirectUrl.searchParams.set('auth_id', user.id);
    if (user.avatar || googleAvatar) redirectUrl.searchParams.set('auth_avatar', user.avatar || googleAvatar || '');
    // v16: Pass gender from Google People API in login redirect
    if (googleGender) redirectUrl.searchParams.set('auth_gender', googleGender);
    // v20.2: Pass birthday from Google People API
    if (googleBirthday) redirectUrl.searchParams.set('auth_birthday', googleBirthday);
    // v20: Pass Google access token for YouTube recommendations
    if (accessToken) {
      redirectUrl.searchParams.set('auth_youtube_token', accessToken);
    }

    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.delete('oauth_state_google');
    response.cookies.delete('oauth_return_to');
    response.cookies.delete('oauth_action');
    response.cookies.set('auth_token', jwtToken, {
      httpOnly: false, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/',
    });
    // v20.1: Store YouTube access token in a cookie (frontend reads it)
    if (accessToken) {
      response.cookies.set('google_youtube_token', accessToken, {
        httpOnly: false, // frontend needs to read it
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 3600, // 1 hour
        path: '/',
      });
    }
    // v20.6: Store birthday in a cookie (more reliable than URL params)
    response.cookies.set('google_birthday', googleBirthday || '', {
      httpOnly: false, // frontend needs to read it
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days (birthday doesn't change)
      path: '/',
    });
    // v21: Store gender in a cookie (more reliable than URL params, survives page reloads)
    response.cookies.set('google_gender', googleGender || '', {
      httpOnly: false, // frontend needs to read it
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });
    // v20.5: Store refresh token in httpOnly cookie (secure — JS cannot read it)
    if (refreshToken) {
      response.cookies.set('google_refresh_token', refreshToken, {
        httpOnly: true, // NOT accessible from JavaScript — secure
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });
    }
    // v20.5: Store token expiry timestamp so frontend knows when to refresh
    if (expiresAt) {
      response.cookies.set('google_token_expires', String(expiresAt), {
        httpOnly: false, // frontend needs to read it
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });
    }

    return response;
  } catch (err) {
    console.error('[Google OAuth] Unexpected error:', err);
    const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
    const redirectUrl = new URL(returnTo, BASE_URL);
    redirectUrl.searchParams.set('auth_error', 'An unexpected error occurred during Google login.');
    const resp = NextResponse.redirect(redirectUrl.toString());
    resp.cookies.delete('oauth_state_google');
    resp.cookies.delete('oauth_return_to');
    resp.cookies.delete('oauth_action');
    return resp;
  }
}
