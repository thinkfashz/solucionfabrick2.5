import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession, getClientIp } from '@/lib/adminAuth';
import { insforgeAdmin } from '@/lib/insforge';
import { detectDevice } from '@/lib/adminNotifications';

export const dynamic = 'force-dynamic';

function userAgent(request: NextRequest) {
  return request.headers.get('user-agent')?.slice(0, 500) || 'unknown';
}

function missingTable(error: unknown) {
  const message = (error as { message?: string } | null)?.message ?? String(error ?? '');
  return /does not exist|relation|schema cache|could not find/i.test(message);
}

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const payload = await decodeSession(sessionCookie.value);
  if (!payload || payload.rol !== 'viewer') return NextResponse.json({ error: 'Solo disponible en modo demo.' }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });
  }

  const sessionId = typeof body.session_id === 'string' ? body.session_id.slice(0, 80) : null;
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 4000) : '';
  const rating = typeof body.rating === 'number' ? Math.max(1, Math.min(5, Math.floor(body.rating))) : null;
  const page = typeof body.page === 'string' ? body.page.slice(0, 500) : null;

  if (!message) return NextResponse.json({ error: 'Escribe un comentario.' }, { status: 400 });

  const ua = userAgent(request);
  const { data, error } = await insforgeAdmin.database
    .from('demo_feedback')
    .insert([
      {
        session_id: sessionId,
        email: payload.email,
        message,
        rating,
        page,
        ip: getClientIp(request),
        user_agent: ua,
        device: detectDevice(ua),
      },
    ])
    .select('id, created_at')
    .single();

  if (error) {
    if (missingTable(error)) return NextResponse.json({ error: 'Tabla demo_feedback no configurada.' }, { status: 500 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, feedback: data });
}

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const payload = await decodeSession(sessionCookie.value);
  if (!payload || payload.rol !== 'superadmin') return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });

  const { data, error } = await insforgeAdmin.database
    .from('demo_feedback')
    .select('id, session_id, email, message, rating, page, ip, device, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    if (missingTable(error)) return NextResponse.json({ feedback: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ feedback: data ?? [] });
}
