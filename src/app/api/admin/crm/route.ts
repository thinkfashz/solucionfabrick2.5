export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

function resolveApiKey() {
  if (process.env.INSFORGE_API_KEY) return process.env.INSFORGE_API_KEY;
  if (process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY) return process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
  return 'ik_7e23032539c2dc64d5d27ca29d07b928';
}

function sqlText(value: unknown) {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNum(value: unknown) {
  const n = Number(value);
  return isNaN(n) ? '0' : String(n);
}

async function runRawSql(query: string) {
  const apiKey = resolveApiKey();
  const url = `${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`;
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
  return { ok: res.ok, status: res.status, data };
}

function rows(result: { data: unknown }): Record<string, unknown>[] {
  return (result.data as { data?: { rows?: Record<string, unknown>[] } } | null)?.data?.rows ?? [];
}

export async function GET() {
  try {
    const existsResult = await runRawSql(
      `SELECT to_regclass('public.crm_leads') IS NOT NULL AS exists`
    );
    const existsRows = rows(existsResult);
    const table_exists = existsRows.length > 0 ? Boolean(existsRows[0].exists) : false;

    if (!table_exists) {
      return NextResponse.json({ leads: [], table_exists: false });
    }

    const leadsResult = await runRawSql(
      `SELECT * FROM crm_leads ORDER BY updated_at DESC`
    );

    if (!leadsResult.ok) {
      return NextResponse.json(
        { error: 'Error al obtener leads', detail: leadsResult.data },
        { status: 500 }
      );
    }

    return NextResponse.json({ leads: rows(leadsResult), table_exists: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (body.action === 'setup') {
    try {
      const result = await runRawSql(`
        CREATE TABLE IF NOT EXISTS crm_leads (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          contact TEXT DEFAULT '',
          email TEXT DEFAULT '',
          phone TEXT DEFAULT '',
          company TEXT DEFAULT '',
          value BIGINT DEFAULT 0,
          stage TEXT DEFAULT 'Contacto inicial',
          probability INTEGER DEFAULT 20,
          notes TEXT DEFAULT '',
          next_action TEXT DEFAULT '',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      if (!result.ok) {
        return NextResponse.json(
          { error: 'Error al crear tabla', detail: result.data },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: true, message: 'Tabla creada' });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 502 });
    }
  }

  // Create lead
  const name = body.name;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'El campo name es requerido' }, { status: 400 });
  }

  try {
    const result = await runRawSql(`
      INSERT INTO crm_leads (name, contact, email, phone, company, value, stage, probability, notes, next_action)
      VALUES (
        ${sqlText(body.name)},
        ${sqlText(body.contact)},
        ${sqlText(body.email)},
        ${sqlText(body.phone)},
        ${sqlText(body.company)},
        ${sqlNum(body.value)},
        ${sqlText(body.stage) === 'NULL' ? `'Contacto inicial'` : sqlText(body.stage)},
        ${body.probability !== undefined && body.probability !== null && body.probability !== '' ? sqlNum(body.probability) : '20'},
        ${sqlText(body.notes)},
        ${sqlText(body.next_action)}
      )
      RETURNING *
    `);

    if (!result.ok) {
      return NextResponse.json(
        { error: 'Error al crear lead', detail: result.data },
        { status: 500 }
      );
    }

    const created = rows(result);
    return NextResponse.json({ ok: true, lead: created[0] ?? null });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const id = body.id;
  if (!id) {
    return NextResponse.json({ error: 'El campo id es requerido' }, { status: 400 });
  }

  const updates: string[] = [];

  if (body.name !== undefined) updates.push(`name = ${sqlText(body.name)}`);
  if (body.contact !== undefined) updates.push(`contact = ${sqlText(body.contact)}`);
  if (body.email !== undefined) updates.push(`email = ${sqlText(body.email)}`);
  if (body.phone !== undefined) updates.push(`phone = ${sqlText(body.phone)}`);
  if (body.company !== undefined) updates.push(`company = ${sqlText(body.company)}`);
  if (body.value !== undefined) updates.push(`value = ${sqlNum(body.value)}`);
  if (body.stage !== undefined) updates.push(`stage = ${sqlText(body.stage)}`);
  if (body.probability !== undefined) updates.push(`probability = ${sqlNum(body.probability)}`);
  if (body.notes !== undefined) updates.push(`notes = ${sqlText(body.notes)}`);
  if (body.next_action !== undefined) updates.push(`next_action = ${sqlText(body.next_action)}`);

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
  }

  updates.push('updated_at = NOW()');

  try {
    const result = await runRawSql(`
      UPDATE crm_leads
      SET ${updates.join(', ')}
      WHERE id = ${sqlNum(id)}
      RETURNING *
    `);

    if (!result.ok) {
      return NextResponse.json(
        { error: 'Error al actualizar lead', detail: result.data },
        { status: 500 }
      );
    }

    const updated = rows(result);
    if (updated.length === 0) {
      return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, lead: updated[0] });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'El parámetro id es requerido' }, { status: 400 });
  }

  try {
    const result = await runRawSql(`
      DELETE FROM crm_leads WHERE id = ${sqlNum(id)}
    `);

    if (!result.ok) {
      return NextResponse.json(
        { error: 'Error al eliminar lead', detail: result.data },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
