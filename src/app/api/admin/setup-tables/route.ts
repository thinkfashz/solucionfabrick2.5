import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { parseSqlBlocks } from '@/lib/sqlBlocks';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/setup-tables
 *
 * Ejecuta `scripts/create-tables.sql` contra InsForge usando el endpoint
 * `/api/database/advance/rawsql/unrestricted`. Divide el archivo en bloques
 * por el marcador `-- TABLA:` (o `-- SEED:`) y ejecuta cada bloque por
 * separado para poder reportar el resultado individual de cada tabla y
 * continuar aunque uno falle.
 *
 * Seguridad: requiere sesión de administrador (cookie `admin_session`).
 *
 * Configuración: usa `NEXT_PUBLIC_INSFORGE_URL` y, en orden de preferencia,
 * `INSFORGE_API_KEY` (admin) → `NEXT_PUBLIC_INSFORGE_ANON_KEY` (anon). InsForge
 * acepta la anon key contra el endpoint `/unrestricted` y la usamos como
 * fallback para que el botón "Crear tablas" funcione sin requerir una clave
 * admin extra (mismo comportamiento que `/api/admin/sql`).
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
  'blog_posts',
  'home_sections',
  'media_assets',
  'admin_error_logs',
] as const;

async function runRawSql(
  baseUrl: string,
  apiKey: string,
  query: string,
): Promise<void> {
  // Use the `/unrestricted` variant because we are running DDL
  // (CREATE TABLE / CREATE INDEX / seed INSERTs). Only the `x-api-key`
  // header is sent: including `Authorization: Bearer <apikey>` in addition
  // makes InsForge try to validate the value as a user JWT first, which
  // fails with AUTH_INVALID_API_KEY.
  const url = `${baseUrl.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ query }),
    cache: 'no-store',
  });
  if (!res.ok) {
    let detail = '';
    let upstreamCode = '';
    try {
      const text = await res.text();
      detail = text ? ` — ${text}` : '';
      try {
        const parsed = JSON.parse(text) as { error?: unknown };
        if (typeof parsed?.error === 'string') upstreamCode = parsed.error;
      } catch {
        /* keep raw text */
      }
    } catch {
      /* ignore */
    }
    const err = new Error(`HTTP ${res.status} ${res.statusText}${detail}`) as Error & {
      upstreamCode?: string;
      status?: number;
    };
    err.upstreamCode = upstreamCode;
    err.status = res.status;
    throw err;
  }
}

const ADMIN_KEY_HINT =
  'InsForge rechazó la API key. El endpoint /rawsql/unrestricted requiere la ' +
  'clave de servicio (admin). Configura la variable de entorno INSFORGE_API_KEY ' +
  'en Vercel con la admin key del proyecto (la anon key no funciona para SQL crudo) ' +
  'y vuelve a desplegar.';

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
    // Mirror the fallback chain used by `/api/admin/sql` so the button works
    // for projects that only have the public anon key configured.
    const hasAdminKey = Boolean(process.env.INSFORGE_API_KEY);
    const apiKey =
      process.env.INSFORGE_API_KEY ||
      process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
    const keySource: 'admin' | 'anon' = hasAdminKey ? 'admin' : 'anon';

    if (!baseUrl || !apiKey) {
      const missing: string[] = [];
      if (!baseUrl) missing.push('NEXT_PUBLIC_INSFORGE_URL');
      if (!apiKey) missing.push('INSFORGE_API_KEY o NEXT_PUBLIC_INSFORGE_ANON_KEY');
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
    let sawAuthInvalid = false;

    for (const block of blocks) {
      try {
        await runRawSql(baseUrl, apiKey, block.query);
        results[block.name] = { ok: true };
        ok += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const code =
          err && typeof err === 'object' && 'upstreamCode' in err
            ? String((err as { upstreamCode?: unknown }).upstreamCode || '')
            : '';
        if (code === 'AUTH_INVALID_API_KEY') sawAuthInvalid = true;
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
      keySource,
      ...(sawAuthInvalid
        ? { hint: `${ADMIN_KEY_HINT} (clave usada: ${keySource})`, code: 'INSFORGE_AUTH_INVALID' }
        : {}),
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
