import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { insforgeAdmin } from '@/lib/insforge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const session = cookie ? await decodeSession(cookie).catch(() => null) : null;
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: NO_STORE });

  const { data, error } = await insforgeAdmin.database
    .from('fabrick_schema_health')
    .select('schema_version,check_name,severity,duplicate_groups,affected_rows,details,checked_at')
    .order('checked_at', { ascending: false })
    .limit(30);

  if (error) {
    const message = String(error.message || '');
    const missing = /does not exist|not found|relation/i.test(message);
    return NextResponse.json(
      missing
        ? { ok: false, pendingBootstrap: true, checks: [], message: 'El bootstrap de base de datos todavía no ha creado la tabla de diagnóstico.' }
        : { error: message || 'No se pudo leer el diagnóstico de esquema.' },
      { status: missing ? 202 : 503, headers: NO_STORE },
    );
  }

  const checks = data || [];
  const latestByName = new Map<string, (typeof checks)[number]>();
  for (const row of checks) {
    if (!latestByName.has(row.check_name)) latestByName.set(row.check_name, row);
  }
  const latest = [...latestByName.values()];
  const warnings = latest.filter((row) => row.severity === 'warning');

  return NextResponse.json({
    ok: true,
    healthy: warnings.length === 0,
    warnings: warnings.length,
    duplicateGroups: warnings.reduce((sum, row) => sum + Number(row.duplicate_groups || 0), 0),
    affectedRows: warnings.reduce((sum, row) => sum + Number(row.affected_rows || 0), 0),
    checks: latest,
  }, { headers: NO_STORE });
}
