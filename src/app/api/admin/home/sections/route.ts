import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { SECTION_KINDS, type SectionKind } from '@/lib/homeSectionKinds';
import { publishCmsEvent } from '@/lib/cmsBus';
import { CMS_CACHE_TAGS } from '@/lib/cms';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface SectionInput {
  kind?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  image_url?: string;
  link_url?: string;
  link_label?: string;
  visible?: boolean;
  data?: Record<string, unknown>;
  position?: number;
  page?: string;
}

function isSectionKind(v: unknown): v is SectionKind {
  return typeof v === 'string' && (SECTION_KINDS as readonly string[]).includes(v);
}

type PageScope = 'home' | 'tienda';

function readPageScope(request: NextRequest): PageScope {
  const url = new URL(request.url);
  const p = url.searchParams.get('page');
  return p === 'tienda' ? 'tienda' : 'home';
}

/** Best-effort extraction of `page` from a request body. */
function readBodyPage(input: { page?: string }): PageScope | null {
  return input.page === 'tienda' ? 'tienda' : input.page === 'home' ? 'home' : null;
}

function pathsForPage(p: PageScope): string[] {
  return p === 'tienda' ? ['/tienda'] : ['/'];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const page = readPageScope(request);
    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('home_sections')
      .select('*')
      .order('position', { ascending: true });
    if (error) {
      return NextResponse.json(
        { error: error.message, code: 'DB_ERROR', hint: 'Crea la tabla home_sections en /admin/setup.' },
        { status: 500 },
      );
    }
    // Filter in JS so legacy rows without a `page` column default to 'home'.
    const filtered = (Array.isArray(data) ? data : []).filter((row) => {
      const rowPage = (row && typeof row === 'object' && 'page' in row ? (row as { page?: string | null }).page : null) || 'home';
      return rowPage === page;
    });
    return NextResponse.json({ sections: filtered, page });
  } catch (err) {
    return adminError(err, 'HOME_LIST_FAILED');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const body = (await request.json().catch(() => ({}))) as SectionInput;
    if (!isSectionKind(body.kind)) {
      return NextResponse.json(
        { error: `Tipo inválido. Permitidos: ${SECTION_KINDS.join(', ')}.`, code: 'VALIDATION' },
        { status: 400 },
      );
    }
    const client = getAdminInsforge();
    const page: PageScope = readBodyPage(body) ?? readPageScope(request);
    // Determine next position (append at end) within the same page scope.
    const { data: existing } = await client.database
      .from('home_sections')
      .select('position, page')
      .order('position', { ascending: false });
    const samePage = (Array.isArray(existing) ? existing : []).filter((r) => {
      const p = (r && typeof r === 'object' && 'page' in r ? (r as { page?: string | null }).page : null) || 'home';
      return p === page;
    });
    const nextPos =
      samePage.length > 0
        ? Number((samePage[0] as { position?: number }).position ?? 0) + 1
        : 0;
    const now = new Date().toISOString();
    const row = {
      kind: body.kind,
      title: (body.title ?? '').trim() || null,
      subtitle: (body.subtitle ?? '').trim() || null,
      body: (body.body ?? '').trim() || null,
      image_url: (body.image_url ?? '').trim() || null,
      link_url: (body.link_url ?? '').trim() || null,
      link_label: (body.link_label ?? '').trim() || null,
      position: typeof body.position === 'number' ? body.position : nextPos,
      visible: body.visible !== false,
      data: body.data && typeof body.data === 'object' ? body.data : {},
      page,
      created_at: now,
      updated_at: now,
    };
    const { data, error } = await client.database.from('home_sections').insert([row]).select();
    if (error) {
      return NextResponse.json({ error: error.message, code: 'DB_ERROR' }, { status: 500 });
    }
    const paths = pathsForPage(page);
    try {
      for (const p of paths) revalidatePath(p);
      revalidateTag(CMS_CACHE_TAGS.homeSections);
    } catch {
      /* best effort */
    }
    publishCmsEvent({ topic: 'home', action: 'create', paths });
    return NextResponse.json({ section: Array.isArray(data) ? data[0] : data });
  } catch (err) {
    return adminError(err, 'HOME_CREATE_FAILED');
  }
}
