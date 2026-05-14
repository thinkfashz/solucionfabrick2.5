import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, adminUnauthorized, adminError, getAdminInsforge } from '@/lib/adminApi';

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('blog_uploads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (err) {
    return adminError(err, 'BLOG_UPLOADS_GET_FAILED');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const client = getAdminInsforge();
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file || !file.name.endsWith('.md')) {
      return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
    }
    const { data, error } = await client.database
      .from('blog_uploads')
      .insert([{
        filename: file.name,
        file_url: `/uploads/${file.name}`,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: session.email,
      }])
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return adminError(err, 'BLOG_UPLOADS_POST_FAILED');
  }
}
