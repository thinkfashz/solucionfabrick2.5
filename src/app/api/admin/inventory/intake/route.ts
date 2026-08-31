import { NextRequest, NextResponse } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { applyInventoryMovementAtomic, inventoryMovementHttpError } from '@/lib/inventory/stockLedger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PRODUCT_SELECT = 'id,name,stock,price,sku,ean,scan_code,scan_format,image_url,activo';
const ITEM_SELECT = 'id,tenant_id,batch_id,client_item_id,product_id,code,scan_format,name,sku,ean,image_url,quantity,unit_cost,match_method,confidence,status,product_snapshot,last_error,created_at,updated_at,committed_at';
const BATCH_SELECT = 'id,tenant_id,status,source,label,device_label,actor_id,created_at,updated_at,committed_at';

type Product = {
  id: string;
  name: string;
  stock: number | null;
  price?: number | null;
  sku?: string | null;
  ean?: string | null;
  scan_code?: string | null;
  scan_format?: string | null;
  image_url?: string | null;
  activo?: boolean | null;
};

type IntakeItem = {
  id: string;
  batch_id: string;
  client_item_id: string;
  product_id?: string | null;
  code?: string | null;
  scan_format?: string | null;
  name?: string | null;
  sku?: string | null;
  ean?: string | null;
  image_url?: string | null;
  quantity: number;
  unit_cost?: number | null;
  confidence?: number | null;
  product_snapshot?: Record<string, unknown> | null;
  status: string;
};

function cleanText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanCode(value: unknown, max = 512) {
  return String(value ?? '').trim().replace(/\s+/g, '').slice(0, max);
}

function cleanFormat(value: unknown) {
  return cleanText(value, 40).toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

function cleanQuantity(value: unknown) {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) ? Math.max(1, Math.min(999999999, parsed)) : 1;
}

function cleanMoney(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(999999999, parsed)) : null;
}

function objectOrEmpty(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function actorId(session: { email?: string | null }) {
  return cleanText(session.email, 240) || 'admin';
}

async function readBatch(tenantId: string, batchId: string) {
  const { data, error } = await insforgeAdmin.database.from('inventory_intake_batches')
    .select(BATCH_SELECT)
    .eq('tenant_id', tenantId)
    .eq('id', batchId)
    .single();
  if (error) return null;
  return data;
}

async function readBatchItems(tenantId: string, batchId: string) {
  const { data, error } = await insforgeAdmin.database.from('inventory_intake_items')
    .select(ITEM_SELECT)
    .eq('tenant_id', tenantId)
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as IntakeItem[];
}

async function findProduct(tenantId: string, input: { productId?: string; code?: string; ean?: string; sku?: string }): Promise<{ product: Product | null; method: string }> {
  if (input.productId) {
    const { data } = await insforgeAdmin.database.from('products').select(PRODUCT_SELECT)
      .eq('tenant_id', tenantId).eq('id', input.productId).limit(1);
    if (data?.[0]) return { product: data[0] as Product, method: 'product_id' };
  }

  const code = cleanCode(input.code);
  if (code) {
    const { data } = await insforgeAdmin.database.from('products').select(PRODUCT_SELECT)
      .eq('tenant_id', tenantId).eq('scan_code', code).limit(1);
    if (data?.[0]) return { product: data[0] as Product, method: 'scan_code' };
  }

  const ean = cleanCode(input.ean, 128);
  if (ean) {
    const { data } = await insforgeAdmin.database.from('products').select(PRODUCT_SELECT)
      .eq('tenant_id', tenantId).eq('ean', ean).limit(1);
    if (data?.[0]) return { product: data[0] as Product, method: 'ean' };
  }

  const sku = cleanCode(input.sku, 128);
  if (sku) {
    const { data } = await insforgeAdmin.database.from('products').select(PRODUCT_SELECT)
      .eq('tenant_id', tenantId).eq('sku', sku).limit(1);
    if (data?.[0]) return { product: data[0] as Product, method: 'sku' };
  }

  return { product: null, method: 'new' };
}

async function createProductFromItem(tenantId: string, item: IntakeItem): Promise<Product> {
  const snapshot = objectOrEmpty(item.product_snapshot);
  const name = cleanText(item.name || snapshot.name, 180);
  if (!name) throw new Error('NAME_REQUIRED');

  const code = cleanCode(item.code);
  const ean = cleanCode(item.ean, 128);
  const sku = cleanCode(item.sku, 128);
  const format = cleanFormat(item.scan_format) || (ean ? (ean.length === 8 ? 'ean_8' : 'ean_13') : 'manual');
  const price = cleanMoney(snapshot.price) ?? 0;
  const description = cleanText(snapshot.description, 5000) || null;
  const attributes = objectOrEmpty(snapshot.attributes);

  const payload = {
    tenant_id: tenantId,
    name,
    description,
    price: Math.round(price),
    stock: 0,
    image_url: cleanText(item.image_url || snapshot.imageUrl, 2000) || null,
    featured: false,
    activo: false,
    source: 'inventory_intake',
    source_id: item.id,
    specifications: attributes,
    sku: sku || null,
    ean: ean || null,
    scan_code: code || ean || null,
    scan_format: (code || ean) ? format : null,
  };

  const { data, error } = await insforgeAdmin.database.from('products').insert([payload]).select(PRODUCT_SELECT).single();
  if (!error && data) return data as Product;

  // A concurrent import may have created the same code between matching and insert.
  const retry = await findProduct(tenantId, { code: code || ean, ean, sku });
  if (retry.product) return retry.product;
  throw error ?? new Error('PRODUCT_CREATE_FAILED');
}

async function ensureOpenBatch(tenantId: string, actor: string, options?: { source?: string; label?: string; deviceLabel?: string; forceNew?: boolean }) {
  const source = cleanText(options?.source, 80) || 'admin_camera';
  if (!options?.forceNew) {
    const { data } = await insforgeAdmin.database.from('inventory_intake_batches')
      .select(BATCH_SELECT)
      .eq('tenant_id', tenantId)
      .eq('actor_id', actor)
      .eq('status', 'open')
      .order('updated_at', { ascending: false })
      .limit(1);
    if (data?.[0]) return data[0];
  }

  const { data, error } = await insforgeAdmin.database.from('inventory_intake_batches').insert([{
    tenant_id: tenantId,
    status: 'open',
    source,
    label: cleanText(options?.label, 160) || null,
    device_label: cleanText(options?.deviceLabel, 160) || null,
    actor_id: actor,
  }]).select(BATCH_SELECT).single();
  if (error) throw error;
  return data;
}

function summarize(items: IntakeItem[]) {
  return {
    lines: items.length,
    units: items.reduce((sum, item) => sum + cleanQuantity(item.quantity), 0),
    matched: items.filter((item) => Boolean(item.product_id)).length,
    newProducts: items.filter((item) => !item.product_id).length,
    errors: items.filter((item) => item.status === 'error').length,
    committed: items.filter((item) => item.status === 'committed').length,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'products', action: 'read' });
  if (!auth.ok) return auth.response;
  const { tenantId, session } = auth.ctx;
  const url = new URL(request.url);
  const requestedBatchId = cleanText(url.searchParams.get('batchId'), 80);

  try {
    let batch = requestedBatchId ? await readBatch(tenantId, requestedBatchId) : null;
    if (!batch) batch = await ensureOpenBatch(tenantId, actorId(session));
    const items = await readBatchItems(tenantId, String(batch.id));
    return NextResponse.json({ ok: true, batch, items, summary: summarize(items) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar la recepción.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'products', action: 'create' });
  if (!auth.ok) return auth.response;
  const { tenantId, session } = auth.ctx;
  const actor = actorId(session);

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 }); }
  const action = cleanText(body.action, 40) || 'upsert_item';

  try {
    if (action === 'open_batch') {
      const batch = await ensureOpenBatch(tenantId, actor, {
        source: cleanText(body.source, 80),
        label: cleanText(body.label, 160),
        deviceLabel: cleanText(body.deviceLabel, 160),
        forceNew: body.forceNew === true,
      });
      const items = await readBatchItems(tenantId, String(batch.id));
      return NextResponse.json({ ok: true, batch, items, summary: summarize(items) });
    }

    const batchId = cleanText(body.batchId, 80);
    if (!batchId) return NextResponse.json({ error: 'batchId requerido.' }, { status: 400 });
    const batch = await readBatch(tenantId, batchId);
    if (!batch) return NextResponse.json({ error: 'Recepción no encontrada.' }, { status: 404 });
    if (!['open', 'partial'].includes(String(batch.status))) return NextResponse.json({ error: 'Esta recepción ya está cerrada.' }, { status: 409 });

    if (action === 'delete_item') {
      const itemId = cleanText(body.itemId, 80);
      if (!itemId) return NextResponse.json({ error: 'itemId requerido.' }, { status: 400 });
      const { error } = await insforgeAdmin.database.from('inventory_intake_items').delete()
        .eq('tenant_id', tenantId).eq('batch_id', batchId).eq('id', itemId).neq('status', 'committed');
      if (error) throw error;
      const items = await readBatchItems(tenantId, batchId);
      return NextResponse.json({ ok: true, batch, items, summary: summarize(items) });
    }

    if (action === 'update_item') {
      const itemId = cleanText(body.itemId, 80);
      if (!itemId) return NextResponse.json({ error: 'itemId requerido.' }, { status: 400 });
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString(), last_error: null };
      if (body.quantity !== undefined) patch.quantity = cleanQuantity(body.quantity);
      if (body.name !== undefined) patch.name = cleanText(body.name, 180) || null;
      if (body.sku !== undefined) patch.sku = cleanCode(body.sku, 128) || null;
      if (body.ean !== undefined) patch.ean = cleanCode(body.ean, 128) || null;
      if (body.code !== undefined) patch.code = cleanCode(body.code) || null;
      if (body.scanFormat !== undefined) patch.scan_format = cleanFormat(body.scanFormat) || null;
      if (body.imageUrl !== undefined) patch.image_url = cleanText(body.imageUrl, 2000) || null;
      if (body.unitCost !== undefined) patch.unit_cost = cleanMoney(body.unitCost);
      if (body.snapshot !== undefined) patch.product_snapshot = objectOrEmpty(body.snapshot);
      const { data, error } = await insforgeAdmin.database.from('inventory_intake_items').update(patch)
        .eq('tenant_id', tenantId).eq('batch_id', batchId).eq('id', itemId).neq('status', 'committed')
        .select(ITEM_SELECT).single();
      if (error) throw error;
      return NextResponse.json({ ok: true, item: data });
    }

    if (action === 'upsert_item') {
      const clientItemId = cleanText(body.clientItemId, 120) || crypto.randomUUID();
      const code = cleanCode(body.code);
      const ean = cleanCode(body.ean, 128);
      const sku = cleanCode(body.sku, 128);
      const quantity = cleanQuantity(body.quantity);
      const productId = cleanText(body.productId, 80);
      const match = await findProduct(tenantId, { productId, code, ean, sku });
      const merge = body.merge !== false;

      if (merge) {
        let existing: IntakeItem | null = null;
        if (match.product?.id) {
          const { data } = await insforgeAdmin.database.from('inventory_intake_items').select(ITEM_SELECT)
            .eq('tenant_id', tenantId).eq('batch_id', batchId).eq('product_id', match.product.id).neq('status', 'committed').limit(1);
          existing = (data?.[0] as IntakeItem | undefined) ?? null;
        } else if (code || ean || sku) {
          const signal = code || ean || sku;
          const { data } = await insforgeAdmin.database.from('inventory_intake_items').select(ITEM_SELECT)
            .eq('tenant_id', tenantId).eq('batch_id', batchId).eq('code', signal).neq('status', 'committed').limit(1);
          existing = (data?.[0] as IntakeItem | undefined) ?? null;
        }

        if (existing) {
          const nextQty = Math.min(999999999, cleanQuantity(existing.quantity) + quantity);
          const { data, error } = await insforgeAdmin.database.from('inventory_intake_items').update({
            quantity: nextQty,
            updated_at: new Date().toISOString(),
            image_url: cleanText(body.imageUrl, 2000) || existing.image_url || null,
            confidence: Number.isFinite(Number(body.confidence)) ? Math.max(0, Math.min(1, Number(body.confidence))) : existing.confidence,
            product_snapshot: { ...objectOrEmpty(existing.product_snapshot), ...objectOrEmpty(body.snapshot) },
            last_error: null,
          }).eq('tenant_id', tenantId).eq('id', existing.id).select(ITEM_SELECT).single();
          if (error) throw error;
          await insforgeAdmin.database.from('inventory_intake_batches').update({ updated_at: new Date().toISOString(), status: 'open' })
            .eq('tenant_id', tenantId).eq('id', batchId);
          return NextResponse.json({ ok: true, merged: true, item: data, product: match.product });
        }
      }

      const snapshot = objectOrEmpty(body.snapshot);
      const proposedName = cleanText(body.name || snapshot.name || match.product?.name, 180);
      const payload = {
        tenant_id: tenantId,
        batch_id: batchId,
        client_item_id: clientItemId,
        product_id: match.product?.id || null,
        code: code || ean || sku || null,
        scan_format: cleanFormat(body.scanFormat) || null,
        name: proposedName || null,
        sku: sku || match.product?.sku || null,
        ean: ean || match.product?.ean || null,
        image_url: cleanText(body.imageUrl || snapshot.imageUrl || match.product?.image_url, 2000) || null,
        quantity,
        unit_cost: cleanMoney(body.unitCost),
        match_method: match.method,
        confidence: Number.isFinite(Number(body.confidence)) ? Math.max(0, Math.min(1, Number(body.confidence))) : null,
        status: match.product ? 'matched' : 'new',
        product_snapshot: snapshot,
        updated_at: new Date().toISOString(),
      };

      const { data: existingByClient } = await insforgeAdmin.database.from('inventory_intake_items').select(ITEM_SELECT)
        .eq('tenant_id', tenantId).eq('batch_id', batchId).eq('client_item_id', clientItemId).limit(1);
      let saved;
      if (existingByClient?.[0]) {
        const { data, error } = await insforgeAdmin.database.from('inventory_intake_items').update(payload)
          .eq('tenant_id', tenantId).eq('id', existingByClient[0].id).select(ITEM_SELECT).single();
        if (error) throw error;
        saved = data;
      } else {
        const { data, error } = await insforgeAdmin.database.from('inventory_intake_items').insert([payload]).select(ITEM_SELECT).single();
        if (error) throw error;
        saved = data;
      }
      await insforgeAdmin.database.from('inventory_intake_batches').update({ updated_at: new Date().toISOString(), status: 'open' })
        .eq('tenant_id', tenantId).eq('id', batchId);
      return NextResponse.json({ ok: true, merged: false, item: saved, product: match.product });
    }

    if (action === 'commit_batch') {
      const items = await readBatchItems(tenantId, batchId);
      const pending = items.filter((item) => item.status !== 'committed');
      const results: Array<{ itemId: string; ok: boolean; productId?: string; stockAfter?: number; duplicate?: boolean; error?: string }> = [];

      for (const item of pending) {
        try {
          let match = await findProduct(tenantId, {
            productId: item.product_id || undefined,
            code: item.code || undefined,
            ean: item.ean || undefined,
            sku: item.sku || undefined,
          });
          let product = match.product;
          if (!product) product = await createProductFromItem(tenantId, item);

          const movement = await applyInventoryMovementAtomic({
            tenantId,
            productId: product.id,
            type: 'in',
            quantity: cleanQuantity(item.quantity),
            referenceType: 'intake_item',
            referenceId: item.id,
            barcode: item.code || item.ean || item.sku || null,
            note: `Recepción rápida ${batchId}`,
            actorId: actor,
          });

          await insforgeAdmin.database.from('inventory_intake_items').update({
            product_id: product.id,
            status: 'committed',
            match_method: match.product ? match.method : 'created',
            last_error: null,
            updated_at: new Date().toISOString(),
            committed_at: new Date().toISOString(),
          }).eq('tenant_id', tenantId).eq('id', item.id);
          results.push({ itemId: item.id, ok: true, productId: product.id, stockAfter: movement.stock_after, duplicate: movement.duplicate });
        } catch (error) {
          const mapped = inventoryMovementHttpError(error);
          const message = error instanceof Error && error.message === 'NAME_REQUIRED'
            ? 'Falta el nombre del producto.'
            : mapped.status < 500 ? mapped.error : (error instanceof Error ? error.message : 'No se pudo incorporar.');
          await insforgeAdmin.database.from('inventory_intake_items').update({
            status: 'error', last_error: message, updated_at: new Date().toISOString(),
          }).eq('tenant_id', tenantId).eq('id', item.id);
          results.push({ itemId: item.id, ok: false, error: message });
        }
      }

      const failed = results.filter((result) => !result.ok).length;
      const now = new Date().toISOString();
      const batchStatus = failed ? 'partial' : 'committed';
      const { data: updatedBatch } = await insforgeAdmin.database.from('inventory_intake_batches').update({
        status: batchStatus,
        updated_at: now,
        committed_at: failed ? null : now,
      }).eq('tenant_id', tenantId).eq('id', batchId).select(BATCH_SELECT).single();
      const updatedItems = await readBatchItems(tenantId, batchId);
      return NextResponse.json({ ok: failed === 0, partial: failed > 0, batch: updatedBatch, items: updatedItems, summary: summarize(updatedItems), results });
    }

    return NextResponse.json({ error: 'Acción no soportada.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo procesar la recepción.' }, { status: 500 });
  }
}
