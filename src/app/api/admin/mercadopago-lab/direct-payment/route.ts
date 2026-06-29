import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { appendMercadoPagoLabEvent, mpLabFetch } from '@/lib/mercadoPagoLab';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type BrickPayer = {
  email?: string;
  identification?: {
    type?: string;
    number?: string;
  };
};

type BrickPaymentPayload = {
  token?: string;
  transaction_amount?: number | string;
  amount?: number | string;
  installments?: number | string;
  payment_method_id?: string;
  issuer_id?: string | number;
  payer?: BrickPayer;
  description?: string;
  external_reference?: string;
};

type MercadoPagoPayment = {
  id?: string | number;
  status?: string;
  status_detail?: string;
  payment_method_id?: string;
  payment_type_id?: string;
  transaction_amount?: number;
  external_reference?: string;
  [key: string]: unknown;
};

async function requireAdmin(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!cookie?.value) return null;
  return decodeSession(cookie.value);
}

function toPositiveNumber(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : 0;
}

function normalizePayload(body: BrickPaymentPayload) {
  const amount = toPositiveNumber(body.transaction_amount ?? body.amount);
  const installments = Math.max(1, Math.round(toPositiveNumber(body.installments) || 1));
  const payerEmail = body.payer?.email?.trim();
  return {
    token: body.token?.trim(),
    amount,
    installments,
    paymentMethodId: body.payment_method_id?.trim(),
    issuerId: typeof body.issuer_id === 'number' ? body.issuer_id : body.issuer_id?.trim(),
    payerEmail,
    identification: body.payer?.identification,
    description: body.description?.trim() || 'Pago interno demo MercadoPago Lab',
    externalReference: body.external_reference?.trim() || `mp_lab_direct_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  if (session.rol === 'viewer') return NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 });

  let body: BrickPaymentPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const normalized = normalizePayload(body);
  if (!normalized.token) return NextResponse.json({ error: 'Falta token de tarjeta generado por Mercado Pago Brick.' }, { status: 400 });
  if (!normalized.paymentMethodId) return NextResponse.json({ error: 'Falta payment_method_id.' }, { status: 400 });
  if (!normalized.payerEmail) return NextResponse.json({ error: 'Falta payer.email.' }, { status: 400 });
  if (!normalized.amount || normalized.amount < 100) return NextResponse.json({ error: 'Monto inválido. Usa mínimo $100 CLP.' }, { status: 400 });

  try {
    const paymentBody: Record<string, unknown> = {
      transaction_amount: normalized.amount,
      token: normalized.token,
      description: normalized.description,
      installments: normalized.installments,
      payment_method_id: normalized.paymentMethodId,
      issuer_id: normalized.issuerId,
      payer: {
        email: normalized.payerEmail,
        identification: normalized.identification,
      },
      external_reference: normalized.externalReference,
      binary_mode: false,
      metadata: {
        scope: 'admin_mercadopago_lab_direct_card',
        isolated: true,
      },
    };

    const payment = await mpLabFetch<MercadoPagoPayment>('/v1/payments', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': randomUUID() },
      body: JSON.stringify(paymentBody),
    });

    const paymentId = payment.id != null ? String(payment.id) : undefined;
    await appendMercadoPagoLabEvent({
      id: `mp_lab_direct_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      receivedAt: new Date().toISOString(),
      method: 'DIRECT_CARD_PAYMENT',
      query: {},
      body: { externalReference: normalized.externalReference, amount: normalized.amount, paymentMethodId: normalized.paymentMethodId },
      paymentId,
      type: 'direct_card_payment',
      action: 'created',
      payment,
    });

    return NextResponse.json({
      ok: true,
      paymentId,
      status: payment.status ?? 'unknown',
      statusDetail: payment.status_detail ?? null,
      externalReference: normalized.externalReference,
      payment,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo crear el pago interno.' }, { status: 502 });
  }
}
