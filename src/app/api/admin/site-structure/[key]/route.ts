import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import { getSiteSectionFresh, setSiteSection } from '@/lib/siteStructure';
import { isSectionKey, mergeWithDefault } from '@/lib/siteStructureTypes';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, max-age=0' };

/**
 * Admin write (and authoritative read) for a CMS section.
 *
 *   GET  → always reads the database without the public site cache.
 *   POST → persists `body.content`, verifies it with an uncached read-back,
 *          and emits the existing CMS event for connected clients.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ key: string }> },
) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const { key } = await context.params;
    if (!isSectionKey(key)) {
      return NextResponse.json({ error: 'Invalid section key' }, { status: 404, headers: NO_STORE_HEADERS });
    }
    const content = await getSiteSectionFresh(key);
    return NextResponse.json({ section_key: key, content }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return adminError(err, 'SITE_STRUCTURE_GET_ERROR', 500, request);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ key: string }> },
) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const { key } = await context.params;
    if (!isSectionKey(key)) {
      return NextResponse.json({ error: 'Invalid section key' }, { status: 404, headers: NO_STORE_HEADERS });
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400, headers: NO_STORE_HEADERS });
    }
    const rawContent = (body as { content?: unknown } | null)?.content;
    if (rawContent === undefined) {
      return NextResponse.json({ error: 'Falta `content`' }, { status: 400, headers: NO_STORE_HEADERS });
    }
    const merged = mergeWithDefault(key, rawContent);
    const saved = await setSiteSection(key, merged, session.email);
    return NextResponse.json({ section_key: key, content: saved, verified: true }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return adminError(err, 'SITE_STRUCTURE_SAVE_ERROR', 500, request);
  }
}
