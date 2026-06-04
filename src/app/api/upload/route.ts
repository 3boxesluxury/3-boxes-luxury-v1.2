import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const uploadedUrls: string[] = []
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')

    // Ensure upload directory exists
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch {
      // Directory may already exist
    }

    for (const file of files) {
      if (!file || !(file instanceof File)) continue

      // Validate file type
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: `File ${file.name} exceeds 5MB limit` }, { status: 400 })
      }

      // Generate unique filename
      const ext = path.extname(file.name) || '.jpg'
      const filename = `${randomUUID()}${ext}`
      const filepath = path.join(uploadDir, filename)

      // Write file to disk
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filepath, buffer)

      // Return public URL path
      uploadedUrls.push(`/uploads/${filename}`)
    }

    return NextResponse.json({ urls: uploadedUrls }, { status: 201 })
  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
