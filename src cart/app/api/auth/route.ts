import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession } from '@/lib/sessions';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : '3boxes-dev-secret-key');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, socialId, email, name, avatar } = body;

    if (!provider || !socialId) {
      return NextResponse.json(
        { error: 'Provider and social ID are required' },
        { status: 400 }
      );
    }

    const validProviders = ['google', 'facebook', 'linkedin'];
    if (!validProviders.includes(provider.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be one of: google, facebook, linkedin' },
        { status: 400 }
      );
    }

    // Try to find existing user by social provider + social ID
    let user = await db.user.findFirst({
      where: {
        socialProvider: provider.toLowerCase(),
        socialId: socialId,
      },
    });

    // If not found, try to find by email (to link accounts)
    if (!user && email) {
      user = await db.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (user) {
        user = await db.user.update({
          where: { id: user.id },
          data: {
            socialProvider: provider.toLowerCase(),
            socialId: socialId,
            ...(avatar && !user.avatar ? { avatar } : {}),
          },
        });
      }
    }

    // If user exists
    if (user) {
      if (!user.isActive) {
        return NextResponse.json(
          { error: 'Your account has been deactivated. Please contact support.' },
          { status: 403 }
        );
      }

      if (user.approvalStatus === 'pending') {
        return NextResponse.json(
          { error: 'Your account is pending approval', approvalStatus: 'pending' },
          { status: 403 }
        );
      }

      if (user.approvalStatus === 'rejected') {
        return NextResponse.json(
          { error: 'Your account has been rejected. Please contact support.', approvalStatus: 'rejected' },
          { status: 403 }
        );
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
          avatar: user.avatar,
          isActive: user.isActive,
          approvalStatus: user.approvalStatus,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          twoFactorEnabled: user.twoFactorEnabled,
        });
      } catch (sessionError) {
        console.warn('[Auth Social] DB session creation failed, JWT-only auth will be used:', sessionError);
      }

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          phone: user.phone,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          twoFactorEnabled: user.twoFactorEnabled,
          approvalStatus: user.approvalStatus,
          socialProvider: user.socialProvider,
          createdAt: user.createdAt,
        },
        token: jwtToken,
      });
    }

    // New user - create with pending approval
    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required for new account creation' },
        { status: 400 }
      );
    }

    const newUser = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        password: null,
        role: 'user',
        avatar: avatar || null,
        socialProvider: provider.toLowerCase(),
        socialId: socialId,
        approvalStatus: 'approved',
        isActive: true,
        emailVerified: true,
        phoneVerified: false,
        twoFactorEnabled: false,
      },
    });

    // Create default permissions
    const defaultPermissions = ['orders.own', 'cart.manage', 'wishlist.manage', 'profile.own'];
    for (const perm of defaultPermissions) {
      await db.userPermission.create({
        data: { userId: newUser.id, permission: perm },
      }).catch(() => {});
    }

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
      console.warn('[Auth Social] DB session creation failed for new user, JWT-only auth will be used:', sessionError);
    }

    return NextResponse.json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        avatar: newUser.avatar,
        phone: newUser.phone,
        isActive: newUser.isActive,
        emailVerified: newUser.emailVerified,
        phoneVerified: newUser.phoneVerified,
        twoFactorEnabled: newUser.twoFactorEnabled,
        approvalStatus: newUser.approvalStatus,
        socialProvider: newUser.socialProvider,
        createdAt: newUser.createdAt,
      },
      token: jwtToken,
      isNewUser: true,
    });
  } catch (error) {
    console.error('Social login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during social login' },
      { status: 500 }
    );
  }
}
