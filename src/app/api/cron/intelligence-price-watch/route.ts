import { NextResponse, type NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/adminApi';
import { runSupplierPriceWatch } from '@/lib/fabrickPriceWatch';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function cronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) {
    const session = await getAdminSession(request);
    if (!session || !['admin', 'superadmin'].includes(session.rol || 'viewer')) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }
  }

  try {
    const report = await runSupplierPriceWatch();
    return NextResponse.json({ ok: true, ...report }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Price Watch no pudo ejecutarse.',
      runAt: new Date().toISOString(),
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
