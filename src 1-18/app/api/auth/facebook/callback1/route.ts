import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession } from '@/lib/sessions';
import jwt from 'jsonwebtoken';

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : '3boxes-dev-secret-key');

/**
 * GET /api/auth/facebook/callback
 * Facebook OAuth callback - exchanges code for token, fetches user profile, creates/signs in user
 * Supports "connect" action: when oauth_action=connect, links provider without changing main auth
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorReason = searchParams.get('error_reason');

  // Read the oauth_action cookie to determine if this is a "login" or "connect" flow
  const oauthAction = request.cookies.get('oauth_action')?.value || 'login';
  const isConnectAction = oauthAction === 'connect';

  // User denied access
  if (error) {
    const errorMsg = errorReason === 'user_denied' 
      ? 'You denied Facebook access. Please try again.' 
      : `Facebook login failed: ${error}`;
    const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
    const redirectUrl = new URL(returnTo, BASE_URL);
    redirectUrl.searchParams.set('auth_error', errorMsg);
    const resp = NextResponse.redirect(redirectUrl.toString());
    resp.cookies.delete('oauth_state_facebook');
    resp.cookies.delete('oauth_return_to');
    resp.cookies.delete('oauth_action');
    return resp;
  }

  if (!code || !state) {
    const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
    const redirectUrl = new URL(returnTo, BASE_URL);
    redirectUrl.searchParams.set('auth_error', 'Facebook login failed: missing authorization code');
    const resp = NextResponse.redirect(redirectUrl.toString());
    resp.cookies.delete('oauth_state_facebook');
    resp.cookies.delete('oauth_return_to');
    resp.cookies.delete('oauth_action');
    return resp;
  }

  // Verify state for CSRF protection
  const savedState = request.cookies.get('oauth_state_facebook')?.value;
  if (!savedState || savedState !== state) {
    const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
    const redirectUrl = new URL(returnTo, BASE_URL);
    redirectUrl.searchParams.set('auth_error', 'Invalid OAuth state. Please try again.');
    const resp = NextResponse.redirect(redirectUrl.toString());
    resp.cookies.delete('oauth_state_facebook');
    resp.cookies.delete('oauth_return_to');
    resp.cookies.delete('oauth_action');
    return resp;
  }

  try {
    // Step 1: Exchange code for access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&redirect_uri=${encodeURIComponent(`${BASE_URL}/api/auth/facebook/callback`)}&code=${code}`,
      { method: 'GET' }
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('[Facebook OAuth] Token exchange error:', tokenData.error);
      const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
      const redirectUrl = new URL(returnTo, BASE_URL);
      redirectUrl.searchParams.set('auth_error', 'Failed to authenticate with Facebook. Please try again.');
      const resp = NextResponse.redirect(redirectUrl.toString());
      resp.cookies.delete('oauth_state_facebook');
      resp.cookies.delete('oauth_return_to');
      resp.cookies.delete('oauth_action');
      return resp;
    }

    const accessToken = tokenData.access_token;

    // Step 2: Fetch user profile from Facebook
    const profileResponse = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name,email,picture.width(200).height(200)&access_token=${accessToken}`,
      { method: 'GET' }
    );

    const profileData = await profileResponse.json();

    if (profileData.error) {
      console.error('[Facebook OAuth] Profile fetch error:', profileData.error);
      const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
      const redirectUrl = new URL(returnTo, BASE_URL);
      redirectUrl.searchParams.set('auth_error', 'Failed to fetch Facebook profile. Please try again.');
      const resp = NextResponse.redirect(redirectUrl.toString());
      resp.cookies.delete('oauth_state_facebook');
      resp.cookies.delete('oauth_return_to');
      resp.cookies.delete('oauth_action');
      return resp;
    }

    const facebookId = profileData.id;
    const facebookName = profileData.name || 'Facebook User';
    const facebookEmail = profileData.email || null;
    const facebookAvatar = profileData.picture?.data?.url || null;

    if (!facebookId) {
      const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
      const redirectUrl = new URL(returnTo, BASE_URL);
      redirectUrl.searchParams.set('auth_error', 'Failed to get Facebook user ID. Please try again.');
      const resp = NextResponse.redirect(redirectUrl.toString());
      resp.cookies.delete('oauth_state_facebook');
      resp.cookies.delete('oauth_return_to');
      resp.cookies.delete('oauth_action');
      return resp;
    }

    // ─── CONNECT ACTION: Link provider to current user, do NOT change auth session ───
    if (isConnectAction) {
      console.log('[Facebook OAuth] Connect action — linking Facebook provider without changing main auth');

      // Store provider info in URL params so the social-style page can read it
      // Do NOT set auth_token, auth_id, etc. — the main login session stays unchanged
      const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
      const redirectUrl = new URL(returnTo, BASE_URL);
      redirectUrl.searchParams.set('connect_provider', 'facebook');
      redirectUrl.searchParams.set('connect_name', facebookName);
      if (facebookEmail) redirectUrl.searchParams.set('connect_email', facebookEmail);
      if (facebookAvatar) redirectUrl.searchParams.set('connect_avatar', facebookAvatar);
      redirectUrl.searchParams.set('connect_id', facebookId);

      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_state_facebook');
      response.cookies.delete('oauth_return_to');
      response.cookies.delete('oauth_action');
      return response;
    }

    // ─── LOGIN ACTION: Full login flow (original behavior) ───

    // Step 3: Find or create user in our database
    let user = await db.user.findFirst({
      where: {
        socialProvider: 'facebook',
        socialId: facebookId,
      },
    });

    // If not found by social ID, try to find by email (to link accounts)
    if (!user && facebookEmail) {
      user = await db.user.findUnique({
        where: { email: facebookEmail.toLowerCase().trim() },
      });

      if (user) {
        // Link the Facebook account to existing user
        user = await db.user.update({
          where: { id: user.id },
          data: {
            socialProvider: 'facebook',
            socialId: facebookId,
            ...(facebookAvatar && !user.avatar ? { avatar: facebookAvatar } : {}),
          },
        });
      }
    }

    // If user exists, check status
    if (user) {
      if (!user.isActive) {
        return NextResponse.redirect(`${BASE_URL}/?auth_error=${encodeURIComponent('Your account has been deactivated. Please contact support.')}`);
      }

      if (user.approvalStatus === 'pending') {
        return NextResponse.redirect(`${BASE_URL}/?auth_error=${encodeURIComponent('Your account is pending approval.')}`);
      }

      if (user.approvalStatus === 'rejected') {
        return NextResponse.redirect(`${BASE_URL}/?auth_error=${encodeURIComponent('Your account has been rejected. Please contact support.')}`);
      }

      // Update last login info
      await db.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          ...(facebookAvatar && !user.avatar ? { avatar: facebookAvatar } : {}),
        },
      }).catch(() => {});
    } else {
      // Create new user from Facebook profile
      if (!facebookEmail) {
        const tempEmail = `fb_${facebookId}@3boxes-social.placeholder`;
        
        user = await db.user.create({
          data: {
            email: tempEmail,
            name: facebookName,
            password: null,
            role: 'user',
            avatar: facebookAvatar,
            socialProvider: 'facebook',
            socialId: facebookId,
            approvalStatus: 'approved',
            isActive: true,
            emailVerified: true,
            phoneVerified: false,
            twoFactorEnabled: false,
          },
        });
      } else {
        user = await db.user.create({
          data: {
            email: facebookEmail.toLowerCase().trim(),
            name: facebookName,
            password: null,
            role: 'user',
            avatar: facebookAvatar,
            socialProvider: 'facebook',
            socialId: facebookId,
            approvalStatus: 'approved',
            isActive: true,
            emailVerified: true,
            phoneVerified: false,
            twoFactorEnabled: false,
          },
        });
      }

      // Create default permissions for new user
      const defaultPermissions = ['orders.own', 'cart.manage', 'wishlist.manage', 'profile.own'];
      for (const perm of defaultPermissions) {
        await db.userPermission.create({
          data: { userId: user.id, permission: perm },
        }).catch(() => {});
      }
    }

    // Step 4: Generate JWT token
    const jwtToken = jwt.sign(
      {
        type: 'session',
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Step 5: Create session
    try {
      await createSession(jwtToken, {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive,
        approvalStatus: user.approvalStatus,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        twoFactorEnabled: user.twoFactorEnabled,
      });
    } catch (sessionError) {
      console.warn('[Facebook OAuth] DB session creation failed, JWT-only auth will be used:', sessionError);
    }

    // Step 6: Create audit log
    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'login',
          entity: 'user',
          entityId: user.id,
          details: JSON.stringify({ method: 'facebook', socialId: facebookId }),
        },
      });
    } catch {}

    // Step 7: Redirect to frontend with token
    const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
    const redirectUrl = new URL(returnTo, BASE_URL);
    redirectUrl.searchParams.set('auth_token', jwtToken);
    redirectUrl.searchParams.set('auth_provider', 'facebook');
    redirectUrl.searchParams.set('auth_name', user.name);
    redirectUrl.searchParams.set('auth_email', user.email);
    redirectUrl.searchParams.set('auth_role', user.role);
    redirectUrl.searchParams.set('auth_id', user.id);

    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.delete('oauth_state_facebook');
    response.cookies.delete('oauth_return_to');
    response.cookies.delete('oauth_action');

    // Also set auth token as a cookie for extra reliability
    response.cookies.set('auth_token', jwtToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[Facebook OAuth] Unexpected error:', err);
    const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
    const redirectUrl = new URL(returnTo, BASE_URL);
    redirectUrl.searchParams.set('auth_error', 'An unexpected error occurred during Facebook login. Please try again.');
    const resp = NextResponse.redirect(redirectUrl.toString());
    resp.cookies.delete('oauth_state_facebook');
    resp.cookies.delete('oauth_return_to');
    resp.cookies.delete('oauth_action');
    return resp;
  }
}
