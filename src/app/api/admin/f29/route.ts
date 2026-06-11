export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rows, runRawSql, sqlDecimal, sqlNum, sqlText } from '@/lib/web-pages/sql';

async function ensureF29Table() {
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
      contribuciones_monto BIGINT DEFAULT 0,
      contribuciones_rol TEXT DEFAULT '',
      contribuciones_estado TEXT DEFAULT 'no_aplica',
      total_pagar BIGINT DEFAULT 0,
      estado TEXT DEFAULT 'pendiente',
      fecha_declaracion DATE,
      fecha_pago DATE,
      medio_pago TEXT DEFAULT '',
      comprobante_url TEXT DEFAULT '',
      notas TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE f29_declaraciones ADD COLUMN IF NOT EXISTS ventas_exportaciones BIGINT DEFAULT 0;
    ALTER TABLE f29_declaraciones ADD COLUMN IF NOT EXISTS compras_exentas BIGINT DEFAULT 0;
    ALTER TABLE f29_declaraciones ADD COLUMN IF NOT EXISTS credito_total BIGINT DEFAULT 0;
    ALTER TABLE f29_declaraciones ADD COLUMN IF NOT EXISTS remanente_siguiente BIGINT DEFAULT 0;
    ALTER TABLE f29_declaraciones ADD COLUMN IF NOT EXISTS contribuciones_monto BIGINT DEFAULT 0;
    ALTER TABLE f29_declaraciones ADD COLUMN IF NOT EXISTS contribuciones_rol TEXT DEFAULT '';
    ALTER TABLE f29_declaraciones ADD COLUMN IF NOT EXISTS contribuciones_estado TEXT DEFAULT 'no_aplica';
    ALTER TABLE f29_declaraciones ADD COLUMN IF NOT EXISTS fecha_pago DATE;
    ALTER TABLE f29_declaraciones ADD COLUMN IF NOT EXISTS medio_pago TEXT DEFAULT '';
    ALTER TABLE f29_declaraciones ADD COLUMN IF NOT EXISTS comprobante_url TEXT DEFAULT '';
    CREATE INDEX IF NOT EXISTS idx_f29_periodo ON f29_declaraciones(periodo);
    CREATE INDEX IF NOT EXISTS idx_f29_estado ON f29_declaraciones(estado);
  `);
  if (!result.ok) throw new Error(JSON.stringify(result.data));
}

export async function GET() {
  try {
    await ensureF29Table();
    const decResult = await runRawSql(`SELECT * FROM f29_declaraciones ORDER BY periodo DESC`);
    if (!decResult.ok) return NextResponse.json({ error: 'Error al obtener declaraciones', detail: decResult.data }, { status: 500 });
    return NextResponse.json({ declaraciones: rows(decResult), table_exists: true, migrated: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error desconocido', declaraciones: [], table_exists: false }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  if (body.action === 'setup') {
    try { await ensureF29Table(); return NextResponse.json({ ok: true, message: 'Tabla F29 creada/migrada correctamente' }); }
    catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo migrar F29' }, { status: 502 }); }
  }
  const periodo = body.periodo;
  if (!periodo || typeof periodo !== 'string' || !periodo.trim()) return NextResponse.json({ error: 'El campo periodo es requerido' }, { status: 400 });
  try {
    await ensureF29Table();
    const fechaDeclaracion = body.fecha_declaracion ? sqlText(body.fecha_declaracion) : 'NULL';
    const fechaPago = body.fecha_pago ? sqlText(body.fecha_pago) : 'NULL';
    const result = await runRawSql(`
      INSERT INTO f29_declaraciones (
        periodo, ventas_afectas, ventas_exentas, ventas_exportaciones, debito_fiscal,
        compras_afectas, compras_exentas, credito_fiscal, remanente_anterior, credito_total,
        iva_neto, remanente_siguiente, ppm_tasa, ppm_base, ppm_monto, otros_creditos,
        contribuciones_monto, contribuciones_rol, contribuciones_estado, total_pagar, estado,
        fecha_declaracion, fecha_pago, medio_pago, comprobante_url, notas
      ) VALUES (
        ${sqlText(body.periodo)}, ${sqlNum(body.ventas_afectas)}, ${sqlNum(body.ventas_exentas)}, ${sqlNum(body.ventas_exportaciones)}, ${sqlNum(body.debito_fiscal)},
        ${sqlNum(body.compras_afectas)}, ${sqlNum(body.compras_exentas)}, ${sqlNum(body.credito_fiscal)}, ${sqlNum(body.remanente_anterior)}, ${sqlNum(body.credito_total)},
        ${sqlNum(body.iva_neto)}, ${sqlNum(body.remanente_siguiente)}, ${sqlDecimal(body.ppm_tasa ?? 2.5)}, ${sqlNum(body.ppm_base)}, ${sqlNum(body.ppm_monto)}, ${sqlNum(body.otros_creditos)},
        ${sqlNum(body.contribuciones_monto)}, ${sqlText(body.contribuciones_rol)}, ${sqlText(body.contribuciones_estado || 'no_aplica')}, ${sqlNum(body.total_pagar)}, ${sqlText(body.estado || 'pendiente')},
        ${fechaDeclaracion}, ${fechaPago}, ${sqlText(body.medio_pago)}, ${sqlText(body.comprobante_url)}, ${sqlText(body.notas)}
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
        contribuciones_monto = EXCLUDED.contribuciones_monto,
        contribuciones_rol = EXCLUDED.contribuciones_rol,
        contribuciones_estado = EXCLUDED.contribuciones_estado,
        total_pagar = EXCLUDED.total_pagar,
        estado = EXCLUDED.estado,
        fecha_declaracion = EXCLUDED.fecha_declaracion,
        fecha_pago = EXCLUDED.fecha_pago,
        medio_pago = EXCLUDED.medio_pago,
        comprobante_url = EXCLUDED.comprobante_url,
        notas = EXCLUDED.notas,
        updated_at = NOW()
      RETURNING *
    `);
    if (!result.ok) return NextResponse.json({ error: 'Error al guardar declaración', detail: result.data }, { status: 500 });
    return NextResponse.json({ ok: true, declaracion: rows(result)[0] ?? null });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error desconocido' }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'El parámetro id es requerido' }, { status: 400 });
  try {
    await ensureF29Table();
    const result = await runRawSql(`DELETE FROM f29_declaraciones WHERE id = ${sqlNum(id)}`);
    if (!result.ok) return NextResponse.json({ error: 'Error al eliminar declaración', detail: result.data }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error desconocido' }, { status: 502 });
  }
}
