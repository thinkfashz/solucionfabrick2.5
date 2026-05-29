export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { getResendCredentials } from '@/lib/resendCredentials';

const DEFAULT_FROM = 'Soluciones Fabrick <onboarding@resend.dev>';

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'test' });
  if (!auth.ok) return auth.response;

  let to = '';
  let subject = '';
  let html = '';
  let from: string | undefined;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.to === 'string') to = body.to.trim();
    if (typeof body.subject === 'string') subject = body.subject.trim();
    if (typeof body.html === 'string') html = body.html;
    if (typeof body.from === 'string' && body.from.trim()) from = body.from.trim();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  if (!to || !to.includes('@')) return NextResponse.json({ ok: false, error: 'Destinatario inválido' }, { status: 400 });
  if (!subject) return NextResponse.json({ ok: false, error: 'Asunto requerido' }, { status: 400 });
  if (!html) return NextResponse.json({ ok: false, error: 'Contenido HTML requerido' }, { status: 400 });

  const creds = await getResendCredentials();
  if (!creds.ready) {
    return NextResponse.json({ ok: false, error: 'Resend no configurado. Configura la API key en Integraciones.' }, { status: 400 });
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from ?? creds.from ?? DEFAULT_FROM,
        to: [to],
        subject,
        html,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      return NextResponse.json({ ok: false, error: `Resend ${res.status}: ${errBody}` }, { status: 502 });
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return NextResponse.json({ ok: true, id: data.id ?? null });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 502 });
  }
}
