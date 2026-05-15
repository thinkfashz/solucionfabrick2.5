import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession, getAdminTenantId } from '@/lib/adminApi';
import { estimateReadingMinutes, renderMarkdown, slugify } from '@/lib/markdown';
import { publishCmsEvent } from '@/lib/cmsBus';
import { CMS_CACHE_TAGS } from '@/lib/cms';
import { detectSchemaError, schemaErrorHint } from '@/lib/schemaErrors';
import { v, parse, validationError } from '@/lib/validate';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const blogPostSchema = {
  title:       v.string({ required: true, min: 1, max: 300 }),
  slug:        v.string({ max: 300 }),
  description: v.string({ max: 500 }),
  cover_url:   v.string({ max: 1000 }),
  body_md:     v.string({ max: 200000 }),
  tags:        v.array({ of: v.string({ max: 100 }), maxItems: 50 }),
  author:      v.string({ max: 200 }),
  published:   v.boolean(),
};

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const tenantId = await getAdminTenantId(request);
    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('blog_posts')
      .select(
        'id, slug, title, description, cover_url, tags, author, published, published_at, reading_minutes, created_at, updated_at',
      )
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false });
    if (error) {
      const schema = detectSchemaError(error.message);
      if (schema) {
        const { code, hint } = schemaErrorHint(schema);
        return NextResponse.json(
          { error: error.message, code, hint, schema },
          { status: 503 },
        );
      }
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

    const tenantId = await getAdminTenantId(request);
    const raw = await request.json().catch(() => ({}));
    const result = parse(blogPostSchema, raw);
    if (!result.ok) return validationError(result.errors);
    const d = result.data as {
      title: string; slug?: string; description?: string; cover_url?: string;
      body_md?: string; tags?: string[]; author?: string; published?: boolean;
    };

    const title = d.title;
    const slug = (d.slug ? slugify(d.slug) : slugify(title)).trim();
    if (!slug) {
      return NextResponse.json({ error: 'Slug inválido.', code: 'VALIDATION' }, { status: 400 });
    }

    const md = d.body_md ?? '';
    const html = renderMarkdown(md);
    const now = new Date().toISOString();
    const published = d.published ?? false;

    const row = {
      slug,
      title,
      description: d.description ?? '',
      cover_url: d.cover_url || null,
      body_md: md,
      body_html: html,
      tags: d.tags ?? [],
      author: (d.author ?? session.email).trim() || null,
      published,
      published_at: published ? now : null,
      reading_minutes: estimateReadingMinutes(md),
      created_at: now,
      updated_at: now,
      tenant_id: tenantId,
    };

    const client = getAdminInsforge();
    const { data, error } = await client.database.from('blog_posts').insert([row]).select();
    if (error) {
      const isDup = /duplicate|unique/i.test(error.message);
      if (!isDup) {
        const schema = detectSchemaError(error.message);
        if (schema) {
          const { code, hint } = schemaErrorHint(schema);
          return NextResponse.json(
            { error: error.message, code, hint, schema },
            { status: 503 },
          );
        }
      }
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
