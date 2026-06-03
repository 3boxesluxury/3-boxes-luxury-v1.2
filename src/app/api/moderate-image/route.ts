import { NextRequest, NextResponse } from 'next/server'
import { createZAI } from '@/lib/zai'

// ── POST /api/moderate-image ─────────────────────────────────────
// Uses VLM (Vision Language Model) to check if an uploaded selfie
// is appropriate for the try-on feature.

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json()
    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Use the VLM to analyze the selfie image
    let analysis: {
      faceDetected: boolean
      appropriate: boolean
      clear: boolean
      selfie: boolean
      reason?: string
    }

    try {
      const zai = await createZAI()
      const result = await Promise.race([
        zai.chat.completions.createVision({
          model: 'glm-4v-plus',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this selfie image for an e-commerce try-on feature. Check: 1) Is there a clear human face visible? 2) Is the image appropriate (no nudity, obscenity, or explicit content)? 3) Is the image clear enough (not blurry or too dark)? 4) Does it appear to be a selfie (single person, face visible)? Respond in JSON format ONLY: {"faceDetected": true/false, "appropriate": true/false, "clear": true/false, "selfie": true/false, "reason": "explanation if any check fails"}',
                },
                {
                  type: 'image_url',
                  image_url: { url: imageBase64 },
                },
              ],
            },
          ],
          thinking: { type: 'disabled' },
        }),
        new Promise<null>((r) => setTimeout(() => r(null), 30000)),
      ])

      if (!result) {
        // Timeout — allow through
        analysis = { faceDetected: true, appropriate: true, clear: true, selfie: true }
      } else {
        const text = result.choices[0]?.message?.content || ''
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0])
        } else {
          analysis = { faceDetected: true, appropriate: true, clear: true, selfie: true }
        }
      }
    } catch (vlmErr) {
      console.error('[moderate-image] VLM analysis failed, allowing image through:', vlmErr instanceof Error ? vlmErr.message : String(vlmErr))
      // Fail open — allow the image on VLM errors
      analysis = { faceDetected: true, appropriate: true, clear: true, selfie: true }
    }

    const isAppropriate = analysis.appropriate && analysis.faceDetected && analysis.clear

    return NextResponse.json({
      appropriate: isAppropriate,
      faceDetected: analysis.faceDetected ?? true,
      clear: analysis.clear ?? true,
      selfie: analysis.selfie ?? true,
      reason: !isAppropriate
        ? !analysis.faceDetected
          ? 'No face detected. Please upload a clear selfie with your face visible.'
          : !analysis.appropriate
            ? 'Image does not meet our content guidelines. Please upload an appropriate photo.'
            : !analysis.clear
              ? 'Image is too blurry or dark. Please take a clearer photo.'
              : 'Image does not meet our selfie guidelines.'
        : undefined,
    })
  } catch (error) {
    console.error('Image moderation error:', error)
    // On error, allow the image through (fail open) to avoid blocking users
    return NextResponse.json({
      appropriate: true,
      faceDetected: true,
      clear: true,
      selfie: true,
    })
  }
}
