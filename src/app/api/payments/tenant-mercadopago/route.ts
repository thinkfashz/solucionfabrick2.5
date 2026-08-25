import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import { mapMercadoPagoStatusDetail } from '@/lib/mercadopagoStatus';
import { readTenantIntegration } from '@/lib/tenantIntegrations';
import { emitBoletaForOrder } from '@/lib/billing/autoEmit';
import { dispatchHookAsync } from '@/lib/extensionsBus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type TenantMercadoPagoBody = {
  token?: string;
  description?: string;
  email?: string;
  installments?: number | string;
  payment_method_id?: string;
  issuer_id?: string;
  externalReference?: string;
};

type MercadoPagoPaymentResponse = {
  id?: number | string | null;
  status?: string | null;
  status_detail?: string | null;
};

type OrderRow = {
  id?: string;
  total?: number | string | null;
  status?: string | null;
  payment_status?: string | null;
  customer_email?: string | null;
  cliente_email?: string | null;
};

function resolveTenantId(request: Request): string {
  return request.headers.get('x-tenant-id') || request.headers.get('x-fabrick-tenant-id') || '';
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function makeIdempotencyKey(request: Request, externalReference: string) {
  return request.headers.get('x-idempotency-key')
    || request.headers.get('x-request-id')
    || `tenant-mp-${externalReference}-${Date.now()}`;
}

function isAlreadyPaid(order: OrderRow) {
  const paymentStatus = cleanText(order.payment_status).toLowerCase();
  const status = cleanText(order.status).toLowerCase();
  return paymentStatus === 'approved'
    || ['pagada', 'pagado', 'confirmado', 'confirmada', 'en_preparacion', 'enviado', 'entregado'].includes(status);
}

async function loadOrder(tenantId: string, orderId: string): Promise<OrderRow | null> {
  const { data, error } = await insforge.database
    .from('orders')
    .select('id,total,status,payment_status,customer_email,cliente_email')
    .eq('tenant_id', tenantId)
    .eq('id', orderId)
    .limit(1);
  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data[0] as OrderRow;
}

async function updateOrderStatus(tenantId: string, orderId: string, paymentId: string | null, paymentStatus: string) {
  const orderStatus = paymentStatus === 'approved'
    ? 'pagada'
    : paymentStatus === 'pending' || paymentStatus === 'in_process' || paymentStatus === 'authorized'
      ? 'pendiente_pago'
      : 'rechazada';

  await insforge.database
    .from('orders')
    .update({
      status: orderStatus,
      payment_id: paymentId,
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('tenant_id', tenantId);
}

export async function POST(request: Request) {
  const tenantId = resolveTenantId(request);
  if (!tenantId) {
    return NextResponse.json({ error: 'No se pudo resolver tenant_id para el pago.', code: 'tenant_required' }, { status: 400 });
  }

  const credentials = await readTenantIntegration(tenantId, 'mercadopago', ['access_token']);
  if (!credentials.ready || !credentials.values.access_token) {
    return NextResponse.json(
      {
        error: 'MercadoPago no está configurado para esta empresa.',
        code: 'tenant_mp_not_configured',
        missing: credentials.missing,
      },
      { status: 503 },
    );
  }

  let body: TenantMercadoPagoBody;
  try {
    body = await request.json() as TenantMercadoPagoBody;
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido.', code: 'invalid_json' }, { status: 400 });
  }

  const token = cleanText(body.token);
  const paymentMethodId = cleanText(body.payment_method_id) || 'visa';
  const description = cleanText(body.description) || 'Compra en Soluciones Fabrick';
  const externalReference = cleanText(body.externalReference);
  const installments = Math.max(1, Number(body.installments || 1));

  if (!token || !externalReference) {
    return NextResponse.json(
      { error: 'token y externalReference son requeridos.', code: 'invalid_payload' },
      { status: 400 },
    );
  }

  const order = await loadOrder(tenantId, externalReference);
  if (!order?.id) {
    return NextResponse.json({ error: 'La orden no existe en este tenant.', code: 'order_not_found' }, { status: 404 });
  }
  if (isAlreadyPaid(order)) {
    return NextResponse.json({ error: 'La orden ya figura pagada y no admite un segundo cobro.', code: 'order_already_paid' }, { status: 409 });
  }

  const amount = Number(order.total);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'La orden no tiene un total cobrable válido.', code: 'invalid_order_total' }, { status: 409 });
  }

  const email = cleanText(order.customer_email || order.cliente_email || body.email).toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'La orden no tiene un correo válido para el pagador.', code: 'payer_email_missing' }, { status: 409 });
  }

  const payload: Record<string, unknown> = {
    transaction_amount: amount,
    token,
    description,
    installments,
    payment_method_id: paymentMethodId,
    payer: { email },
    binary_mode: false,
    external_reference: externalReference,
    metadata: { tenant_id: tenantId, order_id: externalReference, source: 'tenant-mercadopago' },
  };

  if (body.issuer_id) payload.issuer_id = String(body.issuer_id);

  try {
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.values.access_token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': makeIdempotencyKey(request, externalReference),
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const json = await mpResponse.json().catch(() => ({})) as MercadoPagoPaymentResponse & Record<string, unknown>;
    if (!mpResponse.ok) {
      return NextResponse.json(
        {
          status: 'rejected',
          statusDetail: json.status_detail ?? `HTTP ${mpResponse.status}`,
          message: 'MercadoPago rechazó la solicitud de pago.',
          code: 'mp_request_failed',
          provider: 'mercadopago',
        },
        { status: 422 },
      );
    }

    const mpStatus = json.status || 'rejected';
    const mpStatusDetail = json.status_detail ?? null;
    const mpPaymentId = json.id != null ? String(json.id) : null;

    try {
      await updateOrderStatus(tenantId, externalReference, mpPaymentId, mpStatus);
    } catch (persistErr) {
      console.warn('[tenant-mp] could not persist order status:', persistErr);
    }

    if (mpStatus === 'approved') {
      emitBoletaForOrder(externalReference).catch((err) => console.warn('[tenant-mp] dte auto-emit failed:', err));
      dispatchHookAsync('order.paid', {
        orderId: externalReference,
        tenantId,
        paymentId: mpPaymentId,
        paymentStatus: mpStatus,
        provider: 'mercadopago',
      });
      return NextResponse.json({
        status: mpStatus,
        statusDetail: mpStatusDetail,
        paymentId: mpPaymentId,
        message: '¡Pago aprobado!',
        tenantId,
      });
    }

    if (mpStatus === 'pending' || mpStatus === 'in_process' || mpStatus === 'authorized') {
      return NextResponse.json(
        {
          status: mpStatus,
          statusDetail: mpStatusDetail,
          paymentId: mpPaymentId,
          message: 'Pago en proceso. Te confirmaremos cuando se acredite.',
          tenantId,
        },
        { status: 202 },
      );
    }

    return NextResponse.json(
      {
        status: mpStatus,
        statusDetail: mpStatusDetail,
        paymentId: mpPaymentId,
        message: mapMercadoPagoStatusDetail(mpStatusDetail),
        code: 'payment_rejected',
        tenantId,
      },
      { status: 422 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error al procesar pago tenant.',
        code: 'tenant_mp_server_error',
      },
      { status: 500 },
    );
  }
}
