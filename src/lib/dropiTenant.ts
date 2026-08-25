import 'server-only';
import { INSFORGE_BASE_URL, insforgeAdmin } from '@/lib/insforge';
import { decryptCredentials, encryptCredentials } from '@/lib/integrationsCrypto';
import { DEFAULT_TENANT_ID } from '@/lib/tenant-edge';
import { readTenantIntegration } from '@/lib/tenantIntegrations';
import {
  dropiRequest,
  normalizeDropiProduct,
  type DropiCredentials,
  type DropiImportResult,
  type NormalizedDropiProduct,
} from '@/lib/dropi';

type AnyRecord = Record<string, unknown>;
type CategoryRow = { id: string; name: string };

const DEFAULT_PRODUCTS_PATH = '/products';
const DEFAULT_ORDERS_PATH = '/orders';

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/[^0-9.,-]/g, '').replace(',', '.'));
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function cleanBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', '1', 'yes', 'si', 'sí', 'on'].includes(value.trim().toLowerCase());
  return fallback;
}

function envCredentials(tenantId: string): Partial<DropiCredentials> {
  if (tenantId !== DEFAULT_TENANT_ID) return {};
  return {
    api_base_url: cleanString(process.env.DROPI_API_BASE_URL),
    api_token: cleanString(process.env.DROPI_API_TOKEN),
    api_key: cleanString(process.env.DROPI_API_KEY),
    auth_header_name: cleanString(process.env.DROPI_AUTH_HEADER_NAME),
    auth_scheme: cleanString(process.env.DROPI_AUTH_SCHEME),
    products_path: cleanString(process.env.DROPI_PRODUCTS_PATH),
    orders_path: cleanString(process.env.DROPI_ORDERS_PATH),
    health_path: cleanString(process.env.DROPI_HEALTH_PATH),
    default_category_id: cleanString(process.env.DROPI_DEFAULT_CATEGORY_ID),
    price_markup_pct: cleanNumber(process.env.DROPI_PRICE_MARKUP_PCT, NaN),
    currency: cleanString(process.env.DROPI_CURRENCY),
    auto_fulfill_paid_orders: cleanBoolean(process.env.DROPI_AUTO_FULFILL_PAID_ORDERS, false),
  };
}

function mergeCredentials(stored: Record<string, string>, tenantId: string): DropiCredentials | null {
  const env = envCredentials(tenantId);
  const envEntries = Object.entries(env).filter(([, value]) => value !== '' && value !== undefined && !Number.isNaN(value));
  const merged = { ...stored, ...Object.fromEntries(envEntries) } as AnyRecord;
  const apiBase = cleanString(merged.api_base_url);
  if (!apiBase) return null;
  return {
    api_base_url: apiBase,
    api_token: cleanString(merged.api_token),
    api_key: cleanString(merged.api_key),
    auth_header_name: cleanString(merged.auth_header_name) || 'Authorization',
    auth_scheme: cleanString(merged.auth_scheme) || 'Bearer',
    products_path: cleanString(merged.products_path) || DEFAULT_PRODUCTS_PATH,
    orders_path: cleanString(merged.orders_path) || DEFAULT_ORDERS_PATH,
    health_path: cleanString(merged.health_path),
    default_category_id: cleanString(merged.default_category_id),
    price_markup_pct: cleanNumber(merged.price_markup_pct, 35),
    currency: cleanString(merged.currency) || 'CLP',
    auto_fulfill_paid_orders: cleanBoolean(merged.auto_fulfill_paid_orders, false),
  };
}

export async function getTenantDropiCredentials(tenantId: string): Promise<DropiCredentials | null> {
  const integration = await readTenantIntegration(tenantId, 'dropi');
  const stored = integration.source === 'tenant' ? integration.values : {};
  return mergeCredentials(stored, tenantId);
}

export async function saveTenantDropiCredentials(tenantId: string, input: Record<string, unknown>) {
  const integration = await readTenantIntegration(tenantId, 'dropi');
  const existing = integration.source === 'tenant' ? integration.values : {};
  const credentials = {
    ...existing,
    api_base_url: cleanString(input.api_base_url) || cleanString(existing.api_base_url),
    api_token: cleanString(input.api_token) || cleanString(existing.api_token),
    api_key: cleanString(input.api_key) || cleanString(existing.api_key),
    auth_header_name: cleanString(input.auth_header_name) || cleanString(existing.auth_header_name) || 'Authorization',
    auth_scheme: cleanString(input.auth_scheme) || cleanString(existing.auth_scheme) || 'Bearer',
    products_path: cleanString(input.products_path) || cleanString(existing.products_path) || DEFAULT_PRODUCTS_PATH,
    orders_path: cleanString(input.orders_path) || cleanString(existing.orders_path) || DEFAULT_ORDERS_PATH,
    health_path: cleanString(input.health_path) || cleanString(existing.health_path),
    default_category_id: cleanString(input.default_category_id) || cleanString(existing.default_category_id),
    price_markup_pct: String(cleanNumber(input.price_markup_pct, cleanNumber(existing.price_markup_pct, 35))),
    currency: cleanString(input.currency) || cleanString(existing.currency) || 'CLP',
    auto_fulfill_paid_orders: cleanBoolean(input.auto_fulfill_paid_orders, cleanBoolean(existing.auto_fulfill_paid_orders, false)) ? 'true' : 'false',
  };
  if (!credentials.api_base_url) throw new Error('api_base_url es requerido.');

  const { error } = await insforgeAdmin.database.from('integrations').upsert(
    [{
      provider: 'dropi',
      tenant_id: tenantId,
      credentials: encryptCredentials(credentials),
      updated_at: new Date().toISOString(),
    }],
    { onConflict: 'provider,tenant_id' },
  );
  if (error) throw new Error(error.message ?? 'No se pudo guardar Dropi.');
  return credentials;
}

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function appendLimit(url: string, limit: number) {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has('limit')) parsed.searchParams.set('limit', String(limit));
    return parsed.toString();
  } catch {
    return url;
  }
}

function extractArray(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload.filter((item): item is AnyRecord => Boolean(item && typeof item === 'object'));
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as AnyRecord;
  for (const candidate of [root.data, root.products, root.items, root.results, root.response, root.list]) {
    if (Array.isArray(candidate)) return candidate.filter((item): item is AnyRecord => Boolean(item && typeof item === 'object'));
    if (candidate && typeof candidate === 'object') {
      const nested = extractArray(candidate);
      if (nested.length) return nested;
    }
  }
  return [];
}

export async function fetchTenantDropiProducts(tenantId: string, limit = 40): Promise<NormalizedDropiProduct[]> {
  const credentials = await getTenantDropiCredentials(tenantId);
  if (!credentials) throw new Error('Dropi no está configurado para este tenant.');
  const safeLimit = Math.max(1, Math.min(limit, 200));
  const url = appendLimit(joinUrl(credentials.api_base_url, credentials.products_path), safeLimit);
  const payload = await dropiRequest(url, {}, credentials);
  return extractArray(payload)
    .slice(0, safeLimit)
    .map((raw) => normalizeDropiProduct(raw, credentials.price_markup_pct))
    .filter((item): item is NormalizedDropiProduct => Boolean(item));
}

async function rawSql(query: string) {
  const apiKey = process.env.INSFORGE_API_KEY;
  if (!apiKey) return;
  const response = await fetch(`${INSFORGE_BASE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ query }),
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`No se pudo alinear esquema Dropi: HTTP ${response.status}`);
}

export async function ensureTenantDropiSchema() {
  await rawSql(`
    CREATE TABLE IF NOT EXISTS public.dropi_order_links (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL DEFAULT '${DEFAULT_TENANT_ID}'::uuid,
      order_id text NOT NULL,
      dropi_order_id text,
      status text DEFAULT 'pending',
      request_payload jsonb DEFAULT '{}'::jsonb,
      response_payload jsonb DEFAULT '{}'::jsonb,
      error_message text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    ALTER TABLE public.dropi_order_links ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT '${DEFAULT_TENANT_ID}'::uuid;
    UPDATE public.dropi_order_links SET tenant_id = '${DEFAULT_TENANT_ID}'::uuid WHERE tenant_id IS NULL;
    ALTER TABLE public.dropi_order_links ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS dropi_order_links_tenant_order_idx ON public.dropi_order_links(tenant_id, order_id, created_at DESC);
  `);
}

function normalizeCategoryName(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

async function loadCategoryMap() {
  const map = new Map<string, CategoryRow>();
  const { data, error } = await insforgeAdmin.database.from('categories').select('id, name');
  if (error) throw new Error(error.message || 'No se pudieron cargar categorías.');
  for (const raw of Array.isArray(data) ? data : []) {
    const row = raw as { id?: string; name?: string };
    if (row.id && row.name) map.set(normalizeCategoryName(row.name), { id: row.id, name: row.name });
  }
  return map;
}

async function resolveCategoryId(name: string | undefined, fallback: string | undefined, map: Map<string, CategoryRow>, warnings: string[]) {
  const cleanName = cleanString(name);
  if (!cleanName) return cleanString(fallback) || null;
  const key = normalizeCategoryName(cleanName);
  const existing = map.get(key);
  if (existing) return existing.id;

  const { data, error } = await insforgeAdmin.database.from('categories').insert([{
    name: cleanName,
    description: 'Creada automáticamente desde Dropi.',
    updated_at: new Date().toISOString(),
  }]);
  if (error) {
    warnings.push(`Categoría ${cleanName}: ${error.message}`);
    return cleanString(fallback) || null;
  }
  const created = Array.isArray(data) ? data[0] as { id?: string; name?: string } | undefined : undefined;
  if (created?.id) {
    map.set(key, { id: created.id, name: created.name ?? cleanName });
    return created.id;
  }
  const fresh = await loadCategoryMap();
  return fresh.get(key)?.id ?? cleanString(fallback) || null;
}

async function findExistingProduct(tenantId: string, sourceId: string) {
  const { data } = await insforgeAdmin.database
    .from('products')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('source', 'dropi')
    .eq('source_id', sourceId)
    .limit(1);
  return Array.isArray(data) ? data[0] as { id?: string } | undefined : undefined;
}

export async function importTenantDropiProducts(tenantId: string, limit = 40, dryRun = false): Promise<DropiImportResult> {
  await ensureTenantDropiSchema();
  const credentials = await getTenantDropiCredentials(tenantId);
  if (!credentials) throw new Error('Dropi no está configurado para este tenant.');
  const products = await fetchTenantDropiProducts(tenantId, limit);
  const warnings: string[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let categoryMap = new Map<string, CategoryRow>();

  if (!dryRun) {
    try { categoryMap = await loadCategoryMap(); }
    catch (err) { warnings.push(`Categorías: ${err instanceof Error ? err.message : 'no se pudieron cargar'}`); }
  }

  if (!dryRun) {
    for (const product of products) {
      try {
        const existing = await findExistingProduct(tenantId, product.externalId);
        const categoryId = await resolveCategoryId(product.categoryName, credentials.default_category_id, categoryMap, warnings);
        const row = {
          tenant_id: tenantId,
          name: product.name,
          description: product.description,
          tagline: product.categoryName || 'Producto importado desde Dropi',
          price: product.salePrice,
          stock: product.stock,
          image_url: product.imageUrl ?? null,
          category_id: categoryId,
          featured: false,
          activo: true,
          source: 'dropi',
          source_url: product.sourceUrl ?? null,
          source_id: product.externalId,
          supplier_price: product.supplierPrice,
          supplier_currency: credentials.currency,
          specifications: { provider: 'dropi', sku: product.sku, categoryName: product.categoryName, importedAt: new Date().toISOString(), raw: product.raw },
          updated_at: new Date().toISOString(),
        };
        if (existing?.id) {
          const { error } = await insforgeAdmin.database.from('products').update(row).eq('tenant_id', tenantId).eq('id', existing.id);
          if (error) throw error;
          updated += 1;
        } else {
          const { error } = await insforgeAdmin.database.from('products').insert([{ ...row, created_at: new Date().toISOString() }]);
          if (error) throw error;
          created += 1;
        }
      } catch (err) {
        skipped += 1;
        warnings.push(`${product.name}: ${err instanceof Error ? err.message : 'no se pudo importar'}`);
      }
    }
  }

  return { totalFetched: products.length, normalized: products.length, created, updated, skipped, products, warnings };
}

function productIdFromItem(item: AnyRecord) {
  return cleanString(item.productId ?? item.productoId ?? item.id);
}

function quantityFromItem(item: AnyRecord) {
  return Math.max(1, Math.floor(cleanNumber(item.quantity ?? item.cantidad, 1)));
}

async function readOrder(tenantId: string, orderId: string) {
  const { data } = await insforgeAdmin.database.from('orders').select('*').eq('tenant_id', tenantId).eq('id', orderId).limit(1);
  return Array.isArray(data) ? data[0] as AnyRecord | undefined : undefined;
}

async function readProduct(tenantId: string, productId: string) {
  const { data } = await insforgeAdmin.database
    .from('products')
    .select('id, name, source, source_id, price, supplier_price, specifications')
    .eq('tenant_id', tenantId)
    .eq('id', productId)
    .limit(1);
  return Array.isArray(data) ? data[0] as AnyRecord | undefined : undefined;
}

function responseOrderId(response: unknown) {
  if (!response || typeof response !== 'object') return '';
  const root = response as AnyRecord;
  const direct = cleanString(root.id ?? root.order_id ?? root.external_id);
  if (direct) return direct;
  if (root.data && typeof root.data === 'object') {
    const data = root.data as AnyRecord;
    return cleanString(data.id ?? data.order_id ?? data.external_id);
  }
  return '';
}

export async function createTenantDropiFulfillment(tenantId: string, orderId: string) {
  await ensureTenantDropiSchema();
  const credentials = await getTenantDropiCredentials(tenantId);
  if (!credentials) return { ok: false, ignored: true, reason: 'dropi_not_configured' };
  const order = await readOrder(tenantId, orderId);
  if (!order) return { ok: false, reason: 'order_not_found' };
  const items = Array.isArray(order.items) ? order.items as AnyRecord[] : [];
  const dropiItems: AnyRecord[] = [];

  for (const item of items) {
    const productId = productIdFromItem(item);
    if (!productId) continue;
    const product = await readProduct(tenantId, productId);
    if (product?.source !== 'dropi' || !product.source_id) continue;
    dropiItems.push({
      product_id: product.source_id,
      external_product_id: product.source_id,
      local_product_id: product.id,
      name: product.name,
      quantity: quantityFromItem(item),
      price: cleanNumber(product.supplier_price ?? product.price, 0),
    });
  }

  if (dropiItems.length === 0) return { ok: true, ignored: true, reason: 'order_without_dropi_products' };

  const payload = {
    external_reference: orderId,
    customer: { name: order.customer_name ?? order.cliente_nombre ?? '', email: order.customer_email ?? order.cliente_email ?? '', phone: order.customer_phone ?? order.cliente_telefono ?? '' },
    shipping: { region: order.region ?? '', address: order.shipping_address ?? order.direccion_envio ?? '' },
    totals: { subtotal: order.subtotal ?? 0, shipping_fee: order.shipping_fee ?? 0, total: order.total ?? 0, currency: order.currency ?? credentials.currency },
    items: dropiItems,
  };

  try {
    const response = await dropiRequest(credentials.orders_path, { method: 'POST', body: JSON.stringify(payload) }, credentials);
    const dropiOrderId = responseOrderId(response);
    await insforgeAdmin.database.from('dropi_order_links').insert([{
      tenant_id: tenantId,
      order_id: orderId,
      dropi_order_id: dropiOrderId || null,
      status: 'sent',
      request_payload: payload,
      response_payload: response as AnyRecord,
      updated_at: new Date().toISOString(),
    }]);
    return { ok: true, sent: true, dropiOrderId, response };
  } catch (err) {
    try {
      await insforgeAdmin.database.from('dropi_order_links').insert([{
        tenant_id: tenantId,
        order_id: orderId,
        status: 'error',
        request_payload: payload,
        error_message: err instanceof Error ? err.message : String(err),
        updated_at: new Date().toISOString(),
      }]);
    } catch {
      // Ignore diagnostics failure.
    }
    return { ok: false, sent: false, error: err instanceof Error ? err.message : 'No se pudo crear orden en Dropi.' };
  }
}

export function createTenantDropiFulfillmentAsync(tenantId: string, orderId: string): void {
  void (async () => {
    const credentials = await getTenantDropiCredentials(tenantId);
    if (!credentials?.auto_fulfill_paid_orders) return;
    await createTenantDropiFulfillment(tenantId, orderId);
  })().catch(() => undefined);
}

export async function readRawTenantDropiCredentials(tenantId: string) {
  const integration = await readTenantIntegration(tenantId, 'dropi');
  if (integration.source !== 'tenant') return {};
  return decryptCredentials(encryptCredentials(integration.values));
}
