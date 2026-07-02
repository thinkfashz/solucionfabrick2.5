import 'server-only';
import { INSFORGE_BASE_URL, insforgeAdmin } from '@/lib/insforge';
import { decryptCredentials, encryptCredentials } from '@/lib/integrationsCrypto';

type AnyRecord = Record<string, unknown>;

export interface DropiCredentials {
  api_base_url: string;
  api_token?: string;
  api_key?: string;
  auth_header_name: string;
  auth_scheme: string;
  products_path: string;
  orders_path: string;
  health_path?: string;
  default_category_id?: string;
  price_markup_pct: number;
  currency: string;
  auto_fulfill_paid_orders: boolean;
}

export interface NormalizedDropiProduct {
  externalId: string;
  sku?: string;
  name: string;
  description: string;
  stock: number;
  supplierPrice: number;
  salePrice: number;
  imageUrl?: string;
  sourceUrl?: string;
  categoryName?: string;
  raw: AnyRecord;
}

export interface DropiImportResult {
  totalFetched: number;
  normalized: number;
  created: number;
  updated: number;
  skipped: number;
  products: NormalizedDropiProduct[];
  warnings: string[];
}

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

function joinUrl(base: string, path: string) {
  const b = base.replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
}

function appendLimit(url: string, limit: number) {
  try {
    const u = new URL(url);
    if (!u.searchParams.has('limit')) u.searchParams.set('limit', String(limit));
    return u.toString();
  } catch {
    return url;
  }
}

function pickString(record: AnyRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function pickNumber(record: AnyRecord, keys: string[]) {
  for (const key of keys) {
    const n = cleanNumber(record[key], NaN);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function pickImage(record: AnyRecord) {
  const direct = pickString(record, ['image_url', 'image', 'main_image', 'thumbnail', 'picture', 'photo', 'url_image']);
  if (direct) return direct;
  const images = record.images || record.pictures || record.photos;
  if (Array.isArray(images)) {
    for (const item of images) {
      if (typeof item === 'string' && item.trim()) return item.trim();
      if (item && typeof item === 'object') {
        const url = pickString(item as AnyRecord, ['url', 'src', 'image_url', 'secure_url']);
        if (url) return url;
      }
    }
  }
  return '';
}

function extractArray(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload.filter((x): x is AnyRecord => Boolean(x && typeof x === 'object'));
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as AnyRecord;
  const candidates = [root.data, root.products, root.items, root.results, root.response, root.list];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.filter((x): x is AnyRecord => Boolean(x && typeof x === 'object'));
    if (candidate && typeof candidate === 'object') {
      const nested = extractArray(candidate);
      if (nested.length) return nested;
    }
  }
  return [];
}

export function normalizeDropiProduct(raw: AnyRecord, markupPct: number): NormalizedDropiProduct | null {
  const externalId = pickString(raw, ['id', 'product_id', 'external_id', 'sku', 'reference', 'code']);
  const name = pickString(raw, ['name', 'title', 'product_name', 'nombre']);
  if (!externalId || !name) return null;
  const supplierPrice = pickNumber(raw, ['cost', 'cost_price', 'supplier_price', 'provider_price', 'wholesale_price', 'price', 'precio', 'sale_price']);
  const listedPrice = pickNumber(raw, ['sale_price', 'price', 'precio', 'selling_price', 'public_price']);
  const safeSupplier = Math.max(0, supplierPrice || listedPrice || 0);
  const safeMarkup = Math.max(0, Number(markupPct) || 0);
  const salePrice = Math.round(Math.max(listedPrice, safeSupplier * (1 + safeMarkup / 100)));
  const stock = Math.max(0, Math.floor(pickNumber(raw, ['stock', 'quantity', 'available_quantity', 'inventory', 'qty'])));
  return {
    externalId,
    sku: pickString(raw, ['sku', 'reference', 'code']),
    name,
    description: pickString(raw, ['description', 'descripcion', 'short_description', 'summary']),
    stock,
    supplierPrice: Math.round(safeSupplier),
    salePrice,
    imageUrl: pickImage(raw) || undefined,
    sourceUrl: pickString(raw, ['url', 'permalink', 'source_url', 'link']) || undefined,
    categoryName: pickString(raw, ['category', 'category_name', 'categoria']) || undefined,
    raw,
  };
}

function envCredentials(): Partial<DropiCredentials> {
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

export async function getStoredDropiCredentials(): Promise<Record<string, unknown>> {
  try {
    const { data } = await insforgeAdmin.database.from('integrations').select('credentials').eq('provider', 'dropi').limit(1);
    const row = Array.isArray(data) ? (data[0] as { credentials?: Record<string, unknown> } | undefined) : undefined;
    return decryptCredentials(row?.credentials);
  } catch {
    return {};
  }
}

export async function getDropiCredentials(): Promise<DropiCredentials | null> {
  const stored = await getStoredDropiCredentials();
  const env = envCredentials();
  const envEntries = Object.entries(env).filter(([, v]) => v !== '' && v !== undefined && !Number.isNaN(v));
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

export async function saveDropiCredentials(input: Record<string, unknown>) {
  const existing = await getStoredDropiCredentials();
  const credentials = {
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
  const encrypted = encryptCredentials(credentials);
  const { error } = await insforgeAdmin.database.from('integrations').upsert(
    [{ provider: 'dropi', credentials: encrypted, updated_at: new Date().toISOString() }],
    { onConflict: 'provider' },
  );
  if (error) throw new Error(error.message ?? 'No se pudo guardar Dropi.');
  return credentials;
}

export function maskedDropiCredentials(credentials: DropiCredentials | null) {
  if (!credentials) return null;
  return {
    ...credentials,
    api_token: credentials.api_token ? `••• ${credentials.api_token.slice(-4)}` : '',
    api_key: credentials.api_key ? `••• ${credentials.api_key.slice(-4)}` : '',
    configured: Boolean(credentials.api_base_url && (credentials.api_token || credentials.api_key)),
  };
}

export function dropiHeaders(credentials: DropiCredentials): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (credentials.api_token) {
    const scheme = credentials.auth_scheme && credentials.auth_scheme.toLowerCase() !== 'none' ? `${credentials.auth_scheme} ` : '';
    headers[credentials.auth_header_name || 'Authorization'] = `${scheme}${credentials.api_token}`;
  }
  if (credentials.api_key) headers['x-api-key'] = credentials.api_key;
  return headers;
}

export async function dropiRequest<T = unknown>(path: string, init: RequestInit = {}, credentials?: DropiCredentials): Promise<T> {
  const creds = credentials ?? await getDropiCredentials();
  if (!creds) throw new Error('Dropi no está configurado.');
  const url = path.startsWith('http') ? path : joinUrl(creds.api_base_url, path);
  const res = await fetch(url, {
    ...init,
    headers: { ...dropiHeaders(creds), ...(init.headers as Record<string, string> | undefined) },
    cache: 'no-store',
    signal: init.signal ?? AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  const upstreamMessage = typeof json === 'object' && json && 'message' in json ? String((json as AnyRecord).message) : text.slice(0, 220);
  if (!res.ok) throw new Error(`Dropi HTTP ${res.status}: ${upstreamMessage}`);
  return json as T;
}

export async function fetchDropiProducts(limit = 40): Promise<NormalizedDropiProduct[]> {
  const credentials = await getDropiCredentials();
  if (!credentials) throw new Error('Dropi no está configurado.');
  const payload = await dropiRequest(appendLimit(joinUrl(credentials.api_base_url, credentials.products_path), limit), {}, credentials);
  const rows = extractArray(payload).slice(0, Math.max(1, Math.min(limit, 200)));
  return rows.map((raw) => normalizeDropiProduct(raw, credentials.price_markup_pct)).filter((item): item is NormalizedDropiProduct => Boolean(item));
}

async function rawSql(query: string) {
  const apiKey = process.env.INSFORGE_API_KEY;
  if (!apiKey) return { ok: false, skipped: true, warning: 'INSFORGE_API_KEY no configurada.' };
  const res = await fetch(`${INSFORGE_BASE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ query }),
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });
  return { ok: res.ok, status: res.status, body: await res.text().catch(() => '') };
}

export async function ensureDropiSchema() {
  return rawSql(`
    CREATE TABLE IF NOT EXISTS public.integrations (provider text PRIMARY KEY, credentials jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz DEFAULT now());
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source_url text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source_id text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_price numeric(12,2);
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_currency text;
    CREATE INDEX IF NOT EXISTS products_dropi_source_idx ON public.products (source, source_id) WHERE source = 'dropi';
    CREATE TABLE IF NOT EXISTS public.dropi_order_links (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id text NOT NULL, dropi_order_id text, status text DEFAULT 'pending', request_payload jsonb DEFAULT '{}'::jsonb, response_payload jsonb DEFAULT '{}'::jsonb, error_message text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
    CREATE INDEX IF NOT EXISTS dropi_order_links_order_idx ON public.dropi_order_links (order_id, created_at DESC);
  `);
}

async function findExistingDropiProduct(sourceId: string) {
  const { data } = await insforgeAdmin.database.from('products').select('id').eq('source', 'dropi').eq('source_id', sourceId).limit(1);
  return Array.isArray(data) ? (data[0] as { id?: string } | undefined) : undefined;
}

export async function importDropiProducts(limit = 40, dryRun = false): Promise<DropiImportResult> {
  await ensureDropiSchema();
  const credentials = await getDropiCredentials();
  if (!credentials) throw new Error('Dropi no está configurado.');
  const products = await fetchDropiProducts(limit);
  const warnings: string[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  if (!dryRun) {
    for (const product of products) {
      try {
        const existing = await findExistingDropiProduct(product.externalId);
        const row = {
          name: product.name,
          description: product.description,
          tagline: product.categoryName || 'Producto importado desde Dropi',
          price: product.salePrice,
          stock: product.stock,
          image_url: product.imageUrl ?? null,
          category_id: credentials.default_category_id || null,
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
          const { error } = await insforgeAdmin.database.from('products').update(row).eq('id', existing.id);
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

async function readOrder(orderId: string) {
  const { data } = await insforgeAdmin.database.from('orders').select('*').eq('id', orderId).limit(1);
  return Array.isArray(data) ? (data[0] as AnyRecord | undefined) : undefined;
}

async function readProduct(productId: string) {
  const { data } = await insforgeAdmin.database.from('products').select('id, name, source, source_id, price, supplier_price, specifications').eq('id', productId).limit(1);
  return Array.isArray(data) ? (data[0] as AnyRecord | undefined) : undefined;
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

export async function createDropiFulfillment(orderId: string) {
  await ensureDropiSchema();
  const credentials = await getDropiCredentials();
  if (!credentials) return { ok: false, ignored: true, reason: 'dropi_not_configured' };
  const order = await readOrder(orderId);
  if (!order) return { ok: false, reason: 'order_not_found' };
  const items = Array.isArray(order.items) ? order.items as AnyRecord[] : [];
  const dropiItems: AnyRecord[] = [];

  for (const item of items) {
    const productId = productIdFromItem(item);
    if (!productId) continue;
    const product = await readProduct(productId);
    if (product?.source !== 'dropi' || !product.source_id) continue;
    dropiItems.push({ product_id: product.source_id, external_product_id: product.source_id, local_product_id: product.id, name: product.name, quantity: quantityFromItem(item), price: cleanNumber(product.supplier_price ?? product.price, 0) });
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
    await insforgeAdmin.database.from('dropi_order_links').insert([{ order_id: orderId, dropi_order_id: dropiOrderId || null, status: 'sent', request_payload: payload, response_payload: response as AnyRecord, updated_at: new Date().toISOString() }]);
    return { ok: true, sent: true, dropiOrderId, response };
  } catch (err) {
    try {
      await insforgeAdmin.database.from('dropi_order_links').insert([{ order_id: orderId, status: 'error', request_payload: payload, error_message: err instanceof Error ? err.message : String(err), updated_at: new Date().toISOString() }]);
    } catch {
      // ignore log failure
    }
    return { ok: false, sent: false, error: err instanceof Error ? err.message : 'No se pudo crear orden en Dropi.' };
  }
}

export function createDropiFulfillmentAsync(orderId: string): void {
  void (async () => {
    const credentials = await getDropiCredentials();
    if (!credentials?.auto_fulfill_paid_orders) return;
    await createDropiFulfillment(orderId);
  })().catch(() => undefined);
}
