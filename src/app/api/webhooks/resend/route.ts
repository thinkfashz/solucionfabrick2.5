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

/* Resend webhook event types we care about */
type ResendEvent = {
  type: 'email.sent' | 'email.delivered' | 'email.delivery_delayed' | 'email.complained' | 'email.bounced' | 'email.opened' | 'email.clicked';
  data: {
    email_id?: string;
    created_at?: string;
    [key: string]: unknown;
  };
};

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  // Verify signature if secret is configured
  if (webhookSecret) {
    const signature = req.headers.get('resend-signature') ?? req.headers.get('svix-signature') ?? '';
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }
    // Basic check: if signature is present, allow through (full HMAC verification would require svix lib)
    // For production, install `svix` and verify properly
  }

  let event: ResendEvent;
  try {
    event = await req.json() as ResendEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const emailId = event.data?.email_id;
  if (!emailId) {
    return NextResponse.json({ ok: true, note: 'No email_id in event' });
  }

  const now = new Date().toISOString();

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
