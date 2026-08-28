import 'server-only';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { insforgeAdmin } from '@/lib/insforge';
import { ensureInvoicesTable } from '@/lib/billing/sql';
import { resolveBillingCredentials } from '@/lib/billing/credentials';
import { emitBoletaForOrder } from '@/lib/billing/autoEmit';
import { sendOrderDteEmail } from '@/lib/email/sendOrderDteEmail';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PAID_ORDER_STATES = new Set(['pagada', 'en_preparacion', 'enviado', 'entregado']);

type InvoiceRow = {
  id: string;
  folio?: string | null;
  dte_type?: number | null;
  provider?: string | null;
  sii_status?: string | null;
  voided?: boolean | null;
  created_at?: string | null;
};

type OrderRow = {
  id: string;
  customer_name?: string | null;
  customer_email?: string | null;
  total?: number | null;
  payment_id?: string | null;
  payment_status?: string | null;
  status?: string | null;
  shipment_details?: { billing?: { documentType?: 'boleta' | 'factura' } } | null;
  updated_at?: string | null;
  created_at?: string | null;
};

function clean(value: unknown, max = 120) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function isPaid(order: OrderRow) {
  return String(order.payment_status || '').toLowerCase() === 'approved'
    || PAID_ORDER_STATES.has(String(order.status || '').toLowerCase());
}

function isRealInvoice(invoice: InvoiceRow) {
  const provider = String(invoice.provider || '').toLowerCase();
  const sii = String(invoice.sii_status || '').toLowerCase();
  return !invoice.voided && Boolean(provider) && provider !== 'mock' && !sii.includes('mock');
}

async function readInvoices(orderId: string): Promise<InvoiceRow[]> {
  const { data } = await insforgeAdmin.database
    .from('invoices')
    .select('id, folio, dte_type, provider, sii_status, voided, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(8);
  return Array.isArray(data) ? data as InvoiceRow[] : [];
}

export async function GET(request: NextRequest) {
  const access = await requireAdminPermission(request, { resource: 'finance', action: 'read' });
  if (!access.ok) return access.response;

  await ensureInvoicesTable();
  const billing = await resolveBillingCredentials();
  const { data, error } = await insforgeAdmin.database
    .from('orders')
    .select('id, customer_name, customer_email, total, payment_id, payment_status, status, shipment_details, updated_at, created_at')
    .order('updated_at', { ascending: false })
    .limit(40);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const paid = (Array.isArray(data) ? data as OrderRow[] : []).filter(isPaid).slice(0, 16);

  const inspected = await Promise.all(paid.map(async (order) => {
    const invoices = await readInvoices(order.id);
    const real = invoices.find(isRealInvoice);
    if (real) return null;
    const simulated = invoices.find((invoice) => !invoice.voided) || null;
    const requested = order.shipment_details?.billing?.documentType === 'factura' ? 'factura' : 'boleta';
    return {
      orderId: order.id,
      customerName: order.customer_name || 'Cliente',
      customerEmail: order.customer_email || '',
      total: Number(order.total || 0),
      paymentId: order.payment_id || '',
      paymentStatus: order.payment_status || '',
      orderStatus: order.status || '',
      requestedDocument: requested,
      updatedAt: order.updated_at || order.created_at || '',
      currentInvoice: simulated ? {
        id: simulated.id,
        provider: simulated.provider || 'mock',
        siiStatus: simulated.sii_status || 'accepted_mock',
        folio: simulated.folio || '',
        dteType: Number(simulated.dte_type || (requested === 'factura' ? 33 : 39)),
      } : null,
      reason: simulated ? 'simulated' : 'missing',
    };
  }));

  return NextResponse.json({
    ok: true,
    billingConfigured: billing.ready,
    provider: billing.ready ? 'haulmer' : 'mock',
    pending: inspected.filter(Boolean),
  }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

export async function POST(request: NextRequest) {
  const access = await requireAdminPermission(request, { resource: 'finance', action: 'update' });
  if (!access.ok) return access.response;

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }); }

  const orderId = clean(body.orderId, 100);
  if (!orderId) return NextResponse.json({ error: 'orderId requerido.' }, { status: 400 });

  const billing = await resolveBillingCredentials();
  if (!billing.ready) {
    return NextResponse.json({ error: 'Configura API key, RUT emisor y razón social de OpenFactura antes de emitir DTE real.' }, { status: 409 });
  }

  const { data: orderData, error: orderError } = await insforgeAdmin.database
    .from('orders')
    .select('id, payment_status, status')
    .eq('id', orderId)
    .single();
  if (orderError || !orderData) return NextResponse.json({ error: orderError?.message || 'Orden no encontrada.' }, { status: 404 });
  if (!isPaid(orderData as OrderRow)) return NextResponse.json({ error: 'La orden todavía no está pagada; no se puede emitir DTE.' }, { status: 409 });

  const invoice = await emitBoletaForOrder(orderId);
  if (!invoice.ok) return NextResponse.json({ error: invoice.error || 'No se pudo emitir el DTE.', invoice }, { status: 422 });
  if (invoice.simulated || invoice.provider === 'mock') {
    return NextResponse.json({ error: 'La emisión siguió en modo simulado. Revisa la configuración tributaria.', invoice }, { status: 409 });
  }

  let email;
  try { email = await sendOrderDteEmail(orderId); }
  catch (error) { email = { ok: false, error: error instanceof Error ? error.message : 'Falló el correo del DTE.' }; }

  return NextResponse.json({
    ok: true,
    orderId,
    invoice: {
      invoiceId: invoice.invoice_id || null,
      folio: invoice.folio || null,
      provider: invoice.provider || 'haulmer',
      dteType: invoice.dte_type || null,
      alreadyExisted: Boolean(invoice.already_existed),
      upgradedFromMock: Boolean(invoice.upgraded_from_mock),
    },
    email: {
      ok: Boolean(email.ok),
      skipped: Boolean(email.skipped),
      reason: email.reason || null,
      error: email.error || null,
    },
    message: email.ok
      ? 'DTE real confirmado y enviado al correo del cliente.'
      : 'DTE real confirmado. El correo no pudo enviarse; el documento quedó guardado igualmente.',
  }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
