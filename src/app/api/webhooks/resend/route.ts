export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

function insforgeKey() {
  return process.env.INSFORGE_API_KEY || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_7e23032539c2dc64d5d27ca29d07b928';
}

async function rawsql(query: string) {
  try {
    const res = await fetch(
      `${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': insforgeKey() },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(8_000),
        cache: 'no-store',
      },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function sql(v: unknown) {
  if (v === null || v === undefined || v === '') return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

type ResendEvent = {
  type:
    | 'email.sent'
    | 'email.delivered'
    | 'email.delivery_delayed'
    | 'email.complained'
    | 'email.bounced'
    | 'email.opened'
    | 'email.clicked'
    | 'contact.created'
    | 'contact.updated'
    | 'contact.deleted';
  data: {
    email_id?: string;
    id?: string;
    created_at?: string;
    // Inbound email fields (email.* events for received emails)
    from?: string;
    to?: string[];
    subject?: string;
    text?: string;
    html?: string;
    [key: string]: unknown;
  };
};

async function ensureInboxTable() {
  await rawsql(`
    CREATE TABLE IF NOT EXISTS correos_recibidos (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      resend_id TEXT,
      de TEXT NOT NULL,
      para TEXT,
      asunto TEXT,
      cuerpo_texto TEXT,
      cuerpo_html TEXT,
      leido BOOLEAN DEFAULT FALSE,
      respondido BOOLEAN DEFAULT FALSE,
      respuesta_resend_id TEXT,
      fecha_recibido TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (webhookSecret) {
    const signature = req.headers.get('resend-signature') ?? req.headers.get('svix-signature') ?? '';
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }
  }

  let event: ResendEvent;
  try {
    event = await req.json() as ResendEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const emailId = event.data?.email_id ?? event.data?.id ?? null;

  // ── Inbound / received email ─────────────────────────────────────────────
  // Resend fires this event when an email arrives at your inbound address.
  // The data shape differs from outbound events: from/to/subject/text/html are top-level.
  if (
    event.type === 'email.delivered' &&
    event.data.from &&
    event.data.to &&
    event.data.subject
  ) {
    // This looks like an inbound email event (Resend inbound webhook payload)
    await ensureInboxTable();
    const fromAddr = String(event.data.from);
    const toAddr = Array.isArray(event.data.to) ? String(event.data.to[0]) : String(event.data.to ?? '');
    const subject = String(event.data.subject ?? '');
    const text = String(event.data.text ?? '');
    const html = String(event.data.html ?? '');
    await rawsql(`
      INSERT INTO correos_recibidos (resend_id, de, para, asunto, cuerpo_texto, cuerpo_html, fecha_recibido)
      VALUES (${sql(emailId)}, ${sql(fromAddr)}, ${sql(toAddr)}, ${sql(subject)}, ${sql(text)}, ${sql(html)}, ${sql(now)})
      ON CONFLICT (resend_id) DO NOTHING;
    `);
    // Also update outbound tracking if there's a matching resend_id
    if (emailId) {
      await rawsql(`
        UPDATE presupuesto_correos SET estado = 'entregado', entregado_at = ${sql(now)}
        WHERE resend_id = ${sql(emailId)} AND estado = 'enviado';
      `);
    }
    return NextResponse.json({ ok: true, type: 'inbound', emailId });
  }

  // ── Standard outbound event tracking ─────────────────────────────────────
  if (!emailId) {
    return NextResponse.json({ ok: true, note: 'No email_id in event' });
  }

  switch (event.type) {
    case 'email.delivered':
      await rawsql(`
        UPDATE presupuesto_correos
        SET estado = 'entregado', entregado_at = ${sql(now)}
        WHERE resend_id = ${sql(emailId)};
      `);
      break;

    case 'email.opened':
      await rawsql(`
        UPDATE presupuesto_correos
        SET estado = 'abierto', abierto_at = COALESCE(abierto_at, ${sql(now)})
        WHERE resend_id = ${sql(emailId)};
      `);
      break;

    case 'email.bounced':
    case 'email.complained':
      await rawsql(`
        UPDATE presupuesto_correos
        SET estado = ${sql(event.type === 'email.bounced' ? 'rebotado' : 'spam')}
        WHERE resend_id = ${sql(emailId)};
      `);
      break;

    default:
      break;
  }

  return NextResponse.json({ ok: true, type: event.type, emailId });
}
