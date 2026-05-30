export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { getResendCredentials } from '@/lib/resendCredentials';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

function insforgeKey(): string {
  return process.env.INSFORGE_API_KEY || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_7e23032539c2dc64d5d27ca29d07b928';
}

function sql(v: unknown): string {
  if (v === null || v === undefined || v === '') return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function rawsql(query: string): Promise<{ data?: { rows?: Record<string, unknown>[] } } | null> {
  try {
    const res = await fetch(
      `${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': insforgeKey() },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      }
    );
    if (!res.ok) return null;
    return res.json() as Promise<{ data?: { rows?: Record<string, unknown>[] } }>;
  } catch {
    return null;
  }
}

const EVENT_MAP: Record<string, string> = {
  sent:       'enviado',
  delivered:  'entregado',
  opened:     'abierto',
  bounced:    'rebotado',
  complained: 'spam',
};

interface ResendEmail {
  id?: string;
  from?: string;
  to?: string | string[];
  subject?: string;
  created_at?: string;
  last_event?: string;
}

interface ResendListResponse {
  data?: ResendEmail[];
  name?: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'test' });
  if (!auth.ok) return auth.response;

  const creds = await getResendCredentials();
  if (!creds.ready) {
    return NextResponse.json({ ok: false, error: 'Resend no configurado. Agrega tu API key en Integraciones.' });
  }

  let limit = 100;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.limit === 'number') limit = Math.min(Math.max(1, body.limit), 100);
  } catch { /* body optional */ }

  // 1. Fetch emails from Resend API
  let resendEmails: ResendEmail[] = [];
  try {
    const res = await fetch(`https://api.resend.com/emails?limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const err = await res.json() as ResendListResponse;
      return NextResponse.json({ ok: false, error: `Resend ${res.status}: ${err.message ?? 'Error desconocido'}` });
    }
    const data = await res.json() as ResendListResponse;
    resendEmails = data.data ?? [];
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message });
  }

  if (resendEmails.length === 0) {
    return NextResponse.json({ ok: true, synced: 0, skipped: 0, total: 0, message: 'No hay correos en Resend' });
  }

  // 2. Ensure required columns exist (idempotent)
  await rawsql(`ALTER TABLE presupuesto_correos ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'presupuesto';`);
  await rawsql(`ALTER TABLE presupuesto_correos ADD COLUMN IF NOT EXISTS enviado_por TEXT;`);

  // 3. Check which resend_ids already exist in DB (single query)
  const validEmails = resendEmails.filter((e) => e.id?.trim());
  if (validEmails.length === 0) {
    return NextResponse.json({ ok: true, synced: 0, skipped: resendEmails.length, total: resendEmails.length, message: 'Sin IDs válidos en Resend' });
  }

  const idList = validEmails.map((e) => sql(e.id!.trim())).join(', ');
  const existsResult = await rawsql(
    `SELECT resend_id FROM presupuesto_correos WHERE resend_id IN (${idList});`
  );
  const existingIds = new Set(
    (existsResult?.data?.rows ?? []).map((r) => String(r.resend_id))
  );

  // 4. Insert missing emails
  let synced = 0;
  const skipped = existingIds.size;

  for (const email of validEmails) {
    const resendId = email.id!.trim();
    if (existingIds.has(resendId)) continue;

    const to = Array.isArray(email.to) ? (email.to[0] ?? '') : (email.to ?? '');
    const subject = email.subject ?? '(sin asunto)';
    const estado = EVENT_MAP[email.last_event ?? ''] ?? 'enviado';
    const createdAt = email.created_at ?? new Date().toISOString();

    const res = await rawsql(`
      INSERT INTO presupuesto_correos
        (presupuesto_id, email_destinatario, asunto, resend_id, estado, tipo, enviado_por, created_at)
      VALUES
        ('resend-import', ${sql(to)}, ${sql(subject)}, ${sql(resendId)}, ${sql(estado)}, 'resend', 'resend-api', ${sql(createdAt)});
    `);

    if (res !== null) synced++;
  }

  const newSkipped = validEmails.length - synced - (validEmails.length - existingIds.size - synced);
  const totalSkipped = skipped + newSkipped;

  return NextResponse.json({
    ok: true,
    synced,
    skipped: totalSkipped,
    total: resendEmails.length,
    message: synced === 0
      ? `Todos los correos ya estaban en la base de datos (${totalSkipped})`
      : `${synced} correos importados${totalSkipped > 0 ? `, ${totalSkipped} ya existían` : ''}`,
  });
}
