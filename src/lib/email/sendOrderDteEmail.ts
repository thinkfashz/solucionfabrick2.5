import 'server-only';
import { Resend } from 'resend';
import { insforgeAdmin } from '@/lib/insforge';
import { resolveIntegrationCredentials } from '@/lib/integrationCredentials';
import { getAppBaseUrl } from '@/lib/mercadopago';
import { createOrderTrackingToken } from '@/lib/orderTracking';

export type SendOrderDteEmailResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  emailId?: string;
  error?: string;
};

function money(value: unknown) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
    .format(Math.round(Number(value || 0)));
}

function esc(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char] || char));
}

export async function sendOrderDteEmail(orderId: string): Promise<SendOrderDteEmailResult> {
  const resend = await resolveIntegrationCredentials('resend', ['api_key', 'from'], true);
  if (resend.missing.length > 0) {
    return { ok: false, skipped: true, reason: `Resend no configurado: ${resend.missing.join(', ')}` };
  }

  const { data: order, error: orderError } = await insforgeAdmin.database
    .from('orders')
    .select('id, customer_name, customer_email, total, currency, payment_id, payment_status')
    .eq('id', orderId)
    .single();
  if (orderError || !order) return { ok: false, error: orderError?.message || 'Orden no encontrada.' };
  if (!order.customer_email) return { ok: false, skipped: true, reason: 'La orden no tiene correo de cliente.' };

  const { data: invoiceRows, error: invoiceError } = await insforgeAdmin.database
    .from('invoices')
    .select('id, folio, dte_type, provider, sii_status, total, pdf_url, pdf_token, voided, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(8);
  if (invoiceError) return { ok: false, error: invoiceError.message };

  const invoice = (Array.isArray(invoiceRows) ? invoiceRows : []).find((row) => {
    const provider = String(row.provider || '').toLowerCase();
    const sii = String(row.sii_status || '').toLowerCase();
    return provider !== 'mock' && !sii.includes('mock') && !row.voided;
  });
  if (!invoice) return { ok: false, skipped: true, reason: 'Todavía no existe un DTE real para esta orden.' };

  const isFactura = Number(invoice.dte_type) === 33 || Number(invoice.dte_type) === 34;
  const documentLabel = isFactura ? 'Factura electrónica' : 'Boleta electrónica';
  const baseUrl = getAppBaseUrl();
  const pdfUrl = invoice.pdf_url
    ? `${baseUrl}/api/invoices/${encodeURIComponent(String(invoice.id))}/pdf?token=${encodeURIComponent(String(invoice.pdf_token || ''))}`
    : '';
  const trackingUrl = `${baseUrl}/pedido/${createOrderTrackingToken(String(order.id))}`;

  const html = `<!doctype html><html><body style="margin:0;background:#f3efe7;font-family:Arial,Helvetica,sans-serif;color:#161616"><div style="max-width:680px;margin:0 auto;padding:28px 14px"><div style="background:#111214;color:white;border-radius:28px 28px 0 0;padding:30px"><div style="font-size:11px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:#ffb000">Documento tributario disponible</div><h1 style="margin:12px 0 8px;font-size:32px;letter-spacing:-.04em">${documentLabel}</h1><p style="margin:0;color:#c8c8c8;line-height:1.6">Hola <b style="color:white">${esc(order.customer_name || 'cliente')}</b>. El documento tributario de tu compra en Soluciones Fabrick ya fue emitido.</p></div><div style="background:white;border-radius:0 0 28px 28px;padding:28px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div style="background:#f8f5ef;border-radius:16px;padding:15px"><div style="font-size:10px;text-transform:uppercase;color:#777;font-weight:800">Folio</div><b style="display:block;margin-top:6px;font-size:20px">${esc(invoice.folio || '-')}</b></div><div style="background:#fff7df;border-radius:16px;padding:15px"><div style="font-size:10px;text-transform:uppercase;color:#8a6510;font-weight:800">Total compra</div><b style="display:block;margin-top:6px;font-size:20px;color:#8a6510">${money(order.total)}</b></div></div><p style="margin:20px 0 0;color:#666;font-size:13px;line-height:1.7">Pedido <b>${esc(order.id)}</b> · Pago ${esc(order.payment_id || 'confirmado')} · Estado SII: ${esc(invoice.sii_status || 'emitido')}</p><div style="margin-top:24px">${pdfUrl ? `<a href="${pdfUrl}" style="display:inline-block;background:#ffb000;color:#111;text-decoration:none;font-weight:900;padding:14px 20px;border-radius:999px;margin-right:8px">Ver ${documentLabel.toLowerCase()}</a>` : ''}<a href="${trackingUrl}" style="display:inline-block;background:#111;color:white;text-decoration:none;font-weight:900;padding:14px 20px;border-radius:999px">Ver pedido</a></div><p style="margin:22px 0 0;color:#888;font-size:11px;line-height:1.6">Este correo corresponde al documento tributario emitido para tu compra. Conserva el folio para tus registros.</p></div></div></body></html>`;

  const client = new Resend(resend.values.api_key);
  const response = await client.emails.send({
    from: resend.values.from,
    to: [order.customer_email],
    subject: `${documentLabel} ${invoice.folio || ''} · Soluciones Fabrick`,
    html,
  });
  if (response.error) return { ok: false, error: response.error.message };
  return { ok: true, emailId: response.data?.id };
}
