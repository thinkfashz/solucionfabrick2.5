import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { SECTION_KINDS } from '@/lib/homeSectionKinds';
import { publishCmsEvent } from '@/lib/cmsBus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, ctx: RouteCtx) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.kind === 'string') {
      if (!(SECTION_KINDS as readonly string[]).includes(body.kind)) {
        return NextResponse.json({ error: 'Tipo inválido.', code: 'VALIDATION' }, { status: 400 });
      }
      update.kind = body.kind;
    }
    if (typeof body.title === 'string') update.title = body.title.trim() || null;
    if (typeof body.subtitle === 'string') update.subtitle = body.subtitle.trim() || null;
    if (typeof body.body === 'string') update.body = body.body.trim() || null;
    if (typeof body.image_url === 'string') update.image_url = body.image_url.trim() || null;
    if (typeof body.link_url === 'string') update.link_url = body.link_url.trim() || null;
    if (typeof body.link_label === 'string') update.link_label = body.link_label.trim() || null;
    if (typeof body.position === 'number') update.position = body.position;
    if (typeof body.visible === 'boolean') update.visible = body.visible;
    if (body.data && typeof body.data === 'object') update.data = body.data;
    if (body.page === 'home' || body.page === 'tienda') update.page = body.page;

    const client = getAdminInsforge();
    // Look up the row to determine which page to revalidate.
    const { data: existing } = await client.database
      .from('home_sections')
      .select('page')
      .eq('id', id)
      .limit(1);
    const existingPage =
      Array.isArray(existing) && existing.length > 0
        ? ((existing[0] as { page?: string | null }).page || 'home')
        : 'home';
    const targetPage =
      typeof update.page === 'string' ? (update.page as string) : existingPage;
    const paths = targetPage === 'tienda' ? ['/tienda'] : ['/'];

    const { data, error } = await client.database
      .from('home_sections')
      .update(update)
      .eq('id', id)
      .select();
    if (error) return NextResponse.json({ error: error.message, code: 'DB_ERROR' }, { status: 500 });
    try {
      for (const p of paths) revalidatePath(p);
    } catch {
      /* best effort */
    }
    publishCmsEvent({ topic: 'home', action: 'update', id, paths });
    return NextResponse.json({ section: Array.isArray(data) ? data[0] : data });
  } catch (err) {
    return adminError(err, 'HOME_UPDATE_FAILED');
  }
}

export async function DELETE(request: NextRequest, ctx: RouteCtx) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const { id } = await ctx.params;
    const client = getAdminInsforge();
    const { data: existing } = await client.database
      .from('home_sections')
      .select('page')
      .eq('id', id)
      .limit(1);
    const existingPage =
      Array.isArray(existing) && existing.length > 0
        ? ((existing[0] as { page?: string | null }).page || 'home')
        : 'home';
    const paths = existingPage === 'tienda' ? ['/tienda'] : ['/'];
    const { error } = await client.database.from('home_sections').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message, code: 'DB_ERROR' }, { status: 500 });
    try {
      for (const p of paths) revalidatePath(p);
    } catch {
      /* best effort */
    }
    publishCmsEvent({ topic: 'home', action: 'delete', id, paths });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return adminError(err, 'HOME_DELETE_FAILED');
  }
}
