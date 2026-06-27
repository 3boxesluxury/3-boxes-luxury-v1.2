import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession } from '@/lib/sessions';
import jwt from 'jsonwebtoken';

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || '';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : '3boxes-dev-secret-key');

// CRITICAL: Warn if JWT_SECRET is missing in production
if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  console.error('[LinkedIn OAuth] FATAL: JWT_SECRET is not set! LinkedIn login will fail. Set it in Vercel → Settings → Environment Variables');
}

/**
 * GET /api/auth/linkedin/callback
 * LinkedIn OAuth callback - exchanges code for token, fetches user profile, creates/signs in user
 * Supports "connect" action: when oauth_action=connect, links provider without changing main auth
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Read the oauth_action cookie to determine if this is a "login" or "connect" flow
  const oauthAction = request.cookies.get('oauth_action')?.value || 'login';
  const isConnectAction = oauthAction === 'connect';

  // User denied access or error occurred
  if (error) {
    const errorMsg = error === 'user_cancelled_login' || error === 'user_cancelled_authorize'
      ? 'You cancelled the LinkedIn login. Please try again.'
      : `LinkedIn login failed: ${errorDescription || error}`;
    const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
    const redirectUrl = new URL(returnTo, BASE_URL);
    redirectUrl.searchParams.set('auth_error', errorMsg);
    const resp = NextResponse.redirect(redirectUrl.toString());
    resp.cookies.delete('oauth_state_linkedin');
    resp.cookies.delete('oauth_return_to');
    resp.cookies.delete('oauth_action');
    return resp;
  }

  if (!code || !state) {
    const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
    const redirectUrl = new URL(returnTo, BASE_URL);
    redirectUrl.searchParams.set('auth_error', 'LinkedIn login failed: missing authorization code');
    const resp = NextResponse.redirect(redirectUrl.toString());
    resp.cookies.delete('oauth_state_linkedin');
    resp.cookies.delete('oauth_return_to');
    resp.cookies.delete('oauth_action');
    return resp;
  }

  // Verify state for CSRF protection
  const savedState = request.cookies.get('oauth_state_linkedin')?.value;
  if (!savedState || savedState !== state) {
    const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
    const redirectUrl = new URL(returnTo, BASE_URL);
    redirectUrl.searchParams.set('auth_error', 'Invalid OAuth state. Please try again.');
    const resp = NextResponse.redirect(redirectUrl.toString());
    resp.cookies.delete('oauth_state_linkedin');
    resp.cookies.delete('oauth_return_to');
    resp.cookies.delete('oauth_action');
    return resp;
  }

  try {
    // Step 1: Exchange authorization code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${BASE_URL}/api/auth/linkedin/callback`,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('[LinkedIn OAuth] Token exchange error:', tokenData.error);
      const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
      const redirectUrl = new URL(returnTo, BASE_URL);
      redirectUrl.searchParams.set('auth_error', 'Failed to authenticate with LinkedIn. Please try again.');
      const resp = NextResponse.redirect(redirectUrl.toString());
      resp.cookies.delete('oauth_state_linkedin');
      resp.cookies.delete('oauth_return_to');
      resp.cookies.delete('oauth_action');
      return resp;
    }

    const accessToken = tokenData.access_token;

    // Step 2: Fetch user profile using OpenID Connect (LinkedIn's current API)
    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const profileData = await profileResponse.json();

    if (profileData.error) {
      console.error('[LinkedIn OAuth] Profile fetch error:', profileData.error);
      const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
      const redirectUrl = new URL(returnTo, BASE_URL);
      redirectUrl.searchParams.set('auth_error', 'Failed to fetch LinkedIn profile. Please try again.');
      const resp = NextResponse.redirect(redirectUrl.toString());
      resp.cookies.delete('oauth_state_linkedin');
      resp.cookies.delete('oauth_return_to');
      resp.cookies.delete('oauth_action');
      return resp;
    }

    const linkedinId = profileData.sub;
    const linkedinName = profileData.name || profileData.given_name || 'LinkedIn User';
    const linkedinEmail = profileData.email || null;
    const linkedinAvatar = profileData.picture || null;
    const linkedinFirstName = profileData.given_name || '';
    const linkedinLastName = profileData.family_name || '';

    if (!linkedinId) {
      const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
      const redirectUrl = new URL(returnTo, BASE_URL);
      redirectUrl.searchParams.set('auth_error', 'Failed to get LinkedIn user ID. Please try again.');
      const resp = NextResponse.redirect(redirectUrl.toString());
      resp.cookies.delete('oauth_state_linkedin');
      resp.cookies.delete('oauth_return_to');
      resp.cookies.delete('oauth_action');
      return resp;
    }

    const fullName = linkedinName || `${linkedinFirstName} ${linkedinLastName}`.trim() || 'LinkedIn User';

    // ─── CONNECT ACTION: Link provider to current user, do NOT change auth session ───
    if (isConnectAction) {
      console.log('[LinkedIn OAuth] Connect action — linking LinkedIn provider without changing main auth');

      // Store provider info in URL params so the social-style page can read it
      // Do NOT set auth_token, auth_id, etc. — the main login session stays unchanged
      const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
      const redirectUrl = new URL(returnTo, BASE_URL);
      redirectUrl.searchParams.set('connect_provider', 'linkedin');
      redirectUrl.searchParams.set('connect_name', fullName);
      if (linkedinEmail) redirectUrl.searchParams.set('connect_email', linkedinEmail);
      if (linkedinAvatar) redirectUrl.searchParams.set('connect_avatar', linkedinAvatar);
      redirectUrl.searchParams.set('connect_id', linkedinId);

      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_state_linkedin');
      response.cookies.delete('oauth_return_to');
      response.cookies.delete('oauth_action');
      return response;
    }

    // ─── LOGIN ACTION: Full login flow (original behavior) ───

    // Step 3: Find or create user in our database
    let user = await db.user.findFirst({
      where: {
        socialProvider: 'linkedin',
        socialId: linkedinId,
      },
    });

    // If not found by social ID, try to find by email (to link accounts)
    if (!user && linkedinEmail) {
      user = await db.user.findUnique({
        where: { email: linkedinEmail.toLowerCase().trim() },
      });

      if (user) {
        // Link the LinkedIn account to existing user
        user = await db.user.update({
          where: { id: user.id },
          data: {
            socialProvider: 'linkedin',
            socialId: linkedinId,
            ...(linkedinAvatar && !user.avatar ? { avatar: linkedinAvatar } : {}),
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
          ...(linkedinAvatar && !user.avatar ? { avatar: linkedinAvatar } : {}),
        },
      }).catch(() => {});
    } else {
      // Create new user from LinkedIn profile
      if (!linkedinEmail) {
        const tempEmail = `li_${linkedinId}@3boxes-social.placeholder`;

        user = await db.user.create({
          data: {
            email: tempEmail,
            name: fullName,
            password: null,
            role: 'user',
            avatar: linkedinAvatar,
            socialProvider: 'linkedin',
            socialId: linkedinId,
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
            email: linkedinEmail.toLowerCase().trim(),
            name: fullName,
            password: null,
            role: 'user',
            avatar: linkedinAvatar,
            socialProvider: 'linkedin',
            socialId: linkedinId,
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
      console.warn('[LinkedIn OAuth] DB session creation failed, JWT-only auth will be used:', sessionError);
    }

    // Step 6: Create audit log
    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'login',
          entity: 'user',
          entityId: user.id,
          details: JSON.stringify({ method: 'linkedin', socialId: linkedinId }),
        },
      });
    } catch {}

    // Step 7: Redirect to frontend with token
    const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
    const redirectUrl = new URL(returnTo, BASE_URL);
    redirectUrl.searchParams.set('auth_token', jwtToken);
    redirectUrl.searchParams.set('auth_provider', 'linkedin');
    redirectUrl.searchParams.set('auth_name', user.name);
    redirectUrl.searchParams.set('auth_email', user.email);
    redirectUrl.searchParams.set('auth_role', user.role);
    redirectUrl.searchParams.set('auth_id', user.id);
    if (user.avatar || linkedinAvatar) redirectUrl.searchParams.set('auth_avatar', user.avatar || linkedinAvatar || '');

    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.delete('oauth_state_linkedin');
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
    console.error('[LinkedIn OAuth] Unexpected error:', err);
    const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
    const redirectUrl = new URL(returnTo, BASE_URL);
    redirectUrl.searchParams.set('auth_error', 'An unexpected error occurred during LinkedIn login. Please try again.');
    const resp = NextResponse.redirect(redirectUrl.toString());
    resp.cookies.delete('oauth_state_linkedin');
    resp.cookies.delete('oauth_return_to');
    resp.cookies.delete('oauth_action');
    return resp;
  }
}
