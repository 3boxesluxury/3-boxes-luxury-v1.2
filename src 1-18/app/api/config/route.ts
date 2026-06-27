import { NextResponse } from 'next/server'
import os from 'os'

export const dynamic = 'force-dynamic'

/**
 * Try to detect a reachable sandbox Caddy gateway that proxies
 * to the ai-proxy mini-service on port 3030.
 */
async function detectCaddyGateway(): Promise<string | null> {
  // On Vercel we can't reach the sandbox directly
  if (process.env.VERCEL) return null

  const hostname = os.hostname()

  // Candidate URLs to try — Caddy on port 81 routes /api/try-on → port 3030
  const candidates: string[] = []

  // Sandbox hostnames look like c-xxxxx-xxxxx-xxxxx
  if (hostname.startsWith('c-')) {
    candidates.push(`http://${hostname}:81`)
  }
  // Always try localhost as fallback
  candidates.push('http://localhost:81')

  for (const url of candidates) {
    try {
      const response = await fetch(`${url}/api/try-on/status`, {
        signal: AbortSignal.timeout(3000),
        headers: { 'User-Agent': '3BOXES-ConfigCheck/1.0' },
      })
      if (response.ok) {
        const data = await response.json()
        if (data.available) {
          console.log('[config] Detected reachable Caddy gateway at', url)
          return url
        }
      }
    } catch {
      // Not reachable, try next
    }
  }

  return null
}

export async function GET() {
  try {
    let aiProxyUrl = process.env.ZAI_PROXY_URL || ''
    const isVercel = !!process.env.VERCEL

    // If no explicit proxy URL is set and not on Vercel,
    // try to auto-detect the sandbox Caddy gateway
    if (!aiProxyUrl && !isVercel) {
      const detected = await detectCaddyGateway()
      if (detected) {
        aiProxyUrl = detected
      }
    }

    return NextResponse.json({
      aiProxyUrl,
      isVercel,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Config unavailable' }, { status: 500 })
  }
}
