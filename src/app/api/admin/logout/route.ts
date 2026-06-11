import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, CLEAR_COOKIE_OPTIONS, decodeSession } from '@/lib/adminAuth';
import { closeAdminSession } from '@/lib/adminSessionAudit';

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (cookie?.value) {
    const payload = await decodeSession(cookie.value).catch(() => null) as ({ session_id?: string } | null);
    const sessionId = payload?.session_id || request.cookies.get('admin_session_id')?.value;
    await closeAdminSession(sessionId, 'logout');
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, '', CLEAR_COOKIE_OPTIONS);
  response.cookies.set('tenant_status', '', CLEAR_COOKIE_OPTIONS);
  response.cookies.set('admin_session_id', '', { ...CLEAR_COOKIE_OPTIONS, httpOnly: false });
  return response;
}
