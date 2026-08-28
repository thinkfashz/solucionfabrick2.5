import 'server-only';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { insforgeAdmin } from '@/lib/insforge';
import { decryptCredentials, encryptCredentials, isEncryptionConfigured } from '@/lib/integrationsCrypto';
import { getMercadoPagoCredentials } from '@/lib/mercadoPagoCredentials';
import { detectMpMode, fetchMercadoPagoAccount, getMpTokenPrefix, probeMercadoPago } from '@/lib/mercadopago';
import { resolveBillingCredentials, maskBillingValue } from '@/lib/billing/credentials';
import { resolveIntegrationCredentials } from '@/lib/integrationCredentials';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type IntegrationRow = { credentials?: Record<string, unknown>; updated_at?: string | null };
function clean(value: unknown, max = 240): string { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function masked(value: string, source?: string) { return { set: Boolean(value), preview: value ? maskBillingValue(value) : '', source: source ?? 'missing' }; }

async function readIntegration(provider: string): Promise<IntegrationRow | null> {
  const { data } = await insforgeAdmin.database.from('integrations').select('credentials, updated_at').eq('provider', provider).limit(1);
  return Array.isArray(data) && data.length ? data[0] as IntegrationRow : null;
}
async function mergeIntegration(provider: string, next: Record<string, string>) {
  const current = await readIntegration(provider);
  const plain = decryptCredentials(current?.credentials ?? {});
  const merged: Record<string, unknown> = { ...plain };
  for (const [key, value] of Object.entries(next)) {
    const normalized = clean(value, key === 'api_key' ? 1000 : 300);
    if (normalized) merged[key] = normalized;
  }
  const { error } = await insforgeAdmin.database.from('integrations').upsert({ provider, credentials: encryptCredentials(merged), updated_at: new Date().toISOString() }, { onConflict: 'provider' });
  if (error) throw new Error(error.message || `No se pudo guardar ${provider}.`);
}
async function recentPaidOrders() {
  try {
    const { data } = await insforgeAdmin.database.from('orders').select('id, customer_name, customer_email, items, total, currency, payment_id, payment_status, status, dispatch_code, tracking_number, updated_at, created_at').order('updated_at', { ascending: false }).limit(40);
    const rows = Array.isArray(data) ? data as Array<Record<string, unknown>> : [];
    return rows.filter((row) => {
      const status = String(row.status || '').toLowerCase();
      const payment = String(row.payment_status || '').toLowerCase();
      return payment === 'approved' || ['pagada', 'en_preparacion', 'enviado', 'entregado'].includes(status);
    }).slice(0, 8).map((row) => {
      const items = Array.isArray(row.items) ? row.items as Array<Record<string, unknown>> : [];
      return {
        id: String(row.id || ''), customerName: String(row.customer_name || 'Cliente'), customerEmail: String(row.customer_email || ''), total: Number(row.total || 0), currency: String(row.currency || 'CLP'), paymentId: String(row.payment_id || ''), paymentStatus: String(row.payment_status || ''), status: String(row.status || ''), dispatchCode: String(row.dispatch_code || ''), trackingNumber: String(row.tracking_number || ''), updatedAt: String(row.updated_at || row.created_at || ''), products: items.map((item) => ({ name: String(item.nombre || item.name || `Producto ${item.productoId || item.productId || ''}`), quantity: Math.max(1, Number(item.cantidad || item.quantity || 1)), unitPrice: Number(item.precioUnitario || item.unitPrice || 0) })).slice(0, 8),
      };
    });
  } catch { return []; }
}

export async function GET(request: NextRequest) {
  const access = await requireAdminPermission(request, { resource: 'finance', action: 'read' });
  if (!access.ok) return access.response;
  const light = request.nextUrl.searchParams.get('light') === '1';
  const recentSales = await recentPaidOrders();
  if (light) return NextResponse.json({ ok: true, recentSales }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });

  const [mpCredentials, mpProbe, billing, resend] = await Promise.all([ getMercadoPagoCredentials(), probeMercadoPago(), resolveBillingCredentials(), resolveIntegrationCredentials('resend', ['api_key', 'from'], true) ]);
  const mpAccount = mpCredentials.accessToken ? await fetchMercadoPagoAccount(mpCredentials.accessToken).catch(() => null) : null;
  const mode = mpCredentials.accessToken ? detectMpMode(mpCredentials.accessToken) : 'unknown';
  const mpSource = mpCredentials.sources.accessToken === 'env' ? 'vercel-env' : mpCredentials.sources.accessToken === 'db' ? 'encrypted-db' : 'missing';
  const notifyTo = resend.values.notify_to || process.env.ORDER_NOTIFICATION_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || '';

  return NextResponse.json({ ok: true, mercadoPago: { connected: mpProbe.status === 'ok', status: mpProbe.status, message: mpProbe.message, mode, source: mpSource, accessToken: { set: Boolean(mpCredentials.accessToken), preview: mpCredentials.accessToken ? `${getMpTokenPrefix(mpCredentials.accessToken)} · ${maskBillingValue(mpCredentials.accessToken)}` : '', source: mpCredentials.sources.accessToken === 'env' ? 'Vercel' : mpCredentials.sources.accessToken === 'db' ? 'Insforge cifrado' : 'Sin configurar' }, publicKey: masked(mpCredentials.publicKey || '', mpCredentials.sources.publicKey === 'env' ? 'Vercel' : mpCredentials.sources.publicKey === 'db' ? 'Insforge cifrado' : 'missing'), webhookSecret: masked(mpCredentials.webhookSecret || '', mpCredentials.sources.webhookSecret === 'env' ? 'Vercel' : mpCredentials.sources.webhookSecret === 'db' ? 'Insforge cifrado' : 'missing'), webhook: { endpoint: '/api/webhooks/mercadopago', routeActive: true, signatureConfigured: Boolean(mpCredentials.webhookSecret), ready: Boolean(mpCredentials.webhookSecret) && mpProbe.status === 'ok' }, account: mpAccount, latencyMs: mpProbe.latencyMs }, billing: { provider: billing.ready ? 'haulmer' : 'mock', providerName: billing.ready ? 'Haulmer / OpenFactura · SII' : 'Comprobante interno (sin DTE SII)', configured: billing.ready, simulated: !billing.ready, source: billing.source, encryptedAtRest: billing.encryptedAtRest, missing: billing.missing, fields: { api_key: masked(billing.apiKey, billing.source), rut_emisor: { set: Boolean(billing.rutEmisor), preview: billing.rutEmisor || '', source: billing.source }, razon_social: { set: Boolean(billing.razonSocial), preview: billing.razonSocial || '', source: billing.source }, giro: { set: Boolean(billing.giro), preview: billing.giro || '', source: billing.source }, direccion: { set: Boolean(billing.direccion), preview: billing.direccion || '', source: billing.source }, comuna: { set: Boolean(billing.comuna), preview: billing.comuna || '', source: billing.source }, base_url: { set: Boolean(billing.baseUrl), preview: billing.baseUrl || '', source: billing.source } } }, notifications: { emailReady: resend.missing.length === 0, provider: 'resend', source: resend.source, notifyTo, notifyToSet: Boolean(notifyTo) }, encryption: { configured: isEncryptionConfigured() }, recentSales }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

export async function POST(request: NextRequest) {
  const access = await requireAdminPermission(request, { resource: 'finance', action: 'update' });
  if (!access.ok) return access.response;
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }); }
  const action = clean(body.action, 60);
  try {
    if (action === 'save_billing') {
      const values = (body.values && typeof body.values === 'object' ? body.values : {}) as Record<string, unknown>;
      const rut = clean(values.rut_emisor, 20);
      if (rut && !/^\d{7,8}-[0-9kK]$/.test(rut.replace(/\./g, ''))) return NextResponse.json({ error: 'RUT emisor inválido. Usa formato 12345678-9.' }, { status: 422 });
      const baseUrl = clean(values.base_url, 300);
      if (baseUrl && !/^https:\/\//i.test(baseUrl)) return NextResponse.json({ error: 'La URL del proveedor debe usar HTTPS.' }, { status: 422 });
      await mergeIntegration('haulmer', { api_key: clean(values.api_key, 1000), rut_emisor: rut, razon_social: clean(values.razon_social, 180), giro: clean(values.giro, 180), direccion: clean(values.direccion, 220), comuna: clean(values.comuna, 120), base_url: baseUrl });
      return NextResponse.json({ ok: true, message: 'Configuración tributaria guardada cifrada en Insforge.' });
    }
    if (action === 'save_notifications') {
      const email = clean(body.email, 240).toLowerCase();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Correo de notificación inválido.' }, { status: 422 });
      await mergeIntegration('resend', { notify_to: email });
      return NextResponse.json({ ok: true, message: 'Correo de avisos de venta actualizado.' });
    }
    return NextResponse.json({ error: 'Acción no soportada.' }, { status: 400 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo guardar la configuración.' }, { status: 500 }); }
}
