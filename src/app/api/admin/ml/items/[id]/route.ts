import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { mlGetItem, mlUpdateItem, mlPauseItem, mlActivateItem } from '@/lib/mlApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface Ctx {
	params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, ctx: Ctx) {
	try {
		const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
		if (!auth.ok) return auth.response;
		const { id } = await ctx.params;
		const item = await mlGetItem(id);
		return NextResponse.json({ ok: true, item, tenantId: auth.ctx.tenantId });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error al obtener publicación ML.';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
	try {
		const auth = await requireTenantAdmin(request, { resource: 'products', action: 'update' });
		if (!auth.ok) return auth.response;

		const { id } = await ctx.params;
		const body = (await request.json().catch(() => ({}))) as {
			price?: number;
			available_quantity?: number;
			status?: string;
		};

		let updated;
		if (body.status === 'paused') {
			updated = await mlPauseItem(id);
		} else if (body.status === 'active') {
			updated = await mlActivateItem(id);
		} else {
			const patch: Parameters<typeof mlUpdateItem>[1] = {};
			if (typeof body.price === 'number' && body.price > 0) patch.price = body.price;
			if (typeof body.available_quantity === 'number' && body.available_quantity >= 0) {
				patch.available_quantity = body.available_quantity;
			}
			if (!Object.keys(patch).length) {
				return NextResponse.json({ error: 'Nada que actualizar.' }, { status: 400 });
			}
			updated = await mlUpdateItem(id, patch);
		}

		return NextResponse.json({ ok: true, item: updated, tenantId: auth.ctx.tenantId });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error al actualizar publicación ML.';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
