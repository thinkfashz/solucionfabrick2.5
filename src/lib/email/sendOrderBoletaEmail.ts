import 'server-only';
import { Resend } from 'resend';
import { insforge } from '@/lib/insforge';
import { getResendCredentials } from '@/lib/resendCredentials';
import { getAppBaseUrl } from '@/lib/mercadopago';
import { createOrderTrackingToken } from '@/lib/orderTracking';
import { resolveDispatchCode } from '@/lib/orders/dispatchCode';
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
    .select('id, dispatch_code, codigo_despacho, customer_name, customer_email, customer_phone, region, shipping_address, items, subtotal, tax, shipping_fee, total, currency, payment_id, payment_status, status, created_at, updated_at')
    .eq('id', orderId)
    .single();
  if (error || !data) throw new Error(error?.message || `No se encontró la orden ${orderId}.`);
  return data as BoletaPdfOrder & { status?: string | null; dispatch_code?: string | null; codigo_despacho?: string | null };
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

function buildHtml(order: BoletaPdfOrder & { status?: string | null }, invoice: BoletaPdfInvoice | null, trackingUrl: string, dispatchCode: string) {
  const items = Array.isArray(order.items) ? order.items : [];
  const rows = items.slice(0, 8).map((item) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #1A1B1F;color:#F2DFBB;font-weight:800;">${safeText(item.nombre, `Producto ${item.productoId}`)}</td>
      <td style="padding:12px 0;border-bottom:1px solid #1A1B1F;color:#BFB8AC;text-align:center;">${item.cantidad}</td>
      <td style="padding:12px 0;border-bottom:1px solid #1A1B1F;color:#FFF9EE;text-align:right;font-weight:900;">${money(Number(item.precioUnitario || 0) * Number(item.cantidad || 1))}</td>
    </tr>`).join('');

  return `<!doctype html>
<html>
  <body style="margin:0;background:#08090A;font-family:Arial,Helvetica,sans-serif;color:#f5f5f5;">
    <div style="max-width:720px;margin:0 auto;padding:28px 14px;">
      <div style="background:radial-gradient(circle at 20% 0%,rgba(255, 176, 0,.26),transparent 260px),linear-gradient(145deg,#111214,#050504);border:1px solid #1A1B1F;border-radius:30px 30px 0 0;padding:30px;color:#FFF9EE;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:48px;height:48px;border-radius:17px;background:#FFB000;color:#08090A;display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:24px;">F</div>
          <div>
            <div style="font-size:23px;font-weight:900;letter-spacing:-.04em;">Soluciones Fabrick</div>
            <div style="font-size:12px;color:#FFB000;text-transform:uppercase;letter-spacing:.18em;">Pago confirmado · pedido en preparación</div>
          </div>
        </div>
        <h1 style="margin:28px 0 10px;font-size:36px;line-height:1;letter-spacing:-.06em;">Tu compra fue confirmada.</h1>
        <p style="margin:0;color:#d4d4d4;line-height:1.6;font-size:15px;">Hola <b style="color:#FFF9EE;">${safeText(order.customer_name, 'cliente')}</b>, recibimos correctamente tu pago por <b style="color:#FFB000;">${money(order.total)}</b>. Tu pedido pasó automáticamente a preparación.</p>
      </div>

      <div style="background:#08090A;border:1px solid #1A1B1F;border-top:0;border-radius:0 0 30px 30px;padding:28px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px;">
          <div style="background:#111214;border:1px solid #1A1B1F;border-radius:18px;padding:16px;">
            <div style="font-size:11px;color:#BFB8AC;text-transform:uppercase;letter-spacing:.16em;font-weight:900;">Orden</div>
            <div style="margin-top:7px;font-size:16px;font-weight:900;color:#FFF9EE;word-break:break-word;">${order.id}</div>
          </div>
          <div style="background:#171200;border:1px solid #4a3a00;border-radius:18px;padding:16px;">
            <div style="font-size:11px;color:#FFB000;text-transform:uppercase;letter-spacing:.16em;font-weight:900;">Código despacho</div>
            <div style="margin-top:7px;font-size:24px;font-weight:900;color:#FFB000;letter-spacing:.08em;">${dispatchCode}</div>
          </div>
          <div style="background:#111214;border:1px solid #1A1B1F;border-radius:18px;padding:16px;">
            <div style="font-size:11px;color:#BFB8AC;text-transform:uppercase;letter-spacing:.16em;font-weight:900;">Boleta</div>
            <div style="margin-top:7px;font-size:16px;font-weight:900;color:#FFF9EE;">${safeText(invoice?.folio, order.id)}</div>
          </div>
          <div style="background:#111214;border:1px solid #1A1B1F;border-radius:18px;padding:16px;">
            <div style="font-size:11px;color:#BFB8AC;text-transform:uppercase;letter-spacing:.16em;font-weight:900;">Estado</div>
            <div style="margin-top:7px;font-size:16px;font-weight:900;color:#22c55e;">En preparación</div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin:12px 0 20px;">
          <thead>
            <tr>
              <th align="left" style="font-size:11px;color:#BFB8AC;text-transform:uppercase;letter-spacing:.14em;padding-bottom:8px;">Producto</th>
              <th align="center" style="font-size:11px;color:#BFB8AC;text-transform:uppercase;letter-spacing:.14em;padding-bottom:8px;">Cant.</th>
              <th align="right" style="font-size:11px;color:#BFB8AC;text-transform:uppercase;letter-spacing:.14em;padding-bottom:8px;">Total</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="3" style="padding:12px 0;color:#BFB8AC;">Compra en tienda</td></tr>'}</tbody>
        </table>

        <div style="background:#111214;border:1px solid #1A1B1F;border-radius:22px;padding:18px;color:#FFF9EE;margin-top:18px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#d4d4d4;"><span>Subtotal</span><b>${money(order.subtotal)}</b></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#d4d4d4;"><span>IVA</span><b>${money(order.tax)}</b></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:12px;color:#d4d4d4;"><span>Despacho</span><b>${money(order.shipping_fee)}</b></div>
          <div style="border-top:1px solid rgba(255,255,255,.14);padding-top:12px;display:flex;justify-content:space-between;font-size:22px;color:#FFB000;"><span style="font-weight:900;">TOTAL</span><b>${money(order.total)}</b></div>
        </div>

        <div style="margin-top:22px;display:flex;gap:10px;flex-wrap:wrap;">
          <a href="${trackingUrl}" style="background:#FFB000;color:#08090A;text-decoration:none;font-weight:900;border-radius:999px;padding:14px 20px;display:inline-block;">Ver seguimiento</a>
          <a href="${getAppBaseUrl()}/verificar-pedido" style="background:#111214;color:#FFB000;text-decoration:none;font-weight:900;border-radius:999px;padding:14px 20px;display:inline-block;border:1px solid #4a3a00;">Verificar con código</a>
          ${invoice?.pdf_url ? `<a href="${invoice.pdf_url}" style="background:#1A1B1F;color:#FFF9EE;text-decoration:none;font-weight:900;border-radius:999px;padding:14px 20px;display:inline-block;border:1px solid #1A1B1F;">Ver PDF proveedor</a>` : ''}
        </div>

        <p style="margin:22px 0 0;color:#BFB8AC;font-size:12px;line-height:1.6;">Guarda este correo. Con el código de despacho puedes verificar el estado del pedido, transportista y número de seguimiento cuando esté disponible.</p>
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
  const dispatchCode = resolveDispatchCode(order as unknown as Record<string, unknown>, order.id);
  const pdfBase64 = generateFabrickBoletaPdfBase64({ order, invoice, trackingUrl });
  const resend = new Resend(credentials.apiKey);

  const response = await resend.emails.send({
    from: credentials.from || 'Soluciones Fabrick <onboarding@resend.dev>',
    to: [order.customer_email],
    subject: `Pago confirmado · Código ${dispatchCode} · Soluciones Fabrick`,
    html: buildHtml(order, invoice, trackingUrl, dispatchCode),
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
