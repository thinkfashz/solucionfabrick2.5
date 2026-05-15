import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession, type AdminSessionPayload } from '@/lib/adminAuth';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export type AdminGuardResult =
  | { ok: true; payload: AdminSessionPayload; viewer: boolean }
  | { ok: false; response: NextResponse };

export async function requireAdminSession(request: Request): Promise<AdminGuardResult> {
  const rawCookie = request.headers.get('cookie') ?? '';
  const match = rawCookie.split(';').map((p) => p.trim()).find((p) => p.startsWith(`${ADMIN_COOKIE_NAME}=`));
  const value = match ? decodeURIComponent(match.split('=').slice(1).join('=')) : '';
  if (!value) return { ok: false, response: NextResponse.json({ error: 'No autenticado.' }, { status: 401 }) };
  const payload = await decodeSession(value);
  if (!payload) return { ok: false, response: NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 }) };
  return { ok: true, payload, viewer: payload.rol === 'viewer' };
}

export async function blockViewerWrites(request: Request): Promise<NextResponse | null> {
  if (!WRITE_METHODS.has(request.method.toUpperCase())) return null;
  const guard = await requireAdminSession(request);
  if (!guard.ok) return guard.response;
  if (!guard.viewer) return null;
  return NextResponse.json({ error: 'Modo demo: solo lectura. Esta acción no está permitida.' }, { status: 403 });
}

export async function requireSuperadminWrite(request: Request): Promise<AdminGuardResult> {
  const guard = await requireAdminSession(request);
  if (!guard.ok) return guard;
  if (guard.viewer) {
    return { ok: false, response: NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 }) };
  }
  if (guard.payload.rol !== 'superadmin') {
    return { ok: false, response: NextResponse.json({ error: 'Solo superadmin puede realizar esta acción.' }, { status: 403 }) };
  }
  return guard;
}
