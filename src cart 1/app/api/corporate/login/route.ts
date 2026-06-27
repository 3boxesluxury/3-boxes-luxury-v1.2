import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { createSession } from '@/lib/sessions';
import { getClientIp, getUserAgent, parseDeviceInfo } from '@/lib/auth-helper';

const JWT_SECRET = process.env.JWT_SECRET || '3boxes-secret-key';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { work_email, password } = body;

    if (!work_email || !password) {
      return NextResponse.json(
        { error: 'Work email and password are required' },
        { status: 400 }
      );
    }

    const email = work_email.toLowerCase().trim();

    // Find user by email where role = "corporate"
    const user = await db.user.findUnique({
      where: { email },
      include: {
        corporateAccount: {
          include: {
            members: true,
            branding: true,
          },
        },
      },
    });

    if (!user || user.role !== 'corporate') {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user has a password (social login users may not)
    if (!user.password) {
      return NextResponse.json(
        { error: 'Please log in with your social account' },
        { status: 401 }
      );
    }

    // Verify password with bcrypt
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check approvalStatus is "approved" (not pending/rejected/suspended)
    if (user.approvalStatus !== 'approved') {
      const statusMessages: Record<string, string> = {
        pending: 'Your corporate account is pending approval. Please wait for admin approval.',
        rejected: 'Your corporate account has been rejected. Please contact support.',
        suspended: 'Your corporate account has been suspended. Please contact support.',
      };
      return NextResponse.json(
        {
          error: statusMessages[user.approvalStatus] || 'Your account is not approved.',
          approvalStatus: user.approvalStatus,
        },
        { status: 403 }
      );
    }

    // Check isActive is true
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    // Also check corporate account approval
    if (user.corporateAccount && user.corporateAccount.approvalStatus !== 'approved') {
      const statusMessages: Record<string, string> = {
        pending: 'Your corporate account is pending approval.',
        rejected: 'Your corporate account application has been rejected.',
        suspended: 'Your corporate account has been suspended.',
      };
      return NextResponse.json(
        {
          error: statusMessages[user.corporateAccount.approvalStatus] || 'Corporate account not approved.',
          approvalStatus: user.corporateAccount.approvalStatus,
        },
        { status: 403 }
      );
    }

    // If 2FA is enabled, return requiresTwoFactor flag
    if (user.twoFactorEnabled) {
      return NextResponse.json({
        requiresTwoFactor: true,
        userId: user.id,
        message: 'Two-factor authentication required',
      });
    }

    // Get IP and user agent info
    const ipAddress = getClientIp(request);
    const userAgentStr = getUserAgent(request);
    const deviceInfo = parseDeviceInfo(userAgentStr);

    // Generate JWT token (works on Vercel serverless without DB lookup)
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

    // Create session with IP + user agent tracking
    try {
      await createSession(
        jwtToken,
        {
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
        },
        { ipAddress, userAgent: userAgentStr, deviceInfo }
      );
    } catch (sessionError) {
      console.warn('[Auth Corporate] DB session creation failed, JWT-only auth will be used:', sessionError);
    }

    // Update user's last login info
    await db.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        lastLoginDevice: deviceInfo,
      },
    });

    // Create AuditLog for corporate login
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'corporate_login',
        entity: 'user',
        entityId: user.id,
        details: JSON.stringify({
          email: user.email,
          corporateAccount: user.corporateAccount?.companyName,
          ipAddress,
          userAgent: userAgentStr,
          deviceInfo,
        }),
        ipAddress,
        userAgent: userAgentStr,
      },
    });

    // Build response
    const { password: _, twoFactorSecret: __, ...userSafe } = user;

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        corporateRole: user.corporateRole,
        avatar: user.avatar,
        phone: user.phone,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorRequired: user.twoFactorRequired,
        approvalStatus: user.approvalStatus,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
      token: jwtToken,
      corporateAccount: user.corporateAccount
        ? {
            id: user.corporateAccount.id,
            companyName: user.corporateAccount.companyName,
            slug: user.corporateAccount.slug,
            industry: user.corporateAccount.industry,
            website: user.corporateAccount.website,
            contactName: user.corporateAccount.contactName,
            contactEmail: user.corporateAccount.contactEmail,
            contactPhone: user.corporateAccount.contactPhone,
            billingAddress: user.corporateAccount.billingAddress,
            billingCity: user.corporateAccount.billingCity,
            billingState: user.corporateAccount.billingState,
            billingZipCode: user.corporateAccount.billingZipCode,
            billingCountry: user.corporateAccount.billingCountry,
            approvalStatus: user.corporateAccount.approvalStatus,
            creditLimit: user.corporateAccount.creditLimit,
            creditUsed: user.corporateAccount.creditUsed,
            discountPercent: user.corporateAccount.discountPercent,
            isActive: user.corporateAccount.isActive,
            branding: user.corporateAccount.branding,
            memberCount: user.corporateAccount.members.length,
          }
        : null,
    });
  } catch (error) {
    console.error('Corporate login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
