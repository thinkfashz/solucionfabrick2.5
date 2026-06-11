export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ensureWebPagesTable, publicPageUrl, rows, runRawSql, sqlJson, sqlText } from '@/lib/web-pages/sql';

function idNum(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureWebPagesTable();
    const { id } = await params;
    const result = await runRawSql(`SELECT * FROM web_pages WHERE id = ${idNum(id)} LIMIT 1`);
    if (!result.ok) return NextResponse.json({ ok: false, error: 'No se pudo cargar la página', detail: result.data }, { status: 500 });
    const page = rows(result)[0] ?? null;
    return NextResponse.json({ ok: true, page: page ? { ...page, public_url: publicPageUrl(String(page.slug)) } : null });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureWebPagesTable();
    const { id } = await params;
    const body = await request.json();
    const status = body.status === 'published' ? 'published' : body.status === 'archived' ? 'archived' : 'draft';
    const publishedAt = status === 'published' ? 'NOW()' : 'published_at';
    const result = await runRawSql(`
      UPDATE web_pages SET
        title = ${sqlText(body.title)},
        niche = ${sqlText(body.niche)},
        client_name = ${sqlText(body.client_name)},
        client_phone = ${sqlText(body.client_phone)},
        status = ${sqlText(status)},
        project_json = ${sqlJson(body.project_json)},
        html = ${sqlText(body.html)},
        css = ${sqlText(body.css)},
        js = ${sqlText(body.js)},
        seo_json = ${sqlJson(body.seo_json)},
        assets_json = ${sqlJson(body.assets_json ?? [], [])},
        published_at = ${publishedAt},
        updated_at = NOW()
      WHERE id = ${idNum(id)}
      RETURNING *
    `);
    if (!result.ok) return NextResponse.json({ ok: false, error: 'No se pudo guardar', detail: result.data }, { status: 500 });
    const page = rows(result)[0] ?? null;
    return NextResponse.json({ ok: true, page: page ? { ...page, public_url: publicPageUrl(String(page.slug)) } : null });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await runRawSql(`DELETE FROM web_pages WHERE id = ${idNum(id)}`);
    if (!result.ok) return NextResponse.json({ ok: false, error: 'No se pudo eliminar', detail: result.data }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }, { status: 500 });
  }
}
