import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { DEFAULT_TENANT_ID } from '@/lib/tenant';
import { buildFabrickDailyBrief, persistDailyBrief } from '@/lib/fabrickDailyBrief';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

async function getSession(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return cookie ? decodeSession(cookie).catch(() => null) : null;
}

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: NO_STORE });
  const tenantId = session.tenant_id || DEFAULT_TENANT_ID;

  try {
    const brief = await buildFabrickDailyBrief(tenantId, 7);
    return NextResponse.json({ ok: true, brief }, { headers: NO_STORE });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo generar el brief.' }, { status: 503, headers: NO_STORE });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: NO_STORE });
  if (!['admin', 'superadmin'].includes(session.rol || 'viewer')) return NextResponse.json({ error: 'Sin permiso para regenerar el brief.' }, { status: 403, headers: NO_STORE });
  const tenantId = session.tenant_id || DEFAULT_TENANT_ID;

  try {
    const brief = await buildFabrickDailyBrief(tenantId, 7);
    await persistDailyBrief(brief);
    return NextResponse.json({ ok: true, brief, persisted: true }, { headers: NO_STORE });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo regenerar el brief.' }, { status: 503, headers: NO_STORE });
  }
}
