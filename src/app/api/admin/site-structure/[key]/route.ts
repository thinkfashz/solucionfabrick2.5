import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import { getSiteSection, setSiteSection } from '@/lib/siteStructure';
import { isSectionKey, mergeWithDefault } from '@/lib/siteStructureTypes';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Admin write (and authoritative read) for a CMS section.
 *
 *   GET  → returns the merged-with-defaults content for editing.
 *   POST → persists `body.content` (merged with defaults) and emits a
 *          CMS event so connected public clients refresh.
 *
 * Auth is gated by the same `admin_session` cookie used elsewhere in
 * `/api/admin/*`. Anonymous users can still read the public mirror via
 * `/api/site-structure/[key]`.
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
      return NextResponse.json({ error: 'Invalid section key' }, { status: 404 });
    }
    const content = await getSiteSection(key);
    return NextResponse.json({ section_key: key, content });
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
      return NextResponse.json({ error: 'Invalid section key' }, { status: 404 });
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }
    const rawContent = (body as { content?: unknown } | null)?.content;
    if (rawContent === undefined) {
      return NextResponse.json({ error: 'Falta `content`' }, { status: 400 });
    }
    const merged = mergeWithDefault(key, rawContent);
    const saved = await setSiteSection(key, merged, session.email);
    return NextResponse.json({ section_key: key, content: saved });
  } catch (err) {
    return adminError(err, 'SITE_STRUCTURE_SAVE_ERROR', 500, request);
  }
}
