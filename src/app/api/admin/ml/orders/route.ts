import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { mlGetOrders } from '@/lib/mlApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/ml/orders?status={}&limit={}&offset={}&sync={true|false}
 *
 * Fetches ML orders. When `sync=true`, also upserts them into the
 * `ml_orders` InsForge table for local persistence.
 */
export async function GET(request: NextRequest) {
	try {
		const session = await getAdminSession(request);
		if (!session) return adminUnauthorized();

		const { searchParams } = request.nextUrl;
		const status = searchParams.get('status') ?? undefined;
		const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 100);
		const offset = Math.max(Number(searchParams.get('offset') ?? '0'), 0);
		const doSync = searchParams.get('sync') === 'true';

		const { results, paging } = await mlGetOrders({ status, limit, offset });

		if (doSync && results.length) {
			const client = getAdminInsforge();
			const rows = results.map((o) => ({
				id: o.id,
				status: o.status,
				status_detail: o.status_detail ?? null,
				buyer_id: o.buyer?.id ?? null,
				buyer_nickname: o.buyer?.nickname ?? null,
				buyer_email: o.buyer?.email ?? null,
				total_amount: o.total_amount,
				currency_id: o.currency_id,
				items: o.order_items,
				shipping_id: o.shipping?.id ?? null,
				shipping_status: o.shipping?.status ?? null,
				shipping_address: o.shipping?.receiver_address?.full ?? null,
				payments: o.payments,
				date_created: o.date_created,
				date_closed: o.date_closed,
				last_updated: o.last_updated,
				synced_at: new Date().toISOString(),
			}));
			// Best-effort upsert — ignore failures so the API still returns data.
			try {
				await client.database
					.from('ml_orders')
					.upsert(rows, { onConflict: 'id' });
			} catch {
				// Table may not exist yet; proceed.
			}
		}

		return NextResponse.json({
			ok: true,
			results,
			paging: { total: paging.total, limit, offset },
		});
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error al obtener pedidos ML.';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
