import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { publishCmsEvent } from '@/lib/cmsBus';
import { CMS_CACHE_TAGS } from '@/lib/cms';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface Section {
  id: string;
  kind: string;
  title?: string | null;
  subtitle?: string | null;
  body?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  link_label?: string | null;
  position: number;
  visible: boolean;
  data?: Record<string, unknown>;
}

interface BatchInput {
  sections?: Section[];
  page?: string;
}

type PageScope = 'home' | 'tienda';

function pathsForPage(p: PageScope): string[] {
  return p === 'tienda' ? ['/tienda'] : ['/'];
}

/**
 * PATCH /api/admin/home/sections/batch
 * Bulk update/upsert sections with real-time autosave support.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const body = (await request.json().catch(() => ({}))) as BatchInput;
    const sections = Array.isArray(body.sections) ? body.sections : [];

    if (sections.length === 0) {
      return NextResponse.json({ ok: true, updated: 0 });
    }

    const client = getAdminInsforge();
    const targetPage: PageScope = body.page === 'tienda' ? 'tienda' : 'home';
    const paths = pathsForPage(targetPage);
    const now = new Date().toISOString();
    const errors: Array<{ id: string; error: string }> = [];
    let updated = 0;

    for (const section of sections) {
      if (!section.id || typeof section.id !== 'string') continue;

      const row = {
        kind: section.kind,
        title: (section.title ?? '').trim() || null,
        subtitle: (section.subtitle ?? '').trim() || null,
        body: (section.body ?? '').trim() || null,
        image_url: (section.image_url ?? '').trim() || null,
        link_url: (section.link_url ?? '').trim() || null,
        link_label: (section.link_label ?? '').trim() || null,
        position: typeof section.position === 'number' ? section.position : 0,
        visible: section.visible !== false,
        data: section.data && typeof section.data === 'object' ? section.data : {},
        page: targetPage,
        updated_at: now,
      };

      // Try to update; if it doesn't exist, insert
      const { error: updateError, count } = await client.database
        .from('home_sections')
        .update(row)
        .eq('id', section.id);

      if (updateError) {
        // Try insert as fallback
        const { error: insertError } = await client.database
          .from('home_sections')
          .insert([{ ...row, id: section.id, created_at: now }]);

        if (insertError) {
          errors.push({ id: section.id, error: insertError.message });
        } else {
          updated++;
        }
      } else if ((count ?? 0) > 0) {
        updated++;
      }
    }

    try {
      for (const p of paths) revalidatePath(p);
      revalidateTag(CMS_CACHE_TAGS.homeSections);
    } catch {
      /* best effort */
    }

    publishCmsEvent({ topic: 'home', action: 'batch-update', paths });

    if (errors.length > 0) {
      return NextResponse.json(
        { ok: false, updated, errors, code: 'PARTIAL' },
        { status: 207 },
      );
    }

    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    return adminError(err, 'HOME_BATCH_FAILED');
  }
}
