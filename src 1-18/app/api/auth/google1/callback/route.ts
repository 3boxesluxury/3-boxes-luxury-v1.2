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

      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_state_google');
      response.cookies.delete('oauth_return_to');
      response.cookies.delete('oauth_action');
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
          },
        });
      }
    }

    if (user) {
      if (!user.isActive) return NextResponse.redirect(`${BASE_URL}/?auth_error=${encodeURIComponent('Your account has been deactivated.')}`);
      if (user.approvalStatus === 'pending') return NextResponse.redirect(`${BASE_URL}/?auth_error=${encodeURIComponent('Your account is pending approval.')}`);
      if (user.approvalStatus === 'rejected') return NextResponse.redirect(`${BASE_URL}/?auth_error=${encodeURIComponent('Your account has been rejected.')}`);
      await db.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), ...(googleAvatar && !user.avatar ? { avatar: googleAvatar } : {}) },
      }).catch(() => {});
    } else {
      const tempEmail = googleEmail || `go_${googleId}@3boxes-social.placeholder`;
      user = await db.user.create({
        data: {
          email: googleEmail ? googleEmail.toLowerCase().trim() : tempEmail,
          name: fullName, password: null, role: 'user', avatar: googleAvatar,
          socialProvider: 'google', socialId: googleId, approvalStatus: 'approved',
          isActive: true, emailVerified: true, phoneVerified: false, twoFactorEnabled: false,
        },
      });
      const defaultPermissions = ['orders.own', 'cart.manage', 'wishlist.manage', 'profile.own'];
      for (const perm of defaultPermissions) {
        await db.userPermission.create({ data: { userId: user.id, permission: perm } }).catch(() => {});
      }
    }

    // Step 4: Generate JWT
    const jwtToken = jwt.sign(
      { type: 'session', userId: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Step 5: Create session
    try {
      await createSession(jwtToken, {
        id: user.id, email: user.email, name: user.name, role: user.role,
        avatar: user.avatar, isActive: user.isActive, approvalStatus: user.approvalStatus,
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

    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.delete('oauth_state_google');
    response.cookies.delete('oauth_return_to');
    response.cookies.delete('oauth_action');
    response.cookies.set('auth_token', jwtToken, {
      httpOnly: false, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/',
    });

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
