import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Tablas que el panel admin de Fabrick necesita en InsForge para
 * funcionar correctamente. El orden refleja el script
 * `scripts/create-tables.sql`.
 */
const REQUIRED_TABLES = [
  'projects',
  'notifications',
  'observatory_logs',
  'posts_social',
  'admin_invitations',
  'admin_webauthn_credentials',
  'servicios',
  'banners',
  'site_config',
  'testimonios',
  'integrations',
] as const;

type TableStatus = {
  name: string;
  exists: boolean;
  error?: string;
};

async function readSetupSql(): Promise<string | null> {
  try {
    const sqlPath = path.join(process.cwd(), 'scripts', 'create-tables.sql');
    return await fs.readFile(sqlPath, 'utf8');
  } catch (err) {
    console.error('Failed to read scripts/create-tables.sql', err);
    return null;
  }
}

const ALLOWED_TABLES = new Set<string>(REQUIRED_TABLES);

async function checkTable(
  baseUrl: string,
  apiKey: string,
  table: string,
  signal: AbortSignal,
): Promise<TableStatus> {
  // Defense in depth: even though `table` is sourced from REQUIRED_TABLES (a
  // compile-time constant), reject anything that is not on the allowlist
  // before interpolating into the SQL string.
  if (!ALLOWED_TABLES.has(table) || !/^[a-z_][a-z0-9_]*$/i.test(table)) {
    return { name: table, exists: false, error: 'invalid table name' };
  }

  // `to_regclass` returns NULL when the relation doesn't exist instead of
  // raising an error, so a single round-trip cleanly distinguishes
  // "table missing" from "everything else".
  const query = `SELECT to_regclass('public.${table}') IS NOT NULL AS exists;`;

  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/database/advance/rawsql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ query }),
      cache: 'no-store',
      signal,
    });

    if (!res.ok) {
      return { name: table, exists: false, error: `HTTP ${res.status}` };
    }

    const payload: unknown = await res.json().catch(() => null);
    const exists = extractExistsFlag(payload);
    return { name: table, exists };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return { name: table, exists: false, error: message };
  }
}

function extractExistsFlag(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;

  // InsForge raw SQL responses commonly look like
  //   { data: { rows: [{ exists: true }] } }
  // or { rows: [{ exists: true }] }. Walk the most likely shapes.
  const candidates: unknown[] = [];
  const root = payload as Record<string, unknown>;
  if (Array.isArray(root.rows)) candidates.push(...root.rows);
  if (root.data && typeof root.data === 'object') {
    const data = root.data as Record<string, unknown>;
    if (Array.isArray(data.rows)) candidates.push(...data.rows);
    if (Array.isArray(data)) candidates.push(...(data as unknown[]));
  }
  if (Array.isArray(root.result)) candidates.push(...root.result);

  for (const row of candidates) {
    if (row && typeof row === 'object') {
      const value = (row as Record<string, unknown>).exists;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') return value === 't' || value === 'true';
    }
  }
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const session = await decodeSession(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
    const apiKey = process.env.INSFORGE_API_KEY;
    const sql = await readSetupSql();

    if (!baseUrl || !apiKey) {
      return NextResponse.json(
        {
          connected: false,
          missingEnv: [
            ...(!baseUrl ? ['NEXT_PUBLIC_INSFORGE_URL'] : []),
            ...(!apiKey ? ['INSFORGE_API_KEY'] : []),
          ],
          tables: REQUIRED_TABLES.map((name) => ({ name, exists: false })),
          sql,
          dashboardUrl: baseUrl ? `${baseUrl.replace(/\/+$/, '')}/dashboard` : null,
        },
        { status: 200 },
      );
    }

    const controller = AbortSignal.timeout(10_000);
    const tables = await Promise.all(
      REQUIRED_TABLES.map((table) => checkTable(baseUrl, apiKey, table, controller)),
    );

    const reachable = tables.some((t) => t.exists) || tables.every((t) => !t.error);

    return NextResponse.json({
      connected: reachable,
      tables,
      sql,
      dashboardUrl: `${baseUrl.replace(/\/+$/, '')}/dashboard`,
    });
  } catch (err) {
    console.error('GET /api/admin/setup failed', err);
    return NextResponse.json(
      { error: 'Internal Server Error', code: 'SETUP_CHECK_FAILED' },
      { status: 500 },
    );
  }
}
