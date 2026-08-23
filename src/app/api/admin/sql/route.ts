import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL;

const ADMIN_KEY_HINT =
  'El endpoint SQL requiere INSFORGE_API_KEY en el servidor. Configura la clave de servicio en Vercel y vuelve a desplegar.';

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const session = await decodeSession(sessionCookie.value);
  if (!session) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
  if (session.rol === 'viewer') {
    return NextResponse.json({ error: 'Modo demo: solo lectura. SQL está bloqueado.' }, { status: 403 });
  }
  if (session.rol !== 'superadmin') {
    return NextResponse.json({ error: 'Solo superadmin puede ejecutar SQL.' }, { status: 403 });
  }

  if (!INSFORGE_URL) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_INSFORGE_URL no está configurado.', code: 'INSFORGE_URL_MISSING' }, { status: 503 });
  }
  const apiKey = process.env.INSFORGE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: ADMIN_KEY_HINT, code: 'INSFORGE_ADMIN_KEY_MISSING' }, { status: 503 });
  }

  let query: string;
  try {
    const body = await request.json();
    query = typeof body?.query === 'string' ? body.query.trim() : '';
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!query) return NextResponse.json({ error: 'Query vacío' }, { status: 400 });
  if (query.length > 100_000) {
    return NextResponse.json({ error: 'Query demasiado grande.' }, { status: 413 });
  }

  const url = `${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(30_000),
      cache: 'no-store',
    });

    const text = await res.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    let friendlyError: string | undefined;
    if (!res.ok) {
      const upstreamCode = data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)
        ? String((data as Record<string, unknown>).error)
        : '';
      if (res.status === 401 && upstreamCode === 'AUTH_INVALID_API_KEY') {
        friendlyError = ADMIN_KEY_HINT;
      }
    }

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      data,
      ...(friendlyError ? { error: friendlyError, code: 'INSFORGE_AUTH_INVALID' } : {}),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 502 });
  }
}
