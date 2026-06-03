import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { createSession } from '@/lib/sessions';
import { setOtp } from '@/lib/demo-otp-store';
import { send2FAEmailWithDetails } from '@/lib/email';

const JWT_SECRET = process.env.JWT_SECRET || '3boxes-secret-key';

// Demo users for when the database is unavailable (e.g., Vercel without Postgres)
const DEMO_USERS: Record<string, { name: string; role: string; password: string; permissions: string[]; twoFactorRequired: boolean }> = {
  'pmkshar@gmail.com': {
    name: 'Admin',
    role: 'admin',
    password: 'admin123',
    permissions: ['products.manage', 'orders.manage', 'users.approve', 'users.manage', 'reports.view', 'settings.manage', 'inventory.manage'],
    twoFactorRequired: true,
  },
  'admin@3boxesluxury.com': {
    name: 'Admin',
    role: 'admin',
    password: 'admin123',
    permissions: ['products.manage', 'orders.manage', 'users.approve', 'users.manage', 'reports.view', 'settings.manage', 'inventory.manage'],
    twoFactorRequired: true,
  },
  'user@3boxesluxury.com': {
    name: 'User',
    role: 'user',
    password: 'user123',
    permissions: ['orders.own', 'cart.manage', 'wishlist.manage', 'profile.own'],
    twoFactorRequired: false,
  },
  'agent@3boxesluxury.com': {
    name: 'Agent',
    role: 'agent',
    password: 'agent123',
    permissions: ['orders.view', 'orders.manage', 'products.view', 'customers.view', 'reports.view'],
    twoFactorRequired: true,
  },
  'team@3boxesluxury.com': {
    name: 'Team',
    role: 'team',
    password: 'team123',
    permissions: ['orders.view', 'products.view', 'inventory.manage', 'reports.view'],
    twoFactorRequired: true,
  },
  'corporate@3boxesluxury.com': {
    name: 'TechCorp Industries',
    role: 'corporate',
    password: 'corporate123',
    permissions: ['corporate.manage', 'campaigns.manage', 'branding.manage', 'recipients.manage'],
    twoFactorRequired: true,
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Try database first
    let user: Awaited<ReturnType<typeof db.user.findUnique>> = null;
    let isDbAvailable = false;
    try {
      user = await db.user.findUnique({
        where: { email: normalizedEmail },
      });
      isDbAvailable = true;
    } catch (dbError) {
      console.warn('[Auth] Database unavailable, trying demo fallback for:', normalizedEmail);
    }

    if (user) {
      // Database user found - use normal auth flow
      if (!user.password) {
        return NextResponse.json(
          { error: 'Please log in with your social account' },
          { status: 401 }
        );
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

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

      // Force 2FA for admin, team, agent, and corporate roles
      const forceRoles = ['admin', 'team', 'agent', 'corporate'];
      if (user.twoFactorEnabled || forceRoles.includes(user.role)) {
        // Generate email OTP for 2FA
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        try {
          await db.user.update({
            where: { id: user.id },
            data: { otpCode: otp, otpExpiry },
          });
        } catch (dbErr) {
          console.warn('[Auth] Failed to store OTP in DB:', dbErr);
        }

        // Actually send the 2FA verification code via email (non-blocking)
        // We fire-and-forget the email sending so the login response returns quickly
        const targetUserEmail = user.email;
        send2FAEmailWithDetails(targetUserEmail, otp).then((emailResult) => {
          if (emailResult.success) {
            console.log('[Auth] ✅ 2FA email sent to:', targetUserEmail);
          } else {
            console.warn('[Auth] ❌ Failed to send 2FA email to:', targetUserEmail);
          }
          if (emailResult.ethereal && emailResult.previewUrl) {
            console.log('[Auth] 📬 Ethereal preview URL:', emailResult.previewUrl);
          }
        }).catch((err) => {
          console.error('[Auth] Email send error:', err);
        });

        return NextResponse.json({
          requiresTwoFactor: true,
          userId: user.id,
          method: 'email',
          email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // masked email
          message: 'A verification code has been sent to your email',
          // In demo/dev mode, include the OTP for testing
          ...(process.env.NODE_ENV !== 'production' ? { _otp: otp } : {}),
        });
      }

      // Generate a JWT token that works on Vercel serverless (no DB needed for verification)
      // This ensures authentication survives cold starts and DB connection issues
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

      // Also create a DB session for lookup-based auth (secondary mechanism)
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
        console.warn('[Auth] DB session creation failed, JWT-only auth will be used:', sessionError);
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
          createdAt: user.createdAt,
        },
        token: jwtToken,
      });
    }

    // Demo fallback: when DB is unavailable or session creation fails
    const demoUser = DEMO_USERS[normalizedEmail];
    if (demoUser && demoUser.password === password) {
      console.log('[Auth] Using demo user fallback for:', normalizedEmail);
      const demoId = `demo-${normalizedEmail.split('@')[0]}`;

      // Force 2FA for admin, team, agent, and corporate roles (demo users)
      if (demoUser.twoFactorRequired) {
        // Generate email OTP for 2FA
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP in-memory (don't create DB entries for demo users to avoid password conflicts)
        setOtp(demoId, otp, normalizedEmail, 5);

        // Actually send the 2FA verification code via email (non-blocking)
        const demoTargetEmail = normalizedEmail;
        send2FAEmailWithDetails(demoTargetEmail, otp).then((emailResult) => {
          if (emailResult.success) {
            console.log('[Auth] ✅ 2FA email sent to:', demoTargetEmail);
          } else {
            console.warn('[Auth] ❌ Failed to send 2FA email to:', demoTargetEmail);
          }
          if (emailResult.ethereal && emailResult.previewUrl) {
            console.log('[Auth] 📬 Ethereal preview URL:', emailResult.previewUrl);
          }
        }).catch((err) => {
          console.error('[Auth] Email send error:', err);
        });

        return NextResponse.json({
          requiresTwoFactor: true,
          userId: demoId,
          method: 'email',
          email: normalizedEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // masked email
          message: 'A verification code has been sent to your email',
          // In demo/dev mode, include the OTP for testing
          ...(process.env.NODE_ENV !== 'production' ? { _otp: otp } : {}),
          _demo: true,
        });
      }

      // Generate a JWT token that works on Vercel (no DB needed for verification)
      const jwtToken = jwt.sign(
        {
          type: 'session',
          userId: demoId,
          email: normalizedEmail,
          name: demoUser.name,
          role: demoUser.role,
          permissions: demoUser.permissions,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Also create a regular session for in-memory cache
      try {
        await createSession(jwtToken, {
          id: demoId,
          email: normalizedEmail,
          name: demoUser.name,
          role: demoUser.role,
          avatar: null,
          isActive: true,
          approvalStatus: 'approved',
          emailVerified: true,
          phoneVerified: false,
          twoFactorEnabled: false,
        });
      } catch {
        console.log('[Auth] DB session creation failed, using JWT-only for demo user');
      }

      return NextResponse.json({
        user: {
          id: demoId,
          email: normalizedEmail,
          name: demoUser.name,
          role: demoUser.role,
          avatar: null,
          phone: null,
          isActive: true,
          emailVerified: true,
          phoneVerified: false,
          twoFactorEnabled: false,
          approvalStatus: 'approved',
          createdAt: new Date().toISOString(),
        },
        token: jwtToken,
        permissions: demoUser.permissions,
        _demo: true, // Flag to indicate this is a demo session
      });
    }

    // No user found in DB and no demo match
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
