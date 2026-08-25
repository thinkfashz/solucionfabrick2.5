import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { requireTenantAdmin } from '@/lib/tenantAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type OrderRow = {
  id: string;
  total?: number | string | null;
  status?: string | null;
  payment_status?: string | null;
  payment_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  cliente_nombre?: string | null;
  cliente_email?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  currency?: string | null;
  items?: unknown;
  tracking_number?: string | null;
  delivery_status?: string | null;
};

type NativeState = 'approved' | 'pending' | 'failed';
type NativeMethod = 'transfer' | 'manual';

function lower(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function amount(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function classify(order: OrderRow): NativeState {
  const ps = lower(order.payment_status);
  const status = lower(order.status);
  if (
    ps === 'approved' ||
    ['pagada', 'pagado', 'confirmado', 'confirmada', 'en_preparacion', 'preparacion', 'preparación', 'enviado', 'entregado'].includes(status)
  ) return 'approved';
  if (
    ['rejected', 'cancelled', 'canceled', 'refunded', 'charged_back', 'failed', 'fallida'].includes(ps) ||
    ['cancelado', 'cancelada', 'fallida', 'rechazado', 'rechazada'].includes(status)
  ) return 'failed';
  return 'pending';
}

function paymentMethod(order: OrderRow) {
  const id = String(order.payment_id ?? '');
  if (/^(TRF-|transfer:|bank:)/i.test(id)) return 'transfer' as const;
  if (/^MAN-/i.test(id)) return 'manual' as const;
  return id ? 'gateway' as const : 'internal' as const;
}

function isOlderThan(order: OrderRow, hours: number) {
  const raw = order.updated_at || order.created_at;
  const ts = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(ts) && Date.now() - ts > hours * 60 * 60 * 1000;
}

function sameDay(value: string | null | undefined, target = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getFullYear() === target.getFullYear() && date.getMonth() === target.getMonth() && date.getDate() === target.getDate();
}

export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'orders', action: 'read' });
  if (!auth.ok) return auth.response;

  const { data, error } = await insforgeAdmin.database
    .from('orders')
    .select('id,total,status,payment_status,payment_id,customer_name,customer_email,cliente_nombre,cliente_email,created_at,updated_at,currency,items,tracking_number,delivery_status')
    .eq('tenant_id', auth.ctx.tenantId)
    .order('created_at', { ascending: false })
    .limit(250);

  if (error) {
    return NextResponse.json({ error: error.message, code: 'NATIVE_PAYMENTS_READ_FAILED' }, { status: 500 });
  }

  const orders = (Array.isArray(data) ? data : []) as OrderRow[];
  let approved = 0;
  let pending = 0;
  let failed = 0;
  let transfers = 0;
  let approvedVolume = 0;
  let pendingVolume = 0;
  let approvedToday = 0;
  let stalePending = 0;
  let failedRecent = 0;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const rows = orders.map((order) => {
    const state = classify(order);
    const method = paymentMethod(order);
    const total = amount(order.total);
    if (state === 'approved') {
      approved += 1;
      approvedVolume += total;
      if (sameDay(order.updated_at || order.created_at)) approvedToday += 1;
    } else if (state === 'failed') {
      failed += 1;
      const ts = Date.parse(order.updated_at || order.created_at || '');
      if (Number.isFinite(ts) && ts >= sevenDaysAgo) failedRecent += 1;
    } else {
      pending += 1;
      pendingVolume += total;
      if (isOlderThan(order, 24)) stalePending += 1;
    }
    if (method === 'transfer') transfers += 1;
    return {
      ...order,
      total,
      nativeState: state,
      method,
      customer: order.customer_name || order.cliente_nombre || order.customer_email || order.cliente_email || 'Cliente',
      email: order.customer_email || order.cliente_email || null,
    };
  });

  const novedades = [
    approvedToday > 0 ? { type: 'success', title: `${approvedToday} pago${approvedToday === 1 ? '' : 's'} aprobado${approvedToday === 1 ? '' : 's'} hoy`, detail: 'El módulo registró movimiento aprobado durante la jornada.' } : null,
    stalePending > 0 ? { type: 'warning', title: `${stalePending} pago${stalePending === 1 ? '' : 's'} lleva${stalePending === 1 ? '' : 'n'} más de 24 h en proceso`, detail: 'Conviene revisar esos pedidos antes de preparar despacho.' } : null,
    failedRecent > 0 ? { type: 'danger', title: `${failedRecent} intento${failedRecent === 1 ? '' : 's'} fallido${failedRecent === 1 ? '' : 's'} en 7 días`, detail: 'Puedes revisar el pedido y cambiar su estado interno cuando corresponda.' } : null,
    transfers > 0 ? { type: 'info', title: `${transfers} transferencia${transfers === 1 ? '' : 's'} registrada${transfers === 1 ? '' : 's'}`, detail: 'Las transferencias se identifican por referencia interna y no requieren una API bancaria.' } : null,
  ].filter(Boolean);

  return NextResponse.json({
    ok: true,
    engine: 'fabrick-native-payments',
    providerRequired: false,
    tenantId: auth.ctx.tenantId,
    kpis: { approved, pending, failed, transfers, approvedVolume, pendingVolume, total: orders.length },
    novedades,
    orders: rows,
  }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'orders', action: 'update' });
  if (!auth.ok) return auth.response;

  let body: { orderId?: unknown; state?: unknown; method?: unknown; reference?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  const state = body.state as NativeState;
  const method = body.method as NativeMethod;
  const reference = typeof body.reference === 'string' ? body.reference.trim().slice(0, 80) : '';

  if (!orderId || !['approved', 'pending', 'failed'].includes(state)) {
    return NextResponse.json({ error: 'orderId y state válidos son requeridos.' }, { status: 400 });
  }
  if (!['transfer', 'manual'].includes(method)) {
    return NextResponse.json({ error: 'method debe ser transfer o manual.' }, { status: 400 });
  }

  const existing = await insforgeAdmin.database
    .from('orders')
    .select('id,payment_id')
    .eq('tenant_id', auth.ctx.tenantId)
    .eq('id', orderId)
    .limit(1);

  if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });
  const found = Array.isArray(existing.data) ? existing.data[0] as { id?: string; payment_id?: string | null } | undefined : undefined;
  if (!found?.id) return NextResponse.json({ error: 'Pedido no encontrado en este tenant.' }, { status: 404 });

  const prefix = method === 'transfer' ? 'TRF-' : 'MAN-';
  const generatedId = `${prefix}${reference || orderId}`.slice(0, 160);
  const payload = state === 'approved'
    ? { status: 'en_preparacion', payment_status: 'approved', payment_id: generatedId, updated_at: new Date().toISOString() }
    : state === 'failed'
      ? { status: 'cancelado', payment_status: 'rejected', payment_id: generatedId, updated_at: new Date().toISOString() }
      : { status: 'pendiente_pago', payment_status: 'pending', payment_id: generatedId, updated_at: new Date().toISOString() };

  const { data, error } = await insforgeAdmin.database
    .from('orders')
    .update(payload)
    .eq('tenant_id', auth.ctx.tenantId)
    .eq('id', orderId)
    .select('id,total,status,payment_status,payment_id,updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message, code: 'NATIVE_PAYMENT_UPDATE_FAILED' }, { status: 500 });
  return NextResponse.json({ ok: true, order: data, nativeState: state, method });
}
