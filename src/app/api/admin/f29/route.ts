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

function sqlDecimal(value: unknown) {
  const n = parseFloat(String(value));
  return isNaN(n) ? '2.50' : n.toFixed(2);
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
      `SELECT to_regclass('public.f29_declaraciones') IS NOT NULL AS exists`
    );
    const existsRows = rows(existsResult);
    const table_exists = existsRows.length > 0 ? Boolean(existsRows[0].exists) : false;

    if (!table_exists) {
      return NextResponse.json({ declaraciones: [], table_exists: false });
    }

    const decResult = await runRawSql(
      `SELECT * FROM f29_declaraciones ORDER BY periodo DESC`
    );

    if (!decResult.ok) {
      return NextResponse.json(
        { error: 'Error al obtener declaraciones', detail: decResult.data },
        { status: 500 }
      );
    }

    return NextResponse.json({ declaraciones: rows(decResult), table_exists: true });
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
        CREATE TABLE IF NOT EXISTS f29_declaraciones (
          id SERIAL PRIMARY KEY,
          periodo TEXT NOT NULL UNIQUE,
          ventas_afectas BIGINT DEFAULT 0,
          ventas_exentas BIGINT DEFAULT 0,
          ventas_exportaciones BIGINT DEFAULT 0,
          debito_fiscal BIGINT DEFAULT 0,
          compras_afectas BIGINT DEFAULT 0,
          compras_exentas BIGINT DEFAULT 0,
          credito_fiscal BIGINT DEFAULT 0,
          remanente_anterior BIGINT DEFAULT 0,
          credito_total BIGINT DEFAULT 0,
          iva_neto BIGINT DEFAULT 0,
          remanente_siguiente BIGINT DEFAULT 0,
          ppm_tasa NUMERIC(5,2) DEFAULT 2.50,
          ppm_base BIGINT DEFAULT 0,
          ppm_monto BIGINT DEFAULT 0,
          otros_creditos BIGINT DEFAULT 0,
          total_pagar BIGINT DEFAULT 0,
          estado TEXT DEFAULT 'pendiente',
          fecha_declaracion DATE,
          notas TEXT DEFAULT '',
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
      return NextResponse.json({ ok: true, message: 'Tabla F29 creada correctamente' });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 502 });
    }
  }

  // UPSERT declaration
  const periodo = body.periodo;
  if (!periodo || typeof periodo !== 'string' || !periodo.trim()) {
    return NextResponse.json({ error: 'El campo periodo es requerido' }, { status: 400 });
  }

  const fechaDeclaracion = body.fecha_declaracion
    ? sqlText(body.fecha_declaracion)
    : 'NULL';

  try {
    const result = await runRawSql(`
      INSERT INTO f29_declaraciones (
        periodo,
        ventas_afectas,
        ventas_exentas,
        ventas_exportaciones,
        debito_fiscal,
        compras_afectas,
        compras_exentas,
        credito_fiscal,
        remanente_anterior,
        credito_total,
        iva_neto,
        remanente_siguiente,
        ppm_tasa,
        ppm_base,
        ppm_monto,
        otros_creditos,
        total_pagar,
        estado,
        fecha_declaracion,
        notas
      ) VALUES (
        ${sqlText(body.periodo)},
        ${sqlNum(body.ventas_afectas)},
        ${sqlNum(body.ventas_exentas)},
        ${sqlNum(body.ventas_exportaciones)},
        ${sqlNum(body.debito_fiscal)},
        ${sqlNum(body.compras_afectas)},
        ${sqlNum(body.compras_exentas)},
        ${sqlNum(body.credito_fiscal)},
        ${sqlNum(body.remanente_anterior)},
        ${sqlNum(body.credito_total)},
        ${sqlNum(body.iva_neto)},
        ${sqlNum(body.remanente_siguiente)},
        ${sqlDecimal(body.ppm_tasa ?? 2.5)},
        ${sqlNum(body.ppm_base)},
        ${sqlNum(body.ppm_monto)},
        ${sqlNum(body.otros_creditos)},
        ${sqlNum(body.total_pagar)},
        ${body.estado ? sqlText(body.estado) : `'pendiente'`},
        ${fechaDeclaracion},
        ${sqlText(body.notas)}
      )
      ON CONFLICT (periodo) DO UPDATE SET
        ventas_afectas = EXCLUDED.ventas_afectas,
        ventas_exentas = EXCLUDED.ventas_exentas,
        ventas_exportaciones = EXCLUDED.ventas_exportaciones,
        debito_fiscal = EXCLUDED.debito_fiscal,
        compras_afectas = EXCLUDED.compras_afectas,
        compras_exentas = EXCLUDED.compras_exentas,
        credito_fiscal = EXCLUDED.credito_fiscal,
        remanente_anterior = EXCLUDED.remanente_anterior,
        credito_total = EXCLUDED.credito_total,
        iva_neto = EXCLUDED.iva_neto,
        remanente_siguiente = EXCLUDED.remanente_siguiente,
        ppm_tasa = EXCLUDED.ppm_tasa,
        ppm_base = EXCLUDED.ppm_base,
        ppm_monto = EXCLUDED.ppm_monto,
        otros_creditos = EXCLUDED.otros_creditos,
        total_pagar = EXCLUDED.total_pagar,
        estado = EXCLUDED.estado,
        fecha_declaracion = EXCLUDED.fecha_declaracion,
        notas = EXCLUDED.notas,
        updated_at = NOW()
      RETURNING *
    `);

    if (!result.ok) {
      return NextResponse.json(
        { error: 'Error al guardar declaración', detail: result.data },
        { status: 500 }
      );
    }

    const upserted = rows(result);
    return NextResponse.json({ ok: true, declaracion: upserted[0] ?? null });
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
      DELETE FROM f29_declaraciones WHERE id = ${sqlNum(id)}
    `);

    if (!result.ok) {
      return NextResponse.json(
        { error: 'Error al eliminar declaración', detail: result.data },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
