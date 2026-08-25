import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { normalizeOrderRecord } from '@/lib/commerce';
import { resolveDispatchCode } from '@/lib/orders/dispatchCode';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SHIPMENT_QUEUE = new Set(['pendiente', 'confirmado', 'en_preparacion', 'enviado']);
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'orders', action: 'read' });
  if (!auth.ok) return auth.response;

  const tenantId = auth.session.tenant_id ?? DEFAULT_TENANT_ID;
  const url = new URL(request.url);
  const scope = url.searchParams.get('scope') || 'all';
  const maxLimit = scope === 'report' ? 1000 : 200;
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 80), 1), maxLimit);

  const { data, error } = await insforgeAdmin.database
    .from('orders')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (Array.isArray(data) ? data : [])
    .filter((row) => !(row as Record<string, unknown>).deleted_at)
    .map((row) => {
      const raw = row as Record<string, unknown>;
      const normalized = normalizeOrderRecord(raw);
      const dispatchCode = resolveDispatchCode(raw, normalized.id);
      return {
        ...normalized,
        dispatch_code: dispatchCode,
        tracking_number: typeof raw.tracking_number === 'string' ? raw.tracking_number : '',
        carrier: typeof raw.carrier === 'string' ? raw.carrier : '',
        shipping_notes: typeof raw.shipping_notes === 'string' ? raw.shipping_notes : '',
        status_email_sent_at: typeof raw.status_email_sent_at === 'string' ? raw.status_email_sent_at : '',
        status_email_last_status: typeof raw.status_email_last_status === 'string' ? raw.status_email_last_status : '',
      };
    });

  const orders = scope === 'shipping' ? rows.filter((row) => SHIPMENT_QUEUE.has(row.status)) : rows;

  return NextResponse.json(
    { ok: true, orders, total: orders.length, scope },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
