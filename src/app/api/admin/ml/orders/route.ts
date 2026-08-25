import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminInsforge } from '@/lib/adminApi';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { mlGetOrders } from '@/lib/mlApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/ml/orders?status={}&limit={}&offset={}&sync={true|false}
 * Fetches orders from the ML seller account configured for the current tenant.
 * Optional local sync is also tagged with the same tenant_id.
 */
export async function GET(request: NextRequest) {
	try {
		const doSync = request.nextUrl.searchParams.get('sync') === 'true';
		const auth = await requireTenantAdmin(request, {
			resource: 'orders',
			action: doSync ? 'update' : 'read',
		});
		if (!auth.ok) return auth.response;

		const { searchParams } = request.nextUrl;
		const status = searchParams.get('status') ?? undefined;
		const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 100);
		const offset = Math.max(Number(searchParams.get('offset') ?? '0'), 0);

		const { results, paging } = await mlGetOrders({ status, limit, offset });

		if (doSync && results.length) {
			const client = getAdminInsforge();
			const rows = results.map((o) => ({
				id: o.id,
				tenant_id: auth.ctx.tenantId,
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
			try {
				await client.database.from('ml_orders').upsert(rows, { onConflict: 'id' });
			} catch {
				// The external result remains usable even if the optional cache fails.
			}
		}

		return NextResponse.json({
			ok: true,
			results,
			paging: { total: paging.total, limit, offset },
			tenantId: auth.ctx.tenantId,
		});
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error al obtener pedidos ML.';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
