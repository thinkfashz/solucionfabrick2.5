import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { mlGetCompetitors, mlGetItem } from '@/lib/mlApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/ml/prices?item_id={}&limit={}
 * Returns competitor prices for a given ML item.
 */
export async function GET(request: NextRequest) {
	try {
		const session = await getAdminSession(request);
		if (!session) return adminUnauthorized();

		const { searchParams } = request.nextUrl;
		const itemId = searchParams.get('item_id')?.trim() ?? '';
		if (!itemId) {
			return NextResponse.json({ error: 'Falta item_id.' }, { status: 400 });
		}
		const limit = Math.min(Number(searchParams.get('limit') ?? '10'), 20);

		const { item, competitors } = await mlGetCompetitors(itemId, { limit });
		const minCompetitorPrice =
			competitors.length > 0
				? Math.min(...competitors.map((c) => c.price))
				: null;

		return NextResponse.json({ ok: true, item, competitors, minCompetitorPrice });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error al obtener precios ML.';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}

/**
 * POST /api/admin/ml/prices
 * Body: { item_id, target_price? }
 * Adds an item to the price watch list (ml_price_alerts table).
 */
export async function POST(request: NextRequest) {
	try {
		const session = await getAdminSession(request);
		if (!session) return adminUnauthorized();

		const body = (await request.json().catch(() => ({}))) as {
			item_id?: unknown;
			target_price?: unknown;
		};
		const itemId = typeof body.item_id === 'string' ? body.item_id.trim() : '';
		if (!itemId) {
			return NextResponse.json({ error: 'Falta item_id.' }, { status: 400 });
		}

		const item = await mlGetItem(itemId);
		const targetPrice =
			typeof body.target_price === 'number' && body.target_price > 0
				? body.target_price
				: null;

		const client = getAdminInsforge();
		const { data, error } = await client.database
			.from('ml_price_alerts')
			.upsert(
				[{
					item_id: itemId,
					item_title: item.title,
					my_price: item.price,
					target_price: targetPrice,
					last_checked_price: item.price,
					last_checked_at: new Date().toISOString(),
					alert_active: true,
				}],
				{ onConflict: 'item_id' },
			)
			.select()
			.single();

		if (error) throw new Error(error.message);
		return NextResponse.json({ ok: true, alert: data });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error al agregar alerta de precio ML.';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}

/**
 * DELETE /api/admin/ml/prices?item_id={}
 * Removes an item from the watch list.
 */
export async function DELETE(request: NextRequest) {
	try {
		const session = await getAdminSession(request);
		if (!session) return adminUnauthorized();

		const itemId = request.nextUrl.searchParams.get('item_id')?.trim() ?? '';
		if (!itemId) {
			return NextResponse.json({ error: 'Falta item_id.' }, { status: 400 });
		}

		const client = getAdminInsforge();
		await client.database
			.from('ml_price_alerts')
			.delete()
			.eq('item_id', itemId);

		return NextResponse.json({ ok: true });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error al eliminar alerta de precio ML.';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
