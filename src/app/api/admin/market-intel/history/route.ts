import { NextResponse, type NextRequest } from 'next/server';
import { adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { normalizeQuery } from '@/lib/marketIntel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/market-intel/history?q=…&limit=20
 *
 * Devuelve los últimos N snapshots persistidos para una query (normalizada),
 * para alimentar la línea de tiempo de subidas/bajadas en el dashboard.
 */
export async function GET(request: NextRequest) {
	const session = await getAdminSession(request);
	if (!session) return adminUnauthorized();
	const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
	if (!q) return NextResponse.json({ error: 'Falta el parámetro "q".' }, { status: 400 });
	const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? '20') || 20, 1), 60);
	try {
		const client = getAdminInsforge();
		const { data, error } = await client.database
			.from('market_intel_snapshots')
			.select('id, query, stats, refs_count, created_at')
			.eq('normalized_query', normalizeQuery(q))
			.order('created_at', { ascending: false })
			.limit(limit);
		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}
		const rows = Array.isArray(data) ? data : [];
		return NextResponse.json({ ok: true, snapshots: rows.reverse() });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error consultando el histórico.';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
