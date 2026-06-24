import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { getAppBaseUrl } from '@/lib/mercadopago';
import { getMercadoPagoLabStatus, mpLabFetch } from '@/lib/mercadoPagoLab';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PreferenceResponse = {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
  date_created?: string;
};

async function requireAdmin(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!cookie?.value) return null;
  return decodeSession(cookie.value);
}

function originFromRequest(request: NextRequest) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) return `${proto}://${host}`;
  return getAppBaseUrl();
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  if (session.rol === 'viewer') return NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 });

  let body: { title?: string; amount?: number | string; email?: string; quantity?: number | string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const amount = Math.round(Number(body.amount || 0));
  const quantity = Math.max(1, Math.round(Number(body.quantity || 1)) || 1);
  const title = String(body.title || 'Compra demo MercadoPago Lab').slice(0, 120);
  const email = String(body.email || 'test_user_123@testuser.com').trim();
  if (!Number.isFinite(amount) || amount < 100) return NextResponse.json({ error: 'Monto inválido. Usa mínimo $100 CLP.' }, { status: 400 });

  const status = await getMercadoPagoLabStatus();
  if (!status.ready) return NextResponse.json({ error: status.message, status }, { status: 400 });

  const baseUrl = originFromRequest(request).replace(/\/+$/, '');
  const externalReference = `mp_lab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const webhookUrl = `${baseUrl}/api/admin/mercadopago-lab/webhook`;
  const adminReturn = `${baseUrl}/admin/pagos/lab`;

  try {
    const preference = await mpLabFetch<PreferenceResponse>('/checkout/preferences', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          {
            id: 'mp-lab-test-product',
            title,
            description: 'Producto demo aislado del checkout real de Soluciones Fabrick',
            quantity,
            currency_id: 'CLP',
            unit_price: amount,
          },
        ],
        payer: { email },
        external_reference: externalReference,
        statement_descriptor: 'FABRICK LAB',
        notification_url: webhookUrl,
        back_urls: {
          success: `${adminReturn}?mp_lab_status=success&external_reference=${externalReference}`,
          failure: `${adminReturn}?mp_lab_status=failure&external_reference=${externalReference}`,
          pending: `${adminReturn}?mp_lab_status=pending&external_reference=${externalReference}`,
        },
        auto_return: 'approved',
        binary_mode: false,
        metadata: {
          scope: 'admin_mercadopago_lab',
          isolated: true,
          external_reference: externalReference,
        },
      }),
    });

    return NextResponse.json({
      ok: true,
      preference,
      externalReference,
      webhookUrl,
      checkoutUrl: preference.sandbox_init_point || preference.init_point || null,
      mode: status.mode,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo crear preferencia de prueba.' }, { status: 502 });
  }
}
