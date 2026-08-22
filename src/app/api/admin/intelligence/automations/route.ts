import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { DEFAULT_TENANT_ID } from '@/lib/tenant';
import { insforgeAdmin } from '@/lib/insforge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

type EventRow = { event?: string | null; meta?: Record<string, unknown> | null; created_at?: string | null };
type WatchRow = { id?: string; enabled?: boolean | null; last_checked_at?: string | null; last_status?: string | null; last_error?: string | null };

async function getSession(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return cookie ? decodeSession(cookie).catch(() => null) : null;
}

function eventBelongsToTenant(row: EventRow, tenantId: string) {
  const metaTenant = String(row.meta?.tenantId || row.meta?.tenant_id || '');
  if (metaTenant) return metaTenant === tenantId;
  return tenantId === DEFAULT_TENANT_ID;
}

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: NO_STORE });
  const tenantId = session.tenant_id || DEFAULT_TENANT_ID;

  try {
    const [briefResult, watchResult] = await Promise.all([
      insforgeAdmin.database.from('pwa_events').select('event,meta,created_at').eq('event', 'intelligence_daily_brief').order('created_at', { ascending: false }).limit(100),
      insforgeAdmin.database.from('supplier_watch_targets').select('id,enabled,last_checked_at,last_status,last_error').eq('tenant_id', tenantId).limit(5000),
    ]);

    if (briefResult.error) throw new Error(`pwa_events: ${briefResult.error.message}`);
    if (watchResult.error) throw new Error(`supplier_watch_targets: ${watchResult.error.message}`);

    const briefEvents = ((briefResult.data || []) as EventRow[]).filter((row) => eventBelongsToTenant(row, tenantId));
    const watches = (watchResult.data || []) as WatchRow[];
    const enabledWatches = watches.filter((row) => row.enabled !== false);
    const failedWatches = enabledWatches.filter((row) => row.last_status && !/ok|success|ready/i.test(String(row.last_status)));
    const latestWatch = enabledWatches
      .filter((row) => row.last_checked_at)
      .sort((a, b) => String(b.last_checked_at).localeCompare(String(a.last_checked_at)))[0];

    const automations = [
      {
        id: 'daily-brief',
        name: 'Daily Operating Brief',
        description: 'Genera el Health Score y las prioridades de mayor impacto para el negocio.',
        schedule: 'Diario · 12:30 UTC',
        status: 'active',
        lastRunAt: briefEvents[0]?.created_at || null,
        lastResult: briefEvents[0] ? 'success' : 'pending',
        href: '/admin/intelligence/today',
      },
      {
        id: 'price-watch',
        name: 'Supplier Price Watch',
        description: 'Revisa proveedores configurados y genera propuestas si cambia el costo o cae el margen.',
        schedule: 'Cada 6 horas · targets respetan su intervalo propio',
        status: enabledWatches.length > 0 ? (failedWatches.length > 0 ? 'warning' : 'active') : 'idle',
        lastRunAt: latestWatch?.last_checked_at || null,
        lastResult: failedWatches.length > 0 ? 'warning' : latestWatch ? 'success' : 'pending',
        detail: `${enabledWatches.length} monitores activos${failedWatches.length ? ` · ${failedWatches.length} con advertencia` : ''}`,
        href: '/admin/intelligence/operations',
      },
      {
        id: 'schema-health',
        name: 'Schema & Duplicate Health',
        description: 'Valida el esquema V2 y registra duplicados potenciales sin borrar datos automáticamente.',
        schedule: 'Después de build/deploy',
        status: 'active',
        lastRunAt: null,
        lastResult: 'managed-by-deploy',
        href: '/api/admin/intelligence/schema-health',
      },
    ];

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      tenantId,
      summary: {
        total: automations.length,
        active: automations.filter((item) => item.status === 'active').length,
        warning: automations.filter((item) => item.status === 'warning').length,
        monitoredProducts: enabledWatches.length,
      },
      automations,
    }, { headers: NO_STORE });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar el centro de automatizaciones.' }, { status: 503, headers: NO_STORE });
  }
}
