import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSiteSection } from '@/lib/siteStructure';
import { isSectionKey } from '@/lib/siteStructureTypes';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Public read-only access to a CMS section. Browsers (the `useSiteContent`
 * hook) call this to lazy-fetch sections that weren't part of the SSR
 * initial bundle. Always returns a 200 with safe defaults — the content
 * pipeline must never block a page render.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params;
  if (!isSectionKey(key)) {
    return NextResponse.json({ error: 'Invalid section key' }, { status: 404 });
  }
  const content = await getSiteSection(key);
  return NextResponse.json(
    { section_key: key, content },
    {
      headers: {
        // Short max-age so admin saves propagate quickly, but
        // stale-while-revalidate keeps it instant for warm visitors.
        'Cache-Control': 'public, max-age=15, stale-while-revalidate=300',
      },
    },
  );
}
