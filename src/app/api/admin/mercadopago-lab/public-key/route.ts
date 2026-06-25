import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { getMercadoPagoLabCredentials } from '@/lib/mercadoPagoLab';

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
  const credentials = await getMercadoPagoLabCredentials();
  if (!credentials.publicKey) {
    return NextResponse.json({ error: 'Falta Public Key de MercadoPago Lab.' }, { status: 404 });
  }
  return NextResponse.json({ publicKey: credentials.publicKey }, { headers: { 'Cache-Control': 'no-store' } });
}
