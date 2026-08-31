import { NextRequest, NextResponse } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { applyInventoryMovementAtomic, type InventoryMovementType } from '@/lib/inventory/stockLedger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PRODUCT_SELECT = 'id,name,stock,sku,ean,scan_code,image_url,activo';

type SyncLine = {
  lineId?: string;
  externalProductId?: string;
  productId?: string;
  sku?: string;
  ean?: string;
  code?: string;
  quantity?: number;
  stock?: number;
  movementType?: InventoryMovementType;
  metadata?: Record<string, unknown>;
};

function cleanText(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max);
}

function cleanCode(value: unknown, max = 128) {
  return cleanText(value, max).replace(/\s+/g, '');
}

function cleanQty(value: unknown, allowZero = true) {
  const parsed = Math.trunc(Number(value));
  if (!Number.isFinite(parsed)) return null;
  const min = allowZero ? 0 : 1;
  return Math.max(min, Math.min(999999999, parsed));
}

function movementForEvent(eventType: string): InventoryMovementType {
  const type = eventType.toLowerCase();
  if (type.includes('return') || type.includes('devol')) return 'return';
  if (type.includes('restock') || type.includes('receive') || type.includes('purchase') || type.includes('entrada')) return 'in';
  if (type.includes('adjust') || type.includes('snapshot') || type.includes('stock_set')) return 'adjustment';
  return 'out';
}

async function findLocalProduct(tenantId: string, provider: string, line: SyncLine) {
  const externalProductId = cleanText(line.externalProductId, 240);
  if (externalProductId) {
    const { data: binding } = await insforgeAdmin.database.from('inventory_source_bindings')
      .select('product_id')
      .eq('tenant_id', tenantId)
      .eq('provider', provider)
      .eq('external_product_id', externalProductId)
      .limit(1);
    if (binding?.[0]?.product_id) {
      const { data } = await insforgeAdmin.database.from('products').select(PRODUCT_SELECT)
        .eq('tenant_id', tenantId).eq('id', binding[0].product_id).limit(1);
      if (data?.[0]) return data[0];
    }
  }

  const signals: Array<[string, string]> = [
    ['id', cleanText(line.productId, 80)],
    ['sku', cleanCode(line.sku)],
    ['ean', cleanCode(line.ean)],
    ['scan_code', cleanText(line.code, 512)],
  ];
  for (const [field, value] of signals) {
    if (!value) continue;
    const { data } = await insforgeAdmin.database.from('products').select(PRODUCT_SELECT)
      .eq('tenant_id', tenantId).eq(field, value).limit(1);
    if (data?.[0]) return data[0];
  }
  return null;
}

async function ensureBinding(tenantId: string, provider: string, externalProductId: string, productId: string, externalSku?: string, metadata?: Record<string, unknown>) {
  if (!externalProductId) return;
  const { data } = await insforgeAdmin.database.from('inventory_source_bindings').select('id')
    .eq('tenant_id', tenantId).eq('provider', provider).eq('external_product_id', externalProductId).limit(1);
  const patch = {
    product_id: productId,
    external_sku: cleanCode(externalSku) || null,
    metadata: metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {},
    updated_at: new Date().toISOString(),
  };
  if (data?.[0]?.id) {
    await insforgeAdmin.database.from('inventory_source_bindings').update(patch)
      .eq('tenant_id', tenantId).eq('id', data[0].id);
  } else {
    await insforgeAdmin.database.from('inventory_source_bindings').insert([{
      tenant_id: tenantId,
      provider,
      external_product_id: externalProductId,
      ...patch,
    }]);
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'products', action: 'read' });
  if (!auth.ok) return auth.response;
  const { tenantId } = auth.ctx;
  const url = new URL(request.url);
  const provider = cleanText(url.searchParams.get('provider'), 80);
  const limit = Math.max(1, Math.min(100, Math.trunc(Number(url.searchParams.get('limit'))) || 50));

  let query = insforgeAdmin.database.from('inventory_sync_events')
    .select('id,provider,external_event_id,event_type,direction,status,attempts,last_error,created_at,applied_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (provider) query = query.eq('provider', provider);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, events: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'products', action: 'update' });
  if (!auth.ok) return auth.response;
  const { tenantId, session } = auth.ctx;

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 }); }
  const provider = cleanText(body.provider, 80).toLowerCase();
  const externalEventId = cleanText(body.externalEventId, 240);
  const eventType = cleanText(body.eventType, 120).toLowerCase();
  const lines = Array.isArray(body.items) ? body.items as SyncLine[] : [];
  if (!provider || !externalEventId || !eventType) return NextResponse.json({ error: 'provider, externalEventId y eventType son requeridos.' }, { status: 400 });
  if (!lines.length || lines.length > 500) return NextResponse.json({ error: 'Envía entre 1 y 500 líneas de stock.' }, { status: 400 });

  const { data: existing } = await insforgeAdmin.database.from('inventory_sync_events')
    .select('id,status,attempts,applied_at,last_error')
    .eq('tenant_id', tenantId).eq('provider', provider).eq('external_event_id', externalEventId).eq('event_type', eventType).limit(1);
  if (existing?.[0]?.status === 'applied') {
    return NextResponse.json({ ok: true, duplicate: true, event: existing[0], results: [] });
  }

  let eventId = existing?.[0]?.id as string | undefined;
  if (!eventId) {
    const { data, error } = await insforgeAdmin.database.from('inventory_sync_events').insert([{
      tenant_id: tenantId,
      provider,
      external_event_id: externalEventId,
      event_type: eventType,
      direction: cleanText(body.direction, 20) || 'inbound',
      status: 'pending',
      attempts: 0,
      payload: body,
    }]).select('id').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    eventId = data.id;
  }

  const results: Array<Record<string, unknown>> = [];
  let failed = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    try {
      const product = await findLocalProduct(tenantId, provider, line);
      if (!product) throw new Error('PRODUCT_MAPPING_REQUIRED');
      const externalProductId = cleanText(line.externalProductId, 240);
      await ensureBinding(tenantId, provider, externalProductId, String(product.id), line.sku, line.metadata);

      const movementType = line.movementType || movementForEvent(eventType);
      const quantity = movementType === 'adjustment' ? cleanQty(line.stock ?? line.quantity) : cleanQty(line.quantity, false);
      if (quantity === null) throw new Error('INVALID_QUANTITY');
      const lineKey = cleanText(line.lineId, 120) || externalProductId || cleanCode(line.sku) || cleanCode(line.ean) || String(index + 1);
      const movement = await applyInventoryMovementAtomic({
        tenantId,
        productId: String(product.id),
        type: movementType,
        quantity,
        referenceType: `sync_${provider}_${eventType}`.slice(0, 120),
        referenceId: `${externalEventId}:${lineKey}`.slice(0, 240),
        barcode: cleanText(line.code || line.ean || line.sku, 512) || null,
        note: `Sincronización ${provider} · ${eventType}`,
        actorId: session.email || `sync:${provider}`,
      });
      results.push({ ok: true, line: index, productId: product.id, productName: product.name, stockAfter: movement.stock_after, duplicate: movement.duplicate });
    } catch (error) {
      failed += 1;
      results.push({ ok: false, line: index, error: error instanceof Error ? error.message : 'SYNC_LINE_FAILED' });
    }
  }

  const now = new Date().toISOString();
  const status = failed ? 'error' : 'applied';
  const lastError = failed ? `${failed} de ${lines.length} línea(s) no pudieron aplicarse.` : null;
  const attempts = Math.max(0, Number(existing?.[0]?.attempts ?? 0)) + 1;
  const { data: event } = await insforgeAdmin.database.from('inventory_sync_events').update({
    status,
    attempts,
    last_error: lastError,
    applied_at: failed ? null : now,
  }).eq('tenant_id', tenantId).eq('id', eventId).select('id,provider,external_event_id,event_type,status,attempts,last_error,created_at,applied_at').single();

  return NextResponse.json({ ok: failed === 0, partial: failed > 0, duplicate: false, event, results }, { status: failed ? 207 : 200 });
}
