import { NextResponse, type NextRequest } from 'next/server';
import { adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import { getMercadoLibreBestSellers } from '@/lib/marketIntel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/market-intel/winners?q=…&limit=20&site=MLC
 *
 * Lista productos "ganadores" — más vendidos en MercadoLibre para una
 * keyword. Útil para detectar oportunidades y posicionamiento.
 */
export async function GET(request: NextRequest) {
	const session = await getAdminSession(request);
	if (!session) return adminUnauthorized();
	const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
	if (!q) return NextResponse.json({ error: 'Falta el parámetro "q".' }, { status: 400 });
	const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? '20') || 20, 1), 50);
	const site = request.nextUrl.searchParams.get('site') ?? 'MLC';
	if (!/^[A-Z]{3}$/.test(site)) {
		return NextResponse.json({ error: 'site inválido.' }, { status: 400 });
	}
	try {
		const winners = await getMercadoLibreBestSellers(q, { limit, site });
		return NextResponse.json({ ok: true, q, site, winners });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error consultando productos ganadores.';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
