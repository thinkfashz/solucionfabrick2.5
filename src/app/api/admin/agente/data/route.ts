export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

/* ─── InsForge DB helper ─────────────────────────────────────────────── */
const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

function insforgeKey(): string {
  return (
    process.env.INSFORGE_API_KEY ||
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ||
    'ik_7e23032539c2dc64d5d27ca29d07b928'
  );
}

interface RawSqlResult {
  data?: {
    rows?: Record<string, unknown>[];
  };
}

async function rawsql(query: string): Promise<RawSqlResult | null> {
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
    return res.json() as Promise<RawSqlResult>;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tipo = url.searchParams.get('tipo') ?? 'productos';

  try {
    if (tipo === 'productos') {
      const result = await rawsql(
        `SELECT id, nombre, descripcion, categoria, precio_base, unidad, activo, created_at, updated_at
         FROM catalogo_productos
         ORDER BY created_at DESC
         LIMIT 100;`,
      );
      const rows = result?.data?.rows ?? [];
      return NextResponse.json({ data: rows });
    }

    if (tipo === 'memoria') {
      const filter = url.searchParams.get('filtro') ?? '';
      const where = filter ? `WHERE tipo = '${filter.replace(/'/g, "''")}'` : '';
      const result = await rawsql(
        `SELECT id, tipo, titulo, contenido, fuente, created_at
         FROM agente_memoria
         ${where}
         ORDER BY created_at DESC
         LIMIT 100;`,
      );
      const rows = result?.data?.rows ?? [];
      return NextResponse.json({ data: rows });
    }

    return NextResponse.json({ error: 'Tipo inválido. Use: productos | memoria' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error inesperado' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const tipo = url.searchParams.get('tipo') ?? '';
  const id = url.searchParams.get('id') ?? '';

  if (!id || !tipo) {
    return NextResponse.json({ error: 'Se requieren tipo e id.' }, { status: 400 });
  }

  const idNum = parseInt(id, 10);
  if (isNaN(idNum) || idNum <= 0) {
    return NextResponse.json({ error: 'id inválido.' }, { status: 400 });
  }

  try {
    if (tipo === 'producto') {
      await rawsql(`DELETE FROM catalogo_productos WHERE id = ${idNum};`);
      return NextResponse.json({ ok: true });
    }

    if (tipo === 'memoria') {
      await rawsql(`DELETE FROM agente_memoria WHERE id = ${idNum};`);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Tipo inválido. Use: producto | memoria' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error inesperado' },
      { status: 500 },
    );
  }
}
