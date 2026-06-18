import { NextRequest, NextResponse } from 'next/server'
import { supabase, STORAGE_BUCKET } from '@/lib/supabase'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server storage not configured.' },
        { status: 500 }
      )
    }

    const uploadedUrls: string[] = []

    for (const file of files) {
      if (!file || !(file instanceof File)) continue

      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
      }

      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: `File ${file.name} exceeds 5MB limit` }, { status: 400 })
      }

      const ext = file.name.split('.').pop() || 'jpg'
      const filename = `${randomUUID()}.${ext}`

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

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

      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(data.path)

      if (!urlData?.publicUrl) {
        return NextResponse.json(
          { error: 'Failed to get public URL' },
          { status: 500 }
        )
      }

      uploadedUrls.push(urlData.publicUrl)
    }

    return NextResponse.json({ urls: uploadedUrls }, { status: 201 })
  } catch (err: any) {
    console.error('[upload] Error:', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
