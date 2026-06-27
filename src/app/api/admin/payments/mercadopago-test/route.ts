import { NextResponse, type NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { detectMpMode, fetchMercadoPagoAccount, getMpTokenPrefix } from '@/lib/mercadopago';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = {
  accessToken?: string;
  publicKey?: string;
  createPreference?: boolean;
};

const API_BASE = 'https://api.mercadopago.com';

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function maskToken(token: string) {
  if (!token) return '';
  return `${token.slice(0, 10)}…${token.slice(-4)}`;
}

async function mercadoPagoJson<T>(path: string, accessToken: string, init: RequestInit = {}) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    const latencyMs = Date.now() - startedAt;
    const text = await res.text();
    const data = text ? JSON.parse(text) as T : null as T;
    return { ok: res.ok, status: res.status, latencyMs, data };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'test' });
  if (!auth.ok) return auth.response;

  let body: Body;
  try {
    body = await request.json() as Body;
  } catch {
    return NextResponse.json({ ok: false, error: 'Cuerpo inválido.' }, { status: 400 });
  }

  const accessToken = clean(body.accessToken);
  const publicKey = clean(body.publicKey);
  const createPreference = Boolean(body.createPreference);

  if (!accessToken) return NextResponse.json({ ok: false, error: 'Pega un Access Token TEST de Mercado Pago.' }, { status: 400 });
  if (!accessToken.startsWith('TEST-')) {
    return NextResponse.json({ ok: false, error: 'Por seguridad esta pantalla solo acepta Access Token de prueba que empiece con TEST-. No usa credenciales productivas.' }, { status: 400 });
  }
  if (publicKey && !publicKey.startsWith('TEST-')) {
    return NextResponse.json({ ok: false, error: 'La Public Key de prueba debe empezar con TEST-.' }, { status: 400 });
  }

  try {
    const mode = detectMpMode(accessToken);
    const tokenPrefix = getMpTokenPrefix(accessToken);
    const account = await fetchMercadoPagoAccount(accessToken, { timeoutMs: 9000 });
    const paymentMethods = await mercadoPagoJson<{ results?: unknown[] } | unknown[]>('/v1/payment_methods?site_id=MLC', accessToken);

    if (!paymentMethods.ok) {
      return NextResponse.json({
        ok: false,
        status: paymentMethods.status,
        mode,
        tokenPrefix,
        tokenMask: maskToken(accessToken),
        account,
        latencyMs: paymentMethods.latencyMs,
        error: paymentMethods.status === 401 || paymentMethods.status === 403
          ? 'Mercado Pago rechazó el token TEST. Revisa que pertenezca a una cuenta de prueba válida.'
          : `Mercado Pago respondió ${paymentMethods.status}.`,
      }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    let preference: { id?: string; init_point?: string; sandbox_init_point?: string } | null = null;
    if (createPreference) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://solucionesfabrick.com');
      const pref = await mercadoPagoJson<{ id?: string; init_point?: string; sandbox_init_point?: string }>('/checkout/preferences', accessToken, {
        method: 'POST',
        body: JSON.stringify({
          items: [{
            id: 'mp-test-credential-check',
            title: 'Prueba credenciales Mercado Pago TEST',
            quantity: 1,
            currency_id: 'CLP',
            unit_price: 1000,
          }],
          external_reference: `mp-test-${Date.now()}`,
          back_urls: {
            success: `${baseUrl}/admin/pagos/mercadopago-test?status=success`,
            failure: `${baseUrl}/admin/pagos/mercadopago-test?status=failure`,
            pending: `${baseUrl}/admin/pagos/mercadopago-test?status=pending`,
          },
          metadata: { source: 'admin_mercadopago_test', safe_test: true },
        }),
      });
      if (pref.ok) preference = pref.data;
    }

    return NextResponse.json({
      ok: true,
      mode,
      tokenPrefix,
      tokenMask: maskToken(accessToken),
      publicKeyStatus: publicKey ? 'recibida' : 'omitida',
      account,
      latencyMs: paymentMethods.latencyMs,
      message: 'Credenciales TEST válidas. No se guardaron ni reemplazaron las credenciales productivas.',
      preference,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo probar Mercado Pago.';
    return NextResponse.json({ ok: false, error: message }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }
}
