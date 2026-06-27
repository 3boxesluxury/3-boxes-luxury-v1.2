import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/style-gallery/my — get current user's submissions with approval status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const items = await db.styleGallery.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Count by status for quick summary
    const pending = items.filter(i => i.status === 'pending').length
    const approved = items.filter(i => i.status === 'approved').length
    const rejected = items.filter(i => i.status === 'rejected').length

    return NextResponse.json({
      items,
      summary: { pending, approved, rejected, total: items.length },
    })
  } catch (error) {
    console.error('[style-gallery/my] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch your submissions' }, { status: 500 })
  }
}
