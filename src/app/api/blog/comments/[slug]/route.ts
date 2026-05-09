import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

interface CommentPayload {
  post_slug: string;
  author_name: string;
  author_email: string;
  author_url?: string;
  content: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const searchParams = request.nextUrl.searchParams;
    const approvedOnly = searchParams.get('approved') === 'true';

    let query = insforge.database
      .from('blog_comments')
      .select('*')
      .eq('post_slug', slug)
      .order('created_at', { ascending: false });

    if (approvedOnly) {
      query = query.eq('status', 'approved');
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Error fetching comments' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Error in comments GET:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CommentPayload;

    const { post_slug, author_name, author_email, author_url, content } = body;

    // Validar
    if (!post_slug || !author_name || !author_email || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validar email básico
    if (!author_email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email' },
        { status: 400 }
      );
    }

    // Insertar comentario
    const { data, error } = await insforge.database
      .from('blog_comments')
      .insert([
        {
          post_slug,
          author_name: author_name.trim().slice(0, 255),
          author_email: author_email.trim().slice(0, 255),
          author_url: author_url ? author_url.trim().slice(0, 255) : null,
          content: content.trim().slice(0, 5000),
          status: 'pending', // Comentarios moderados por defecto
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('DB error:', error);
      return NextResponse.json(
        { error: 'Error creating comment' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('Error in comments POST:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
