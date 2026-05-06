import { NextResponse, type NextRequest } from 'next/server';
import { adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import {
	aggregateProductRefs,
	compareWithPrevious,
	persistSnapshot,
	type MarketSource,
} from '@/lib/marketIntel';

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
 * Ejecuta una búsqueda agregada multi-fuente y, si `persist` es true, guarda
 * un snapshot en `market_intel_snapshots` + filas en `market_intel_refs`.
 * Devuelve también la comparativa contra el snapshot anterior (si existe).
 */
export async function POST(request: NextRequest) {
	const session = await getAdminSession(request);
	if (!session) return adminUnauthorized();
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
		const delta = await compareWithPrevious(snapshot.normalizedQuery, snapshot.stats.avg);
		let snapshotId: string | null = null;
		if (persist) snapshotId = await persistSnapshot(snapshot);
		return NextResponse.json({ ok: true, snapshot, delta, snapshotId });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error en la búsqueda agregada.';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
