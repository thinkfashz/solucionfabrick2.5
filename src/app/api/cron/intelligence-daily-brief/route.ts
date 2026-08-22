import { NextResponse, type NextRequest } from 'next/server';
import { buildFabrickDailyBrief, listKnownTenantIds, persistDailyBrief } from '@/lib/fabrickDailyBrief';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });

  try {
    const tenantIds = await listKnownTenantIds();
    const results: Array<{ tenantId: string; ok: boolean; healthScore?: number; actions?: number; error?: string }> = [];

    for (const tenantId of tenantIds.slice(0, 50)) {
      try {
        const brief = await buildFabrickDailyBrief(tenantId, 7);
        await persistDailyBrief(brief);
        results.push({ tenantId, ok: true, healthScore: brief.healthScore, actions: brief.actions.length });
      } catch (error) {
        results.push({ tenantId, ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return NextResponse.json({
      ok: results.every((item) => item.ok),
      processed: results.length,
      succeeded: results.filter((item) => item.ok).length,
      failed: results.filter((item) => !item.ok).length,
      results,
      runAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Error generando Daily Brief.' }, { status: 503 });
  }
}
