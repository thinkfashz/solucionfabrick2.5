import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { insforge } from '@/lib/insforge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (typeof body.alt === 'string') update.alt = body.alt.trim() || null;
    if (typeof body.folder === 'string') {
      const f = body.folder.toLowerCase().replace(/[^a-z0-9-]/g, '');
      update.folder = f || 'general';
    }
    if (Array.isArray(body.tags)) update.tags = (body.tags as unknown[]).map((t) => String(t)).filter(Boolean);
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Sin cambios.', code: 'VALIDATION' }, { status: 400 });
    }
    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('media_assets')
      .update(update)
      .eq('id', id)
      .select();
    if (error) return NextResponse.json({ error: error.message, code: 'DB_ERROR' }, { status: 500 });
    return NextResponse.json({ asset: Array.isArray(data) ? data[0] : data });
  } catch (err) {
    return adminError(err, 'MEDIA_PATCH_FAILED');
  }
}

export async function DELETE(request: NextRequest, ctx: RouteCtx) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const { id } = await ctx.params;
    const client = getAdminInsforge();
    const { data: existing, error: fetchErr } = await client.database
      .from('media_assets')
      .select('bucket, path')
      .eq('id', id)
      .limit(1);
    if (fetchErr) return NextResponse.json({ error: fetchErr.message, code: 'DB_ERROR' }, { status: 500 });
    const row = Array.isArray(existing) ? (existing[0] as { bucket?: string; path?: string }) : null;
    if (!row) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });

    if (row.bucket && row.path) {
      try {
        await insforge.storage.from(row.bucket).remove(row.path);
      } catch {
        // best-effort: continue and remove the registry row anyway
      }
    }
    const { error } = await client.database.from('media_assets').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message, code: 'DB_ERROR' }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return adminError(err, 'MEDIA_DELETE_FAILED');
  }
}
