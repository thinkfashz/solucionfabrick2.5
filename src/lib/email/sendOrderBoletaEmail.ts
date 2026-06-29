import 'server-only';
import { Resend } from 'resend';
import { insforge } from '@/lib/insforge';
import { getResendCredentials } from '@/lib/resendCredentials';
import { getAppBaseUrl } from '@/lib/mercadopago';
import { createOrderTrackingToken } from '@/lib/orderTracking';
import { generateFabrickBoletaPdfBase64, type BoletaPdfInvoice, type BoletaPdfOrder } from '@/lib/billing/boletaPdf';

export type SendOrderBoletaEmailResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  emailId?: string;
  error?: string;
};

function money(value: number | null | undefined) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(Number(value || 0)));
}

function safeText(value: unknown, fallback = '-') {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  return text || fallback;
}

async function fetchOrder(orderId: string) {
  const { data, error } = await insforge.database
    .from('orders')
    .select('id, customer_name, customer_email, customer_phone, region, shipping_address, items, subtotal, tax, shipping_fee, total, currency, payment_id, payment_status, status, created_at, updated_at')
    .eq('id', orderId)
    .single();
  if (error || !data) throw new Error(error?.message || `No se encontró la orden ${orderId}.`);
  return data as BoletaPdfOrder & { status?: string | null };
}

async function fetchInvoice(orderId: string) {
  const { data } = await insforge.database
    .from('invoices')
    .select('id, folio, dte_type, provider, sii_status, pdf_url, neto, iva, exento, total')
    .eq('order_id', orderId)
    .eq('dte_type', 39)
    .limit(1);
  return Array.isArray(data) && data.length ? data[0] as BoletaPdfInvoice : null;
}

function buildHtml(order: BoletaPdfOrder & { status?: string | null }, invoice: BoletaPdfInvoice | null, trackingUrl: string) {
  const items = Array.isArray(order.items) ? order.items : [];
  const rows = items.slice(0, 8).map((item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eee;color:#111;font-weight:700;">${safeText(item.nombre, `Producto ${item.productoId}`)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eee;color:#555;text-align:center;">${item.cantidad}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eee;color:#111;text-align:right;font-weight:700;">${money(Number(item.precioUnitario || 0) * Number(item.cantidad || 1))}</td>
    </tr>`).join('');

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#111;">
    <div style="max-width:680px;margin:0 auto;padding:28px 14px;">
      <div style="background:#050505;border-radius:28px 28px 0 0;padding:28px;color:#fff;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:46px;height:46px;border-radius:16px;background:#f59e0b;color:#050505;display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:24px;">F</div>
          <div>
            <div style="font-size:22px;font-weight:900;letter-spacing:-.03em;">FABRICK</div>
            <div style="font-size:12px;color:#fcd34d;text-transform:uppercase;letter-spacing:.16em;">Pago confirmado</div>
          </div>
        </div>
        <h1 style="margin:26px 0 10px;font-size:34px;line-height:1;letter-spacing:-.06em;">Tu compra fue confirmada.</h1>
        <p style="margin:0;color:#d4d4d4;line-height:1.6;font-size:15px;">Adjuntamos tu boleta en PDF con el detalle de la compra. Guarda este correo para respaldo y seguimiento.</p>
      </div>

      <div style="background:#fff;border:1px solid #eee;border-top:0;border-radius:0 0 28px 28px;padding:28px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px;">
          <div style="background:#fafafa;border:1px solid #eee;border-radius:18px;padding:16px;">
            <div style="font-size:11px;color:#777;text-transform:uppercase;letter-spacing:.16em;font-weight:900;">Orden</div>
            <div style="margin-top:6px;font-size:18px;font-weight:900;color:#111;">${order.id}</div>
          </div>
          <div style="background:#fafafa;border:1px solid #eee;border-radius:18px;padding:16px;">
            <div style="font-size:11px;color:#777;text-transform:uppercase;letter-spacing:.16em;font-weight:900;">Boleta</div>
            <div style="margin-top:6px;font-size:18px;font-weight:900;color:#111;">${safeText(invoice?.folio, order.id)}</div>
          </div>
        </div>

        <p style="margin:0 0 18px;color:#444;line-height:1.6;">Hola <b>${safeText(order.customer_name, 'cliente')}</b>, recibimos correctamente tu pago por <b>${money(order.total)}</b>.</p>

        <table style="width:100%;border-collapse:collapse;margin:12px 0 20px;">
          <thead>
            <tr>
              <th align="left" style="font-size:11px;color:#777;text-transform:uppercase;letter-spacing:.14em;padding-bottom:8px;">Producto</th>
              <th align="center" style="font-size:11px;color:#777;text-transform:uppercase;letter-spacing:.14em;padding-bottom:8px;">Cant.</th>
              <th align="right" style="font-size:11px;color:#777;text-transform:uppercase;letter-spacing:.14em;padding-bottom:8px;">Total</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="3" style="padding:12px 0;color:#555;">Compra en tienda</td></tr>'}</tbody>
        </table>

        <div style="background:#111;border-radius:20px;padding:18px;color:#fff;margin-top:18px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#d4d4d4;"><span>Subtotal</span><b>${money(order.subtotal)}</b></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#d4d4d4;"><span>IVA</span><b>${money(order.tax)}</b></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:12px;color:#d4d4d4;"><span>Despacho</span><b>${money(order.shipping_fee)}</b></div>
          <div style="border-top:1px solid rgba(255,255,255,.14);padding-top:12px;display:flex;justify-content:space-between;font-size:22px;color:#fcd34d;"><span style="font-weight:900;">TOTAL</span><b>${money(order.total)}</b></div>
        </div>

        <div style="margin-top:22px;display:flex;gap:10px;flex-wrap:wrap;">
          <a href="${trackingUrl}" style="background:#f59e0b;color:#050505;text-decoration:none;font-weight:900;border-radius:16px;padding:14px 18px;display:inline-block;">Ver seguimiento</a>
          ${invoice?.pdf_url ? `<a href="${invoice.pdf_url}" style="background:#f5f5f5;color:#111;text-decoration:none;font-weight:900;border-radius:16px;padding:14px 18px;display:inline-block;border:1px solid #eee;">Ver PDF proveedor</a>` : ''}
        </div>

        <p style="margin:22px 0 0;color:#777;font-size:12px;line-height:1.6;">Este correo fue generado automáticamente por Soluciones Fabrick. Si tienes dudas, responde este correo con el número de orden.</p>
      </div>
    </div>
  </body>
</html>`;
}

export async function sendOrderBoletaEmail(orderId: string): Promise<SendOrderBoletaEmailResult> {
  const credentials = await getResendCredentials({ preferDb: true });
  if (!credentials.ready) {
    return { ok: false, skipped: true, reason: `Resend no configurado: ${credentials.missing.join(', ')}` };
  }

  const order = await fetchOrder(orderId);
  if (!order.customer_email) return { ok: false, skipped: true, reason: 'La orden no tiene correo de cliente.' };

  const invoice = await fetchInvoice(orderId);
  const trackingUrl = `${getAppBaseUrl()}/pedido/${createOrderTrackingToken(order.id)}`;
  const pdfBase64 = generateFabrickBoletaPdfBase64({ order, invoice, trackingUrl });
  const resend = new Resend(credentials.apiKey);

  const response = await resend.emails.send({
    from: credentials.from || 'Soluciones Fabrick <onboarding@resend.dev>',
    to: [order.customer_email],
    subject: `Pago confirmado · Boleta ${invoice?.folio || order.id} · Soluciones Fabrick`,
    html: buildHtml(order, invoice, trackingUrl),
    attachments: [
      {
        filename: `boleta-fabrick-${order.id}.pdf`,
        content: pdfBase64,
      },
    ],
  });

  if (response.error) return { ok: false, error: response.error.message };
  return { ok: true, emailId: response.data?.id };
}
