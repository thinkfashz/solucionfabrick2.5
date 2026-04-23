import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/setup-tables
 *
 * Ejecuta `scripts/create-tables.sql` contra InsForge usando el endpoint
 * `/api/database/advance/rawsql`. Divide el archivo en bloques por el marcador
 * `-- TABLA:` (o `-- SEED:`) y ejecuta cada bloque por separado para poder
 * reportar el resultado individual de cada tabla y continuar aunque uno falle.
 *
 * Seguridad: requiere sesión de administrador (cookie `admin_session`).
 * Requiere las variables de entorno `NEXT_PUBLIC_INSFORGE_URL` y
 * `INSFORGE_API_KEY` en el servidor.
 */

type StepResult = { ok: boolean; error?: string };

const EXPECTED_TABLES = [
  'productos',
  'products',
  'integrations',
  'orders',
  'leads',
  'posts',
  'projects',
  'cupones',
  'configuracion',
  'admin_users',
  'banners',
] as const;

function parseSqlBlocks(sql: string): Array<{ name: string; query: string }> {
  const blocks: Array<{ name: string; query: string }> = [];
  const lines = sql.split(/\r?\n/);
  let current: { name: string; buf: string[] } | null = null;

  const flush = () => {
    if (current) {
      const query = current.buf.join('\n').trim();
      if (query.length > 0) {
        blocks.push({ name: current.name, query });
      }
    }
  };

  for (const line of lines) {
    const headerMatch = line.match(/^--\s*(TABLA|SEED):\s*(.+?)\s*$/i);
    if (headerMatch) {
      flush();
      const kind = headerMatch[1].toLowerCase();
      const label = headerMatch[2].trim();
      // Normalise the block name: for "TABLA: posts (blog)" -> "posts".
      const name =
        kind === 'tabla'
          ? label.replace(/\s*\(.*\)\s*$/, '').trim()
          : `seed:${label.replace(/\s*\(.*\)\s*$/, '').trim()}`;
      current = { name, buf: [] };
      continue;
    }
    if (current) current.buf.push(line);
  }
  flush();
  return blocks;
}

async function runRawSql(
  baseUrl: string,
  apiKey: string,
  query: string,
): Promise<void> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/database/advance/rawsql`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ query }),
    cache: 'no-store',
  });
  if (!res.ok) {
    let detail = '';
    try {
      const text = await res.text();
      detail = text ? ` — ${text}` : '';
    } catch {
      /* ignore */
    }
    throw new Error(`HTTP ${res.status} ${res.statusText}${detail}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    // --- AuthN: only admins with a valid session may trigger migrations. ---
    const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }
    const payload = await decodeSession(sessionCookie.value);
    if (!payload) {
      return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
    const apiKey = process.env.INSFORGE_API_KEY;
    if (!baseUrl || !apiKey) {
      const missing: string[] = [];
      if (!baseUrl) missing.push('NEXT_PUBLIC_INSFORGE_URL');
      if (!apiKey) missing.push('INSFORGE_API_KEY');
      return NextResponse.json(
        {
          error: 'Configuración de InsForge incompleta.',
          code: 'MISSING_ENV',
          missing,
        },
        { status: 500 },
      );
    }

    // --- Load SQL file shipped with the app. ---
    const sqlPath = join(process.cwd(), 'scripts', 'create-tables.sql');
    let sql: string;
    try {
      sql = readFileSync(sqlPath, 'utf8');
    } catch (err) {
      return NextResponse.json(
        {
          error: 'No se pudo leer scripts/create-tables.sql.',
          code: 'SQL_FILE_NOT_FOUND',
          detail: err instanceof Error ? err.message : String(err),
        },
        { status: 500 },
      );
    }

    const blocks = parseSqlBlocks(sql);

    // Ejecuta cada tabla individualmente para manejar errores por separado.
    const results: Record<string, StepResult> = {};
    let ok = 0;
    let failed = 0;

    for (const block of blocks) {
      try {
        await runRawSql(baseUrl, apiKey, block.query);
        results[block.name] = { ok: true };
        ok += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results[block.name] = { ok: false, error: msg };
        failed += 1;
      }
    }

    // Garantiza que todas las tablas esperadas aparecen en el informe, incluso
    // si el SQL no contiene un marcador `-- TABLA:` para alguna de ellas.
    for (const t of EXPECTED_TABLES) {
      if (!(t in results)) {
        results[t] = { ok: false, error: 'Bloque no encontrado en SQL.' };
        failed += 1;
      }
    }

    return NextResponse.json({
      ok: failed === 0,
      summary: { total: blocks.length, ok, failed },
      results,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Error inesperado.',
        code: 'SETUP_TABLES_FAILED',
      },
      { status: 500 },
    );
  }
}
