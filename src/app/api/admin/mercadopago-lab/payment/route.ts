import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { mpLabFetch } from '@/lib/mercadoPagoLab';

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

  const paymentId = new URL(request.url).searchParams.get('id')?.trim() || '';
  if (!paymentId) return NextResponse.json({ error: 'Falta id de pago.' }, { status: 400 });

  try {
    const payment = await mpLabFetch<Record<string, unknown>>(`/v1/payments/${encodeURIComponent(paymentId)}`, { method: 'GET' });
    return NextResponse.json({ ok: true, payment });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo consultar el pago.' }, { status: 502 });
  }
}
