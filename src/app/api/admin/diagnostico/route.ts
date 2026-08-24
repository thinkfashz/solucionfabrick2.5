import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, getAdminInsforge } from '@/lib/adminApi';
import { requireAdminPermission } from '@/lib/adminPermissions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/diagnostico
 *
 * Diagnóstico de plataforma reservado a Root/superadmin. Expone únicamente
 * presencia de variables y estado de tablas, nunca valores de credenciales.
 */

const TRACKED_ENV_VARS = [
  'NEXT_PUBLIC_INSFORGE_URL',
  'NEXT_PUBLIC_INSFORGE_ANON_KEY',
  'INSFORGE_API_KEY',
  'ADMIN_SESSION_SECRET',
  'ADMIN_PASSWORD',
  'MERCADOPAGO_ACCESS_TOKEN',
  'NEXT_PUBLIC_MP_PUBLIC_KEY',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT',
  'CLOUDINARY_URL',
] as const;

const PROBE_TABLES = ['products', 'orders', 'leads', 'projects', 'admin_users'];

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminPermission(request, { resource: 'admin', action: 'manage' });
    if (!auth.ok) return auth.response;

    const env: Record<string, boolean> = {};
    for (const name of TRACKED_ENV_VARS) {
      env[name] = Boolean(process.env[name]);
    }

    const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL ?? '';
    const tables: Record<string, { ok: boolean; rows?: number; error?: string }> = {};

    if (!baseUrl) {
      return NextResponse.json(
        {
          ok: false,
          env,
          insforge: { configured: false },
          tables,
          hint: 'NEXT_PUBLIC_INSFORGE_URL no está configurada. Define la variable en Vercel y redeploya.',
        },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const client = getAdminInsforge();
    for (const table of PROBE_TABLES) {
      try {
        const { error, count } = await client.database
          .from(table)
          .select('*', { count: 'exact', head: true });
        if (error) {
          tables[table] = { ok: false, error: error.message ?? 'unknown' };
        } else {
          tables[table] = { ok: true, rows: count ?? 0 };
        }
      } catch (error) {
        tables[table] = { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    }

    const allTablesOk = Object.values(tables).every((table) => table.ok);
    return NextResponse.json(
      {
        ok: allTablesOk,
        env,
        insforge: { configured: true, baseUrl },
        tables,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return adminError(err, 'DIAGNOSTICO_FAILED');
  }
}
