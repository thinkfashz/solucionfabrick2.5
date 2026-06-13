import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : typeof value === 'number' ? String(value) : fallback;
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function htmlHeaders(status = 200) {
  return {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
      'x-robots-tag': 'noindex, nofollow, noarchive',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    },
  };
}

function expiredHtml() {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Demo no disponible</title><meta name="robots" content="noindex,nofollow,noarchive"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#050505;color:#fff7e8;font-family:Inter,system-ui,sans-serif;padding:16px}.box{width:min(92vw,620px);padding:32px;border:1px solid rgba(255,190,56,.24);border-radius:32px;background:#111;box-shadow:0 24px 80px rgba(0,0,0,.45)}h1{font-size:clamp(40px,10vw,68px);line-height:.95;letter-spacing:-.07em}.tag{color:#fbbf24;text-transform:uppercase;font-size:12px;font-weight:900;letter-spacing:.22em}p{font-size:18px;line-height:1.5;color:#e8dcc9}</style></head><body><main class="box"><p class="tag">Demo privada</p><h1>Este link no está disponible</h1><p>La propuesta no existe, fue archivada o el token no es válido.</p></main></body></html>`;
}

function parseProjectJson(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'string') {
    try { return obj(JSON.parse(value)); } catch { return {}; }
  }
  return obj(value);
}

function normalizeExternalUrl(value: unknown) {
  const raw = text(value).trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(raw)) return `https://${raw}`;
  return raw;
}

function brandFallbackImage(brand: string) {
  const label = encodeURIComponent(brand || 'Demo');
  return `https://placehold.co/1200x630/080808/f6c945/png?text=${label}`;
}

function firstImage(project: Record<string, unknown>, html: string, brand: string) {
  const client = obj(project.client);
  const explicit = text(project.shareImage || project.ogImage || project.previewImage || project.logo || client.logo || client.avatar || client.image || client.profile_image || client.photo);
  if (/^https?:\/\//i.test(explicit)) return explicit;

  const images = Array.isArray(project.images) ? project.images : [];
  const first = images.find((image) => typeof image === 'string' && /^https?:\/\//i.test(image));
  if (first) return String(first);

  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
  if (match && /^https?:\/\//i.test(match)) return match;

  return brandFallbackImage(brand);
}

function metadataFor(row: Record<string, unknown>, request: NextRequest, token: string) {
  const html = String(row.html || '');
  const project = parseProjectJson(row.project_json);
  const client = obj(project.client);

  const brand = text(
    project.brand || project.business || project.company || client.brand || client.business || client.name || row.title,
    'Demo digital',
  );
  const account = text(client.account || client.instagram || project.account, '');
  const displayUrl = normalizeExternalUrl(project.shareDisplayUrl || project.displayUrl || project.website || client.website || client.url || client.instagram || client.facebook || account);
  const displayHost = displayUrl.replace(/^https?:\/\//i, '').replace(/\/+$/, '') || `${brand.toLowerCase().replace(/[^a-z0-9]+/gi, '') || 'demo'}.cl`;
  const title = text(project.shareTitle || project.title || row.title, `${brand} | Demo digital`);
  const description = text(
    project.shareDescription || project.description || client.description,
    `Vista previa privada de ${brand}. Diseño web, propuesta comercial y presentación digital lista para revisar.`,
  );
  const image = firstImage(project, html, brand);
  const url = `${request.nextUrl.origin}/w/${token}`;
  return { title, description, image, url, brand, displayHost };
}

function metaTags(meta: ReturnType<typeof metadataFor>) {
  return `
<title>${escapeHtml(meta.title)}</title>
<meta name="description" content="${escapeHtml(meta.description)}">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="application-name" content="${escapeHtml(meta.brand)}">
<meta name="apple-mobile-web-app-title" content="${escapeHtml(meta.brand)}">
<link rel="canonical" href="${escapeHtml(meta.url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${escapeHtml(meta.brand)}">
<meta property="og:title" content="${escapeHtml(meta.title)}">
<meta property="og:description" content="${escapeHtml(meta.description)}">
<meta property="og:image" content="${escapeHtml(meta.image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${escapeHtml(meta.url)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(meta.title)}">
<meta name="twitter:description" content="${escapeHtml(meta.description)}">
<meta name="twitter:image" content="${escapeHtml(meta.image)}">
<meta name="twitter:domain" content="${escapeHtml(meta.displayHost)}">
<meta name="preview-display-url" content="${escapeHtml(meta.displayHost)}">
<meta name="demo-brand" content="${escapeHtml(meta.brand)}">
`;
}

function injectMetadata(html: string, meta: ReturnType<typeof metadataFor>) {
  const tags = metaTags(meta);
  let document = html || expiredHtml();
  document = document.replace(/<title>[\s\S]*?<\/title>/i, '');
  document = document.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
  document = document.replace(/<meta\s+name=["']application-name["'][^>]*>/gi, '');
  document = document.replace(/<meta\s+name=["']apple-mobile-web-app-title["'][^>]*>/gi, '');
  document = document.replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '');
  document = document.replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, '');
  document = document.replace(/<meta\s+name=["']robots["'][^>]*>/gi, '');
  document = document.replace(/<meta\s+name=["']fabrick-security["'][^>]*>/gi, '');
  document = document.replace(/<meta\s+name=["']preview-display-url["'][^>]*>/gi, '');
  document = document.replace(/<meta\s+name=["']demo-brand["'][^>]*>/gi, '');
  document = document.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '');
  if (/<head[^>]*>/i.test(document)) return document.replace(/<head[^>]*>/i, (match) => `${match}${tags}`);
  if (/<html[^>]*>/i.test(document)) return document.replace(/<html[^>]*>/i, (match) => `${match}<head>${tags}</head>`);
  return `<!doctype html><html lang="es"><head>${tags}</head><body>${document}</body></html>`;
}

function expiredBanner(expiresAt: string) {
  return `<div style="position:sticky;top:0;z-index:999999;background:linear-gradient(135deg,#f59e0b,#fb923c);color:#120700;padding:12px 16px;font-family:Inter,system-ui,sans-serif;font-weight:900;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.18)">Versión vencida el ${escapeHtml(expiresAt)} · vista solo referencial. Solicita una nueva versión para precios actualizados.</div>`;
}

function injectExpiredBanner(html: string, expiresAt: string) {
  const banner = expiredBanner(expiresAt);
  if (/<body[^>]*>/i.test(html)) return html.replace(/<body[^>]*>/i, (match) => `${match}${banner}`);
  return `${banner}${html}`;
}

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(token || '')) {
    return new NextResponse(expiredHtml(), htmlHeaders(404));
  }

  const { data, error } = await insforgeAdmin.database
    .from('page_engine_documents')
    .select('html, title, status, expires_at, project_json')
    .eq('token', token)
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'No se pudo leer la página.', detail: error }, { status: 502 });
  const row = data as Record<string, unknown> | null;
  if (!row || row.status !== 'publicado') return new NextResponse(expiredHtml(), htmlHeaders(404));

  const project = parseProjectJson(row.project_json);
  const strictExpiry = project.strictExpiry === true;
  const expires = row.expires_at ? new Date(String(row.expires_at)).getTime() : Number.NaN;
  let html = String(row.html || expiredHtml());
  if (Number.isFinite(expires) && Date.now() > expires) {
    if (strictExpiry) return new NextResponse(expiredHtml(), htmlHeaders(410));
    html = injectExpiredBanner(html, String(row.expires_at));
  }

  const meta = metadataFor(row, request, token);
  return new NextResponse(injectMetadata(html, meta), htmlHeaders(200));
}
