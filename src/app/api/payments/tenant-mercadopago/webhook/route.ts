import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforge } from '@/lib/insforge';
import { readTenantIntegration } from '@/lib/tenantIntegrations';
import { emitBoletaForOrder } from '@/lib/billing/autoEmit';
import { dispatchHookAsync } from '@/lib/extensionsBus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type MercadoPagoWebhookBody = {
  type?: string;
  action?: string;
  data?: { id?: string | number };
  resource?: string;
};

type MercadoPagoPayment = {
  id?: string | number | null;
  status?: string | null;
  status_detail?: string | null;
  external_reference?: string | null;
  metadata?: { tenant_id?: string; [key: string]: unknown } | null;
};

function resolveTenantId(request: NextRequest, body: MercadoPagoWebhookBody): string {
  return request.nextUrl.searchParams.get('tenant_id')
    || request.headers.get('x-tenant-id')
    || request.headers.get('x-fabrick-tenant-id')
    || (typeof body?.data === 'object' && body.data ? String((body.data as Record<string, unknown>).tenant_id ?? '') : '')
    || '';
}

function resolvePaymentId(body: MercadoPagoWebhookBody, request: NextRequest): string {
  const fromData = body?.data?.id != null ? String(body.data.id) : '';
  if (fromData) return fromData;
  const idParam = request.nextUrl.searchParams.get('id') || request.nextUrl.searchParams.get('data.id') || '';
  if (idParam) return idParam;
  if (typeof body.resource === 'string') {
    const parts = body.resource.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? '';
  }
  return '';
}

function orderStatusFromPayment(status: string) {
  if (status === 'approved') return 'pagada';
  if (status === 'pending' || status === 'in_process' || status === 'authorized') return 'pendiente_pago';
  return 'rechazada';
}

async function fetchPayment(tenantId: string, paymentId: string): Promise<MercadoPagoPayment | null> {
  const integration = await readTenantIntegration(tenantId, 'mercadopago', ['access_token']);
  if (!integration.ready || !integration.values.access_token) return null;

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${integration.values.access_token}` },
    cache: 'no-store',
  });

  if (!res.ok) return null;
  return await res.json() as MercadoPagoPayment;
}

async function updateOrder(tenantId: string, payment: MercadoPagoPayment) {
  const orderId = payment.external_reference ? String(payment.external_reference) : '';
  const status = payment.status || 'unknown';
  const paymentId = payment.id != null ? String(payment.id) : null;
  if (!orderId) return { updated: false, orderId: null };

  await insforge.database
    .from('orders')
    .update({
      status: orderStatusFromPayment(status),
      payment_id: paymentId,
      payment_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('tenant_id', tenantId);

  if (status === 'approved') {
    emitBoletaForOrder(orderId).catch((err) => console.warn('[tenant-mp-webhook] dte auto-emit failed:', err));
    dispatchHookAsync('order.paid', {
      orderId,
      tenantId,
      paymentId,
      paymentStatus: status,
      provider: 'mercadopago',
    });
  }

  return { updated: true, orderId };
}

export async function POST(request: NextRequest) {
  let body: MercadoPagoWebhookBody;
  try {
    body = await request.json() as MercadoPagoWebhookBody;
  } catch {
    body = {};
  }

  const tenantId = resolveTenantId(request, body);
  const paymentId = resolvePaymentId(body, request);

  if (!tenantId) {
    return NextResponse.json({ ok: false, error: 'tenant_id requerido para webhook tenant.', code: 'tenant_required' }, { status: 400 });
  }

  if (!paymentId) {
    return NextResponse.json({ ok: false, error: 'No se recibió payment id.', code: 'payment_id_required' }, { status: 400 });
  }

  const payment = await fetchPayment(tenantId, paymentId);
  if (!payment) {
    return NextResponse.json({ ok: false, error: 'No se pudo consultar el pago en MercadoPago para este tenant.', code: 'payment_lookup_failed' }, { status: 202 });
  }

  const metadataTenantId = payment.metadata?.tenant_id;
  if (metadataTenantId && metadataTenantId !== tenantId) {
    return NextResponse.json({ ok: false, error: 'El pago no pertenece al tenant indicado.', code: 'tenant_mismatch' }, { status: 403 });
  }

  const result = await updateOrder(tenantId, payment);

  return NextResponse.json({
    ok: true,
    tenantId,
    paymentId: String(payment.id ?? paymentId),
    status: payment.status ?? null,
    statusDetail: payment.status_detail ?? null,
    orderId: result.orderId,
    updated: result.updated,
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'tenant-mercadopago-webhook' });
}
