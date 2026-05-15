import { NextRequest, NextResponse } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return NextResponse.json({ ok: false }, { status: 401 });
  const payload = await decodeSession(sessionCookie.value);
  if (!payload || payload.rol !== 'viewer') {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const action = body.action;
  const session_id = typeof body.session_id === 'string' ? body.session_id.slice(0, 36) : null;
  if (!session_id) return NextResponse.json({ ok: false }, { status: 400 });

  if (action === 'enter') {
    const page = typeof body.page === 'string' ? body.page.slice(0, 500) : '/';
    const { data, error } = await insforgeAdmin.database
      .from('demo_session_events')
      .insert([{ session_id, page, entered_at: new Date().toISOString() }])
      .select('id')
      .single();

    if (error) {
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        return NextResponse.json({ ok: false, error: 'table_missing' }, { status: 500 });
      }
      return NextResponse.json({ ok: false }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: (data as { id?: string } | null)?.id });
  }

  if (action === 'leave') {
    const event_id = typeof body.event_id === 'string' ? body.event_id.slice(0, 36) : null;
    const duration_ms = typeof body.duration_ms === 'number' ? Math.floor(body.duration_ms) : null;
    if (!event_id) return NextResponse.json({ ok: false }, { status: 400 });

    await insforgeAdmin.database
      .from('demo_session_events')
      .update({ left_at: new Date().toISOString(), duration_ms })
      .eq('id', event_id)
      .eq('session_id', session_id);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const payload = await decodeSession(sessionCookie.value);
  if (!payload || payload.rol !== 'superadmin') {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const { data, error } = await insforgeAdmin.database
    .from('demo_session_events')
    .select('id, session_id, page, entered_at, left_at, duration_ms, created_at')
    .order('entered_at', { ascending: false })
    .limit(500);

  if (error) {
    if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
      return NextResponse.json({ events: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data ?? [] });
}
