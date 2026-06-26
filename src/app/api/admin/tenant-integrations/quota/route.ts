import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { requireTenantAdmin } from '@/lib/tenantAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SnapshotRow = {
  provider: string;
  used: number | null;
  quota_limit: number | null;
  captured_at: string;
  raw?: Record<string, unknown> | null;
  tenant_id?: string | null;
};

export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const { data, error } = await insforgeAdmin.database
      .from('integration_quota_snapshots')
      .select('provider, used, quota_limit, captured_at, raw, tenant_id')
      .eq('tenant_id', ctx.tenantId)
      .order('captured_at', { ascending: false })
      .limit(80);

    if (error) return NextResponse.json({ snapshots: [], hint: error.message, tenantId: ctx.tenantId });

    const seen = new Set<string>();
    const snapshots = [];
    for (const row of (data ?? []) as SnapshotRow[]) {
      if (seen.has(row.provider)) continue;
      seen.add(row.provider);
      snapshots.push({
        provider: row.provider,
        used: row.used,
        limit: row.quota_limit,
        captured_at: row.captured_at,
        raw: row.raw ?? null,
      });
    }

    return NextResponse.json({ snapshots, tenantId: ctx.tenantId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error inesperado.', snapshots: [] },
      { status: 500 },
    );
  }
}
