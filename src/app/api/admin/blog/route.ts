import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { estimateReadingMinutes, renderMarkdown, slugify } from '@/lib/markdown';
import { publishCmsEvent } from '@/lib/cmsBus';
import { CMS_CACHE_TAGS } from '@/lib/cms';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface BlogPostInput {
  slug?: string;
  title?: string;
  description?: string;
  cover_url?: string;
  body_md?: string;
  tags?: string[];
  author?: string;
  published?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('blog_posts')
      .select(
        'id, slug, title, description, cover_url, tags, author, published, published_at, reading_minutes, created_at, updated_at',
      )
      .order('updated_at', { ascending: false });
    if (error) {
      return NextResponse.json(
        { error: error.message, code: 'DB_ERROR', hint: 'Crea la tabla blog_posts en /admin/setup.' },
        { status: 500 },
      );
    }
    return NextResponse.json({ posts: data ?? [] });
  } catch (err) {
    return adminError(err, 'BLOG_LIST_FAILED');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const body = (await request.json().catch(() => ({}))) as BlogPostInput;
    const title = (body.title ?? '').trim();
    if (!title) {
      return NextResponse.json({ error: 'Título requerido.', code: 'VALIDATION' }, { status: 400 });
    }
    const slug = (body.slug ? slugify(body.slug) : slugify(title)).trim();
    if (!slug) {
      return NextResponse.json({ error: 'Slug inválido.', code: 'VALIDATION' }, { status: 400 });
    }

    const md = body.body_md ?? '';
    const html = renderMarkdown(md);
    const now = new Date().toISOString();
    const published = Boolean(body.published);

    const row = {
      slug,
      title,
      description: (body.description ?? '').trim(),
      cover_url: (body.cover_url ?? '').trim() || null,
      body_md: md,
      body_html: html,
      tags: Array.isArray(body.tags) ? body.tags.map((t) => String(t)).filter(Boolean) : [],
      author: (body.author ?? session.email).trim() || null,
      published,
      published_at: published ? now : null,
      reading_minutes: estimateReadingMinutes(md),
      created_at: now,
      updated_at: now,
    };

    const client = getAdminInsforge();
    const { data, error } = await client.database.from('blog_posts').insert([row]).select();
    if (error) {
      const isDup = /duplicate|unique/i.test(error.message);
      return NextResponse.json(
        {
          error: isDup ? 'Ya existe una entrada con ese slug.' : error.message,
          code: isDup ? 'SLUG_TAKEN' : 'DB_ERROR',
        },
        { status: isDup ? 409 : 500 },
      );
    }
    try {
      revalidatePath('/blog');
      revalidatePath(`/blog/${slug}`);
      revalidateTag(CMS_CACHE_TAGS.blogList);
      revalidateTag(CMS_CACHE_TAGS.blogPost);
    } catch {
      /* best effort */
    }
    publishCmsEvent({ topic: 'blog', action: 'create', id: slug, paths: ['/blog', `/blog/${slug}`] });
    return NextResponse.json({ post: Array.isArray(data) ? data[0] : data });
  } catch (err) {
    return adminError(err, 'BLOG_CREATE_FAILED');
  }
}
