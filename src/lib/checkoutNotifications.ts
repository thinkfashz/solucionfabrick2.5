import 'server-only';
import { jsPDF } from 'jspdf';
import { sendEmail } from '@/lib/emailDriver';
import type { CheckoutSummary, InternalShippingEstimate, LineItem } from '@/lib/checkout';

interface CheckoutOrderEmailInput {
  id: string;
  cliente: { nombre: string; email: string; telefono?: string };
  items: LineItem[];
  resumen: CheckoutSummary;
  shippingAddress?: string;
  region: string;
  estado: string;
  creadoEn: string;
  paymentMethod?: string;
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
  const candidates = [
    process.env.CHECKOUT_ADMIN_EMAIL,
    process.env.ADMIN_EMAIL,
    process.env.RESEND_ADMIN_EMAIL,
    process.env.NEXT_PUBLIC_ADMIN_EMAIL,
    'faubricioedms@gmail.com',
  ];
  return Array.from(new Set(candidates.filter((email): email is string => Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))));
}

function itemsRows(order: CheckoutOrderEmailInput) {
  return order.items.map((item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #242424;color:#fff;">${escapeHtml(item.nombre || item.productoId)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #242424;color:#aaa;text-align:center;">${item.cantidad}</td>
      <td style="padding:10px 0;border-bottom:1px solid #242424;color:#fff;text-align:right;">${clp(item.precioUnitario)}</td>
    </tr>
  `).join('');
}

function buildReceiptPdf(order: CheckoutOrderEmailInput, forAdmin = false) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 44;
  let y = 56;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Soluciones Fabrick', margin, y);
  y += 22;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Comprobante / boleta interna: ${order.id}`, margin, y);
  y += 16;
  doc.text(`Fecha: ${dateCl(order.creadoEn)}`, margin, y);
  y += 28;
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
  doc.text(`Direccion: ${order.shippingAddress || '-'}`, margin, y);
  y += 14;
  doc.text(`Region: ${order.region || '-'}`, margin, y);
  y += 26;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Detalle de productos', margin, y);
  y += 18;
  doc.setFontSize(10);
  order.items.forEach((item) => {
    const name = `${item.nombre || item.productoId}`.slice(0, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(`${item.cantidad} x ${name}`, margin, y);
    doc.text(clp(item.precioUnitario * item.cantidad), 470, y, { align: 'right' });
    y += 15;
  });
  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.text(`Subtotal: ${clp(order.resumen.subtotal)}`, margin, y);
  y += 16;
  doc.text(`IVA referencial: ${clp(order.resumen.iva)}`, margin, y);
  y += 16;
  doc.text(`Total compra: ${clp(order.resumen.total)}`, margin, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.text('Entrega estimada: 7 a 21 dias habiles desde confirmacion y coordinacion de despacho.', margin, y);
  y += 16;
  doc.text('Despacho: costo interno estimado para administracion; no se suma al total hasta confirmacion.', margin, y);
  if (forAdmin && order.internalShippingEstimate) {
    y += 18;
    doc.setFont('helvetica', 'bold');
    doc.text(`Costo envio estimado interno: ${clp(order.internalShippingEstimate.amount)}`, margin, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.text(`Fuente: ${order.internalShippingEstimate.source}`, margin, y);
  }
  const output = doc.output('arraybuffer');
  return Buffer.from(output).toString('base64');
}

function customerHtml(order: CheckoutOrderEmailInput) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#080808;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;padding:24px;">
    <div style="max-width:680px;margin:auto;background:#111;border:1px solid #272727;border-radius:22px;padding:28px;">
      <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#facc15;font-weight:900;">Soluciones Fabrick</div>
      <h1 style="font-size:26px;line-height:1.1;margin:14px 0 8px;color:#fff;">Recibimos tu compra</h1>
      <p style="color:#bdbdbd;line-height:1.6;margin:0 0 20px;">Hola ${escapeHtml(order.cliente.nombre)}, tu orden quedó registrada. Si pagaste por transferencia, la confirmación final se valida con el comprobante.</p>
      <div style="background:#0b0b0b;border:1px solid #242424;border-radius:18px;padding:18px;margin-bottom:20px;">
        <p style="margin:0 0 8px;color:#aaa;">Orden</p>
        <div style="font-size:20px;font-weight:900;color:#fff;">${escapeHtml(order.id)}</div>
        <p style="color:#888;margin:8px 0 0;">Entrega estimada: <strong style="color:#fff">7 a 21 días hábiles</strong></p>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">${itemsRows(order)}</table>
      <div style="margin-top:18px;text-align:right;font-size:18px;font-weight:900;color:#fff;">Total: ${clp(order.resumen.total)}</div>
      <p style="margin-top:20px;color:#999;font-size:13px;line-height:1.5;">Adjuntamos tu comprobante PDF con el detalle del producto, dirección y plazo estimado.</p>
    </div>
  </body></html>`;
}

function adminHtml(order: CheckoutOrderEmailInput) {
  const estimate = order.internalShippingEstimate;
  return `<!doctype html><html lang="es"><body style="margin:0;background:#080808;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;padding:24px;">
    <div style="max-width:760px;margin:auto;background:#111;border:1px solid #272727;border-radius:22px;padding:28px;">
      <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#facc15;font-weight:900;">Nueva compra / admin</div>
      <h1 style="font-size:25px;margin:14px 0;color:#fff;">${escapeHtml(order.id)}</h1>
      <p style="color:#bbb;line-height:1.6;">Fecha: ${dateCl(order.creadoEn)} · Método: ${escapeHtml(order.paymentMethod || 'checkout')} · Estado: ${escapeHtml(order.estado)}</p>
      <div style="display:grid;gap:12px;margin:18px 0;">
        <div style="background:#0b0b0b;border:1px solid #242424;border-radius:16px;padding:16px;">Cliente: <strong>${escapeHtml(order.cliente.nombre)}</strong><br>Email: ${escapeHtml(order.cliente.email)}<br>Teléfono: ${escapeHtml(order.cliente.telefono || '-')}</div>
        <div style="background:#0b0b0b;border:1px solid #242424;border-radius:16px;padding:16px;">Dirección: ${escapeHtml(order.shippingAddress || '-')}<br>Región: ${escapeHtml(order.region || '-')}</div>
        <div style="background:#171200;border:1px solid #4a3a00;border-radius:16px;padding:16px;color:#fde68a;">Envío interno estimado: <strong>${estimate ? clp(estimate.amount) : 'No calculado'}</strong><br>Fuente: ${escapeHtml(estimate?.source || 'free-local-estimator')}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">${itemsRows(order)}</table>
      <div style="margin-top:18px;text-align:right;font-size:18px;font-weight:900;color:#fff;">Total cliente: ${clp(order.resumen.total)}</div>
    </div>
  </body></html>`;
}

export async function sendCheckoutOrderEmails(order: CheckoutOrderEmailInput) {
  const customerPdf = buildReceiptPdf(order, false);
  const adminPdf = buildReceiptPdf(order, true);
  const attachmentName = `boleta-${order.id}.pdf`;

  const customer = await sendEmail({
    to: order.cliente.email,
    subject: `Tu compra en Soluciones Fabrick · ${order.id}`,
    html: customerHtml(order),
    attachments: [{ filename: attachmentName, content: customerPdf, contentType: 'application/pdf' }],
  });

  const admins = adminRecipients();
  const admin = admins.length
    ? await sendEmail({
        to: admins,
        subject: `[Fabrick] Nueva compra ${order.id} · ${clp(order.resumen.total)}`,
        html: adminHtml(order),
        attachments: [{ filename: `admin-${attachmentName}`, content: adminPdf, contentType: 'application/pdf' }],
      })
    : { ok: true, simulated: true };

  return { customer, admin };
}
