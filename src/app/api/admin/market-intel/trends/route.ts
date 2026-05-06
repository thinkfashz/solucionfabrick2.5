import { NextResponse, type NextRequest } from 'next/server';
import { adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { getMercadoLibreTrends } from '@/lib/marketIntel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TREND_TTL_MS = 6 * 60 * 60 * 1000; // 6h

/**
 * GET /api/admin/market-intel/trends?site=MLC
 *
 * Devuelve el listado de tendencias de búsqueda de MercadoLibre para el
 * sitio indicado. Cachea en `market_intel_trends` durante 6h para no
 * golpear el endpoint público en cada render.
 */
export async function GET(request: NextRequest) {
	const session = await getAdminSession(request);
	if (!session) return adminUnauthorized();
	const site = request.nextUrl.searchParams.get('site') ?? 'MLC';
	if (!/^[A-Z]{3}$/.test(site)) {
		return NextResponse.json({ error: 'site inválido (esperado código de 3 letras, p.ej. MLC).' }, { status: 400 });
	}
	const force = request.nextUrl.searchParams.get('force') === '1';

	const client = getAdminInsforge();

	if (!force) {
		try {
			const { data } = await client.database
				.from('market_intel_trends')
				.select('payload, captured_at')
				.eq('site', site)
				.order('captured_at', { ascending: false })
				.limit(1)
				.maybeSingle();
			if (data) {
				const row = data as { payload?: unknown; captured_at?: string };
				const capturedAt = row.captured_at ? new Date(row.captured_at).getTime() : 0;
				if (Date.now() - capturedAt < TREND_TTL_MS && Array.isArray(row.payload)) {
					return NextResponse.json({ ok: true, site, trends: row.payload, cached: true, capturedAt: row.captured_at });
				}
			}
		} catch {
			/* ignore — caemos a recálculo */
		}
	}

	try {
		const trends = await getMercadoLibreTrends(site);
		try {
			await client.database.from('market_intel_trends').insert([{ site, payload: trends }]);
		} catch {
			/* persistencia best-effort */
		}
		return NextResponse.json({ ok: true, site, trends, cached: false });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error consultando tendencias ML.';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
