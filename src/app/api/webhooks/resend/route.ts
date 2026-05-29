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
    | 'email.received'
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
    from?: string;
    to?: string | string[];
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
  // Resend fires 'email.received' when a message arrives at an inbound address.
  if (event.type === 'email.received') {
    if (!event.data.from) {
      return NextResponse.json({ ok: true, note: 'email.received without from' });
    }
    await ensureInboxTable();
    const fromAddr = String(event.data.from);
    const toRaw = event.data.to;
    const toAddr = Array.isArray(toRaw) ? String(toRaw[0] ?? '') : String(toRaw ?? '');
    const subject = String(event.data.subject ?? '');
    const text = String(event.data.text ?? '');
    const html = String(event.data.html ?? '');
    // Use WHERE NOT EXISTS to deduplicate without requiring a UNIQUE constraint
    await rawsql(`
      INSERT INTO correos_recibidos (resend_id, de, para, asunto, cuerpo_texto, cuerpo_html, fecha_recibido)
      SELECT ${sql(emailId)}, ${sql(fromAddr)}, ${sql(toAddr)}, ${sql(subject)}, ${sql(text)}, ${sql(html)}, ${sql(now)}
      WHERE NOT EXISTS (
        SELECT 1 FROM correos_recibidos WHERE resend_id = ${sql(emailId)} AND resend_id IS NOT NULL
      );
    `);
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
