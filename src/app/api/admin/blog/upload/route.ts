import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

export async function GET() {
  try {
    const { data, error } = await insforge
      .from('blog_uploads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Error fetching uploads' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Error in uploads GET:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file || !file.name.endsWith('.md')) {
      return NextResponse.json(
        { error: 'Invalid file' },
        { status: 400 }
      );
    }

    const filename = file.name;
    const fileSize = file.size;
    const mimeType = file.type;

    // TODO: Subir archivo a storage (Cloudinary, S3, etc.)
    // Por ahora, guardar metadatos en BD
    const fileUrl = `/uploads/${filename}`;

    const { data, error } = await insforge
      .from('blog_uploads')
      .insert([
        {
          filename,
          file_url: fileUrl,
          file_size: fileSize,
          mime_type: mimeType,
          uploaded_by: 'admin',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('DB error:', error);
      return NextResponse.json(
        { error: 'Error saving upload' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('Error in uploads POST:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
