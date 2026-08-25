import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { getAdminTenantId } from '@/lib/adminApi';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { recordAdminAudit, recordAdminFailure } from '@/lib/adminAudit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATUS_VALUES = new Set(['draft', 'sent', 'in_review', 'approved', 'rejected', 'archived']);
const QUOTE_SELECT = 'id,customer_name,customer_email,customer_phone,region,status,total,created_at';

function cleanId(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 160) : '';
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'quotes', action: 'read' });
  if (!auth.ok) return auth.response;
  const tenantId = await getAdminTenantId(request);

  const { data, error } = await insforgeAdmin.database
    .from('quotes')
    .select(QUOTE_SELECT)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    await recordAdminFailure({ session: auth.session, request, action: 'read', resource: 'quotes', metadata: { error: error.message } });
    return NextResponse.json({ error: error.message || 'No se pudieron cargar las cotizaciones.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, quotes: Array.isArray(data) ? data : [] }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'quotes', action: 'update' });
  if (!auth.ok) return auth.response;
  const tenantId = await getAdminTenantId(request);

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const id = cleanId(body.id);
  const status = typeof body.status === 'string' ? body.status.trim() : '';
  if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });
  if (!STATUS_VALUES.has(status)) return NextResponse.json({ error: 'Estado de cotización inválido.' }, { status: 422 });

  const { data, error } = await insforgeAdmin.database
    .from('quotes')
    .update({ status })
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .select(QUOTE_SELECT)
    .single();

  if (error) {
    await recordAdminFailure({ session: auth.session, request, action: 'update', resource: 'quotes', resourceId: id, metadata: { status, error: error.message } });
    return NextResponse.json({ error: error.message || 'No se pudo actualizar la cotización.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Cotización no encontrada.' }, { status: 404 });

  await recordAdminAudit({ session: auth.session, request, action: 'update', resource: 'quotes', resourceId: id, metadata: { status } });
  return NextResponse.json({ ok: true, quote: data });
}
