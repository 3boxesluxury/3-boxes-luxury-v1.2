import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export async function GET() {
  const dbUrl = process.env.DATABASE_URL
  const directUrl = process.env.DIRECT_URL

  // Try to actually connect
  let dbStatus = 'not_tested'
  let dbError = null
  let userCount = null

  try {
    const prisma = new PrismaClient()
    userCount = await prisma.user.count()
    dbStatus = 'connected'
    await prisma.$disconnect()
  } catch (err: any) {
    dbStatus = 'failed'
    dbError = err.message
  }

  return NextResponse.json({
    env_check: {
      DATABASE_URL_exists: !!dbUrl,
      DATABASE_URL_prefix: dbUrl ? dbUrl.substring(0, 40) + '...' : 'NOT SET',
      DIRECT_URL_exists: !!directUrl,
      DIRECT_URL_prefix: directUrl ? directUrl.substring(0, 40) + '...' : 'NOT SET',
    },
    connection_test: {
      status: dbStatus,
      error: dbError,
      userCount: userCount,
    },
    NODE_ENV: process.env.NODE_ENV,
  })
}