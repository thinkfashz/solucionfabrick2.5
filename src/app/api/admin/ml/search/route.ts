import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import { mlSearch } from '@/lib/mlApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/ml/search?q={query}&limit={n}&offset={n}
 *
 * Searches the MercadoLibre catalog (buyer-side search, site MLC).
 * Returns the standard MLSearchResult shape.
 */
export async function GET(request: NextRequest) {
	try {
		const session = await getAdminSession(request);
		if (!session) return adminUnauthorized();

		const { searchParams } = request.nextUrl;
		const q = searchParams.get('q')?.trim() ?? '';
		if (!q) {
			return NextResponse.json({ error: 'Falta el parámetro "q".' }, { status: 400 });
		}
		const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50);
		const offset = Math.max(Number(searchParams.get('offset') ?? '0'), 0);

		const results = await mlSearch(q, { limit, offset });
		return NextResponse.json({ ok: true, ...results });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error al buscar en ML.';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
