import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { SECTION_KINDS, type SectionKind } from '@/lib/homeSectionKinds';
import { publishCmsEvent } from '@/lib/cmsBus';

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
}

function isSectionKind(v: unknown): v is SectionKind {
  return typeof v === 'string' && (SECTION_KINDS as readonly string[]).includes(v);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
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
    return NextResponse.json({ sections: data ?? [] });
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
    // Determine next position (append at end).
    const { data: existing } = await client.database
      .from('home_sections')
      .select('position')
      .order('position', { ascending: false })
      .limit(1);
    const nextPos =
      Array.isArray(existing) && existing.length > 0
        ? Number((existing[0] as { position?: number }).position ?? 0) + 1
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
      created_at: now,
      updated_at: now,
    };
    const { data, error } = await client.database.from('home_sections').insert([row]).select();
    if (error) {
      return NextResponse.json({ error: error.message, code: 'DB_ERROR' }, { status: 500 });
    }
    try {
      revalidatePath('/');
    } catch {
      /* best effort */
    }
    publishCmsEvent({ topic: 'home', action: 'create', paths: ['/'] });
    return NextResponse.json({ section: Array.isArray(data) ? data[0] : data });
  } catch (err) {
    return adminError(err, 'HOME_CREATE_FAILED');
  }
}
