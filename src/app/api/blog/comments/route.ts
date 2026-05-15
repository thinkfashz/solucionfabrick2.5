import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import { v, parse, validationError } from '@/lib/validate';

const schema = {
  post_slug:    v.string({ required: true, min: 1, max: 255 }),
  author_name:  v.string({ required: true, min: 1, max: 255 }),
  author_email: v.email({ required: true, max: 255 }),
  author_url:   v.url({ max: 500 }),
  content:      v.string({ required: true, min: 1, max: 5000 }),
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = parse(schema, body);
    if (!result.ok) return validationError(result.errors);

    const { post_slug, author_name, author_email, author_url, content } = result.data as {
      post_slug: string; author_name: string; author_email: string;
      author_url?: string; content: string;
    };

    const { data, error } = await insforge.database
      .from('blog_comments')
      .insert([{
        post_slug,
        author_name,
        author_email,
        author_url: author_url ?? null,
        content,
        status: 'pending',
      }])
      .select()
      .single();

    if (error) {
      console.error('[blog/comments] DB error:', error);
      return NextResponse.json({ error: 'Error creando comentario.' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[blog/comments] unexpected error:', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
