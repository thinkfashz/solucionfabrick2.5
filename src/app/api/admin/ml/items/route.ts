import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { mlListMyItems, mlGetMe } from '@/lib/mlApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/ml/items?limit={n}&offset={n}
 * Returns listings owned by the Mercado Libre account configured for the
 * current tenant.
 */
export async function GET(request: NextRequest) {
	try {
		const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
		if (!auth.ok) return auth.response;

		const { searchParams } = request.nextUrl;
		const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 100);
		const offset = Math.max(Number(searchParams.get('offset') ?? '0'), 0);

		const me = await mlGetMe();
		const { items, total } = await mlListMyItems({ userId: me.id, limit, offset });

		return NextResponse.json({
			ok: true,
			results: items,
			paging: { total, limit, offset },
			seller: { id: me.id, nickname: me.nickname },
			tenantId: auth.ctx.tenantId,
		});
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error al obtener publicaciones ML.';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
