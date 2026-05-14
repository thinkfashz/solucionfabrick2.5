import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, adminUnauthorized, adminError, getAdminInsforge } from '@/lib/adminApi';

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('blog_comments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (err) {
    return adminError(err, 'BLOG_COMMENTS_GET_FAILED');
  }
}
