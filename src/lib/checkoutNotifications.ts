import 'server-only';
import { jsPDF } from 'jspdf';
import { sendEmail } from '@/lib/emailDriver';
import type { CheckoutSummary, InternalShippingEstimate, LineItem } from '@/lib/checkout';

export interface CheckoutOrderEmailInput {
  id: string;
  cliente: { nombre: string; email: string; telefono?: string };
  items: LineItem[];
  resumen: CheckoutSummary;
  shippingAddress?: string;
  region: string;
  estado: string;
  creadoEn: string;
  paymentMethod?: string;
  paymentId?: string | null;
  trackingUrl?: string;
  internalShippingEstimate?: InternalShippingEstimate;
}

function clp(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Math.round(value || 0));
}

function dateCl(value: string) {
  try {
    return new Date(value).toLocaleString('es-CL', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Santiago' });
  } catch {
    return value;
  }
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function adminRecipients() {
  const candidates = [process.env.CHECKOUT_ADMIN_EMAIL, process.env.ADMIN_EMAIL, process.env.RESEND_ADMIN_EMAIL, process.env.NEXT_PUBLIC_ADMIN_EMAIL, 'faubricioedms@gmail.com'];
  return Array.from(new Set(candidates.filter((email): email is string => Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))));
}

function itemsRows(order: CheckoutOrderEmailInput) {
  return order.items.map((item) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #242424;color:#fff;font-weight:700;">${escapeHtml(item.nombre || item.productoId)}</td>
      <td style="padding:12px 0;border-bottom:1px solid #242424;color:#aaa;text-align:center;">${item.cantidad}</td>
      <td style="padding:12px 0;border-bottom:1px solid #242424;color:#fff;text-align:right;font-weight:900;">${clp(item.precioUnitario * item.cantidad)}</td>
    </tr>
  `).join('');
}

function buildReceiptPdf(order: CheckoutOrderEmailInput, forAdmin = false) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 44;
  let y = 50;

  doc.setFillColor(5, 5, 4);
  doc.rect(0, 0, 595, 130, 'F');
  doc.setTextColor(250, 204, 21);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('SOLUCIONES FABRICK', margin, y);
  y += 28;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('Boleta / comprobante de compra', margin, y);
  y += 28;
  doc.setTextColor(210, 210, 210);
  doc.setFontSize(10);
  doc.text(`Orden: ${order.id}`, margin, y);
  doc.text(`Fecha: ${dateCl(order.creadoEn)}`, 330, y);

  y = 160;
  doc.setTextColor(15, 15, 15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Cliente', margin, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Nombre: ${order.cliente.nombre}`, margin, y);
  y += 14;
  doc.text(`Email: ${order.cliente.email}`, margin, y);
  y += 14;
  doc.text(`Telefono: ${order.cliente.telefono || '-'}`, margin, y);
  y += 14;
  doc.text(`Direccion: ${order.shippingAddress || '-'}`, margin, y, { maxWidth: 500 });
  y += 28;
  doc.text(`Region: ${order.region || '-'}`, margin, y);
  y += 24;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Detalle de productos', margin, y);
  y += 20;
  doc.setFontSize(10);
  order.items.forEach((item) => {
    const name = `${item.nombre || item.productoId}`.slice(0, 64);
    doc.setFont('helvetica', 'normal');
    doc.text(`${item.cantidad} x ${name}`, margin, y);
    doc.text(clp(item.precioUnitario * item.cantidad), 520, y, { align: 'right' });
    y += 16;
  });

  y += 14;
  doc.setDrawColor(230, 230, 230);
  doc.line(margin, y, 540, y);
  y += 22;
  doc.setFont('helvetica', 'bold');
  doc.text(`Subtotal: ${clp(order.resumen.subtotal)}`, margin, y);
  y += 17;
  doc.text(`IVA referencial: ${clp(order.resumen.iva)}`, margin, y);
  y += 17;
  doc.text(`Despacho: ${clp(order.resumen.despacho)}`, margin, y);
  y += 20;
  doc.setFontSize(15);
  doc.text(`Total compra: ${clp(order.resumen.total)}`, margin, y);
  y += 28;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Entrega estimada: 7 a 21 dias habiles desde confirmacion y coordinacion de despacho.', margin, y);
  y += 14;
  if (order.trackingUrl) doc.text(`Seguimiento: ${order.trackingUrl}`, margin, y, { maxWidth: 500 });

  if (forAdmin && order.internalShippingEstimate) {
    y += 22;
    doc.setFont('helvetica', 'bold');
    doc.text(`Costo envio estimado interno: ${clp(order.internalShippingEstimate.amount)}`, margin, y);
  }

  return Buffer.from(doc.output('arraybuffer')).toString('base64');
}

function customerHtml(order: CheckoutOrderEmailInput) {
  const tracking = order.trackingUrl
    ? `<a href="${escapeHtml(order.trackingUrl)}" style="display:inline-block;margin-top:18px;background:#facc15;color:#060606;text-decoration:none;font-weight:900;border-radius:999px;padding:14px 20px;letter-spacing:.08em;text-transform:uppercase;">Ver estado del pedido</a>`
    : '';
  return `<!doctype html><html lang="es"><body style="margin:0;background:#050505;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;padding:24px;">
    <div style="max-width:720px;margin:auto;background:#0b0b0b;border:1px solid #272727;border-radius:28px;overflow:hidden;box-shadow:0 30px 90px rgba(0,0,0,.45);">
      <div style="background:radial-gradient(circle at 20% 0%,rgba(250,204,21,.22),transparent 260px),#050504;padding:28px;border-bottom:1px solid #242424;">
        <div style="font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#facc15;font-weight:900;">Soluciones Fabrick</div>
        <h1 style="font-size:34px;line-height:1.02;margin:14px 0 8px;color:#fff;letter-spacing:-1.4px;">Pago confirmado</h1>
        <p style="color:#c8c8c8;line-height:1.6;margin:0;">Hola ${escapeHtml(order.cliente.nombre)}, tu compra fue confirmada correctamente.</p>
      </div>
      <div style="padding:28px;">
        <div style="background:#111;border:1px solid #242424;border-radius:20px;padding:18px;margin-bottom:20px;">
          <p style="margin:0 0 8px;color:#999;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Orden</p>
          <div style="font-size:22px;font-weight:900;color:#fff;">${escapeHtml(order.id)}</div>
          <p style="color:#888;margin:8px 0 0;">Entrega estimada: <strong style="color:#fff">7 a 21 días hábiles</strong></p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">${itemsRows(order)}</table>
        <div style="margin-top:18px;text-align:right;color:#d6d6d6;line-height:1.9;">
          <div>Subtotal: <strong style="color:#fff">${clp(order.resumen.subtotal)}</strong></div>
          <div>IVA referencial: <strong style="color:#fff">${clp(order.resumen.iva)}</strong></div>
          <div>Despacho: <strong style="color:#fff">${clp(order.resumen.despacho)}</strong></div>
          <div style="font-size:22px;font-weight:900;color:#facc15;">Total: ${clp(order.resumen.total)}</div>
        </div>
        ${tracking}
        <p style="margin-top:20px;color:#999;font-size:13px;line-height:1.5;">Adjuntamos tu comprobante PDF con el detalle de compra, dirección y fecha de registro.</p>
      </div>
    </div>
  </body></html>`;
}

function adminHtml(order: CheckoutOrderEmailInput) {
  const estimate = order.internalShippingEstimate;
  return `<!doctype html><html lang="es"><body style="margin:0;background:#080808;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;padding:24px;">
    <div style="max-width:760px;margin:auto;background:#111;border:1px solid #272727;border-radius:22px;padding:28px;">
      <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#facc15;font-weight:900;">Compra pagada / admin</div>
      <h1 style="font-size:25px;margin:14px 0;color:#fff;">${escapeHtml(order.id)}</h1>
      <p style="color:#bbb;line-height:1.6;">Fecha: ${dateCl(order.creadoEn)} · Método: ${escapeHtml(order.paymentMethod || 'checkout')} · Estado: ${escapeHtml(order.estado)} · Pago: ${escapeHtml(order.paymentId || '-')}</p>
      <div style="display:grid;gap:12px;margin:18px 0;">
        <div style="background:#0b0b0b;border:1px solid #242424;border-radius:16px;padding:16px;">Cliente: <strong>${escapeHtml(order.cliente.nombre)}</strong><br>Email: ${escapeHtml(order.cliente.email)}<br>Teléfono: ${escapeHtml(order.cliente.telefono || '-')}</div>
        <div style="background:#0b0b0b;border:1px solid #242424;border-radius:16px;padding:16px;">Dirección: ${escapeHtml(order.shippingAddress || '-')}<br>Región: ${escapeHtml(order.region || '-')}</div>
        <div style="background:#171200;border:1px solid #4a3a00;border-radius:16px;padding:16px;color:#fde68a;">Envío interno estimado: <strong>${estimate ? clp(estimate.amount) : 'No calculado'}</strong></div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">${itemsRows(order)}</table>
      <div style="margin-top:18px;text-align:right;font-size:18px;font-weight:900;color:#fff;">Total cliente: ${clp(order.resumen.total)}</div>
      ${order.trackingUrl ? `<p style="margin-top:18px;color:#aaa;">Tracking público: <a href="${escapeHtml(order.trackingUrl)}" style="color:#facc15">${escapeHtml(order.trackingUrl)}</a></p>` : ''}
    </div>
  </body></html>`;
}

function rejectedHtml(order: CheckoutOrderEmailInput, reason?: string) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#080808;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;padding:24px;">
    <div style="max-width:680px;margin:auto;background:#111;border:1px solid #3f1d1d;border-radius:22px;padding:28px;">
      <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#facc15;font-weight:900;">Soluciones Fabrick</div>
      <h1 style="font-size:28px;line-height:1.1;margin:14px 0 8px;color:#fff;">Pago no aprobado</h1>
      <p style="color:#bdbdbd;line-height:1.6;">Hola ${escapeHtml(order.cliente.nombre)}, Mercado Pago informó que el pago de la orden <b>${escapeHtml(order.id)}</b> no fue aprobado.</p>
      <p style="color:#999;line-height:1.6;">${escapeHtml(reason || 'Puedes intentar nuevamente desde el checkout o escribirnos para coordinar otra forma de pago.')}</p>
      ${order.trackingUrl ? `<a href="${escapeHtml(order.trackingUrl)}" style="display:inline-block;margin-top:18px;background:#facc15;color:#060606;text-decoration:none;font-weight:900;border-radius:999px;padding:14px 20px;">Ver estado</a>` : ''}
    </div>
  </body></html>`;
}

export async function sendCheckoutOrderEmails(order: CheckoutOrderEmailInput) {
  const customerPdf = buildReceiptPdf(order, false);
  const adminPdf = buildReceiptPdf(order, true);
  const attachmentName = `boleta-${order.id}.pdf`;

  const customer = await sendEmail({
    to: order.cliente.email,
    subject: `Pago confirmado · Soluciones Fabrick · ${order.id}`,
    html: customerHtml(order),
    attachments: [{ filename: attachmentName, content: customerPdf, contentType: 'application/pdf' }],
  });

  const admins = adminRecipients();
  const admin = admins.length
    ? await sendEmail({
        to: admins,
        subject: `[Fabrick] Compra pagada ${order.id} · ${clp(order.resumen.total)}`,
        html: adminHtml(order),
        attachments: [{ filename: `admin-${attachmentName}`, content: adminPdf, contentType: 'application/pdf' }],
      })
    : { ok: true, simulated: true };

  return { customer, admin };
}

export async function sendCheckoutPaymentRejectedEmail(order: CheckoutOrderEmailInput, reason?: string) {
  const customer = await sendEmail({
    to: order.cliente.email,
    subject: `Pago no aprobado · Soluciones Fabrick · ${order.id}`,
    html: rejectedHtml(order, reason),
  });

  const admins = adminRecipients();
  const admin = admins.length
    ? await sendEmail({
        to: admins,
        subject: `[Fabrick] Pago rechazado ${order.id}`,
        html: adminHtml({ ...order, estado: 'rechazada' }),
      })
    : { ok: true, simulated: true };

  return { customer, admin };
}
