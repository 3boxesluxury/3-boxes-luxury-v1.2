import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { createSession } from '@/lib/sessions';

const JWT_SECRET = process.env.JWT_SECRET || '3boxes-secret-key';

// Default permissions by role
const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'products.manage',
    'orders.manage',
    'users.approve',
    'users.manage',
    'reports.view',
    'settings.manage',
    'inventory.manage',
  ],
  user: [
    'orders.own',
    'cart.manage',
    'wishlist.manage',
    'profile.own',
  ],
  agent: [
    'orders.view',
    'orders.manage',
    'products.view',
    'customers.view',
    'reports.view',
  ],
  team: [
    'orders.view',
    'products.view',
    'inventory.manage',
    'reports.view',
  ],
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, password, role, gender } = body;

    // Validate required fields
    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, name, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Validate role
    const validRole = role || 'user';
    const allowedRoles = ['user', 'agent', 'team', 'corporate'];
    if (!allowedRoles.includes(validRole)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: user, agent, team, corporate' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Determine approval status based on role
    const approvalStatus = ['user'].includes(validRole) ? 'approved' : 'pending';

    // Validate gender if provided (v16)
    const validGender = (gender === 'male' || gender === 'female') ? gender : null;

    // Create user
    const user = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        password: hashedPassword,
        role: validRole,
        approvalStatus,
        isActive: true,
        emailVerified: false,
        phoneVerified: false,
        twoFactorEnabled: false,
        ...(validGender ? { gender: validGender } : {}),  // v16: persist gender if provided
      },
    });

    // Create default permissions for the user
    const permissions = DEFAULT_PERMISSIONS[validRole] || DEFAULT_PERMISSIONS.user;
    if (permissions.length > 0) {
      for (const perm of permissions) {
        await db.userPermission.create({
          data: {
            userId: user.id,
            permission: perm,
          },
        }).catch(() => {}); // Ignore duplicate errors
      }
    }

    // If auto-approved (admin/user), create session and return token
    if (approvalStatus === 'approved') {
      // Generate JWT token (works on Vercel serverless without DB lookup)
      const jwtToken = jwt.sign(
        {
          type: 'session',
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          ...(user.gender ? { gender: user.gender } : {}),  // v16: include gender in JWT
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
          gender: user.gender,  // v16
          isActive: user.isActive,
          approvalStatus: user.approvalStatus,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          twoFactorEnabled: user.twoFactorEnabled,
        });
      } catch (sessionError) {
        console.warn('[Auth Register] DB session creation failed, JWT-only auth will be used:', sessionError);
      }

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          phone: user.phone,
          gender: user.gender,  // v16
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          twoFactorEnabled: user.twoFactorEnabled,
          approvalStatus: user.approvalStatus,
          createdAt: user.createdAt,
        },
        token: jwtToken,
      });
    }

    // If pending approval, return 201 with approval status
    return NextResponse.json(
      {
        message: 'Registration successful. Your account is pending admin approval.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          gender: user.gender,  // v16
          approvalStatus: user.approvalStatus,
          createdAt: user.createdAt,
        },
        approvalStatus: 'pending',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
