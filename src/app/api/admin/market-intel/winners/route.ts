import { NextResponse, type NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { getMercadoLibreBestSellers } from '@/lib/marketIntel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/market-intel/winners?q=…&limit=20&site=MLC
 *
 * Lista referencias más vendidas de la fuente pública de Mercado Libre. El
 * dato es público, pero el acceso al módulo exige products:read.
 */
export async function GET(request: NextRequest) {
	const auth = await requireAdminPermission(request, { resource: 'products', action: 'read' });
	if (!auth.ok) return auth.response;
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
