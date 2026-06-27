import { NextRequest, NextResponse } from 'next/server'

/**
 * Remote Try-On Route — forwards the entire try-on request to the sandbox.
 *
 * On Vercel, the AI service (172.25.136.193:8080) is not directly accessible.
 * Instead of trying to use the ZAI SDK on Vercel, this route forwards the
 * try-on request to the sandbox's /api/try-on endpoint, which has direct
 * access to the AI service.
 *
 * The sandbox URL is configured via the ZAI_PROXY_URL environment variable.
 */

export async function POST(request: NextRequest) {
  const proxyUrl = process.env.ZAI_PROXY_URL

  if (!proxyUrl) {
    return NextResponse.json({
      error: 'Virtual try-on is not configured for this deployment. Please set ZAI_PROXY_URL environment variable.',
      code: 'AI_SERVICE_UNAVAILABLE',
    }, { status: 503 })
  }

  try {
    const body = await request.json()

    // Forward the request to the sandbox
    const response = await fetch(`${proxyUrl}/api/try-on`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    })

    const result = await response.json()
    return NextResponse.json(result, { status: response.status })
  } catch (error) {
    console.error('[try-on-remote] Error:', error)
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({
        error: 'The AI service took too long to respond. Please try again.',
        code: 'TIMEOUT',
      }, { status: 504 })
    }
    return NextResponse.json({
      error: 'Failed to connect to the AI style service. Please try again later.',
      code: 'CONNECTION_ERROR',
    }, { status: 502 })
  }
}

export async function GET(request: NextRequest) {
  const proxyUrl = process.env.ZAI_PROXY_URL

  if (!proxyUrl) {
    return NextResponse.json({ available: false, message: 'AI proxy not configured' })
  }

  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const response = await fetch(`${proxyUrl}/api/try-on?jobId=${jobId}`, {
      signal: AbortSignal.timeout(10000),
    })
    const result = await response.json()
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({
      status: 'failed',
      error: 'Failed to check job status',
    })
  }
}
