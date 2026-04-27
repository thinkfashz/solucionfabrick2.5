import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { estimateReadingMinutes, renderMarkdown, slugify } from '@/lib/markdown';
import { publishCmsEvent } from '@/lib/cmsBus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RouteCtx {
  params: Promise<{ id: string }>;
}

async function fetchPost(id: string) {
  const client = getAdminInsforge();
  const { data, error } = await client.database
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .limit(1);
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : null;
  return row ?? null;
}

export async function GET(request: NextRequest, ctx: RouteCtx) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const { id } = await ctx.params;
    const post = await fetchPost(id);
    if (!post) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });
    return NextResponse.json({ post });
  } catch (err) {
    return adminError(err, 'BLOG_GET_FAILED');
  }
}

export async function PUT(request: NextRequest, ctx: RouteCtx) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const { id } = await ctx.params;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const existing = await fetchPost(id);
    if (!existing) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });

    const title =
      typeof body.title === 'string' && body.title.trim()
        ? body.title.trim()
        : (existing as { title: string }).title;
    const incomingSlug = typeof body.slug === 'string' ? slugify(body.slug) : null;
    const slug = incomingSlug || (existing as { slug: string }).slug;
    const md =
      typeof body.body_md === 'string'
        ? body.body_md
        : (existing as { body_md?: string }).body_md ?? '';
    const description =
      typeof body.description === 'string'
        ? body.description.trim()
        : (existing as { description?: string }).description ?? '';
    const cover_url =
      typeof body.cover_url === 'string'
        ? body.cover_url.trim() || null
        : (existing as { cover_url?: string | null }).cover_url ?? null;
    const tags = Array.isArray(body.tags)
      ? (body.tags as unknown[]).map((t) => String(t)).filter(Boolean)
      : (existing as { tags?: string[] }).tags ?? [];
    const author =
      typeof body.author === 'string'
        ? body.author.trim() || null
        : (existing as { author?: string | null }).author ?? null;
    const published =
      typeof body.published === 'boolean'
        ? body.published
        : Boolean((existing as { published?: boolean }).published);

    const now = new Date().toISOString();
    const previousPublished = Boolean((existing as { published?: boolean }).published);
    const previousPublishedAt = (existing as { published_at?: string | null }).published_at ?? null;
    const published_at = published
      ? previousPublished && previousPublishedAt
        ? previousPublishedAt
        : now
      : null;

    const update = {
      slug,
      title,
      description,
      cover_url,
      body_md: md,
      body_html: renderMarkdown(md),
      tags,
      author,
      published,
      published_at,
      reading_minutes: estimateReadingMinutes(md),
      updated_at: now,
    };

    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('blog_posts')
      .update(update)
      .eq('id', id)
      .select();
    if (error) {
      const isDup = /duplicate|unique/i.test(error.message);
      return NextResponse.json(
        {
          error: isDup ? 'Ya existe otra entrada con ese slug.' : error.message,
          code: isDup ? 'SLUG_TAKEN' : 'DB_ERROR',
        },
        { status: isDup ? 409 : 500 },
      );
    }
    try {
      revalidatePath('/blog');
      revalidatePath(`/blog/${slug}`);
      const oldSlug = (existing as { slug?: string }).slug;
      if (oldSlug && oldSlug !== slug) revalidatePath(`/blog/${oldSlug}`);
    } catch {
      /* best effort */
    }
    publishCmsEvent({ topic: 'blog', action: 'update', id: slug, paths: ['/blog', `/blog/${slug}`] });
    return NextResponse.json({ post: Array.isArray(data) ? data[0] : data });
  } catch (err) {
    return adminError(err, 'BLOG_UPDATE_FAILED');
  }
}

export async function DELETE(request: NextRequest, ctx: RouteCtx) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const { id } = await ctx.params;
    const existing = await fetchPost(id);
    if (!existing) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });
    const client = getAdminInsforge();
    const { error } = await client.database.from('blog_posts').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message, code: 'DB_ERROR' }, { status: 500 });
    try {
      revalidatePath('/blog');
      const slug = (existing as { slug?: string }).slug;
      if (slug) revalidatePath(`/blog/${slug}`);
    } catch {
      /* best effort */
    }
    publishCmsEvent({ topic: 'blog', action: 'delete', id: (existing as { slug?: string }).slug, paths: ['/blog'] });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return adminError(err, 'BLOG_DELETE_FAILED');
  }
}
