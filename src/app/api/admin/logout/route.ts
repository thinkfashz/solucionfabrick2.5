import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, CLEAR_COOKIE_OPTIONS } from '@/lib/adminAuth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, '', CLEAR_COOKIE_OPTIONS);
  response.cookies.set('tenant_status', '', CLEAR_COOKIE_OPTIONS);
  return response;
}
