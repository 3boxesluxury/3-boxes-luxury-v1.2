/**
 * AI Proxy Mini-Service
 *
 * Proxies AI try-on requests from Vercel to the local ZAI AI service.
 * Runs on the sandbox where the ZAI service is accessible.
 *
 * Endpoints:
 * - GET  /api/try-on/status  → Health check
 * - POST /api/try-on         → Create try-on job
 * - GET  /api/try-on?jobId=X → Poll job status
 */

import { createServer } from 'http'
import ZAI from 'z-ai-web-dev-sdk'
import sharp from 'sharp'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import os from 'os'

const PORT = 3030

// ─── ZAI Config ────────────────────────────────────────────────────
const ZAI_CONFIG = (() => {
  const configPaths = [
    '/etc/.z-ai-config',
    join(process.cwd(), '.z-ai-config'),
    join(os.homedir(), '.z-ai-config'),
  ]

  for (const filePath of configPaths) {
    try {
      const configStr = readFileSync(filePath, 'utf-8')
      const config = JSON.parse(configStr)
      if (config.baseUrl && config.apiKey) {
        console.log(`[ai-proxy] Loaded config from ${filePath}`)
        return config
      }
    } catch {
      // Continue
    }
  }

  if (process.env.ZAI_BASE_URL && process.env.ZAI_API_KEY) {
    return {
      baseUrl: process.env.ZAI_BASE_URL,
      apiKey: process.env.ZAI_API_KEY,
      chatId: process.env.ZAI_CHAT_ID || '',
      token: process.env.ZAI_TOKEN || '',
      userId: process.env.ZAI_USER_ID || '',
    }
  }

  return null
})()

function createZAIClient() {
  if (!ZAI_CONFIG) throw new Error('ZAI config not available')
  return new ZAI({
    baseUrl: ZAI_CONFIG.baseUrl,
    apiKey: ZAI_CONFIG.apiKey,
    chatId: ZAI_CONFIG.chatId || '',
    token: ZAI_CONFIG.token || '',
    userId: ZAI_CONFIG.userId || '',
  })
}

// ─── Types ─────────────────────────────────────────────────────────

type ImageSize = '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864' | '1440x720' | '720x1440'

interface TryOnJob {
  status: 'processing' | 'completed' | 'failed'
  imageUrl?: string
  productName?: string
  categorySlug?: string
  error?: string
  createdAt: number
  attempt?: number
  strategy?: string
  faceScore?: number
  productScore?: number
  suggestions?: any[]
  progress?: string
}

const jobs = new Map<string, TryOnJob>()

// Clean up old jobs every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [id, job] of jobs) {
    if (now - job.createdAt > 10 * 60 * 1000) {
      jobs.delete(id)
    }
  }
}, 5 * 60 * 1000)

// ─── Rate-limit-aware delay ────────────────────────────────────────

const API_CALL_DELAY = 1500 // 1.5s between API calls

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// ─── Helpers ───────────────────────────────────────────────────────

function getProductPlacement(categorySlug: string, productName: string): string {
  const n = productName.toLowerCase()
  if (categorySlug === 'jewelry') {
    if (n.includes('earring') || n.includes('jhumka') || n.includes('stud')) return 'wearing earrings on both earlobes'
    if (n.includes('necklace') || n.includes('choker') || n.includes('pendant') || n.includes('temple') || n.includes('haar') || n.includes('mala')) return 'wearing a necklace around the neck'
    if (n.includes('bracelet') || n.includes('cuff') || n.includes('bangle') || n.includes('kada')) return 'wearing a bracelet on the wrist'
    if (n.includes('ring')) return 'wearing a ring on the finger'
    if (n.includes('set') || n.includes('bridal')) return 'wearing a matching jewelry set - necklace around the neck and earrings on both earlobes, with the pieces complementing each other perfectly'
    return 'wearing the jewelry piece'
  }
  if (categorySlug === 'sarees') return 'draped in the saree in traditional Indian style with pallu elegantly over the left shoulder, matching blouse, properly pleated at the waist'
  if (categorySlug === 'mens-shirts-t-shirts') return 'wearing the shirt on the torso'
  if (categorySlug === 'watches') return 'wearing the watch on the left wrist'
  if (categorySlug === 'fashion') return 'wearing the outfit'
  return 'wearing the product'
}

function getImageSize(categorySlug: string): ImageSize {
  if (['sarees', 'fashion', 'mens-shirts-t-shirts'].includes(categorySlug)) return '768x1344'
  if (categorySlug === 'home-living') return '1344x768'
  return '864x1152'
}

// ─── Watermark ─────────────────────────────────────────────────────

async function addWatermark(imageDataUrl: string): Promise<string> {
  try {
    const base64Match = imageDataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/)
    if (!base64Match) return imageDataUrl

    const imageBuffer = Buffer.from(base64Match[2], 'base64')
    const metadata = await sharp(imageBuffer).metadata()
    const width = metadata.width || 800
    const height = metadata.height || 1000

    const wmWidth = Math.max(Math.floor(width * 0.35), 150)
    const wmHeight = Math.max(Math.floor(height * 0.08), 40)
    const fontSize = Math.max(Math.floor(wmHeight * 0.55), 14)
    const subFontSize = Math.max(Math.floor(wmHeight * 0.3), 8)

    const svg = `<svg width="${wmWidth}" height="${wmHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#b8860b;stop-opacity:0.85" />
          <stop offset="50%" style="stop-color:#daa520;stop-opacity:0.9" />
          <stop offset="100%" style="stop-color:#b8860b;stop-opacity:0.85" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${wmWidth}" height="${wmHeight}" rx="4" ry="4" fill="rgba(0,0,0,0.55)" />
      <text x="${wmWidth / 2}" y="${wmHeight * 0.42}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" fill="url(#grad)" text-anchor="middle" dominant-baseline="middle">3BOXES GIFTS</text>
      <text x="${wmWidth / 2}" y="${wmHeight * 0.78}" font-family="Arial, Helvetica, sans-serif" font-size="${subFontSize}" fill="rgba(218,165,32,0.6)" text-anchor="middle" dominant-baseline="middle">AI Style Preview</text>
    </svg>`

    const wmBuffer = Buffer.from(svg)
    const wmMeta = await sharp(wmBuffer).metadata()
    const wmW = wmMeta.width || 150
    const wmH = wmMeta.height || 40
    const padding = Math.max(Math.floor(height * 0.02), 10)
    const left = Math.max(width - wmW - padding, 0)
    const top = Math.max(height - wmH - padding, 0)

    const watermarkedBuffer = await sharp(imageBuffer)
      .composite([{ input: wmBuffer, left, top }])
      .png()
      .toBuffer()

    return `data:image/png;base64,${watermarkedBuffer.toString('base64')}`
  } catch (err) {
    console.error('[ai-proxy] Watermark failed:', err)
    return imageDataUrl
  }
}

// ─── VLM Analysis ──────────────────────────────────────────────────

async function vlmAnalyze(zai: any, prompt: string, imageUrl: string, timeoutMs = 30000): Promise<string> {
  try {
    const result = await Promise.race([
      zai.chat.completions.createVision({
        model: 'glm-4v-plus',
        messages: [{ role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ]}],
        thinking: { type: 'disabled' },
      }),
      new Promise<null>(r => setTimeout(() => r(null), timeoutMs)),
    ])
    return result ? (result.choices[0]?.message?.content || '') : ''
  } catch (err) {
    console.error('[ai-proxy] VLM analysis failed:', (err as Error).message?.substring(0, 200))
    return ''
  }
}

// ─── Safe image generation wrappers ────────────────────────────────

async function safeImageEdit(zai: any, params: { prompt: string; images: { url: string }[]; size: ImageSize }): Promise<string | null> {
  try {
    const response = await zai.images.generations.edit({
      prompt: params.prompt,
      images: params.images,
      size: params.size,
    } as any)

    if (response?.data?.[0]?.base64) {
      return `data:image/png;base64,${response.data[0].base64}`
    }
    if (!response?.data || !Array.isArray(response.data) || response.data.length === 0) {
      console.warn('[ai-proxy] Edit API returned unexpected response:', JSON.stringify(response)?.substring(0, 200))
      return null
    }
    return null
  } catch (err) {
    console.error('[ai-proxy] Image edit failed:', (err as Error).message?.substring(0, 200))
    return null
  }
}

async function safeImageCreate(zai: any, params: { prompt: string; size: ImageSize }): Promise<string | null> {
  try {
    const response = await zai.images.generations.create({
      prompt: params.prompt,
      size: params.size,
    })

    if (response?.data?.[0]?.base64) {
      return `data:image/png;base64,${response.data[0].base64}`
    }
    if (!response?.data || !Array.isArray(response.data)) {
      console.warn('[ai-proxy] Create API returned unexpected response:', JSON.stringify(response)?.substring(0, 200))
      return null
    }
    return null
  } catch (err) {
    console.error('[ai-proxy] Image create failed:', (err as Error).message?.substring(0, 200))
    return null
  }
}

// ─── Background Processing ─────────────────────────────────────────

async function backgroundProcess(
  jobId: string, productName: string, categorySlug: string,
  selfieData: string, productImageBase64: string,
) {
  const job = jobs.get(jobId)
  if (!job) return

  try {
    const zai = createZAIClient()
    const placement = getProductPlacement(categorySlug, productName)
    const size = getImageSize(categorySlug)

    // VLM analysis (sequential with delay to avoid rate limiting)
    if (job) job.progress = 'AI is analyzing your photo and product...'
    console.log(`[ai-proxy] Starting VLM analysis for job ${jobId}`)

    const personDesc = await vlmAnalyze(zai, `Describe this person's appearance for a virtual try-on: face shape, skin tone (exact shade), hair color and style, body type, and any visible accessories. Be specific about colors. 2-3 sentences.`, selfieData)
    console.log(`[ai-proxy] Person: ${personDesc.substring(0, 80)}...`)

    await delay(API_CALL_DELAY)

    const productDesc = await vlmAnalyze(zai, `Describe this product in detail for a virtual try-on: exact type, EXACT primary and secondary colors (be very specific - e.g., "deep maroon red" not just "red"), material/texture, key design elements, patterns, embellishments, and how it would be worn on a person. 2-3 sentences.`, productImageBase64)
    console.log(`[ai-proxy] Product: ${productDesc.substring(0, 80)}...`)

    // Strategy 1: Edit with both images (BEST for product matching - includes actual product image)
    if (job) { job.attempt = 1; job.progress = 'Combining your photo with product...' }
    await delay(API_CALL_DELAY)
    console.log(`[ai-proxy] Strategy 1: edit-both`)
    const s1 = await safeImageEdit(zai, {
      prompt: `Professional fashion photograph. The FIRST image is the person, the SECOND image is the product "${productName}". CRITICAL INSTRUCTIONS: 1) Use the FIRST image's face, skin tone, and body type - do NOT change them. 2) Apply the EXACT product from the SECOND image - match its colors, materials, texture, and design precisely. 3) Show the person ${placement} with the product looking natural and realistic. Studio lighting, photorealistic, 8K quality.`,
      images: [{ url: selfieData }, { url: productImageBase64 }],
      size,
    })
    if (s1) {
      console.log(`[ai-proxy] Strategy 1 (edit-both) succeeded`)
      job.status = 'completed'
      job.strategy = 'edit-both'
      job.faceScore = 8
      job.productScore = 9
      job.progress = 'Adding finishing touches...'

      let finalUrl = s1
      try { finalUrl = await addWatermark(s1) } catch {}
      job.imageUrl = finalUrl
      job.productName = productName
      job.progress = 'Complete!'
      return
    }

    // Strategy 2: Edit selfie with product description (GOOD for face preservation - includes actual selfie)
    if (job) { job.attempt = 2; job.progress = 'Generating your try-on look...' }
    await delay(API_CALL_DELAY)
    console.log(`[ai-proxy] Strategy 2: edit-selfie`)
    const s2 = await safeImageEdit(zai, {
      prompt: `Professional fashion photograph. Edit this person's photo to show them ${placement}. The product is "${productName}": ${productDesc || 'a luxury fashion item'}. CRITICAL INSTRUCTIONS: 1) Keep the EXACT same face, skin tone, hair, and body type from the original photo. 2) Apply the product with its EXACT colors, materials, and design details. 3) The product must look realistic and naturally worn. Studio lighting, photorealistic, 8K quality.`,
      images: [{ url: selfieData }],
      size,
    })
    if (s2) {
      console.log(`[ai-proxy] Strategy 2 (edit-selfie) succeeded`)
      job.status = 'completed'
      job.strategy = 'edit-selfie'
      job.faceScore = 9
      job.productScore = 6
      job.progress = 'Adding finishing touches...'
      let finalUrl = s2
      try { finalUrl = await addWatermark(s2) } catch {}
      job.imageUrl = finalUrl
      job.productName = productName
      job.progress = 'Complete!'
      return
    }

    // Strategy 3: Edit product with person description
    if (job) { job.attempt = 3; job.progress = 'Creating product-focused preview...' }
    await delay(API_CALL_DELAY)
    console.log(`[ai-proxy] Strategy 3: edit-product`)
    const s3 = await safeImageEdit(zai, {
      prompt: `Show this product "${productName}" being worn by a person. The person is ${placement}. Person description: ${personDesc || 'a person'}. Product: ${productDesc || 'luxury item'}. CRITICAL: The product's colors, materials, and design must match EXACTLY as shown in the image. Studio lighting, photorealistic, 8K quality.`,
      images: [{ url: productImageBase64 }],
      size,
    })
    if (s3) {
      console.log(`[ai-proxy] Strategy 3 (edit-product) succeeded`)
      job.status = 'completed'
      job.strategy = 'edit-product'
      job.faceScore = 5
      job.productScore = 8
      job.progress = 'Adding finishing touches...'
      let finalUrl = s3
      try { finalUrl = await addWatermark(s3) } catch {}
      job.imageUrl = finalUrl
      job.productName = productName
      job.progress = 'Complete!'
      return
    }

    // Strategy 4: Text-to-image fallback
    if (job) { job.attempt = 4; job.progress = 'Generating from descriptions...' }
    await delay(API_CALL_DELAY)
    console.log(`[ai-proxy] Strategy 4: create-detailed`)

    const bodyType = categorySlug === 'sarees' || categorySlug === 'fashion' || categorySlug === 'mens-shirts-t-shirts'
      ? 'Full-body professional fashion photograph'
      : categorySlug === 'jewelry' || categorySlug === 'watches'
      ? 'Close-up professional beauty photograph from chest up'
      : 'Professional fashion photograph'

    const s4 = await safeImageCreate(zai, {
      prompt: `${bodyType} of a person ${placement}. The product is "${productName}": ${productDesc || 'a luxury fashion item'}. Person: ${personDesc || 'a person'}. Show the product being worn accurately. Photorealistic, studio lighting, 8K, high detail.`,
      size,
    })
    if (s4) {
      console.log(`[ai-proxy] Strategy 4 (create-detailed) succeeded`)
      job.status = 'completed'
      job.strategy = 'create-detailed'
      job.faceScore = 4
      job.productScore = 6
      job.progress = 'Adding finishing touches...'
      let finalUrl = s4
      try { finalUrl = await addWatermark(s4) } catch {}
      job.imageUrl = finalUrl
      job.productName = productName
      job.progress = 'Complete!'
      return
    }

    throw new Error('All AI generation strategies failed. Please try again.')
  } catch (error: any) {
    console.error(`[ai-proxy] Job ${jobId} failed:`, error?.message)
    if (job) {
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Generation failed'
    }
  }
}

// ─── Product Image Fetching ────────────────────────────────────────

async function getProductImageBase64(imagePath: string): Promise<string | null> {
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    try {
      const response = await fetch(imagePath, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*,*/*;q=0.8' },
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) return null
      const contentType = response.headers.get('content-type') || 'image/jpeg'
      const mimeType = contentType.split(';')[0].trim()
      const buffer = Buffer.from(await response.arrayBuffer())
      return `data:${mimeType};base64,${buffer.toString('base64')}`
    } catch { return null }
  }
  if (imagePath.startsWith('//')) return getProductImageBase64(`https:${imagePath}`)
  if (imagePath.startsWith('/api/image-proxy')) {
    try {
      const proxyUrlObj = new URL(imagePath, 'http://localhost:3000')
      const originalUrl = proxyUrlObj.searchParams.get('url')
      if (originalUrl) {
        const directResult = await getProductImageBase64(originalUrl.startsWith('//') ? `https:${originalUrl}` : originalUrl)
        if (directResult) return directResult
      }
    } catch {}
  }
  // Local path
  try {
    const fullPath = join(process.cwd(), '..', '..', 'public', imagePath)
    if (!existsSync(fullPath)) return null
    const buffer = readFileSync(fullPath)
    const ext = imagePath.split('.').pop()?.toLowerCase() || 'jpg'
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    return `data:${mimeType};base64,${buffer.toString('base64')}`
  } catch { return null }
}

// ─── HTTP Server ───────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Abc')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  const url = new URL(req.url!, `http://localhost:${PORT}`)
  const path = url.pathname

  try {
    // GET /api/try-on/status
    if (path === '/api/try-on/status' && req.method === 'GET') {
      const available = ZAI_CONFIG !== null
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ available }))
      return
    }

    // GET /api/try-on?jobId=X
    if (path === '/api/try-on' && req.method === 'GET') {
      const jobId = url.searchParams.get('jobId')
      if (!jobId) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Job ID required' }))
        return
      }
      const job = jobs.get(jobId)
      if (!job) {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Job not found' }))
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        jobId,
        status: job.status,
        imageUrl: job.imageUrl,
        productName: job.productName,
        categorySlug: job.categorySlug,
        error: job.error,
        attempt: job.attempt,
        strategy: job.strategy,
        faceScore: job.faceScore,
        productScore: job.productScore,
        suggestions: job.suggestions,
        progress: job.progress,
      }))
      return
    }

    // POST /api/try-on
    if (path === '/api/try-on' && req.method === 'POST') {
      if (!ZAI_CONFIG) {
        res.writeHead(503, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'AI service not configured', code: 'AI_SERVICE_UNAVAILABLE' }))
        return
      }

      let body: any
      try {
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk)
        body = JSON.parse(Buffer.concat(chunks).toString())
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid request body' }))
        return
      }

      const { productId, selfieData, productImageUrl, productImageBase64: providedBase64, productName, categorySlug } = body
      if (!productId || !selfieData) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Product ID and selfie are required' }))
        return
      }

      console.log(`[ai-proxy] POST: productId=${productId}, hasProvidedBase64=${!!providedBase64}, selfieLen=${selfieData?.length}, productName=${productName}, categorySlug=${categorySlug}`)

      // Use provided base64 directly if available, otherwise fetch from URL
      let productImgB64: string | null = providedBase64 || null
      if (!productImgB64 && productImageUrl) {
        console.log(`[ai-proxy] Fetching product image from URL: ${productImageUrl}`)
        productImgB64 = await getProductImageBase64(productImageUrl)
        console.log(`[ai-proxy] Fetch result: ${productImgB64 ? 'success' : 'failed'}`)
      }
      if (!productImgB64) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Product image not available' }))
        return
      }

      console.log(`[ai-proxy] Product image source: ${providedBase64 ? 'base64 (provided)' : productImageUrl ? 'fetched from URL' : 'none'}`)

      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      jobs.set(jobId, {
        status: 'processing',
        createdAt: Date.now(),
        categorySlug: categorySlug || '',
        attempt: 1,
        progress: 'Analyzing your photo and product...',
      })

      // Start background processing
      backgroundProcess(jobId, productName || 'Product', categorySlug || 'jewelry', selfieData, productImgB64)
        .catch(err => console.error('[ai-proxy] Background job failed:', err))

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        jobId,
        status: 'processing',
        productName: productName || 'Product',
        categorySlug: categorySlug || 'jewelry',
      }))
      return
    }

    // 404 for all other routes
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  } catch (err) {
    console.error('[ai-proxy] Server error:', err)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Internal server error' }))
  }
})

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[ai-proxy] Port ${PORT} is already in use — another instance may be running. Exiting gracefully.`)
    process.exit(0)
  } else {
    console.error(`[ai-proxy] Server error:`, err)
    process.exit(1)
  }
})

server.listen(PORT, () => {
  console.log(`[ai-proxy] AI Proxy service running on port ${PORT}`)
  console.log(`[ai-proxy] ZAI config: ${ZAI_CONFIG ? 'available' : 'NOT available'}`)
})
