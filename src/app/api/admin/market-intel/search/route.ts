import { NextResponse, type NextRequest } from 'next/server';
import { getAdminTenantId } from '@/lib/adminApi';
import { requireAdminPermission } from '@/lib/adminPermissions';
import {
	aggregateProductRefs,
	type MarketSource,
} from '@/lib/marketIntel';
import {
	compareMarketSnapshotForTenant,
	persistMarketSnapshotForTenant,
} from '@/lib/marketIntelTenantStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_SOURCES = new Set<MarketSource>(['mercadolibre', 'serper', 'serpapi']);

interface Body {
	q?: unknown;
	sources?: unknown;
	site?: unknown;
	persist?: unknown;
	useCache?: unknown;
	limitPerSource?: unknown;
}

/**
 * POST /api/admin/market-intel/search
 *
 * Ejecuta una búsqueda agregada multi-fuente. El mercado consultado es público,
 * pero los snapshots, referencias y comparativas históricas quedan aislados por
 * tenant. Requiere permiso de lectura de Productos.
 */
export async function POST(request: NextRequest) {
	const auth = await requireAdminPermission(request, { resource: 'products', action: 'read' });
	if (!auth.ok) return auth.response;
	const tenantId = await getAdminTenantId(request);
	let body: Body;
	try {
		body = (await request.json()) as Body;
	} catch {
		return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
	}
	const q = typeof body.q === 'string' ? body.q.trim() : '';
	if (!q) return NextResponse.json({ error: 'Falta el parámetro "q".' }, { status: 400 });
	if (q.length > 200) return NextResponse.json({ error: 'La consulta es demasiado larga.' }, { status: 400 });
	const requestedSources = Array.isArray(body.sources)
		? (body.sources.filter((s): s is MarketSource => typeof s === 'string' && VALID_SOURCES.has(s as MarketSource)))
		: undefined;
	const site = typeof body.site === 'string' && /^[A-Z]{3}$/.test(body.site) ? body.site : 'MLC';
	const useCache = body.useCache !== false;
	const persist = body.persist === true;
	const limitPerSource = Math.min(Math.max(Number(body.limitPerSource ?? 20) || 20, 5), 30);

	try {
		const snapshot = await aggregateProductRefs(q, {
			sources: requestedSources,
			site,
			useCache,
			limitPerSource,
		});
		const delta = await compareMarketSnapshotForTenant(tenantId, snapshot.normalizedQuery, snapshot.stats.avg);
		let snapshotId: string | null = null;
		if (persist) snapshotId = await persistMarketSnapshotForTenant(tenantId, snapshot);
		return NextResponse.json({ ok: true, snapshot, delta, snapshotId });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error en la búsqueda agregada.';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
