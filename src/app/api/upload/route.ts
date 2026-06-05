import { NextRequest, NextResponse } from 'next/server'
import { supabase, STORAGE_BUCKET } from '@/lib/supabase'
import { randomUUID } from 'crypto'

/**
 * POST /api/upload
 *
 * Uploads image files to Supabase Storage (works on Vercel serverless).
 * Replaces the old local-filesystem upload that failed with EROFS on Vercel.
 *
 * Accepts: FormData with "files" field(s)
 * Returns: { urls: string[] } — public URLs of uploaded images
 */
export async function POST(request: NextRequest) {
  try {
    // ── Auth check: only logged-in admin users can upload ──────────────
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Parse form data ────────────────────────────────────────────────
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // ── Validate Supabase config ───────────────────────────────────────
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[upload] Missing Supabase env vars')
      return NextResponse.json(
        { error: 'Server storage not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 500 }
      )
    }

    const uploadedUrls: string[] = []

    for (const file of files) {
      if (!file || !(file instanceof File)) continue

      // ── Validate file type ───────────────────────────────────────────
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
      }

      // ── Validate file size (5 MB max) ────────────────────────────────
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: `File ${file.name} exceeds 5MB limit` }, { status: 400 })
      }

      // ── Generate unique filename ─────────────────────────────────────
      const ext = file.name.split('.').pop() || 'jpg'
      const filename = `${randomUUID()}.${ext}`

      // ── Read file bytes ──────────────────────────────────────────────
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // ── Upload to Supabase Storage ───────────────────────────────────
      const { data, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filename, buffer, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        console.error('[upload] Supabase storage error:', uploadError)
        return NextResponse.json(
          { error: `Upload failed: ${uploadError.message}` },
          { status: 500 }
        )
      }

      // ── Get public URL ───────────────────────────────────────────────
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(data.path)

      if (!urlData?.publicUrl) {
        return NextResponse.json(
          { error: 'Failed to get public URL for uploaded file' },
          { status: 500 }
        )
      }

      uploadedUrls.push(urlData.publicUrl)
    }

    return NextResponse.json({ urls: uploadedUrls }, { status: 201 })
  } catch (err: any) {
    console.error('[upload] Unexpected error:', err)
    return NextResponse.json(
      { error: err.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
