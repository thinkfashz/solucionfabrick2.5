import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { requireAdminPermission } from '@/lib/adminPermissions';
import type { ProductShippingMode } from '@/lib/shipping';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MODES = new Set<ProductShippingMode>(['inherit', 'test', 'production', 'fixed', 'free']);

function money(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'update' });
  if (!auth.ok) return auth.response;

  const id = new URL(request.url).searchParams.get('id')?.trim();
  if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });

  const mode = String(body.shipping_mode || 'inherit') as ProductShippingMode;
  if (!MODES.has(mode)) return NextResponse.json({ error: 'Modo de envío inválido.' }, { status: 422 });

  const patch = {
    shipping_mode: mode,
    shipping_fee: money(body.shipping_fee),
    shipping_weight_kg: body.shipping_weight_kg === '' || body.shipping_weight_kg == null ? null : Number(body.shipping_weight_kg),
    shipping_dimensions: body.shipping_dimensions ? String(body.shipping_dimensions).trim() : null,
    shipping_region_overrides: body.shipping_region_overrides && typeof body.shipping_region_overrides === 'object' ? body.shipping_region_overrides : {},
  };

  const { error } = await insforgeAdmin.database.from('products').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message || 'No se pudo actualizar envío del producto.' }, { status: 500 });
  return NextResponse.json({ ok: true, patch });
}
