import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomInt } from 'crypto'

// In production, this would send SMS/email. For demo, we store in DB and log to console.
export async function POST(request: NextRequest) {
  try {
    const { email, phone } = await request.json()

    if (!email && !phone) {
      return NextResponse.json({ error: 'Email or phone is required' }, { status: 400 })
    }

    // Generate 6-digit OTP
    const code = String(randomInt(100000, 999999))
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    // Delete any existing OTPs for this email/phone
    const identifier = email || phone!
    await db.oTP.deleteMany({
      where: {
        OR: [
          { email: identifier },
          ...(phone ? [{ phone }] : []),
        ],
        verified: false,
      },
    })

    // Create new OTP
    await db.oTP.create({
      data: {
        email: email || '',
        phone: phone || null,
        code,
        purpose: 'login',
        expiresAt,
      },
    })

    // In production: send via SMS/Email service
    // For demo: log to console
    console.log(`[OTP] Code for ${identifier}: ${code}`)

    return NextResponse.json({
      success: true,
      message: `OTP sent to ${identifier}`,
      // In demo mode, return the OTP so it can be shown in UI
      ...(process.env.NODE_ENV === 'development' && { demoCode: code }),
    })
  } catch (error) {
    console.error('[OTP Send] Error:', error)
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 })
  }
}
