export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ensureWebPagesTable, publicPageUrl, rows, runRawSql, sqlJson, sqlText } from '@/lib/web-pages/sql';
import { createStarterTemplate, slugify } from '@/lib/web-pages/templates';

function token() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);
}

export async function GET() {
  try {
    await ensureWebPagesTable();
    const result = await runRawSql(`SELECT id, token, slug, title, niche, client_name, client_phone, status, visits, published_at, updated_at, created_at FROM web_pages ORDER BY updated_at DESC LIMIT 100`);
    if (!result.ok) return NextResponse.json({ ok: false, error: 'No se pudieron cargar páginas', detail: result.data }, { status: 500 });
    return NextResponse.json({ ok: true, table_exists: true, pages: rows(result) });
  } catch (err) {
    return NextResponse.json({ ok: false, table_exists: false, pages: [], error: err instanceof Error ? err.message : 'Error desconocido' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureWebPagesTable();
    const body = await request.json();
    const title = String(body.title || 'Nueva página Fabrick').trim();
    const niche = String(body.niche || 'general');
    const clientName = String(body.client_name || '').trim();
    const clientPhone = String(body.client_phone || '').trim();
    const t = token();
    const slug = `${slugify(title)}-${t}`;
    const starter = createStarterTemplate(niche, title, clientName);
    const seo = { title, description: `Página comercial ${niche} creada con Fabrick Page Engine.` };
    const project = { pages: [{ component: starter.html, styles: starter.css }], assets: [] };
    const result = await runRawSql(`
      INSERT INTO web_pages (token, slug, title, niche, client_name, client_phone, status, project_json, html, css, js, seo_json)
      VALUES (${sqlText(t)}, ${sqlText(slug)}, ${sqlText(title)}, ${sqlText(niche)}, ${sqlText(clientName)}, ${sqlText(clientPhone)}, 'draft', ${sqlJson(project)}, ${sqlText(starter.html)}, ${sqlText(starter.css)}, ${sqlText(starter.js)}, ${sqlJson(seo)})
      RETURNING *
    `);
    if (!result.ok) return NextResponse.json({ ok: false, error: 'No se pudo crear la página', detail: result.data }, { status: 500 });
    const page = rows(result)[0];
    return NextResponse.json({ ok: true, page: { ...page, public_url: publicPageUrl(String(page.slug)) } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }, { status: 500 });
  }
}
