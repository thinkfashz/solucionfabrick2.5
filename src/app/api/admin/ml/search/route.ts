import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { mlSearch } from '@/lib/mlApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
	try {
		const auth = await requireTenantAdmin(request, { resource: 'products', action: 'read' });
		if (!auth.ok) return auth.response;

		const { searchParams } = request.nextUrl;
		const q = searchParams.get('q')?.trim() ?? '';
		if (!q) {
			return NextResponse.json({ error: 'Falta el parámetro "q".' }, { status: 400 });
		}
		const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50);
		const offset = Math.max(Number(searchParams.get('offset') ?? '0'), 0);

		const results = await mlSearch(q, { limit, offset });
		return NextResponse.json({ ok: true, ...results, tenantId: auth.ctx.tenantId });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error al buscar en ML.';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
