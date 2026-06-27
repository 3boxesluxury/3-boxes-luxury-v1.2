import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, phone, code } = await request.json()
    const identifier = email || phone

    if (!identifier || !code) {
      return NextResponse.json({ error: 'Identifier and OTP code are required' }, { status: 400 })
    }

    // Find the most recent unverified OTP
    const otp = await db.oTP.findFirst({
      where: {
        OR: [
          { email: identifier },
          ...(phone ? [{ phone: identifier }] : []),
        ],
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!otp) {
      return NextResponse.json({ error: 'Invalid or expired OTP. Please request a new one.' }, { status: 400 })
    }

    if (otp.code !== code) {
      return NextResponse.json({ error: 'Incorrect OTP code' }, { status: 400 })
    }

    // Mark OTP as verified
    await db.oTP.update({
      where: { id: otp.id },
      data: { verified: true },
    })

    // Find or create user
    let user = await db.user.findUnique({
      where: { email: identifier },
    })

    if (!user && phone) {
      // Try finding by phone
      user = await db.user.findFirst({
        where: { phone: identifier },
      })
    }

    if (!user) {
      // Auto-create account for new OTP users
      const name = identifier.includes('@') ? identifier.split('@')[0] : identifier
      const hashedPassword = await bcrypt.hash(String(Math.random()), 12)
      user = await db.user.create({
        data: {
          email: identifier.includes('@') ? identifier : `${identifier}@3boxesluxury.com`,
          name,
          password: hashedPassword,
          phone: !identifier.includes('@') ? identifier : null,
          phoneVerified: !identifier.includes('@'),
          emailVerified: identifier.includes('@'),
          role: 'user',
        },
      })
    } else {
      // Update verification status
      await db.user.update({
        where: { id: user.id },
        data: {
          ...(identifier.includes('@') ? { emailVerified: true } : { phoneVerified: true }),
        },
      })
    }

    // Create session token
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await db.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
      },
    })
  } catch (error) {
    console.error('[OTP Verify] Error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
