import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { CheckoutPayload, CheckoutSummary, LineItem } from '@/lib/checkout';
import { getMercadoPagoCredentials } from '@/lib/mercadoPagoCredentials';
import { createOrderTrackingToken } from '@/lib/orderTracking';

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
  return (process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();
}

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

export type MercadoPagoConnectionStatus = 'ok' | 'unconfigured' | 'unreachable' | 'invalid_token';
export type MercadoPagoMode = 'production' | 'sandbox' | 'unknown';

export interface MercadoPagoStatusResult {
  status: MercadoPagoConnectionStatus;
  publicKey: string;
  hasAccessToken: boolean;
  reachable: boolean;
  latencyMs: number | null;
  message: string;
  mode: MercadoPagoMode;
  tokenPrefix: string;
}

export function detectMpMode(accessToken: string): MercadoPagoMode {
  const t = accessToken.trim();
  if (!t) return 'unknown';
  if (t.startsWith('APP_USR-')) return 'production';
  if (t.startsWith('TEST-')) return 'sandbox';
  return 'unknown';
}

export function getMpTokenPrefix(accessToken: string): string {
  const t = accessToken.trim();
  if (!t) return '';
  const dash = t.indexOf('-');
  return dash > 0 ? t.slice(0, dash) : t.slice(0, Math.min(8, t.length));
}

export interface MercadoPagoAccountInfo {
  id: string | number | null;
  email: string | null;
  nickname: string | null;
  siteId: string | null;
  isTestUser: boolean;
}

interface AccountCacheEntry {
  fetchedAt: number;
  account: MercadoPagoAccountInfo | null;
}

const ACCOUNT_CACHE_TTL_MS = 60_000;
const accountCache = new Map<string, AccountCacheEntry>();

function tokenCacheKey(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 16);
}

export async function fetchMercadoPagoAccount(accessToken: string, options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}): Promise<MercadoPagoAccountInfo | null> {
  const token = accessToken.trim();
  if (!token) return null;
  const cacheKey = tokenCacheKey(token);
  const cached = accountCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < ACCOUNT_CACHE_TTL_MS) return cached.account;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 6000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${API_BASE}/users/me`, { method: 'GET', headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store' });
    if (!res.ok) {
      accountCache.set(cacheKey, { fetchedAt: Date.now(), account: null });
      return null;
    }
    const data = (await res.json().catch(() => null)) as { id?: number | string; email?: string; nickname?: string; site_id?: string; tags?: string[] } | null;
    if (!data) {
      accountCache.set(cacheKey, { fetchedAt: Date.now(), account: null });
      return null;
    }
    const account: MercadoPagoAccountInfo = { id: data.id ?? null, email: typeof data.email === 'string' ? data.email : null, nickname: typeof data.nickname === 'string' ? data.nickname : null, siteId: typeof data.site_id === 'string' ? data.site_id : null, isTestUser: Array.isArray(data.tags) ? data.tags.includes('test_user') : false };
    accountCache.set(cacheKey, { fetchedAt: Date.now(), account });
    return account;
  } catch {
    accountCache.set(cacheKey, { fetchedAt: Date.now(), account: null });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function probeMercadoPago(options: { timeoutMs?: number; fetchImpl?: typeof fetch } = {}): Promise<MercadoPagoStatusResult> {
  const resolved = await getMercadoPagoCredentials();
  const publicKey = resolved.publicKey ?? getMercadoPagoPublicKey();
  const accessToken = resolved.accessToken ?? getMercadoPagoAccessToken();
  const hasAccessToken = accessToken.length > 0;
  const mode = detectMpMode(accessToken);
  const tokenPrefix = getMpTokenPrefix(accessToken);
  if (!publicKey && !hasAccessToken) return { status: 'unconfigured', publicKey: '', hasAccessToken: false, reachable: false, latencyMs: null, mode, tokenPrefix, message: 'Pasarela no configurada: define MERCADO_PAGO_ACCESS_TOKEN y MP_PUBLIC_KEY en el entorno.' };
  if (!hasAccessToken) return { status: 'unconfigured', publicKey, hasAccessToken: false, reachable: false, latencyMs: null, mode, tokenPrefix, message: 'Falta MERCADO_PAGO_ACCESS_TOKEN: no se puede cobrar desde el servidor.' };
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 6000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetchImpl(`${API_BASE}/v1/payment_methods?site_id=MLC`, { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal, cache: 'no-store' });
    const latencyMs = Date.now() - startedAt;
    if (response.status === 401 || response.status === 403) return { status: 'invalid_token', publicKey, hasAccessToken: true, reachable: true, latencyMs, mode, tokenPrefix, message: 'Mercado Pago rechazó el access token. Actualízalo en Vercel.' };
    if (!response.ok) return { status: 'unreachable', publicKey, hasAccessToken: true, reachable: false, latencyMs, mode, tokenPrefix, message: `Mercado Pago respondió con estado ${response.status}.` };
    return { status: 'ok', publicKey, hasAccessToken: true, reachable: true, latencyMs, mode, tokenPrefix, message: mode === 'sandbox' ? 'Conexión activa con Mercado Pago en modo demo (TEST).' : 'Conexión activa con Mercado Pago.' };
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const aborted = err instanceof Error && err.name === 'AbortError';
    return { status: 'unreachable', publicKey, hasAccessToken: true, reachable: false, latencyMs, mode, tokenPrefix, message: aborted ? `Mercado Pago no respondió en ${timeoutMs} ms.` : 'No se pudo contactar con api.mercadopago.com.' };
  } finally {
    clearTimeout(timer);
  }
}

export function getMercadoPagoWebhookSecret() {
  return (process.env.MERCADO_PAGO_WEBHOOK_SECRET || process.env.MERCADOPAGO_WEBHOOK_SECRET || process.env.MP_WEBHOOK_SECRET || '').trim();
}

function getPaymentItems(items: LineItem[], summary: CheckoutSummary) {
  const mapped = items.map((item) => ({ id: String(item.productoId), title: item.nombre || `Producto ${item.productoId}`, quantity: item.cantidad, currency_id: summary.moneda, unit_price: Number(item.precioUnitario.toFixed(2)) }));
  if (summary.iva > 0) mapped.push({ id: 'iva', title: 'IVA', quantity: 1, currency_id: summary.moneda, unit_price: Number(summary.iva.toFixed(2)) });
  if (summary.despacho > 0) mapped.push({ id: 'despacho', title: 'Despacho', quantity: 1, currency_id: summary.moneda, unit_price: Number(summary.despacho.toFixed(2)) });
  return mapped;
}

async function mercadoPagoFetch<T>(path: string, init: RequestInit, timeoutMs = 10_000) {
  const resolved = await getMercadoPagoCredentials();
  const accessToken = resolved.accessToken ?? getMercadoPagoAccessToken();
  if (!accessToken) throw new Error('Falta configurar MERCADO_PAGO_ACCESS_TOKEN.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
      cache: 'no-store',
      signal: controller.signal,
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(data?.message || data?.error || `Mercado Pago respondió con estado ${response.status}.`);
    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Mercado Pago no respondió en ${timeoutMs} ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function createMercadoPagoPreference(params: { orderId: string; payload: CheckoutPayload; summary: CheckoutSummary }) {
  const baseUrl = getAppBaseUrl();
  const { orderId, payload, summary } = params;
  const trackingToken = createOrderTrackingToken(orderId);
  const trackingUrl = `${baseUrl}/pedido/${trackingToken}`;
  const notificationUrl = `${baseUrl}/api/webhooks/mercadopago`;
  const body = {
    items: getPaymentItems(payload.items, summary),
    payer: { name: payload.cliente.nombre, email: payload.cliente.email, phone: payload.cliente.telefono ? { number: payload.cliente.telefono } : undefined },
    external_reference: orderId,
    statement_descriptor: 'FABRICK',
    notification_url: notificationUrl,
    back_urls: { success: `${trackingUrl}?payment_status=success`, failure: `${trackingUrl}?payment_status=failure`, pending: `${trackingUrl}?payment_status=pending` },
    auto_return: 'approved',
    binary_mode: false,
    metadata: { order_id: orderId, tracking_token: trackingToken, region: payload.region, shipping_address: payload.shippingAddress || '' },
  };
  return mercadoPagoFetch<MercadoPagoPreferenceResult>('/checkout/preferences', { method: 'POST', body: JSON.stringify(body) }, 12_000);
}

export async function getMercadoPagoPayment(paymentId: string) {
  return mercadoPagoFetch<MercadoPagoPaymentResponse>(`/v1/payments/${paymentId}`, { method: 'GET' }, 8_000);
}

function parseSignatureParts(signatureHeader: string | null) {
  if (!signatureHeader) return null;
  const parts = Object.fromEntries(signatureHeader.split(',').map((entry) => entry.trim()).map((entry) => { const [key, ...rest] = entry.split('='); return [key, rest.join('=')]; }));
  return { ts: parts.ts || '', v1: parts.v1 || '' };
}

export async function verifyMercadoPagoSignature(args: { signatureHeader: string | null; requestIdHeader: string | null; dataId: string | null }) {
  const resolved = await getMercadoPagoCredentials();
  const secret = resolved.webhookSecret ?? getMercadoPagoWebhookSecret();
  if (!secret) return true;
  const parts = parseSignatureParts(args.signatureHeader);
  if (!parts?.ts || !parts.v1 || !args.dataId || !args.requestIdHeader) return false;
  const manifest = `id:${args.dataId.toLowerCase()};request-id:${args.requestIdHeader};ts:${parts.ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');
  try { return timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1)); } catch { return false; }
}

export function mapMercadoPagoStatus(status?: string) {
  switch (status) {
    case 'approved':
      return 'pagada';
    case 'authorized':
    case 'in_process':
    case 'pending':
      return 'pendiente';
    case 'rejected':
    case 'cancelled':
      return 'fallida';
    case 'refunded':
      return 'reembolsada';
    case 'charged_back':
      return 'contracargo';
    default:
      return 'pendiente';
  }
}
