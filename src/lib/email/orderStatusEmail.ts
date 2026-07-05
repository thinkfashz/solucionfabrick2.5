import 'server-only';
import { sendEmail } from '@/lib/emailDriver';
import { ORDER_STATUS_LABELS, formatCLP, normalizeLineItems, normalizeOrderStatus, type OrderStatus } from '@/lib/commerce';

type OrderEmailRow = Record<string, unknown>;

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function num(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function dateCl(value: unknown) {
  const raw = str(value, new Date().toISOString());
  try {
    return new Date(raw).toLocaleString('es-CL', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Santiago',
    });
  } catch {
    return raw;
  }
}

function firstName(value: unknown) {
  return str(value, 'Cliente').split(' ').filter(Boolean)[0] || 'Cliente';
}

function statusMessage(status: OrderStatus, trackingNumber?: string, carrier?: string) {
  if (status === 'confirmado') return 'Tu compra fue confirmada. Ya tenemos el pago registrado y estamos coordinando la preparación.';
  if (status === 'en_preparacion') return 'Tu pedido pasó a preparación. Estamos alistando productos, validando despacho y preparando la entrega.';
  if (status === 'enviado') return `Tu pedido ya fue enviado.${carrier ? ` Transportista: ${carrier}.` : ''}${trackingNumber ? ` Número de seguimiento: ${trackingNumber}.` : ''}`;
  if (status === 'entregado') return 'Tu pedido fue marcado como entregado. Gracias por confiar en Soluciones Fabrick.';
  if (status === 'cancelado') return 'Tu pedido fue cancelado. Si tienes dudas, responde este correo para ayudarte.';
  return 'Recibimos tu pedido y está pendiente de revisión.';
}

function itemsHtml(order: OrderEmailRow) {
  const items = normalizeLineItems(order.items);
  if (!items.length) return '<p style="margin:0;color:#a1a1aa;font-size:13px;">Sin detalle de productos.</p>';
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;">${items.map((item) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #27272a;color:#f4f4f5;font-weight:700;">${escapeHtml(item.name)}</td>
      <td style="padding:12px 0;border-bottom:1px solid #27272a;color:#a1a1aa;text-align:center;">${item.quantity}</td>
      <td style="padding:12px 0;border-bottom:1px solid #27272a;color:#fff;text-align:right;font-weight:900;">${formatCLP(item.subtotal)}</td>
    </tr>
  `).join('')}</table>`;
}

function stepChip(label: string, active: boolean, done: boolean) {
  const bg = done ? '#22c55e' : active ? '#facc15' : '#27272a';
  const color = done || active ? '#050505' : '#a1a1aa';
  return `<td style="padding:0 4px 8px 0;"><div style="border-radius:999px;background:${bg};color:${color};padding:8px 10px;text-align:center;font-size:11px;font-weight:900;white-space:nowrap;">${label}</div></td>`;
}

function statusSteps(status: OrderStatus) {
  const order: OrderStatus[] = ['confirmado', 'en_preparacion', 'enviado', 'entregado'];
  const index = Math.max(0, order.indexOf(status));
  return `<table style="width:100%;border-collapse:collapse;margin:20px 0 4px;"><tr>
    ${stepChip('Pago confirmado', status === 'confirmado', index > 0)}
    ${stepChip('Preparación', status === 'en_preparacion', index > 1)}
    ${stepChip('En camino', status === 'enviado', index > 2)}
    ${stepChip('Entregado', status === 'entregado', status === 'entregado')}
  </tr></table>`;
}

export async function sendOrderStatusUpdateEmail(params: {
  order: OrderEmailRow;
  status: OrderStatus;
  trackingNumber?: string;
  carrier?: string;
  trackingUrl?: string;
  note?: string;
  dispatchCode?: string;
}) {
  const email = str(params.order.customer_email || params.order.cliente_email).toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'El pedido no tiene correo válido para notificar.' };
  }

  const status = normalizeOrderStatus(params.status);
  const label = ORDER_STATUS_LABELS[status];
  const orderId = str(params.order.id, 'pedido');
  const total = num(params.order.total, 0);
  const dispatchCode = str(params.dispatchCode || params.order.dispatch_code || params.order.codigo_despacho, 'Pendiente');
  const trackingButton = params.trackingUrl
    ? `<a href="${escapeHtml(params.trackingUrl)}" style="display:inline-block;margin-top:18px;background:#facc15;color:#050505;text-decoration:none;font-weight:900;border-radius:999px;padding:14px 20px;letter-spacing:.08em;text-transform:uppercase;">Ver seguimiento</a>`
    : '';
  const trackingBlock = params.trackingNumber || params.carrier
    ? `<div style="margin:18px 0;background:#18181b;border:1px solid #2d2d32;border-radius:18px;padding:16px;">
        <div style="font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#facc15;font-weight:900;margin-bottom:8px;">Datos de despacho</div>
        ${params.carrier ? `<p style="margin:0 0 6px;color:#e5e7eb;font-size:14px;"><strong>Transportista:</strong> ${escapeHtml(params.carrier)}</p>` : ''}
        ${params.trackingNumber ? `<p style="margin:0;color:#e5e7eb;font-size:14px;"><strong>N° seguimiento:</strong> ${escapeHtml(params.trackingNumber)}</p>` : ''}
      </div>`
    : '';
  const noteBlock = params.note
    ? `<div style="margin-top:16px;background:#111827;border:1px solid #1f2937;border-radius:16px;padding:14px;color:#dbeafe;font-size:13px;line-height:1.6;"><strong>Nota del despacho:</strong> ${escapeHtml(params.note)}</div>`
    : '';

  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#050505;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;padding:24px;">
    <div style="max-width:720px;margin:auto;background:#0b0b0b;border:1px solid #27272a;border-radius:28px;overflow:hidden;box-shadow:0 30px 90px rgba(0,0,0,.45);">
      <div style="background:radial-gradient(circle at 20% 0%,rgba(250,204,21,.26),transparent 260px),linear-gradient(145deg,#111,#050504);padding:30px;border-bottom:1px solid #27272a;">
        <div style="font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#facc15;font-weight:900;">Soluciones Fabrick</div>
        <h1 style="font-size:34px;line-height:1.02;margin:14px 0 8px;color:#fff;letter-spacing:-1.4px;">Tu pedido está ${escapeHtml(label.toLowerCase())}</h1>
        <p style="color:#c8c8c8;line-height:1.6;margin:0;">Hola ${escapeHtml(firstName(params.order.customer_name || params.order.cliente_nombre))}, ${escapeHtml(statusMessage(status, params.trackingNumber, params.carrier))}</p>
      </div>
      <div style="padding:28px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
          <div style="background:#111;border:1px solid #27272a;border-radius:20px;padding:18px;">
            <p style="margin:0 0 8px;color:#999;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Pedido</p>
            <div style="font-size:18px;font-weight:900;color:#fff;word-break:break-word;">${escapeHtml(orderId)}</div>
          </div>
          <div style="background:#171200;border:1px solid #4a3a00;border-radius:20px;padding:18px;">
            <p style="margin:0 0 8px;color:#facc15;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Código despacho</p>
            <div style="font-size:24px;font-weight:900;color:#facc15;letter-spacing:.08em;">${escapeHtml(dispatchCode)}</div>
          </div>
        </div>
        ${statusSteps(status)}
        <p style="color:#888;margin:8px 0 18px;">Actualizado: <strong style="color:#fff">${escapeHtml(dateCl(new Date().toISOString()))}</strong> · Compra: <strong style="color:#fff">${escapeHtml(dateCl(params.order.created_at))}</strong></p>
        ${trackingBlock}
        ${itemsHtml(params.order)}
        <div style="margin-top:18px;text-align:right;color:#d6d6d6;line-height:1.9;">
          <div style="font-size:22px;font-weight:900;color:#facc15;">Total: ${formatCLP(total)}</div>
        </div>
        ${noteBlock}
        ${trackingButton}
        <p style="margin-top:20px;color:#999;font-size:13px;line-height:1.5;">Usa el código de despacho para verificar el estado de tu pedido en la página de seguimiento. Este correo fue enviado automáticamente desde Soluciones Fabrick.</p>
      </div>
    </div>
  </body></html>`;

  return sendEmail({
    to: email,
    subject: `Pedido ${label} · Código ${dispatchCode} · Soluciones Fabrick`,
    html,
  });
}
