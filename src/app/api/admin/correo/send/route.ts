export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { getResendCredentials } from '@/lib/resendCredentials';

const DEFAULT_FROM = 'Soluciones Fabrick <onboarding@resend.dev>';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

function insforgeKey(): string {
  return process.env.INSFORGE_API_KEY || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_7e23032539c2dc64d5d27ca29d07b928';
}

function sql(v: unknown): string {
  if (v === null || v === undefined || v === '') return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function rawsql(query: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': insforgeKey() },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(8_000),
        cache: 'no-store',
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

async function saveToDb(opts: {
  to: string;
  subject: string;
  resendId: string | null;
  sentBy: string;
}): Promise<void> {
  // Ensure tipo column exists (idempotent)
  await rawsql(`ALTER TABLE presupuesto_correos ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'presupuesto';`);
  await rawsql(`ALTER TABLE presupuesto_correos ADD COLUMN IF NOT EXISTS enviado_por TEXT;`);

  await rawsql(`
    INSERT INTO presupuesto_correos
      (presupuesto_id, email_destinatario, asunto, resend_id, estado, tipo, enviado_por)
    VALUES
      ('manual', ${sql(opts.to)}, ${sql(opts.subject)}, ${sql(opts.resendId)}, 'enviado', 'manual', ${sql(opts.sentBy)});
  `);
}

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
    const resendId = data.id ?? null;

    // Persist to DB (best-effort, don't fail the send if DB write fails)
    void saveToDb({ to, subject, resendId, sentBy: auth.session.email ?? 'admin' });

    return NextResponse.json({ ok: true, id: resendId });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 502 });
  }
}
