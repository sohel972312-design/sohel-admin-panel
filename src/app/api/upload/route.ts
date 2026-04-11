import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function POST(req: NextRequest) {
  try {
    console.log('Upload API called');
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    
    if (!file) {
      console.log('No file uploaded');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    console.log('File received:', file.name, file.type, file.size);

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size should be less than 5MB' }, { status: 400 });
    }

    // Local development path
    const uploadDir = path.join(process.cwd(), 'public', 'blog-images', type);
    console.log('Upload directory:', uploadDir);
    
    // Ensure directory exists
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
      console.log('Created directory:', uploadDir);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name;
    const ext = path.extname(originalName);
    const safeName = originalName
      .replace(ext, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');
    const filename = `${timestamp}-${safeName}${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Convert File to Buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);
    
    console.log('File saved:', filepath);

    // Return local URL
    const publicUrl = `http://localhost:3000/blog-images/${type}/${filename}`;

    return NextResponse.json({ success: true, url: publicUrl });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}