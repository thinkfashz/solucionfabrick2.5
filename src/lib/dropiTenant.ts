import 'server-only';
import { INSFORGE_BASE_URL, insforgeAdmin } from '@/lib/insforge';
import { encryptCredentials } from '@/lib/integrationsCrypto';
import { DEFAULT_TENANT_ID } from '@/lib/tenant-edge';
import { readTenantIntegration } from '@/lib/tenantIntegrations';
import { dropiRequest, normalizeDropiProduct, type DropiCredentials, type DropiImportResult, type NormalizedDropiProduct } from '@/lib/dropi';

type AnyRecord = Record<string, unknown>;
type CategoryRow = { id: string; name: string };

function text(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }
function numberValue(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.,-]/g, '').replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}
function boolValue(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', '1', 'yes', 'si', 'sí', 'on'].includes(value.trim().toLowerCase());
  return fallback;
}

function envValues(tenantId: string): Record<string, unknown> {
  if (tenantId !== DEFAULT_TENANT_ID) return {};
  return {
    api_base_url: process.env.DROPI_API_BASE_URL,
    api_token: process.env.DROPI_API_TOKEN,
    api_key: process.env.DROPI_API_KEY,
    auth_header_name: process.env.DROPI_AUTH_HEADER_NAME,
    auth_scheme: process.env.DROPI_AUTH_SCHEME,
    products_path: process.env.DROPI_PRODUCTS_PATH,
    orders_path: process.env.DROPI_ORDERS_PATH,
    health_path: process.env.DROPI_HEALTH_PATH,
    default_category_id: process.env.DROPI_DEFAULT_CATEGORY_ID,
    price_markup_pct: process.env.DROPI_PRICE_MARKUP_PCT,
    currency: process.env.DROPI_CURRENCY,
    auto_fulfill_paid_orders: process.env.DROPI_AUTO_FULFILL_PAID_ORDERS,
  };
}

function asCredentials(values: Record<string, unknown>): DropiCredentials | null {
  const apiBase = text(values.api_base_url);
  if (!apiBase) return null;
  return {
    api_base_url: apiBase,
    api_token: text(values.api_token),
    api_key: text(values.api_key),
    auth_header_name: text(values.auth_header_name) || 'Authorization',
    auth_scheme: text(values.auth_scheme) || 'Bearer',
    products_path: text(values.products_path) || '/products',
    orders_path: text(values.orders_path) || '/orders',
    health_path: text(values.health_path),
    default_category_id: text(values.default_category_id),
    price_markup_pct: numberValue(values.price_markup_pct, 35),
    currency: text(values.currency) || 'CLP',
    auto_fulfill_paid_orders: boolValue(values.auto_fulfill_paid_orders, false),
  };
}

export async function getTenantDropiCredentials(tenantId: string): Promise<DropiCredentials | null> {
  const integration = await readTenantIntegration(tenantId, 'dropi');
  const stored: Record<string, unknown> = integration.source === 'tenant' ? integration.values : {};
  const env = envValues(tenantId);
  const envDefined = Object.fromEntries(Object.entries(env).filter(([, value]) => text(value) !== ''));
  return asCredentials({ ...stored, ...envDefined });
}

export async function saveTenantDropiCredentials(tenantId: string, input: Record<string, unknown>) {
  const integration = await readTenantIntegration(tenantId, 'dropi');
  const existing: Record<string, unknown> = integration.source === 'tenant' ? integration.values : {};
  const merged: Record<string, string> = {
    ...Object.fromEntries(Object.entries(existing).map(([key, value]) => [key, String(value ?? '')])),
    api_base_url: text(input.api_base_url) || text(existing.api_base_url),
    api_token: text(input.api_token) || text(existing.api_token),
    api_key: text(input.api_key) || text(existing.api_key),
    auth_header_name: text(input.auth_header_name) || text(existing.auth_header_name) || 'Authorization',
    auth_scheme: text(input.auth_scheme) || text(existing.auth_scheme) || 'Bearer',
    products_path: text(input.products_path) || text(existing.products_path) || '/products',
    orders_path: text(input.orders_path) || text(existing.orders_path) || '/orders',
    health_path: text(input.health_path) || text(existing.health_path),
    default_category_id: text(input.default_category_id) || text(existing.default_category_id),
    price_markup_pct: String(numberValue(input.price_markup_pct, numberValue(existing.price_markup_pct, 35))),
    currency: text(input.currency) || text(existing.currency) || 'CLP',
    auto_fulfill_paid_orders: boolValue(input.auto_fulfill_paid_orders, boolValue(existing.auto_fulfill_paid_orders, false)) ? 'true' : 'false',
  };
  if (!merged.api_base_url) throw new Error('api_base_url es requerido.');
  const { error } = await insforgeAdmin.database.from('integrations').upsert([{
    provider: 'dropi', tenant_id: tenantId, credentials: encryptCredentials(merged), updated_at: new Date().toISOString(),
  }], { onConflict: 'provider,tenant_id' });
  if (error) throw new Error(error.message || 'No se pudo guardar Dropi.');
  return merged;
}

function extractArray(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload.filter((row): row is AnyRecord => Boolean(row && typeof row === 'object'));
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as AnyRecord;
  for (const candidate of [root.data, root.products, root.items, root.results, root.response, root.list]) {
    if (Array.isArray(candidate)) return candidate.filter((row): row is AnyRecord => Boolean(row && typeof row === 'object'));
    if (candidate && typeof candidate === 'object') {
      const nested = extractArray(candidate);
      if (nested.length) return nested;
    }
  }
  return [];
}

export async function fetchTenantDropiProducts(tenantId: string, limit = 40): Promise<NormalizedDropiProduct[]> {
  const credentials = await getTenantDropiCredentials(tenantId);
  if (!credentials) throw new Error('Dropi no está configurado para esta empresa.');
  const safeLimit = Math.max(1, Math.min(limit, 200));
  const url = new URL(credentials.products_path.replace(/^\//, ''), `${credentials.api_base_url.replace(/\/+$/, '')}/`);
  if (!url.searchParams.has('limit')) url.searchParams.set('limit', String(safeLimit));
  const payload = await dropiRequest(url.toString(), {}, credentials);
  return extractArray(payload).slice(0, safeLimit)
    .map((row) => normalizeDropiProduct(row, credentials.price_markup_pct))
    .filter((row): row is NormalizedDropiProduct => Boolean(row));
}

async function rawSql(query: string) {
  const apiKey = process.env.INSFORGE_API_KEY;
  if (!apiKey) return;
  const response = await fetch(`${INSFORGE_BASE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey }, body: JSON.stringify({ query }), cache: 'no-store', signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`No se pudo alinear esquema Dropi: HTTP ${response.status}`);
}

export async function ensureTenantDropiSchema() {
  await rawSql(`
CREATE TABLE IF NOT EXISTS public.dropi_order_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL DEFAULT '${DEFAULT_TENANT_ID}'::uuid,
  order_id text NOT NULL, dropi_order_id text, status text DEFAULT 'pending', request_payload jsonb DEFAULT '{}'::jsonb,
  response_payload jsonb DEFAULT '{}'::jsonb, error_message text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.dropi_order_links ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT '${DEFAULT_TENANT_ID}'::uuid;
UPDATE public.dropi_order_links SET tenant_id = '${DEFAULT_TENANT_ID}'::uuid WHERE tenant_id IS NULL;
ALTER TABLE public.dropi_order_links ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS dropi_order_links_tenant_order_idx ON public.dropi_order_links(tenant_id, order_id, created_at DESC);
`);
}

function categoryKey(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' '); }
async function categoryMap() {
  const map = new Map<string, CategoryRow>();
  const { data, error } = await insforgeAdmin.database.from('categories').select('id, name');
  if (error) throw new Error(error.message);
  for (const raw of Array.isArray(data) ? data : []) {
    const row = raw as { id?: string; name?: string };
    if (row.id && row.name) map.set(categoryKey(row.name), { id: row.id, name: row.name });
  }
  return map;
}
async function resolveCategory(name: string | undefined, fallback: string | undefined, map: Map<string, CategoryRow>, warnings: string[]) {
  const categoryName = text(name);
  if (!categoryName) return text(fallback) || null;
  const key = categoryKey(categoryName);
  const found = map.get(key);
  if (found) return found.id;
  const { data, error } = await insforgeAdmin.database.from('categories').insert([{ name: categoryName, description: 'Creada automáticamente desde Dropi.', updated_at: new Date().toISOString() }]);
  if (error) { warnings.push(`Categoría ${categoryName}: ${error.message}`); return text(fallback) || null; }
  const created = Array.isArray(data) ? data[0] as { id?: string } | undefined : undefined;
  if (created?.id) { map.set(key, { id: created.id, name: categoryName }); return created.id; }
  return text(fallback) || null;
}

export async function importTenantDropiProducts(tenantId: string, limit = 40, dryRun = false): Promise<DropiImportResult> {
  await ensureTenantDropiSchema();
  const credentials = await getTenantDropiCredentials(tenantId);
  if (!credentials) throw new Error('Dropi no está configurado para esta empresa.');
  const products = await fetchTenantDropiProducts(tenantId, limit);
  const warnings: string[] = [];
  let created = 0, updated = 0, skipped = 0;
  const categories = dryRun ? new Map<string, CategoryRow>() : await categoryMap().catch((err) => { warnings.push(`Categorías: ${err instanceof Error ? err.message : 'error'}`); return new Map<string, CategoryRow>(); });

  if (!dryRun) for (const product of products) {
    try {
      const existing = await insforgeAdmin.database.from('products').select('id').eq('tenant_id', tenantId).eq('source', 'dropi').eq('source_id', product.externalId).limit(1);
      const existingId = Array.isArray(existing.data) ? (existing.data[0] as { id?: string } | undefined)?.id : undefined;
      const categoryId = await resolveCategory(product.categoryName, credentials.default_category_id, categories, warnings);
      const row = {
        tenant_id: tenantId, name: product.name, description: product.description, tagline: product.categoryName || 'Producto importado desde Dropi',
        price: product.salePrice, stock: product.stock, image_url: product.imageUrl ?? null, category_id: categoryId,
        featured: false, activo: true, source: 'dropi', source_url: product.sourceUrl ?? null, source_id: product.externalId,
        supplier_price: product.supplierPrice, supplier_currency: credentials.currency,
        specifications: { provider: 'dropi', sku: product.sku, categoryName: product.categoryName, importedAt: new Date().toISOString(), raw: product.raw },
        updated_at: new Date().toISOString(),
      };
      if (existingId) {
        const { error } = await insforgeAdmin.database.from('products').update(row).eq('tenant_id', tenantId).eq('id', existingId);
        if (error) throw error; updated += 1;
      } else {
        const { error } = await insforgeAdmin.database.from('products').insert([{ ...row, created_at: new Date().toISOString() }]);
        if (error) throw error; created += 1;
      }
    } catch (err) { skipped += 1; warnings.push(`${product.name}: ${err instanceof Error ? err.message : 'no se pudo importar'}`); }
  }
  return { totalFetched: products.length, normalized: products.length, created, updated, skipped, products, warnings };
}

function itemProductId(item: AnyRecord) { return text(item.productId ?? item.productoId ?? item.id); }
function itemQuantity(item: AnyRecord) { return Math.max(1, Math.floor(numberValue(item.quantity ?? item.cantidad, 1))); }
function responseId(response: unknown) {
  if (!response || typeof response !== 'object') return '';
  const root = response as AnyRecord;
  const direct = text(root.id ?? root.order_id ?? root.external_id);
  if (direct) return direct;
  return root.data && typeof root.data === 'object' ? text((root.data as AnyRecord).id ?? (root.data as AnyRecord).order_id ?? (root.data as AnyRecord).external_id) : '';
}

export async function createTenantDropiFulfillment(tenantId: string, orderId: string) {
  await ensureTenantDropiSchema();
  const credentials = await getTenantDropiCredentials(tenantId);
  if (!credentials) return { ok: false, ignored: true, reason: 'dropi_not_configured' };
  const orderResult = await insforgeAdmin.database.from('orders').select('*').eq('tenant_id', tenantId).eq('id', orderId).limit(1);
  const order = Array.isArray(orderResult.data) ? orderResult.data[0] as AnyRecord | undefined : undefined;
  if (!order) return { ok: false, reason: 'order_not_found' };
  const dropiItems: AnyRecord[] = [];
  for (const item of Array.isArray(order.items) ? order.items as AnyRecord[] : []) {
    const productId = itemProductId(item);
    if (!productId) continue;
    const productResult = await insforgeAdmin.database.from('products').select('id, name, source, source_id, price, supplier_price').eq('tenant_id', tenantId).eq('id', productId).limit(1);
    const product = Array.isArray(productResult.data) ? productResult.data[0] as AnyRecord | undefined : undefined;
    if (product?.source !== 'dropi' || !product.source_id) continue;
    dropiItems.push({ product_id: product.source_id, external_product_id: product.source_id, local_product_id: product.id, name: product.name, quantity: itemQuantity(item), price: numberValue(product.supplier_price ?? product.price, 0) });
  }
  if (!dropiItems.length) return { ok: true, ignored: true, reason: 'order_without_dropi_products' };
  const payload = {
    external_reference: orderId,
    customer: { name: order.customer_name ?? '', email: order.customer_email ?? '', phone: order.customer_phone ?? '' },
    shipping: { region: order.region ?? '', address: order.shipping_address ?? '' },
    totals: { subtotal: order.subtotal ?? 0, shipping_fee: order.shipping_fee ?? 0, total: order.total ?? 0, currency: order.currency ?? credentials.currency },
    items: dropiItems,
  };
  try {
    const response = await dropiRequest(credentials.orders_path, { method: 'POST', body: JSON.stringify(payload) }, credentials);
    const dropiOrderId = responseId(response);
    await insforgeAdmin.database.from('dropi_order_links').insert([{ tenant_id: tenantId, order_id: orderId, dropi_order_id: dropiOrderId || null, status: 'sent', request_payload: payload, response_payload: response as AnyRecord, updated_at: new Date().toISOString() }]);
    return { ok: true, sent: true, dropiOrderId, response };
  } catch (err) {
    try { await insforgeAdmin.database.from('dropi_order_links').insert([{ tenant_id: tenantId, order_id: orderId, status: 'error', request_payload: payload, error_message: err instanceof Error ? err.message : String(err), updated_at: new Date().toISOString() }]); } catch {}
    return { ok: false, sent: false, error: err instanceof Error ? err.message : 'No se pudo crear orden en Dropi.' };
  }
}

export function createTenantDropiFulfillmentAsync(tenantId: string, orderId: string) {
  void (async () => {
    const credentials = await getTenantDropiCredentials(tenantId);
    if (!credentials?.auto_fulfill_paid_orders) return;
    await createTenantDropiFulfillment(tenantId, orderId);
  })().catch(() => undefined);
}
