import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import { mlListMyItems, mlGetMe } from '@/lib/mlApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/ml/items?limit={n}&offset={n}
 *
 * Returns all listings owned by the authenticated ML seller account.
 */
export async function GET(request: NextRequest) {
	try {
		const session = await getAdminSession(request);
		if (!session) return adminUnauthorized();

		const { searchParams } = request.nextUrl;
		const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 100);
		const offset = Math.max(Number(searchParams.get('offset') ?? '0'), 0);

		// Resolve seller id once and pass it through to avoid duplicate /users/me calls.
		const me = await mlGetMe();
		const { items, total } = await mlListMyItems({ userId: me.id, limit, offset });

		return NextResponse.json({
			ok: true,
			results: items,
			paging: { total, limit, offset },
			seller: { id: me.id, nickname: me.nickname },
		});
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error al obtener publicaciones ML.';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
