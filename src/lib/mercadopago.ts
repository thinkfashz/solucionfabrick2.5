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

/**
 * Resolve the Mercado Pago **public** key. The client-side card tokenizer
 * (`new window.MercadoPago(publicKey).createCardToken(...)`) needs this value;
 * it's safe to expose to the browser (that's why MP calls it "public"). To
 * avoid the very common foot-gun of naming the env var slightly wrong on
 * Vercel, we accept the most common spellings — both the `NEXT_PUBLIC_*`
 * variants (inlined into the JS bundle at build time) and the server-only
 * variants (read at request time and surfaced to the browser via
 * `/api/payments/mp-status`).
 */
export function getMercadoPagoPublicKey() {
  return (
    process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ||
    process.env.MP_PUBLIC_KEY ||
    process.env.MERCADO_PAGO_PUBLIC_KEY ||
    process.env.MERCADOPAGO_PUBLIC_KEY ||
    ''
  ).trim();
}

export type MercadoPagoConnectionStatus =
  | 'ok'
  | 'unconfigured'
  | 'unreachable'
  | 'invalid_token';

export interface MercadoPagoStatusResult {
  status: MercadoPagoConnectionStatus;
  publicKey: string;
  hasAccessToken: boolean;
  reachable: boolean;
  latencyMs: number | null;
  message: string;
}

/**
 * Probe the Mercado Pago gateway and return a sanitized status object suitable
 * for the public `/api/payments/mp-status` endpoint.
 *
 * The probe issues a lightweight authenticated GET against a stable endpoint
 * (`/v1/payment_methods?site_id=MLC`) — it requires a valid access token, is
 * idempotent, costs nothing, and is the documented health-check path used in
 * the official examples. We deliberately do not call `/users/me` because that
 * leaks merchant identity into application logs.
 */
export async function probeMercadoPago(
  options: { timeoutMs?: number; fetchImpl?: typeof fetch } = {},
): Promise<MercadoPagoStatusResult> {
  const publicKey = getMercadoPagoPublicKey();
  const accessToken = getMercadoPagoAccessToken();
  const hasAccessToken = accessToken.length > 0;

  if (!publicKey && !hasAccessToken) {
    return {
      status: 'unconfigured',
      publicKey: '',
      hasAccessToken: false,
      reachable: false,
      latencyMs: null,
      message:
        'Pasarela no configurada: define MERCADO_PAGO_ACCESS_TOKEN y MP_PUBLIC_KEY (o sus variantes NEXT_PUBLIC_*) en el entorno.',
    };
  }

  if (!hasAccessToken) {
    return {
      status: 'unconfigured',
      publicKey,
      hasAccessToken: false,
      reachable: false,
      latencyMs: null,
      message:
        'Falta MERCADO_PAGO_ACCESS_TOKEN: la tokenización funcionará pero no se puede cobrar desde el servidor.',
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 6000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetchImpl(`${API_BASE}/v1/payment_methods?site_id=MLC`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
      cache: 'no-store',
    });
    const latencyMs = Date.now() - startedAt;

    if (response.status === 401 || response.status === 403) {
      return {
        status: 'invalid_token',
        publicKey,
        hasAccessToken: true,
        reachable: true,
        latencyMs,
        message:
          'Mercado Pago rechazó el access token. Genera uno nuevo en el panel de Mercado Pago y actualízalo en Vercel.',
      };
    }

    if (!response.ok) {
      return {
        status: 'unreachable',
        publicKey,
        hasAccessToken: true,
        reachable: false,
        latencyMs,
        message: `Mercado Pago respondió con estado ${response.status}.`,
      };
    }

    return {
      status: 'ok',
      publicKey,
      hasAccessToken: true,
      reachable: true,
      latencyMs,
      message: 'Conexión activa con Mercado Pago.',
    };
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const aborted = err instanceof Error && err.name === 'AbortError';
    return {
      status: 'unreachable',
      publicKey,
      hasAccessToken: true,
      reachable: false,
      latencyMs,
      message: aborted
        ? `Mercado Pago no respondió en ${timeoutMs} ms.`
        : 'No se pudo contactar con api.mercadopago.com.',
    };
  } finally {
    clearTimeout(timer);
  }
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
      return 'confirmado';
    case 'authorized':
    case 'in_process':
    case 'pending':
      return 'pendiente';
    case 'rejected':
    case 'cancelled':
    case 'refunded':
    case 'charged_back':
      return 'cancelado';
    default:
      return 'pendiente';
  }
}
