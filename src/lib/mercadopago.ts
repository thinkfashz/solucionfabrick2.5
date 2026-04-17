import { createHmac, timingSafeEqual } from 'node:crypto';
import type { CheckoutPayload, CheckoutSummary, LineItem } from '@/lib/checkout';

const DEFAULT_SITE_URL = 'https://fabrick.cl';
const API_BASE = 'https://api.mercadopago.com';

export interface MercadoPagoPreferenceResult {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
}

export interface MercadoPagoPaymentResponse {
  id: number | string;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  transaction_amount?: number;
  currency_id?: string;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export function getAppBaseUrl() {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

  return trimTrailingSlash(fromEnv || DEFAULT_SITE_URL);
}

export function getMercadoPagoAccessToken() {
  return (
    process.env.MERCADO_PAGO_ACCESS_TOKEN ||
    process.env.MP_ACCESS_TOKEN ||
    process.env.MERCADOPAGO_ACCESS_TOKEN ||
    ''
  ).trim();
}

export function getMercadoPagoWebhookSecret() {
  return (
    process.env.MERCADO_PAGO_WEBHOOK_SECRET ||
    process.env.MP_WEBHOOK_SECRET ||
    process.env.PAYMENTS_WEBHOOK_SECRET ||
    ''
  ).trim();
}

function getPaymentItems(items: LineItem[], summary: CheckoutSummary) {
  const mapped = items.map((item) => ({
    id: String(item.productoId),
    title: item.nombre || `Producto ${item.productoId}`,
    quantity: item.cantidad,
    currency_id: summary.moneda,
    unit_price: Number(item.precioUnitario.toFixed(2)),
  }));

  if (summary.iva > 0) {
    mapped.push({
      id: 'iva',
      title: 'IVA',
      quantity: 1,
      currency_id: summary.moneda,
      unit_price: Number(summary.iva.toFixed(2)),
    });
  }

  if (summary.despacho > 0) {
    mapped.push({
      id: 'despacho',
      title: 'Despacho',
      quantity: 1,
      currency_id: summary.moneda,
      unit_price: Number(summary.despacho.toFixed(2)),
    });
  }

  return mapped;
}

async function mercadoPagoFetch<T>(path: string, init: RequestInit) {
  const accessToken = getMercadoPagoAccessToken();
  if (!accessToken) {
    throw new Error('Falta configurar MERCADO_PAGO_ACCESS_TOKEN.');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || data?.error || `Mercado Pago respondió con estado ${response.status}.`;
    throw new Error(message);
  }

  return data as T;
}

export async function createMercadoPagoPreference(params: {
  orderId: string;
  payload: CheckoutPayload;
  summary: CheckoutSummary;
}) {
  const baseUrl = getAppBaseUrl();
  const { orderId, payload, summary } = params;

  const successUrl = `${baseUrl}/checkout?payment_status=success&external_reference=${encodeURIComponent(orderId)}`;
  const failureUrl = `${baseUrl}/checkout?payment_status=failure&external_reference=${encodeURIComponent(orderId)}`;
  const pendingUrl = `${baseUrl}/checkout?payment_status=pending&external_reference=${encodeURIComponent(orderId)}`;
  const notificationUrl = `${baseUrl}/api/payments/webhook?source=mercadopago`;

  const body = {
    items: getPaymentItems(payload.items, summary),
    payer: {
      name: payload.cliente.nombre,
      email: payload.cliente.email,
      phone: payload.cliente.telefono
        ? {
            number: payload.cliente.telefono,
          }
        : undefined,
    },
    external_reference: orderId,
    statement_descriptor: 'FABRICK',
    notification_url: notificationUrl,
    back_urls: {
      success: successUrl,
      failure: failureUrl,
      pending: pendingUrl,
    },
    auto_return: 'approved',
    binary_mode: false,
    metadata: {
      order_id: orderId,
      region: payload.region,
      shipping_address: payload.shippingAddress || '',
    },
  };

  return mercadoPagoFetch<MercadoPagoPreferenceResult>('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getMercadoPagoPayment(paymentId: string) {
  return mercadoPagoFetch<MercadoPagoPaymentResponse>(`/v1/payments/${paymentId}`, {
    method: 'GET',
  });
}

function parseSignatureParts(signatureHeader: string | null) {
  if (!signatureHeader) return null;

  const parts = Object.fromEntries(
    signatureHeader
      .split(',')
      .map((entry) => entry.trim())
      .map((entry) => {
        const [key, ...rest] = entry.split('=');
        return [key, rest.join('=')];
      }),
  );

  return {
    ts: parts.ts || '',
    v1: parts.v1 || '',
  };
}

export function verifyMercadoPagoSignature(args: {
  signatureHeader: string | null;
  requestIdHeader: string | null;
  dataId: string | null;
}) {
  const secret = getMercadoPagoWebhookSecret();
  if (!secret) return true;

  const parts = parseSignatureParts(args.signatureHeader);
  if (!parts?.ts || !parts.v1 || !args.dataId || !args.requestIdHeader) {
    return false;
  }

  const manifest = `id:${args.dataId.toLowerCase()};request-id:${args.requestIdHeader};ts:${parts.ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
  } catch {
    return false;
  }
}

export function mapMercadoPagoStatus(status?: string) {
  switch (status) {
    case 'approved':
      return 'pagada';
    case 'rejected':
    case 'cancelled':
      return 'fallida';
    case 'refunded':
    case 'charged_back':
      return 'reembolsada';
    default:
      return 'pendiente_pago';
  }
}
