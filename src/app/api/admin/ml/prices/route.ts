import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminInsforge } from '@/lib/adminApi';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { mlGetCompetitors, mlGetItem } from '@/lib/mlApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
	try {
		const auth = await requireTenantAdmin(request, { resource: 'products', action: 'read' });
		if (!auth.ok) return auth.response;

		const { searchParams } = request.nextUrl;
		const itemId = searchParams.get('item_id')?.trim() ?? '';
		if (!itemId) {
			return NextResponse.json({ error: 'Falta item_id.' }, { status: 400 });
		}
		const limit = Math.min(Number(searchParams.get('limit') ?? '10'), 20);

		const { item, competitors } = await mlGetCompetitors(itemId, { limit });
		const minCompetitorPrice = competitors.length > 0
			? Math.min(...competitors.map((c) => c.price))
			: null;

		return NextResponse.json({ ok: true, item, competitors, minCompetitorPrice, tenantId: auth.ctx.tenantId });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error al obtener precios ML.';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	try {
		const auth = await requireTenantAdmin(request, { resource: 'products', action: 'update' });
		if (!auth.ok) return auth.response;

		const body = (await request.json().catch(() => ({}))) as {
			item_id?: unknown;
			target_price?: unknown;
		};
		const itemId = typeof body.item_id === 'string' ? body.item_id.trim() : '';
		if (!itemId) {
			return NextResponse.json({ error: 'Falta item_id.' }, { status: 400 });
		}

		const item = await mlGetItem(itemId);
		const targetPrice = typeof body.target_price === 'number' && body.target_price > 0
			? body.target_price
			: null;

		const client = getAdminInsforge();
		const payload = {
			tenant_id: auth.ctx.tenantId,
			item_id: itemId,
			item_title: item.title,
			my_price: item.price,
			target_price: targetPrice,
			last_checked_price: item.price,
			last_checked_at: new Date().toISOString(),
			alert_active: true,
		};

		const existing = await client.database
			.from('ml_price_alerts')
			.select('id')
			.eq('tenant_id', auth.ctx.tenantId)
			.eq('item_id', itemId)
			.limit(1);

		let data;
		let error;
		if (Array.isArray(existing.data) && existing.data[0]?.id) {
			const result = await client.database
				.from('ml_price_alerts')
				.update(payload)
				.eq('tenant_id', auth.ctx.tenantId)
				.eq('id', existing.data[0].id)
				.select()
				.single();
			data = result.data;
			error = result.error;
		} else {
			const result = await client.database
				.from('ml_price_alerts')
				.insert([payload])
				.select()
				.single();
			data = result.data;
			error = result.error;
		}

		if (error) throw new Error(error.message);
		return NextResponse.json({ ok: true, alert: data, tenantId: auth.ctx.tenantId });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error al agregar alerta de precio ML.';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const auth = await requireTenantAdmin(request, { resource: 'products', action: 'update' });
		if (!auth.ok) return auth.response;

		const itemId = request.nextUrl.searchParams.get('item_id')?.trim() ?? '';
		if (!itemId) {
			return NextResponse.json({ error: 'Falta item_id.' }, { status: 400 });
		}

		const client = getAdminInsforge();
		const { error } = await client.database
			.from('ml_price_alerts')
			.delete()
			.eq('tenant_id', auth.ctx.tenantId)
			.eq('item_id', itemId);
		if (error) throw new Error(error.message);

		return NextResponse.json({ ok: true, tenantId: auth.ctx.tenantId });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error al eliminar alerta de precio ML.';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
