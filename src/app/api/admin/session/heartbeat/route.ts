import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { touchAdminSession } from '@/lib/adminSessionAudit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!cookie?.value) return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 });
  const payload = await decodeSession(cookie.value) as ({ session_id?: string; email?: string } | null);
  if (!payload) return NextResponse.json({ ok: false, error: 'Sesión inválida' }, { status: 401 });
  const sessionId = payload.session_id || request.cookies.get('admin_session_id')?.value;
  await touchAdminSession(sessionId, 'active');
  return NextResponse.json({ ok: true, sessionId, ts: new Date().toISOString() });
}
