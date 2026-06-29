import 'server-only';
import { jsPDF } from 'jspdf';
import type { CheckoutSummary, LineItem } from '@/lib/checkout';

export type BoletaPdfOrder = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone?: string | null;
  region?: string | null;
  shipping_address?: string | null;
  items: LineItem[] | null;
  subtotal: number;
  tax: number;
  shipping_fee: number;
  total: number;
  currency?: string | null;
  payment_id?: string | null;
  payment_status?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export type BoletaPdfInvoice = {
  id?: string | null;
  folio?: string | null;
  dte_type?: number | null;
  provider?: string | null;
  sii_status?: string | null;
  pdf_url?: string | null;
  neto?: number | null;
  iva?: number | null;
  exento?: number | null;
  total?: number | null;
};

function money(value: number | null | undefined) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(Number(value || 0)));
}

function safe(value: unknown, fallback = '-') {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  return text || fallback;
}

function clip(doc: jsPDF, text: string, maxWidth: number) {
  return doc.splitTextToSize(text, maxWidth).join(' ');
}

function drawLogo(doc: jsPDF, x: number, y: number) {
  doc.setFillColor(245, 158, 11);
  doc.roundedRect(x, y, 24, 24, 6, 6, 'F');
  doc.setTextColor(5, 5, 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('F', x + 8.3, y + 17);
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(18);
  doc.text('FABRICK', x + 30, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Soluciones · Tienda · Construcción', x + 30, y + 17);
}

function drawLine(doc: jsPDF, y: number) {
  doc.setDrawColor(230, 230, 230);
  doc.line(18, y, 192, y);
}

export function generateFabrickBoletaPdfBase64(args: {
  order: BoletaPdfOrder;
  invoice?: BoletaPdfInvoice | null;
  trackingUrl?: string;
}) {
  const { order, invoice, trackingUrl } = args;
  const doc = new jsPDF({ unit: 'mm', format: 'letter', compress: true });
  const issuedAt = new Date(order.updated_at || order.created_at || Date.now()).toLocaleString('es-CL');
  const folio = invoice?.folio || order.id;
  const items = Array.isArray(order.items) ? order.items : [];
  const summary: CheckoutSummary = {
    subtotal: Number(order.subtotal || 0),
    iva: Number(order.tax || 0),
    despacho: Number(order.shipping_fee || 0),
    total: Number(order.total || invoice?.total || 0),
    moneda: 'CLP',
  };

  doc.setFillColor(250, 250, 250);
  doc.rect(0, 0, 216, 279, 'F');

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, 14, 188, 248, 5, 5, 'F');
  doc.setDrawColor(238, 238, 238);
  doc.roundedRect(14, 14, 188, 248, 5, 5, 'S');

  drawLogo(doc, 22, 24);

  doc.setFillColor(17, 17, 17);
  doc.roundedRect(142, 23, 44, 28, 5, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(invoice?.dte_type === 39 ? 'BOLETA' : 'COMPROBANTE', 164, 33, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° ${folio}`, 164, 40, { align: 'center' });
  doc.text('Pago confirmado', 164, 46, { align: 'center' });

  drawLine(doc, 60);

  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Datos del cliente', 22, 72);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 75, 75);
  doc.text(`Cliente: ${safe(order.customer_name, 'Consumidor final')}`, 22, 81);
  doc.text(`Correo: ${safe(order.customer_email)}`, 22, 88);
  doc.text(`Teléfono: ${safe(order.customer_phone)}`, 22, 95);
  doc.text(`Región: ${safe(order.region)}`, 22, 102);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Datos de la compra', 115, 72);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 75, 75);
  doc.text(`Orden: ${order.id}`, 115, 81);
  doc.text(`Fecha: ${issuedAt}`, 115, 88);
  doc.text(`Pago: ${safe(order.payment_status, 'approved')}`, 115, 95);
  doc.text(`ID pago: ${safe(order.payment_id)}`, 115, 102);

  if (order.shipping_address) {
    doc.setFillColor(255, 248, 225);
    doc.roundedRect(22, 111, 164, 16, 4, 4, 'F');
    doc.setTextColor(95, 70, 20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Dirección de despacho', 27, 118);
    doc.setFont('helvetica', 'normal');
    doc.text(clip(doc, order.shipping_address, 145), 27, 124);
  }

  const tableY = order.shipping_address ? 140 : 124;
  doc.setFillColor(17, 17, 17);
  doc.roundedRect(22, tableY, 164, 10, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Producto', 27, tableY + 6.5);
  doc.text('Cant.', 124, tableY + 6.5, { align: 'right' });
  doc.text('Unitario', 154, tableY + 6.5, { align: 'right' });
  doc.text('Total', 181, tableY + 6.5, { align: 'right' });

  let y = tableY + 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);

  const printableItems = items.length ? items : [{ productoId: order.id, cantidad: 1, precioUnitario: summary.subtotal || summary.total, nombre: 'Compra en tienda' }];
  for (const item of printableItems.slice(0, 12)) {
    const qty = Number(item.cantidad || 1);
    const unit = Number(item.precioUnitario || 0);
    const total = qty * unit;
    doc.text(clip(doc, item.nombre || `Producto ${item.productoId}`, 82), 27, y);
    doc.text(String(qty), 124, y, { align: 'right' });
    doc.text(money(unit), 154, y, { align: 'right' });
    doc.text(money(total), 181, y, { align: 'right' });
    y += 9;
    doc.setDrawColor(242, 242, 242);
    doc.line(27, y - 4, 181, y - 4);
  }

  const totalY = Math.max(y + 8, 202);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(112, totalY - 8, 74, 39, 4, 4, 'F');
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  doc.text('Subtotal', 120, totalY);
  doc.text(money(summary.subtotal), 180, totalY, { align: 'right' });
  doc.text('IVA', 120, totalY + 8);
  doc.text(money(summary.iva), 180, totalY + 8, { align: 'right' });
  doc.text('Despacho', 120, totalY + 16);
  doc.text(money(summary.despacho), 180, totalY + 16, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 10, 10);
  doc.setFontSize(12);
  doc.text('TOTAL', 120, totalY + 28);
  doc.text(money(summary.total), 180, totalY + 28, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(95, 95, 95);
  doc.text(`Proveedor DTE: ${safe(invoice?.provider, 'Fabrick')}`, 22, 235);
  doc.text(`Estado SII: ${safe(invoice?.sii_status, 'registro interno')}`, 22, 241);
  if (trackingUrl) doc.text(`Seguimiento: ${trackingUrl}`, 22, 247, { maxWidth: 160 });

  doc.setFillColor(245, 158, 11);
  doc.roundedRect(22, 252, 164, 5, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Gracias por comprar en Soluciones Fabrick', 104, 255.7, { align: 'center' });

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer).toString('base64');
}
