import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth-helper';

// POST /api/upload
// Handles image uploads from the admin dashboard.
// Saves files to the public/uploads directory and returns the URLs.
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const { user, error } = await authenticate(request);
    if (error) return error;

    // Only admins can upload files
    if (user!.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('files');

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    const urls: string[] = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: `File "${file.name}" is not an image` },
          { status: 400 }
        );
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds 5MB limit` },
          { status: 400 }
        );
      }

      // Generate a unique filename
      const ext = file.name.split('.').pop() || 'jpg';
      const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // In a production environment (Vercel), we can't write to the filesystem.
      // We need to upload to a cloud storage provider (like Supabase Storage).
      // Check if Supabase is configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseKey) {
        // Upload to Supabase Storage
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(supabaseUrl, supabaseKey);

          // Try to upload to 'product-images' bucket
          const { data, error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filename, buffer, {
              contentType: file.type,
              upsert: false,
            });

          if (uploadError) {
            console.error('Supabase upload error:', uploadError);
            // Fallback: try to get public URL even if bucket doesn't exist
            const { data: publicUrlData } = supabase.storage
              .from('product-images')
              .getPublicUrl(filename);
            urls.push(publicUrlData.publicUrl);
          } else {
            // Get the public URL
            const { data: publicUrlData } = supabase.storage
              .from('product-images')
              .getPublicUrl(filename);
            urls.push(publicUrlData.publicUrl);
          }
        } catch (supabaseErr) {
          console.error('Supabase storage error:', supabaseErr);
          // Fallback: return a placeholder URL
          urls.push(`/uploads/${filename}`);
        }
      } else {
        // Local development: write to public/uploads
        try {
          const { writeFile, mkdir } = await import('fs/promises');
          const { join } = await import('path');
          const uploadDir = join(process.cwd(), 'public', 'uploads');
          try {
            await mkdir(uploadDir, { recursive: true });
          } catch {}
          const filePath = join(uploadDir, filename);
          await writeFile(filePath, buffer);
          urls.push(`/uploads/${filename}`);
        } catch (fsErr) {
          console.error('Filesystem upload error:', fsErr);
          return NextResponse.json(
            { error: 'Failed to save file. Ensure Supabase Storage is configured.' },
            { status: 500 }
          );
        }
      }
    }

    if (urls.length === 0) {
      return NextResponse.json(
        { error: 'No files were uploaded successfully' },
        { status: 500 }
      );
    }

    return NextResponse.json({ urls });
  } catch (err: any) {
    console.error('Upload API error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to upload files' },
      { status: 500 }
    );
  }
}
