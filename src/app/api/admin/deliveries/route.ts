import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { requireAdminPermission } from '@/lib/adminPermissions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

type DeliveryRow = Record<string, unknown>;

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

async function tenantOrderIds(tenantId: string) {
  const { data, error } = await insforgeAdmin.database
    .from('orders')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1000);

  if (error) throw new Error(error.message || 'No se pudieron resolver los pedidos del tenant.');
  return (Array.isArray(data) ? data : [])
    .map((row) => cleanText((row as Record<string, unknown>).id))
    .filter(Boolean);
}

async function loadOwnedDelivery(id: string, tenantId: string) {
  const { data, error } = await insforgeAdmin.database
    .from('deliveries')
    .select('*')
    .eq('id', id)
    .limit(1);

  if (error) throw new Error(error.message || 'No se pudo cargar la entrega.');
  const delivery = Array.isArray(data) ? data[0] as DeliveryRow | undefined : undefined;
  if (!delivery) return null;

  const orderId = cleanText(delivery.order_id);
  if (!orderId) return null;

  const ownership = await insforgeAdmin.database
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .limit(1);

  if (ownership.error) throw new Error(ownership.error.message || 'No se pudo validar la entrega.');
  if (!Array.isArray(ownership.data) || !ownership.data[0]) return null;
  return delivery;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'orders', action: 'read' });
  if (!auth.ok) return auth.response;
  const tenantId = auth.session.tenant_id ?? DEFAULT_TENANT_ID;

  try {
    const orderIds = await tenantOrderIds(tenantId);
    if (!orderIds.length) {
      return NextResponse.json({ ok: true, deliveries: [], total: 0 }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
    }

    const { data, error } = await insforgeAdmin.database
      .from('deliveries')
      .select('*')
      .in('order_id', orderIds)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const deliveries = Array.isArray(data) ? data : [];
    return NextResponse.json(
      { ok: true, deliveries, total: deliveries.length },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : 'No se pudieron cargar las entregas.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'orders', action: 'update' });
  if (!auth.ok) return auth.response;
  const tenantId = auth.session.tenant_id ?? DEFAULT_TENANT_ID;

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const id = cleanText(body.id);
  if (!id) return NextResponse.json({ error: 'El campo id es requerido.' }, { status: 400 });

  try {
    const delivery = await loadOwnedDelivery(id, tenantId);
    if (!delivery) return NextResponse.json({ error: 'Entrega no encontrada.' }, { status: 404 });

    const payload: Record<string, unknown> = {};
    if (body.responsible !== undefined) payload.responsible = cleanText(body.responsible) || null;
    if (body.estimated_date !== undefined) payload.estimated_date = cleanText(body.estimated_date) || null;

    const requestedStatus = cleanText(body.status);
    if (requestedStatus) {
      if (!['pendiente', 'en_camino', 'entregado', 'fallido'].includes(requestedStatus)) {
        return NextResponse.json({ error: 'Estado de entrega inválido.' }, { status: 422 });
      }
      payload.status = requestedStatus;
    }

    if (!Object.keys(payload).length) {
      return NextResponse.json({ error: 'No hay cambios válidos para guardar.' }, { status: 400 });
    }

    const { data: updatedRows, error: updateError } = await insforgeAdmin.database
      .from('deliveries')
      .update(payload)
      .eq('id', id)
      .select('*');

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    const orderId = cleanText(delivery.order_id);
    if (requestedStatus === 'entregado' && orderId) {
      const { error: orderError } = await insforgeAdmin.database
        .from('orders')
        .update({ status: 'entregado', delivery_status: 'entregado', updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('tenant_id', tenantId);

      if (orderError) {
        return NextResponse.json(
          {
            ok: true,
            delivery: Array.isArray(updatedRows) ? updatedRows[0] ?? { ...delivery, ...payload } : { ...delivery, ...payload },
            warning: 'La entrega se actualizó, pero no se pudo sincronizar el pedido.',
          },
          { status: 207 },
        );
      }
    }

    return NextResponse.json({
      ok: true,
      delivery: Array.isArray(updatedRows) ? updatedRows[0] ?? { ...delivery, ...payload } : { ...delivery, ...payload },
    });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : 'No se pudo actualizar la entrega.' }, { status: 500 });
  }
}
