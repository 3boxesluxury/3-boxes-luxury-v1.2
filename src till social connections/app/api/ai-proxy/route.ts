import { NextRequest, NextResponse } from 'next/server'

/**
 * AI Proxy Route — forwards requests to the internal ZAI service.
 *
 * This route runs on the sandbox (localhost:3000) where the AI service
 * at 172.25.136.193:8080 is reachable. Vercel's try-on route calls
 * this proxy instead of the AI service directly.
 *
 * Security: Only allows specific AI endpoints (chat, vision, images, audio).
 */

const AI_BASE_URL = 'http://172.25.136.193:8080/v1'

// Config from .z-ai-config — required for authentication with the AI service
const AI_CONFIG = {
  apiKey: 'Z.ai',
  chatId: 'chat-97b5f242-82cb-4d42-801a-52a64cae9d47',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZDcxYjY5NjQtOWFmZS00M2ZkLTlhYjgtMTA4ZTU3YjA1NWZhIiwiY2hhdF9pZCI6ImNoYXQtOTdiNWYyNDItODJjYi00ZDQyLTgwMWEtNTJhNjRjYWU5ZDQ3IiwicGxhdGZvcm0iOiJ6YWkifQ.fjmP7wiqFk0qaWxoLRtjEEVwGHe5Vx4kqsSbz5eM2C4',
  userId: 'd71b6964-9afe-43fd-9ab8-108e57b055fa',
}

// Allowed sub-paths to prevent abuse
const ALLOWED_PATHS = [
  '/chat/completions',
  '/chat/completions/vision',
  '/images/generations',
  '/images/generations/edit',
  '/audio/tts',
  '/audio/asr',
  '/video/generation',
  '/async-result',
  '/functions/invoke',
]

function buildHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
    'X-Z-AI-From': 'Z',
    'X-Chat-Id': AI_CONFIG.chatId,
    'X-User-Id': AI_CONFIG.userId,
    'X-Token': AI_CONFIG.token,
  }

  return { ...headers, ...extraHeaders }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path, payload } = body

    if (!path || !ALLOWED_PATHS.some(p => path.startsWith(p))) {
      return NextResponse.json(
        { error: 'Invalid or disallowed AI path' },
        { status: 400 }
      )
    }

    const url = `${AI_BASE_URL}${path}`
    const headers = buildHeaders()

    console.log(`[ai-proxy] POST ${url}`)

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120000), // 2 minute timeout for image generation
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`[ai-proxy] Error ${response.status}: ${errorBody.substring(0, 200)}`)
      return NextResponse.json(
        { error: `AI service returned ${response.status}`, details: errorBody.substring(0, 500) },
        { status: response.status }
      )
    }

    const contentType = response.headers.get('content-type') || ''

    // Handle streaming responses
    if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
      const reader = response.body?.getReader()
      if (!reader) {
        return NextResponse.json({ error: 'No response body' }, { status: 500 })
      }
      // For simplicity, collect the stream and return as text
      const chunks: Uint8Array[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) chunks.push(value)
      }
      const combined = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0))
      let offset = 0
      for (const chunk of chunks) {
        combined.set(chunk, offset)
        offset += chunk.length
      }
      return new NextResponse(combined, {
        headers: { 'Content-Type': contentType },
      })
    }

    // Handle JSON responses
    const result = await response.json()

    // For image generation, download and convert URLs to base64
    if (result.data && Array.isArray(result.data)) {
      const processedData = await Promise.all(
        result.data.map(async (item: any) => {
          if (item.url) {
            try {
              const imgResponse = await fetch(item.url, {
                signal: AbortSignal.timeout(30000),
              })
              if (imgResponse.ok) {
                const buffer = Buffer.from(await imgResponse.arrayBuffer())
                return { base64: buffer.toString('base64'), format: 'png' }
              }
            } catch (err) {
              console.error('[ai-proxy] Failed to download image:', err)
            }
          }
          return item
        })
      )
      return NextResponse.json({ ...result, data: processedData })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[ai-proxy] Error:', error)
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'AI service request timed out' },
        { status: 504 }
      )
    }
    return NextResponse.json(
      { error: 'AI proxy request failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')

    if (!path || !ALLOWED_PATHS.some(p => path.startsWith(p))) {
      return NextResponse.json(
        { error: 'Invalid or disallowed AI path' },
        { status: 400 }
      )
    }

    const url = `${AI_BASE_URL}${path}`
    const headers = buildHeaders()
    // GET requests don't need Content-Type
    delete headers['Content-Type']

    console.log(`[ai-proxy] GET ${url}`)

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      return NextResponse.json(
        { error: `AI service returned ${response.status}`, details: errorBody.substring(0, 500) },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[ai-proxy] GET Error:', error)
    return NextResponse.json(
      { error: 'AI proxy request failed' },
      { status: 500 }
    )
  }
}
