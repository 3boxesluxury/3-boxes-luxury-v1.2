import { NextResponse } from 'next/server'
import { isZAIAvailable, clearHealthCache } from '@/lib/zai'

export async function GET() {
  try {
    let check = await isZAIAvailable()
    
    // If unavailable, clear cache and retry once (the AI service may have just started)
    if (!check.available) {
      clearHealthCache()
      check = await isZAIAvailable()
    }
    
    return NextResponse.json({
      available: check.available,
      mode: check.mode,
      reason: check.reason || undefined,
    })
  } catch (err) {
    return NextResponse.json({
      available: false,
      mode: 'unavailable',
      reason: 'Health check failed',
    })
  }
}
