import 'server-only';

import { insforgeAdmin } from '@/lib/insforge';
import { applyInventoryMovementAtomic, type InventoryMovementType } from '@/lib/inventory/stockLedger';

const PRODUCT_SELECT = 'id,tenant_id,name,description,price,stock,delivery_days,image_url,featured,activo,tagline,category_id,created_at,source,source_url,source_id,supplier_price,supplier_currency,specifications,shipping_mode,shipping_fee,shipping_weight_kg,shipping_dimensions,rating,discount_percentage,sku,ean,scan_code,scan_format';

type Product = Record<string, unknown> & {
  id: string;
  name: string;
  stock?: number | null;
  price?: number | null;
  sku?: string | null;
  ean?: string | null;
  scan_code?: string | null;
  activo?: boolean | null;
};

function cleanText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanCode(value: unknown, max = 128) {
  return String(value ?? '').trim().replace(/\s+/g, '').slice(0, max);
}

function cleanScanCode(value: unknown) {
  return String(value ?? '').trim().slice(0, 512);
}

function cleanFormat(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
}

function numberInRange(value: unknown, min: number, max: number, fallback: number | null = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function objectOrEmpty(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function clampLimit(value: unknown, fallback = 20) {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? Math.max(1, Math.min(100, n)) : fallback;
}

function scoreProduct(product: Product, q: string) {
  const needle = q.toLowerCase();
  const name = String(product.name || '').toLowerCase();
  const sku = String(product.sku || '').toLowerCase();
  const ean = String(product.ean || '').toLowerCase();
  const scan = String(product.scan_code || '').toLowerCase();
  let score = 0;
  if (scan === needle || ean === needle || sku === needle) score += 100;
  if (name === needle) score += 80;
  if (name.startsWith(needle)) score += 55;
  if (name.includes(needle)) score += 35;
  if (sku.includes(needle) || ean.includes(needle) || scan.includes(needle)) score += 30;
  return score;
}

function dedupe(products: Product[]) {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}

export async function mcpSearchProducts(tenantId: string, input: { query?: string; limit?: number; activeOnly?: boolean; stock?: 'any' | 'low' | 'out' }) {
  const q = cleanText(input.query, 180);
  const limit = clampLimit(input.limit, 20);
  const stockFilter = input.stock ?? 'any';

  if (!q) {
    let query = insforgeAdmin.database.from('products').select(PRODUCT_SELECT)
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true })
      .limit(limit);
    if (input.activeOnly) query = query.eq('activo', true);
    if (stockFilter === 'out') query = query.eq('stock', 0);
    if (stockFilter === 'low') query = query.lte('stock', 5).gt('stock', 0);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { count: data?.length ?? 0, products: data ?? [] };
  }

  const signals = q.replace(/\s+/g, '');
  const collected: Product[] = [];
  for (const field of ['scan_code', 'ean', 'sku'] as const) {
    const { data } = await insforgeAdmin.database.from('products').select(PRODUCT_SELECT)
      .eq('tenant_id', tenantId).eq(field, signals).limit(3);
    if (data?.length) collected.push(...data as Product[]);
  }

  const safePattern = q.replace(/[%_]/g, '').trim();
  if (safePattern) {
    let nameQuery = insforgeAdmin.database.from('products').select(PRODUCT_SELECT)
      .eq('tenant_id', tenantId)
      .ilike('name', `%${safePattern}%`)
      .limit(Math.max(limit * 2, 30));
    if (input.activeOnly) nameQuery = nameQuery.eq('activo', true);
    const { data } = await nameQuery;
    if (data?.length) collected.push(...data as Product[]);
  }

  let products = dedupe(collected).sort((a, b) => scoreProduct(b, q) - scoreProduct(a, q));
  if (stockFilter === 'out') products = products.filter((p) => Number(p.stock ?? 0) <= 0);
  if (stockFilter === 'low') products = products.filter((p) => Number(p.stock ?? 0) > 0 && Number(p.stock ?? 0) <= 5);
  products = products.slice(0, limit);
  return { query: q, count: products.length, products };
}

export async function mcpGetProduct(tenantId: string, input: { id?: string; sku?: string; ean?: string; code?: string }) {
  const candidates: [string, string][] = [];
  const id = cleanText(input.id, 120);
  if (id) candidates.push(['id', id]);
  const sku = cleanCode(input.sku);
  if (sku) candidates.push(['sku', sku]);
  const ean = cleanCode(input.ean);
  if (ean) candidates.push(['ean', ean]);
  const code = cleanScanCode(input.code);
  if (code) candidates.push(['scan_code', code]);
  if (!candidates.length) throw new Error('Debes indicar id, sku, ean o code.');

  for (const [field, value] of candidates) {
    const { data } = await insforgeAdmin.database.from('products').select(PRODUCT_SELECT)
      .eq('tenant_id', tenantId).eq(field, value).limit(1);
    if (data?.[0]) return data[0];
  }
  return null;
}

export async function mcpCatalogAudit(tenantId: string, input: { limit?: number; lowStockThreshold?: number }) {
  const limit = clampLimit(input.limit, 80);
  const low = Math.max(0, Math.min(10000, Math.trunc(Number(input.lowStockThreshold ?? 5))));
  const { data, error } = await insforgeAdmin.database.from('products').select(PRODUCT_SELECT)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const products = (data ?? []) as Product[];

  const issues = products.map((product) => {
    const problems: string[] = [];
    const stock = Number(product.stock ?? 0);
    const price = Number(product.price ?? 0);
    if (!cleanText(product.description, 5000)) problems.push('sin_descripcion');
    if (!cleanText(product.image_url, 2000)) problems.push('sin_imagen');
    if (!cleanCode(product.sku)) problems.push('sin_sku');
    if (!cleanCode(product.ean) && !cleanScanCode(product.scan_code)) problems.push('sin_codigo');
    if (price <= 0) problems.push('precio_cero');
    if (stock <= 0) problems.push('sin_stock');
    else if (stock <= low) problems.push('stock_bajo');
    if (product.activo !== true) problems.push('inactivo');
    return { id: product.id, name: product.name, stock, price, problems };
  }).filter((item) => item.problems.length > 0);

  return {
    inspected: products.length,
    issues: issues.length,
    healthy: products.length - issues.length,
    summary: {
      outOfStock: issues.filter((x) => x.problems.includes('sin_stock')).length,
      lowStock: issues.filter((x) => x.problems.includes('stock_bajo')).length,
      missingImage: issues.filter((x) => x.problems.includes('sin_imagen')).length,
      missingSku: issues.filter((x) => x.problems.includes('sin_sku')).length,
      inactive: issues.filter((x) => x.problems.includes('inactivo')).length,
    },
    products: issues.slice(0, limit),
  };
}

export async function mcpCreateProduct(tenantId: string, input: Record<string, unknown>) {
  const name = cleanText(input.name, 180);
  if (!name) throw new Error('Nombre requerido.');
  const sku = cleanCode(input.sku);
  const ean = cleanCode(input.ean);
  const scanCode = cleanScanCode(input.scan_code ?? input.code);
  const payload = {
    tenant_id: tenantId,
    name,
    description: cleanText(input.description, 5000) || null,
    tagline: cleanText(input.tagline, 240) || null,
    price: Math.round(numberInRange(input.price, 0, 999999999, 0) ?? 0),
    stock: 0,
    image_url: cleanText(input.image_url, 2000) || null,
    featured: input.featured === true,
    activo: input.activo === true,
    category_id: cleanText(input.category_id, 120) || null,
    source: 'mcp',
    source_url: cleanText(input.source_url, 2000) || null,
    source_id: cleanText(input.source_id, 240) || null,
    supplier_price: numberInRange(input.supplier_price, 0, 999999999),
    supplier_currency: cleanText(input.supplier_currency, 12) || 'CLP',
    specifications: objectOrEmpty(input.specifications),
    shipping_mode: cleanText(input.shipping_mode, 40) || 'inherit',
    shipping_fee: numberInRange(input.shipping_fee, 0, 999999999),
    shipping_weight_kg: numberInRange(input.shipping_weight_kg, 0, 999999),
    shipping_dimensions: cleanText(input.shipping_dimensions, 240) || null,
    sku: sku || null,
    ean: ean || null,
    scan_code: scanCode || null,
    scan_format: scanCode ? (cleanFormat(input.scan_format) || 'manual') : null,
  };

  const { data, error } = await insforgeAdmin.database.from('products').insert([payload]).select(PRODUCT_SELECT).single();
  if (error) {
    const duplicate = (error as { code?: string }).code === '23505';
    throw new Error(duplicate ? 'Ese SKU, EAN o código ya pertenece a otro producto.' : error.message);
  }
  return data;
}

export async function mcpUpdateProduct(tenantId: string, productId: string, input: Record<string, unknown>) {
  const id = cleanText(productId, 120);
  if (!id) throw new Error('productId requerido.');
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const name = cleanText(input.name, 180);
    if (!name) throw new Error('El nombre no puede quedar vacío.');
    patch.name = name;
  }
  if (input.description !== undefined) patch.description = cleanText(input.description, 5000) || null;
  if (input.tagline !== undefined) patch.tagline = cleanText(input.tagline, 240) || null;
  if (input.image_url !== undefined) patch.image_url = cleanText(input.image_url, 2000) || null;
  if (input.category_id !== undefined) patch.category_id = cleanText(input.category_id, 120) || null;
  if (input.price !== undefined) patch.price = Math.round(numberInRange(input.price, 0, 999999999, 0) ?? 0);
  if (input.activo !== undefined) patch.activo = input.activo === true;
  if (input.featured !== undefined) patch.featured = input.featured === true;
  if (input.sku !== undefined) patch.sku = cleanCode(input.sku) || null;
  if (input.ean !== undefined) patch.ean = cleanCode(input.ean) || null;
  if (input.scan_code !== undefined || input.code !== undefined) patch.scan_code = cleanScanCode(input.scan_code ?? input.code) || null;
  if (input.scan_format !== undefined) patch.scan_format = cleanFormat(input.scan_format) || null;
  if (input.specifications !== undefined) patch.specifications = objectOrEmpty(input.specifications);
  if (input.supplier_price !== undefined) patch.supplier_price = numberInRange(input.supplier_price, 0, 999999999);
  if (input.supplier_currency !== undefined) patch.supplier_currency = cleanText(input.supplier_currency, 12) || 'CLP';
  if (Object.keys(patch).length === 0) throw new Error('No hay campos válidos para actualizar.');

  const { data, error } = await insforgeAdmin.database.from('products').update(patch)
    .eq('tenant_id', tenantId).eq('id', id).select(PRODUCT_SELECT).single();
  if (error) {
    const duplicate = (error as { code?: string }).code === '23505';
    throw new Error(duplicate ? 'Ese SKU, EAN o código ya pertenece a otro producto.' : error.message);
  }
  return data;
}

export async function mcpMoveInventory(tenantId: string, input: { productId: string; type: InventoryMovementType; quantity: number; referenceId?: string; barcode?: string; note?: string }) {
  const productId = cleanText(input.productId, 120);
  if (!productId) throw new Error('productId requerido.');
  const quantity = Math.trunc(Number(input.quantity));
  if (!Number.isFinite(quantity) || quantity < 0) throw new Error('Cantidad inválida.');
  return applyInventoryMovementAtomic({
    tenantId,
    productId,
    type: input.type,
    quantity,
    referenceType: 'mcp',
    referenceId: cleanText(input.referenceId, 240) || `mcp:${crypto.randomUUID()}`,
    barcode: cleanScanCode(input.barcode) || null,
    note: cleanText(input.note, 500) || null,
    actorId: 'mcp-agent',
  });
}