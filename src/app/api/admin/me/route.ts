import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const payload = await decodeSession(sessionCookie.value);
  if (!payload) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    email: payload.email,
    exp: payload.exp,
  });
}
