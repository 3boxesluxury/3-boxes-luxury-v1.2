import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession } from '@/lib/sessions';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : '3boxes-dev-secret-key');
if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required in production.');
}

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '1638724140532761';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || 'f6faeeafe9b64e31719894476129b4ee';
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/facebook/callback`
  : 'https://3boxes-luxury-v12.vercel.app/api/auth/facebook/callback';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // User denied permission
    if (error) {
      console.log('[Facebook Auth] User denied permission:', error);
      return NextResponse.redirect(new URL('/?auth=denied', request.url));
    }

    if (!code) {
      console.log('[Facebook Auth] No authorization code received');
      return NextResponse.redirect(new URL('/?auth=error', request.url));
    }

    // Step 1: Exchange code for access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`,
      { method: 'GET' }
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('[Facebook Auth] Token exchange error:', tokenData.error);
      return NextResponse.redirect(new URL('/?auth=error', request.url));
    }

    const accessToken = tokenData.access_token;

    // Step 2: Get user profile from Facebook
    const profileResponse = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name,email,picture.width(200).height(200)&access_token=${accessToken}`,
      { method: 'GET' }
    );

    const profileData = await profileResponse.json();

    if (profileData.error) {
      console.error('[Facebook Auth] Profile fetch error:', profileData.error);
      return NextResponse.redirect(new URL('/?auth=error', request.url));
    }

    const { id: facebookId, name, email, picture } = profileData;

    if (!facebookId) {
      console.error('[Facebook Auth] No Facebook ID in profile');
      return NextResponse.redirect(new URL('/?auth=error', request.url));
    }

    const avatar = picture?.data?.url || null;
    const userEmail = email || `fb_${facebookId}@3boxesluxury.com`; // Fallback if email not provided

    // Step 3: Find or create user
    let user = await db.user.findFirst({
      where: {
        socialProvider: 'facebook',
        socialId: facebookId,
      },
    });

    // If not found by social ID, try to find by email (link accounts)
    if (!user && userEmail) {
      user = await db.user.findUnique({
        where: { email: userEmail.toLowerCase().trim() },
      });

      if (user) {
        // Link the Facebook account to existing user
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

    // If user exists
    if (user) {
      if (!user.isActive) {
        return NextResponse.redirect(new URL('/?auth=deactivated', request.url));
      }

      if (user.approvalStatus === 'pending') {
        return NextResponse.redirect(new URL('/?auth=pending', request.url));
      }

      if (user.approvalStatus === 'rejected') {
        return NextResponse.redirect(new URL('/?auth=rejected', request.url));
      }

      // Update avatar if missing
      if (avatar && !user.avatar) {
        await db.user.update({
          where: { id: user.id },
          data: { avatar },
        }).catch(() => {});
      }

      // Generate JWT token
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

      try {
        await createSession(jwtToken, {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: avatar || user.avatar,
          isActive: user.isActive,
          approvalStatus: user.approvalStatus,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          twoFactorEnabled: user.twoFactorEnabled,
        });
      } catch (sessionError) {
        console.warn('[Facebook Auth] DB session creation failed, JWT-only auth will be used:', sessionError);
      }

      // Redirect to home with token
      const redirectUrl = new URL('/', request.url);
      redirectUrl.searchParams.set('token', jwtToken);
      redirectUrl.searchParams.set('userId', user.id);
      redirectUrl.searchParams.set('userName', encodeURIComponent(user.name));
      redirectUrl.searchParams.set('userEmail', user.email);
      redirectUrl.searchParams.set('userRole', user.role);
      redirectUrl.searchParams.set('authProvider', 'facebook');
      return NextResponse.redirect(redirectUrl);
    }

    // New user - create account
    const newUser = await db.user.create({
      data: {
        email: userEmail.toLowerCase().trim(),
        name: name || 'Facebook User',
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

    // Create default permissions
    const defaultPermissions = [
      'orders.own',
      'cart.manage',
      'wishlist.manage',
      'profile.own',
    ];

    for (const perm of defaultPermissions) {
      await db.userPermission.create({
        data: {
          userId: newUser.id,
          permission: perm,
        },
      }).catch(() => {});
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        type: 'session',
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    try {
      await createSession(jwtToken, {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        avatar: newUser.avatar,
        isActive: newUser.isActive,
        approvalStatus: newUser.approvalStatus,
        emailVerified: newUser.emailVerified,
        phoneVerified: newUser.phoneVerified,
        twoFactorEnabled: newUser.twoFactorEnabled,
      });
    } catch (sessionError) {
      console.warn('[Facebook Auth] DB session creation failed for new user, JWT-only auth will be used:', sessionError);
    }

    // Redirect to home with token
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('token', jwtToken);
    redirectUrl.searchParams.set('userId', newUser.id);
    redirectUrl.searchParams.set('userName', encodeURIComponent(newUser.name));
    redirectUrl.searchParams.set('userEmail', newUser.email);
    redirectUrl.searchParams.set('userRole', newUser.role);
    redirectUrl.searchParams.set('authProvider', 'facebook');
    redirectUrl.searchParams.set('isNewUser', 'true');
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('[Facebook Auth] Callback error:', error);
    return NextResponse.redirect(new URL('/?auth=error', request.url));
  }
}
