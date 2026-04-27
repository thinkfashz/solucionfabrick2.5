import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { listContent, getContent } from '@/lib/content';
import { renderMarkdown, estimateReadingMinutes } from '@/lib/markdown';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/blog/import-md
 *
 * Migrates `src/content/blog/*.md` to the `blog_posts` table. Existing rows
 * (matched by `slug`) are skipped so the import is safely re-runnable. Returns
 * a per-file status report.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const client = getAdminInsforge();
    const { data: existing, error: existingErr } = await client.database
      .from('blog_posts')
      .select('slug');
    if (existingErr) {
      return NextResponse.json(
        { error: existingErr.message, code: 'DB_ERROR', hint: 'Crea la tabla blog_posts primero.' },
        { status: 500 },
      );
    }
    const existingSlugs = new Set(
      ((existing ?? []) as Array<{ slug?: string }>).map((r) => r.slug).filter(Boolean) as string[],
    );

    const items = listContent('blog');
    const results: Array<{ slug: string; ok: boolean; skipped?: boolean; error?: string }> = [];
    let imported = 0;

    for (const meta of items) {
      if (existingSlugs.has(meta.slug)) {
        results.push({ slug: meta.slug, ok: true, skipped: true });
        continue;
      }
      const post = getContent('blog', meta.slug);
      if (!post) {
        results.push({ slug: meta.slug, ok: false, error: 'no se pudo leer .md' });
        continue;
      }
      const md = post.raw;
      const now = new Date().toISOString();
      const row = {
        slug: meta.slug,
        title: meta.title,
        description: meta.description,
        cover_url: meta.cover ?? null,
        body_md: md,
        body_html: renderMarkdown(md),
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        author: meta.author ?? null,
        published: !meta.draft,
        published_at: meta.draft ? null : meta.date,
        reading_minutes: estimateReadingMinutes(md),
        created_at: meta.date,
        updated_at: now,
      };
      const { error: insertErr } = await client.database.from('blog_posts').insert([row]);
      if (insertErr) {
        results.push({ slug: meta.slug, ok: false, error: insertErr.message });
      } else {
        results.push({ slug: meta.slug, ok: true });
        imported += 1;
      }
    }

    try {
      revalidatePath('/blog');
    } catch {
      /* best effort */
    }
    return NextResponse.json({ ok: true, imported, total: items.length, results });
  } catch (err) {
    return adminError(err, 'BLOG_IMPORT_FAILED');
  }
}
