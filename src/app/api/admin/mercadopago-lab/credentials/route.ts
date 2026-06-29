import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { getMercadoPagoLabStatus, saveMercadoPagoLabCredentials } from '@/lib/mercadoPagoLab';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function requireAdmin(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!cookie?.value) return null;
  return decodeSession(cookie.value);
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const status = await getMercadoPagoLabStatus();
  return NextResponse.json(status, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  if (session.rol === 'viewer') return NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 });

  let body: { publicKey?: string; accessToken?: string; webhookSecret?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const publicKey = body.publicKey?.trim() || '';
  const accessToken = body.accessToken?.trim() || '';
  if (publicKey && !/^(TEST-|APP_USR-|APP_|pk_)/i.test(publicKey) && publicKey.length < 12) {
    return NextResponse.json({ error: 'Public Key parece inválida. Revisa que sea la clave pública de Mercado Pago.' }, { status: 400 });
  }
  if (accessToken && !/^(TEST-|APP_USR-)/i.test(accessToken)) {
    return NextResponse.json({ error: 'Access Token inválido. Para pruebas debe comenzar con TEST-. Para producción suele comenzar con APP_USR-.' }, { status: 400 });
  }

  try {
    const next = await saveMercadoPagoLabCredentials(body);
    return NextResponse.json({ ok: true, ...next });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo guardar MercadoPago Lab.' }, { status: 500 });
  }
}
