import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { insforge } from '@/lib/insforge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const REQUIRED_TABLES = [
  'products',
  'orders',
  'leads',
  'posts_social',
  'projects',
  'cupones',
  'site_config',
  'admin_users',
  'banners',
  'categories',
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
  } catch {
    return null;
  }
}

async function checkTable(table: string): Promise<TableStatus> {
  try {
    const { error } = await insforge.database.from(table).select('*').limit(1);
    if (error) {
      const msg = (error as { message?: string }).message ?? JSON.stringify(error);
      const missing = /does not exist|not found|relation/i.test(msg);
      return { name: table, exists: !missing, error: missing ? undefined : msg };
    }
    return { name: table, exists: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return { name: table, exists: false, error: message };
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
    if (!sessionCookie?.value) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    const session = await decodeSession(sessionCookie.value);
    if (!session) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });
    if (session.rol !== 'superadmin') {
      return NextResponse.json({ error: 'Solo Root/superadmin puede revisar el bootstrap del sistema.' }, { status: 403 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
    if (!baseUrl) {
      return NextResponse.json({
        error: 'NEXT_PUBLIC_INSFORGE_URL no está configurado.',
        code: 'INSFORGE_URL_MISSING',
      }, { status: 503 });
    }

    const sql = await readSetupSql();
    const tables = await Promise.all(REQUIRED_TABLES.map(checkTable));
    const reachable = tables.some((table) => table.exists);

    return NextResponse.json({
      connected: reachable,
      tables,
      sql,
      dashboardUrl: `${baseUrl.replace(/\/+$/, '')}/dashboard`,
      missingEnv: process.env.INSFORGE_API_KEY ? [] : ['INSFORGE_API_KEY'],
    });
  } catch (err) {
    console.error('GET /api/admin/setup failed', err);
    return NextResponse.json(
      { error: 'Internal Server Error', code: 'SETUP_CHECK_FAILED' },
      { status: 500 },
    );
  }
}
