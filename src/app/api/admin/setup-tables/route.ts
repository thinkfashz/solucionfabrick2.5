import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { parseSqlBlocks } from '@/lib/sqlBlocks';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type StepResult = { ok: boolean; error?: string };

const EXPECTED_TABLES = [
  'productos',
  'categories',
  'products',
  'integrations',
  'orders',
  'payment_webhooks',
  'leads',
  'leads-order-link',
  'crm_leads',
  'customer_accounts',
  'order-shipping-columns',
  'deliveries',
  'order_shipments',
  'customer-account-order-link',
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

async function runRawSql(baseUrl: string, apiKey: string, query: string): Promise<void> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ query }),
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
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
      } catch {}
    } catch {}
    const err = new Error(`HTTP ${res.status} ${res.statusText}${detail}`) as Error & { upstreamCode?: string; status?: number };
    err.upstreamCode = upstreamCode;
    err.status = res.status;
    throw err;
  }
}

function loadSqlBundle() {
  const scriptsDir = join(process.cwd(), 'scripts');
  const files = ['create-tables.sql', 'create-sales-tables.sql', 'create-shipping-tables.sql'];
  return files.map((file) => {
    const path = join(scriptsDir, file);
    if (!existsSync(path)) return '';
    return readFileSync(path, 'utf8');
  }).filter(Boolean).join('\n\n');
}

const ADMIN_KEY_HINT =
  'El bootstrap de esquema requiere INSFORGE_API_KEY (clave de servicio) en Vercel. No se usa la anon key para operaciones unrestricted.';

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
    if (!sessionCookie?.value) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    const payload = await decodeSession(sessionCookie.value);
    if (!payload) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });
    if (payload.rol !== 'superadmin') {
      return NextResponse.json({ error: 'Solo Root/superadmin puede modificar el esquema.' }, { status: 403 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
    const apiKey = process.env.INSFORGE_API_KEY;

    if (!baseUrl || !apiKey) {
      const missing: string[] = [];
      if (!baseUrl) missing.push('NEXT_PUBLIC_INSFORGE_URL');
      if (!apiKey) missing.push('INSFORGE_API_KEY');
      return NextResponse.json({
        error: 'Configuración segura de InsForge incompleta.',
        code: 'MISSING_ENV',
        missing,
        hint: ADMIN_KEY_HINT,
      }, { status: 503 });
    }

    let sql: string;
    try {
      sql = loadSqlBundle();
      if (!sql.trim()) throw new Error('No hay SQL cargado.');
    } catch (err) {
      return NextResponse.json({
        error: 'No se pudieron leer scripts/create-tables.sql, scripts/create-sales-tables.sql o scripts/create-shipping-tables.sql.',
        code: 'SQL_FILE_NOT_FOUND',
        detail: err instanceof Error ? err.message : String(err),
      }, { status: 500 });
    }

    const blocks = parseSqlBlocks(sql);
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
        const code = err && typeof err === 'object' && 'upstreamCode' in err
          ? String((err as { upstreamCode?: unknown }).upstreamCode || '')
          : '';
        if (code === 'AUTH_INVALID_API_KEY') sawAuthInvalid = true;
        results[block.name] = { ok: false, error: msg };
        failed += 1;
      }
    }

    for (const table of EXPECTED_TABLES) {
      if (!(table in results)) {
        results[table] = { ok: false, error: 'Bloque no encontrado en SQL.' };
        failed += 1;
      }
    }

    return NextResponse.json({
      ok: failed === 0,
      summary: { total: blocks.length, ok, failed },
      results,
      keySource: 'admin' as const,
      ...(sawAuthInvalid ? { hint: ADMIN_KEY_HINT, code: 'INSFORGE_AUTH_INVALID' } : {}),
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Error inesperado.',
      code: 'SETUP_TABLES_FAILED',
    }, { status: 500 });
  }
}
