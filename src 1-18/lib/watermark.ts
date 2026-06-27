import sharp from 'sharp'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Cache the watermark buffer so we don't read from disk on every request
let watermarkBufferCache: Buffer | null = null

/**
 * Create a "3BOXES GIFTS" watermark image using Sharp.
 * Generates a semi-transparent text-based watermark at the bottom-right corner.
 */
async function createWatermarkBuffer(width: number, height: number): Promise<Buffer> {
  // Scale watermark based on image dimensions
  const wmWidth = Math.max(Math.floor(width * 0.35), 150)
  const wmHeight = Math.max(Math.floor(height * 0.08), 40)
  const fontSize = Math.max(Math.floor(wmHeight * 0.55), 14)
  const subFontSize = Math.max(Math.floor(wmHeight * 0.3), 8)

  // Create the SVG watermark
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

  return Buffer.from(svg)
}

/**
 * Try to load the logo PNG from public/images/ and create a watermark overlay.
 * Falls back to a text-based watermark if the logo is unavailable.
 */
async function getWatermarkBuffer(width: number, height: number): Promise<Buffer> {
  // Try using the logo file
  const logoPath = join(process.cwd(), 'public', 'images', 'logo-uploaded.png')
  if (existsSync(logoPath)) {
    try {
      const logoData = readFileSync(logoPath)
      const logoMeta = await sharp(logoData).metadata()
      const logoW = logoMeta.width || 1536
      const logoH = logoMeta.height || 1024

      // Scale logo to fit nicely in the bottom-right
      const targetHeight = Math.max(Math.floor(height * 0.08), 36)
      const targetWidth = Math.floor((logoW / logoH) * targetHeight)
      const padding = Math.floor(height * 0.02)

      // Resize logo and add transparency
      const resizedLogo = await sharp(logoData)
        .resize(targetWidth, targetHeight, { fit: 'contain' })
        .ensureAlpha(0.6) // 60% opacity
        .png()
        .toBuffer()

      // Create a composite watermark: logo + text
      const textWmWidth = Math.max(Math.floor(width * 0.28), 130)
      const textWmHeight = Math.max(Math.floor(height * 0.06), 28)
      const fontSize = Math.max(Math.floor(textWmHeight * 0.5), 11)
      const subFontSize = Math.max(Math.floor(textWmHeight * 0.3), 7)

      const totalWmWidth = targetWidth + 8 + textWmWidth
      const totalWmHeight = Math.max(targetHeight, textWmHeight)

      const svgText = `<svg width="${textWmWidth}" height="${textWmHeight}" xmlns="http://www.w3.org/2000/svg">
        <text x="0" y="${textWmHeight * 0.45}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" fill="rgba(218,165,32,0.85)" dominant-baseline="middle">3BOXES GIFTS</text>
        <text x="0" y="${textWmHeight * 0.82}" font-family="Arial, Helvetica, sans-serif" font-size="${subFontSize}" fill="rgba(218,165,32,0.5)" dominant-baseline="middle">AI Style Preview</text>
      </svg>`

      const textBuffer = Buffer.from(svgText)
      const textPng = await sharp(textBuffer).png().toBuffer()

      // Composite logo + text side by side
      const composite = await sharp({
        create: {
          width: totalWmWidth,
          height: totalWmHeight,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([
          { input: resizedLogo, left: 0, top: Math.floor((totalWmHeight - targetHeight) / 2) },
          { input: textPng, left: targetWidth + 8, top: Math.floor((totalWmHeight - textWmHeight) / 2) },
        ])
        .png()
        .toBuffer()

      return composite
    } catch (err) {
      console.error('[watermark] Failed to create logo watermark, using text fallback:', err)
    }
  }

  // Fallback: text-only watermark
  return createWatermarkBuffer(width, height)
}

/**
 * Add a "3BOXES GIFTS" watermark to an image.
 * The watermark is placed at the bottom-right corner with some padding.
 *
 * @param imageDataUrl - Base64 data URL of the image (e.g., "data:image/png;base64,...")
 * @returns Watermarked image as a base64 data URL
 */
export async function addWatermark(imageDataUrl: string): Promise<string> {
  try {
    // Strip the data URL prefix
    const base64Match = imageDataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/)
    if (!base64Match) {
      console.warn('[watermark] Invalid data URL format, returning original')
      return imageDataUrl
    }

    const imageBuffer = Buffer.from(base64Match[2], 'base64')
    const metadata = await sharp(imageBuffer).metadata()
    const width = metadata.width || 800
    const height = metadata.height || 1000

    // Get the watermark overlay
    const wmBuffer = await getWatermarkBuffer(width, height)
    const wmMeta = await sharp(wmBuffer).metadata()
    const wmWidth = wmMeta.width || 150
    const wmHeight = wmMeta.height || 40

    // Position: bottom-right with padding
    const padding = Math.max(Math.floor(height * 0.02), 10)
    const left = Math.max(width - wmWidth - padding, 0)
    const top = Math.max(height - wmHeight - padding, 0)

    // Composite the watermark onto the image
    const watermarkedBuffer = await sharp(imageBuffer)
      .composite([{
        input: wmBuffer,
        left,
        top,
      }])
      .png()
      .toBuffer()

    return `data:image/png;base64,${watermarkedBuffer.toString('base64')}`
  } catch (err) {
    console.error('[watermark] Failed to add watermark, returning original:', err)
    return imageDataUrl
  }
}
