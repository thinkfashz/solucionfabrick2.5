import 'server-only';
import { insforgeAdmin } from '@/lib/insforge';

type OrderRow = Record<string, unknown>;

type PipelineStage = {
  stage: string;
  probability: number;
  attended?: boolean;
  nextAction?: string;
};

function str(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function num(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function orderId(order: OrderRow) {
  return str(order.id);
}

function customerName(order: OrderRow) {
  return str(order.customer_name || order.cliente_nombre, 'Cliente web');
}

function customerEmail(order: OrderRow) {
  return str(order.customer_email || order.cliente_email).toLowerCase();
}

function customerPhone(order: OrderRow) {
  return str(order.customer_phone || order.cliente_telefono);
}

function orderTotal(order: OrderRow) {
  return Math.round(num(order.total, 0));
}

function orderItemsSummary(order: OrderRow) {
  const items = Array.isArray(order.items) ? order.items as Array<Record<string, unknown>> : [];
  if (!items.length) return 'Sin detalle de productos';
  return items.map((item) => {
    const qty = Math.max(1, Math.round(num(item.cantidad ?? item.quantity, 1)));
    const name = str(item.nombre ?? item.name ?? item.title ?? item.productoId ?? item.productId ?? item.id, 'Producto');
    return `${qty} × ${name}`;
  }).join(' · ').slice(0, 700);
}

async function findByOrderId(table: string, id: string) {
  try {
    const { data, error } = await insforgeAdmin.database.from(table).select('id').eq('order_id', id).limit(1);
    if (error) return null;
    return Array.isArray(data) ? data[0] as { id?: string | number } | undefined : null;
  } catch {
    return null;
  }
}

async function insertOrUpdateLead(order: OrderRow, stage: PipelineStage) {
  const id = orderId(order);
  if (!id) return { ok: false, reason: 'missing_order_id' };

  const payloadWithOrderId = {
    order_id: id,
    nombre: customerName(order),
    email: customerEmail(order) || null,
    telefono: customerPhone(order) || null,
    tipo_proyecto: 'Venta e-commerce',
    mensaje: `Pedido ${id} · ${stage.stage} · Total ${orderTotal(order).toLocaleString('es-CL')} CLP · ${orderItemsSummary(order)}`,
    atendido: Boolean(stage.attended),
    created_at: str(order.created_at) || new Date().toISOString(),
  };

  const existing = await findByOrderId('leads', id);
  if (existing?.id) {
    const { error } = await insforgeAdmin.database.from('leads').update({
      nombre: payloadWithOrderId.nombre,
      email: payloadWithOrderId.email,
      telefono: payloadWithOrderId.telefono,
      tipo_proyecto: payloadWithOrderId.tipo_proyecto,
      mensaje: payloadWithOrderId.mensaje,
      atendido: payloadWithOrderId.atendido,
    }).eq('id', existing.id);
    return { ok: !error, reason: error?.message };
  }

  const { error } = await insforgeAdmin.database.from('leads').insert([payloadWithOrderId]);
  if (!error) return { ok: true };

  // Backward compatibility for databases that have not yet added leads.order_id.
  const fallbackPayload = { ...payloadWithOrderId } as Record<string, unknown>;
  delete fallbackPayload.order_id;
  const fallback = await insforgeAdmin.database.from('leads').insert([fallbackPayload]);
  return { ok: !fallback.error, reason: fallback.error?.message || error.message };
}

async function insertOrUpdateCrmLead(order: OrderRow, stage: PipelineStage) {
  const id = orderId(order);
  if (!id) return { ok: false, reason: 'missing_order_id' };

  const payloadWithOrderId = {
    order_id: id,
    name: customerName(order),
    contact: customerName(order),
    email: customerEmail(order),
    phone: customerPhone(order),
    company: 'Cliente web',
    value: orderTotal(order),
    stage: stage.stage,
    probability: stage.probability,
    notes: `Pedido ${id} · Estado: ${str(order.status, 'pendiente')} · ${orderItemsSummary(order)}`,
    next_action: stage.nextAction || 'Contactar cliente y preparar despacho',
    updated_at: new Date().toISOString(),
  };

  const existing = await findByOrderId('crm_leads', id);
  if (existing?.id) {
    const { error } = await insforgeAdmin.database.from('crm_leads').update(payloadWithOrderId).eq('id', existing.id);
    return { ok: !error, reason: error?.message };
  }

  const { error } = await insforgeAdmin.database.from('crm_leads').insert([{ ...payloadWithOrderId, created_at: str(order.created_at) || new Date().toISOString() }]);
  if (!error) return { ok: true };

  // Backward compatibility for CRM tables created before order_id existed.
  const fallbackPayload = { ...payloadWithOrderId, created_at: str(order.created_at) || new Date().toISOString() } as Record<string, unknown>;
  delete fallbackPayload.order_id;
  const fallback = await insforgeAdmin.database.from('crm_leads').insert([fallbackPayload]);
  return { ok: !fallback.error, reason: fallback.error?.message || error.message };
}

export async function syncOrderToSalesPipeline(order: OrderRow, stage: PipelineStage) {
  const [lead, crm] = await Promise.allSettled([
    insertOrUpdateLead(order, stage),
    insertOrUpdateCrmLead(order, stage),
  ]);

  return {
    ok: lead.status === 'fulfilled' && crm.status === 'fulfilled',
    lead: lead.status === 'fulfilled' ? lead.value : { ok: false, reason: lead.reason instanceof Error ? lead.reason.message : String(lead.reason) },
    crm: crm.status === 'fulfilled' ? crm.value : { ok: false, reason: crm.reason instanceof Error ? crm.reason.message : String(crm.reason) },
  };
}

export function syncOrderToSalesPipelineAsync(order: OrderRow, stage: PipelineStage) {
  syncOrderToSalesPipeline(order, stage).catch((error) => {
    console.warn('[sales-pipeline] sync failed', orderId(order), error instanceof Error ? error.message : error);
  });
}
