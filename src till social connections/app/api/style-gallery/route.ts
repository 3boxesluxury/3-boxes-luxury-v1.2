import { NextRequest, NextResponse } from 'next/server'
import { db, edb, getGalleryModel } from '@/lib/db'
import { verifyAuth } from '@/lib/auth-api'
import { supabase, STORAGE_BUCKET } from '@/lib/supabase'
import { randomUUID } from 'crypto'

// Next.js App Router route segment config (replaces deprecated Pages Router config)
export const maxDuration = 60

// Helper: ensure the storage bucket exists (creates it if missing)
async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.find((b) => b.name === STORAGE_BUCKET)
  if (exists) {
    if (!exists.public) await supabase.storage.updateBucket(STORAGE_BUCKET, { public: true })
    return
  }
  const { error } = await supabase.storage.createBucket(STORAGE_BUCKET, {
    public: true,
    fileSizeLimit: 5242880,
    allowedMimeTypes: ['image/*'],
  })
  if (error) console.error('[style-gallery] Bucket creation failed:', error.message)
}

// Helper: upload base64 data URL to Supabase Storage and return the public URL
async function uploadBase64ToSupabase(dataUrl: string, prefix: string): Promise<string> {
  // Extract mime type and base64 data
  const matches = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
  if (!matches) {
    throw new Error('Invalid base64 image data URL')
  }

  const mimeType = matches[1]
  const base64Data = matches[2]

  // Determine file extension
  const extMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  const ext = extMap[mimeType] || 'png'

  // Generate unique filename
  const filename = `${prefix}-${randomUUID()}.${ext}`

  // Convert base64 to buffer
  const buffer = Buffer.from(base64Data, 'base64')

  // Upload to Supabase Storage
  const { data, error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filename, buffer, {
      contentType: mimeType,
      upsert: false,
    })

  if (uploadError) {
    console.error('[style-gallery] Supabase upload error:', uploadError)
    throw new Error(`Upload failed: ${uploadError.message}`)
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(data.path)

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get public URL from Supabase')
  }

  console.log('[style-gallery] Uploaded image to Supabase:', urlData.publicUrl)
  return urlData.publicUrl
}

// GET /api/style-gallery — list gallery images with filtering & pagination
export async function GET(request: NextRequest) {
  try {
    const galleryModel = getGalleryModel()
    if (!galleryModel) {
      console.error('[style-gallery] No gallery model found in Prisma client. Available models:', Object.keys(db).filter(k => !k.startsWith('_') && !k.startsWith('$')))
      return NextResponse.json({ error: 'Gallery model not configured. Run: npx prisma generate' }, { status: 503 })
    }

    const user = await verifyAuth(request)

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId') || undefined
    const status = searchParams.get('status') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    const where: any = {}

    if (!user || user.role !== 'admin') {
      where.isApproved = true
      where.isActive = true
    } else {
      if (status === 'pending') {
        where.isApproved = false
        where.isActive = true
      } else if (status === 'approved') {
        where.isApproved = true
        where.isActive = true
      } else if (status === 'rejected') {
        where.isActive = false
      }
    }

    if (productId) {
      where.productId = productId
    }

    const [images, total] = await Promise.all([
      galleryModel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true,
            },
          },
        },
      }),
      galleryModel.count({ where }),
    ])

    return NextResponse.json({
      images,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Style Gallery GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch gallery images' }, { status: 500 })
  }
}

// POST /api/style-gallery — create a new gallery image (user submission)
export async function POST(request: NextRequest) {
  try {
    const galleryModel = getGalleryModel()
    if (!galleryModel) {
      console.error('[style-gallery] No gallery model found in Prisma client. Available models:', Object.keys(db).filter(k => !k.startsWith('_') && !k.startsWith('$')))
      return NextResponse.json({ error: 'Gallery model not configured. Run: npx prisma generate' }, { status: 503 })
    }

    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body;
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body. Image may be too large.' }, { status: 400 })
    }

    const { productId, userName, aiGeneratedImage, originalSelfie, rating, reviewTitle, reviewComment, consentGiven } = body

    if (!userName) {
      return NextResponse.json({ error: 'userName is required' }, { status: 400 })
    }
    if (!aiGeneratedImage) {
      return NextResponse.json({ error: 'aiGeneratedImage is required' }, { status: 400 })
    }
    if (consentGiven !== true) {
      return NextResponse.json({ error: 'consentGiven must be true to submit' }, { status: 400 })
    }

    // Ensure storage bucket exists before uploading
    await ensureBucket()

    // Upload base64 image to Supabase Storage
    let imageUrl = aiGeneratedImage
    if (aiGeneratedImage.startsWith('data:')) {
      try {
        imageUrl = await uploadBase64ToSupabase(aiGeneratedImage, 'style-gallery')
      } catch (uploadErr: any) {
        console.error('[style-gallery] Supabase upload failed:', uploadErr?.message)
        return NextResponse.json({ error: 'Failed to upload image. Please try again.' }, { status: 500 })
      }
    }

    // Upload original selfie if provided
    let selfieUrl = originalSelfie || null
    if (originalSelfie && originalSelfie.startsWith('data:') && consentGiven) {
      try {
        selfieUrl = await uploadBase64ToSupabase(originalSelfie, 'selfie')
      } catch {
        selfieUrl = null
      }
    }

    // Validate productId
    let validatedProductId: string | null = productId || null
    if (validatedProductId) {
      try {
        const product = await db.product.findUnique({ where: { id: validatedProductId } })
        if (!product) {
          console.log('[style-gallery] Product not found, saving without productId')
          validatedProductId = null
        }
      } catch {
        validatedProductId = null
      }
    }

    const ratingNum = rating ?? 5
    if (ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    const data: any = {
      productId: validatedProductId,
      userId: user.id,
      userName,
      aiGeneratedImage: imageUrl,
      rating: ratingNum,
      consentGiven: true,
      isApproved: false,
      isActive: true,
    }

    if (selfieUrl && consentGiven) {
      data.originalSelfie = selfieUrl
    }
    if (reviewTitle) {
      data.reviewTitle = reviewTitle
    }
    if (reviewComment) {
      data.reviewComment = reviewComment
    }

    const image = await galleryModel.create({
      data,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
          },
        },
      },
    })

    console.log(`[style-gallery] New submission: ${image.id} by ${userName} (status: pending)`)

    return NextResponse.json({
      image,
      message: 'Your style has been submitted and is pending admin approval. It will appear in the gallery once approved.',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[style-gallery] POST error:', error?.message || error, error?.code, error?.meta)

    if (error?.code === 'P2021') {
      return NextResponse.json({ error: 'Gallery table does not exist. Add the model to prisma/schema.prisma and run: npx prisma db push && npx prisma generate' }, { status: 503 })
    }

    return NextResponse.json({ error: 'Failed to create gallery image. Please try again.' }, { status: 500 })
  }
}