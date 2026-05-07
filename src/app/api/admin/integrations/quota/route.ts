import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { insforgeAdmin } from '@/lib/insforge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/integrations/quota
 *
 * Returns the latest `integration_quota_snapshots` row per provider so the
 * `<QuotaBar />` component in /admin/integraciones can render a tiny
 * usage bar at the top of each card without firing a "Probar ahora" call.
 *
 * Snapshots are written by the daily health-check cron
 * (`/api/cron/integrations-healthcheck`). Providers without a quota
 * endpoint (Meta, Google, etc.) are simply absent from the response.
 */

export interface QuotaSnapshot {
	provider: string;
	used: number | null;
	limit: number | null;
	captured_at: string;
	raw?: Record<string, unknown> | null;
}

async function requireAdmin(request: NextRequest) {
	const cookie = request.cookies.get(ADMIN_COOKIE_NAME);
	if (!cookie?.value) return null;
	return decodeSession(cookie.value);
}

export async function GET(request: NextRequest) {
	const session = await requireAdmin(request);
	if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

	try {
		// We over-fetch and dedupe in memory so the endpoint works even on
		// older PostgREST flavours that don't expose `DISTINCT ON`.
		const { data, error } = await insforgeAdmin.database
			.from('integration_quota_snapshots')
			.select('provider, used, quota_limit, captured_at, raw')
			.order('captured_at', { ascending: false })
			.limit(80);
		if (error) {
			// Table missing → treat as "no data yet" so the UI degrades to a
			// silent no-op rather than throwing 500 at the merchant.
			return NextResponse.json({ snapshots: [], hint: error.message });
		}
		const seen = new Set<string>();
		const out: QuotaSnapshot[] = [];
		for (const row of (data ?? []) as Array<{
			provider: string;
			used: number | null;
			quota_limit: number | null;
			captured_at: string;
			raw: Record<string, unknown> | null;
		}>) {
			if (seen.has(row.provider)) continue;
			seen.add(row.provider);
			out.push({
				provider: row.provider,
				used: row.used,
				limit: row.quota_limit,
				captured_at: row.captured_at,
				raw: row.raw,
			});
		}
		return NextResponse.json({ snapshots: out });
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : 'Error inesperado.', snapshots: [] },
			{ status: 500 },
		);
	}
}
