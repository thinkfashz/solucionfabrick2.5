import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { jsPDF } from 'jspdf';
import { insforge } from '@/lib/insforge';
import { calculateCheckoutSummary, validateCheckoutPayload, type CheckoutPayload } from '@/lib/checkout';
import { getResendCredentials } from '@/lib/resendCredentials';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DELIVERY_WINDOW = '7 a 21 días hábiles';
const DEFAULT_FROM = 'Soluciones Fabrick <onboarding@resend.dev>';

type ExtendedCheckoutPayload = CheckoutPayload & {
  shippingHouseNumber?: string;
  paymentMethod?: string;
};

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value || 0);
}

function adminEmail() {
  return (
    process.env.CHECKOUT_ADMIN_EMAIL ||
    process.env.RESEND_ADMIN_EMAIL ||
    process.env.NEXT_PUBLIC_BANK_ACCOUNT_EMAIL ||
    'pagos@solucionesfabrick.cl'
  );
}

function fullAddress(address?: string, number?: string) {
  return [address, number ? `N° ${number}` : ''].filter(Boolean).join(' · ');
}

function estimateInternalShipping(region: string, total: number, itemsCount: number) {
  const normalized = (region || '').toUpperCase();
  const far = ['XV', 'I', 'II', 'XI', 'XII', 'ARICA', 'TARAPACÁ', 'ANTOFAGASTA', 'AYSÉN', 'MAGALLANES'].some((r) => normalized.includes(r));
  const base = far ? 42000 : normalized.includes('MAULE') || normalized.includes('LINARES') ? 18000 : 28000;
  const volumeFactor = Math.min(45000, Math.max(0, (itemsCount - 1) * 6500));
  const insurance = Math.round(Math.min(total * 0.018, 35000));
  return {
    estimatedCarrierCost: base + volumeFactor + insurance,
    method: 'Estimación interna gratuita por zona + volumen + seguro referencial',
    source: 'checkout-local-free-estimator',
  };
}

function buildReceiptPdf(params: {
  id: string;
  cliente: ExtendedCheckoutPayload['cliente'];
  items: ExtendedCheckoutPayload['items'];
  resumen: ReturnType<typeof calculateCheckoutSummary>;
  region: string;
  address: string;
  createdAt: string;
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const left = 44;
  let y = 48;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Boleta / Comprobante de solicitud', left, y);
  y += 24;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Orden: ${params.id}`, left, y);
  y += 16;
  doc.text(`Fecha: ${new Date(params.createdAt).toLocaleString('es-CL')}`, left, y);
  y += 16;
  doc.text(`Cliente: ${params.cliente.nombre}`, left, y);
  y += 16;
  doc.text(`Email: ${params.cliente.email}`, left, y);
  y += 16;
  doc.text(`Teléfono: ${params.cliente.telefono || 'No informado'}`, left, y);
  y += 16;
  doc.text(`Dirección: ${params.address || 'No informada'}`, left, y, { maxWidth: 500 });
  y += 28;
  doc.text(`Región: ${params.region}`, left, y);
  y += 16;
  doc.text(`Entrega estimada: ${DELIVERY_WINDOW}`, left, y);
  y += 30;
  doc.setFont('helvetica', 'bold');
  doc.text('Detalle del producto', left, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  params.items.forEach((item, index) => {
    const line = `${index + 1}. ${item.nombre || item.productoId} · Cantidad ${item.cantidad} · Unitario ${formatCLP(item.precioUnitario)} · Total ${formatCLP(item.cantidad * item.precioUnitario)}`;
    doc.text(line, left, y, { maxWidth: 500 });
    y += 18;
  });
  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.text(`Subtotal: ${formatCLP(params.resumen.subtotal)}`, left, y);
  y += 18;
  doc.text(`IVA: ${formatCLP(params.resumen.iva)}`, left, y);
  y += 18;
  doc.text(`Despacho visible cliente: ${formatCLP(params.resumen.despacho)}`, left, y);
  y += 18;
  doc.text(`Total a transferir: ${formatCLP(params.resumen.total)}`, left, y);
  y += 34;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Este documento confirma la solicitud de compra por transferencia. La preparación/despacho se inicia al validar el pago.', left, y, { maxWidth: 500 });
  return Buffer.from(doc.output('arraybuffer'));
}

function buildCustomerHtml(params: { id: string; cliente: ExtendedCheckoutPayload['cliente']; resumen: ReturnType<typeof calculateCheckoutSummary>; address: string; items: ExtendedCheckoutPayload['items'] }) {
  const rows = params.items.map((item) => `<tr><td style="padding:10px;border-bottom:1px solid #eee">${item.nombre || item.productoId}</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:center">${item.cantidad}</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:right">${formatCLP(item.precioUnitario)}</td></tr>`).join('');
  return `<div style="font-family:Arial,sans-serif;color:#111;max-width:680px;margin:auto"><h1>Compra recibida</h1><p>Hola ${params.cliente.nombre}, recibimos tu orden <b>${params.id}</b>.</p><p><b>Total a transferir:</b> ${formatCLP(params.resumen.total)}</p><p><b>Entrega estimada:</b> ${DELIVERY_WINDOW}</p><p><b>Dirección:</b> ${params.address}</p><table style="width:100%;border-collapse:collapse;margin:20px 0"><thead><tr><th align="left">Producto</th><th>Cant.</th><th align="right">Precio</th></tr></thead><tbody>${rows}</tbody></table><p>Adjuntamos tu boleta/comprobante en PDF. Te avisaremos cuando el pago sea validado y el pedido pase a preparación.</p></div>`;
}

function buildAdminHtml(params: { id: string; body: ExtendedCheckoutPayload; resumen: ReturnType<typeof calculateCheckoutSummary>; address: string; shippingEstimate: ReturnType<typeof estimateInternalShipping>; createdAt: string }) {
  return `<div style="font-family:Arial,sans-serif;color:#111;max-width:760px;margin:auto"><h1>Nueva compra por transferencia</h1><p><b>Orden:</b> ${params.id}</p><p><b>Fecha:</b> ${new Date(params.createdAt).toLocaleString('es-CL')}</p><p><b>Cliente:</b> ${params.body.cliente.nombre} · ${params.body.cliente.email} · ${params.body.cliente.telefono || 'sin teléfono'}</p><p><b>Dirección:</b> ${params.address}</p><p><b>Región:</b> ${params.body.region}</p><p><b>Total cliente:</b> ${formatCLP(params.resumen.total)}</p><p><b>Despacho cobrado al cliente:</b> ${formatCLP(params.resumen.despacho)}</p><p><b>Envío interno estimado aprox.:</b> ${formatCLP(params.shippingEstimate.estimatedCarrierCost)}</p><p><b>Método estimación:</b> ${params.shippingEstimate.method}</p><p><b>Entrega prometida:</b> ${DELIVERY_WINDOW}</p><pre style="background:#111;color:#fff;padding:16px;border-radius:12px;white-space:pre-wrap">${JSON.stringify(params.body.items, null, 2)}</pre></div>`;
}

async function sendTransferEmails(params: {
  id: string;
  body: ExtendedCheckoutPayload;
  resumen: ReturnType<typeof calculateCheckoutSummary>;
  address: string;
  createdAt: string;
  shippingEstimate: ReturnType<typeof estimateInternalShipping>;
}) {
  const creds = await getResendCredentials();
  if (!creds.ready || !creds.apiKey) return { ok: false, reason: 'Resend no configurado' };
  const resend = new Resend(creds.apiKey);
  const from = creds.from || DEFAULT_FROM;
  const pdf = buildReceiptPdf({ id: params.id, cliente: params.body.cliente, items: params.body.items, resumen: params.resumen, region: params.body.region, address: params.address, createdAt: params.createdAt });
  const attachments = [{ filename: `boleta-${params.id}.pdf`, content: pdf }];
  const customer = await resend.emails.send({
    from,
    to: params.body.cliente.email,
    subject: `Tu compra Soluciones Fabrick · ${params.id}`,
    html: buildCustomerHtml({ id: params.id, cliente: params.body.cliente, resumen: params.resumen, address: params.address, items: params.body.items }),
    attachments,
  });
  const admin = await resend.emails.send({
    from,
    to: adminEmail(),
    subject: `Nueva compra por transferencia · ${params.id}`,
    html: buildAdminHtml(params),
    attachments,
  });
  return { ok: !customer.error && !admin.error, customerId: customer.data?.id ?? null, adminId: admin.data?.id ?? null, customerError: customer.error?.message ?? null, adminError: admin.error?.message ?? null };
}

export async function POST(request: Request) {
  try {
    const body: ExtendedCheckoutPayload = await request.json();
    const { items, region, cliente, shippingAddress, shippingHouseNumber } = body;

    const validationErrors = validateCheckoutPayload(body);
    if (validationErrors.length > 0) {
      return NextResponse.json({ error: 'Datos inválidos.', validationErrors }, { status: 422 });
    }

    const resumen = calculateCheckoutSummary(items, region);
    const id = `FBK-T-${Date.now()}-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
    const now = new Date().toISOString();
    const address = fullAddress(shippingAddress, shippingHouseNumber);
    const shippingEstimate = estimateInternalShipping(region, resumen.total, items.reduce((acc, item) => acc + item.cantidad, 0));

    const { error: insertError } = await insforge.database
      .from('orders')
      .insert([
        {
          id,
          customer_name: cliente.nombre,
          customer_email: cliente.email,
          customer_phone: cliente.telefono ?? null,
          region,
          shipping_address: address || null,
          items,
          subtotal: resumen.subtotal,
          tax: resumen.iva,
          shipping_fee: resumen.despacho,
          total: resumen.total,
          currency: resumen.moneda,
          status: 'pendiente_transferencia',
          created_at: now,
          updated_at: now,
        },
      ]);

    if (insertError) {
      return NextResponse.json(
        { error: `No se pudo registrar la orden: ${insertError.message}` },
        { status: 500 },
      );
    }

    let notification: Awaited<ReturnType<typeof sendTransferEmails>> = { ok: false, reason: 'No ejecutado' };
    try {
      notification = await sendTransferEmails({ id, body, resumen, address, createdAt: now, shippingEstimate });
    } catch (mailError) {
      notification = { ok: false, reason: mailError instanceof Error ? mailError.message : 'Error enviando emails' };
    }

    return NextResponse.json(
      {
        data: {
          id,
          resumen,
          estado: 'pendiente_transferencia',
          creadoEn: now,
          cliente,
          shippingAddress: address,
          deliveryEstimate: DELIVERY_WINDOW,
        },
        payment: { method: 'transfer' },
        notification,
        admin: {
          shippingEstimate,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
