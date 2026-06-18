import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { googleSheetCsvUrl, parseDelimitedProducts, parseJsonProducts, type ParsedImportProduct, type ProductImportMode, type ProductImportSource } from '@/lib/productBulkImport';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ImportBody = {
  action?: 'preview' | 'publish';
  source?: ProductImportSource;
  mode?: ProductImportMode;
  content?: string;
  url?: string;
  marginPct?: number | string;
  asDraft?: boolean;
  products?: Array<ParsedImportProduct & { row?: number; warnings?: string[]; raw_price?: number; rounded_price?: number }>;
};

type ExistingProduct = { id: string; name?: string | null; source_url?: string | null; source_id?: string | null };

type PreviewProduct = ParsedImportProduct & {
  row: number;
  warnings: string[];
  raw_price: number;
  rounded_price: number;
};

function cleanProductForDb(product: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(product).filter(([, value]) => value !== undefined && value !== null));
}

function normalizeMarginPct(value: unknown) {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(n)) return 25;
  return Math.min(1000, Math.max(0, n));
}

function roundCommercial(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value >= 100000) return Math.floor(value / 10000) * 10000 + 9990;
  if (value >= 10000) return Math.floor(value / 1000) * 1000 + 990;
  if (value >= 1000) return Math.floor(value / 100) * 100 + 90;
  return Math.round(value);
}

function isValidHttpUrl(value?: string | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function applyResellerMargin(product: ParsedImportProduct, defaultMarginPct: number): PreviewProduct {
  const marginPct = normalizeMarginPct(product.margin_pct ?? defaultMarginPct);
  const cost = Number(product.supplier_price || product.price || 0);
  const rawPrice = Number.isFinite(cost) && cost > 0 ? cost * (1 + marginPct / 100) : Number(product.price || 0);
  const roundedPrice = roundCommercial(rawPrice);
  const specs = {
    ...(product.specifications ?? {}),
    margen_importacion: marginPct,
    precio_calculado_sin_redondeo: Math.round(rawPrice),
    precio_redondeado: roundedPrice,
  };

  return {
    ...product,
    row: 0,
    warnings: [],
    margin_pct: marginPct,
    supplier_price: product.supplier_price || product.price,
    supplier_currency: product.supplier_currency || 'CLP',
    price: roundedPrice || product.price,
    raw_price: Math.round(rawPrice),
    rounded_price: roundedPrice,
    specifications: specs,
  };
}

async function parseIncomingProducts(body: ImportBody) {
  const source = body.source || 'table';
  let content = String(body.content || '');

  if (Array.isArray(body.products) && body.products.length > 0) {
    return { source, products: body.products as ParsedImportProduct[], errors: [] as Array<{ row: number; message: string }> };
  }

  if (source === 'google_sheets') {
    const csvUrl = googleSheetCsvUrl(String(body.url || ''));
    const response = await fetch(csvUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Google Sheets respondió HTTP ${response.status}. Revisa que la hoja esté pública o publicada.`);
    content = await response.text();
  }

  if (!content.trim()) throw new Error('No hay contenido para importar.');

  const parsed = source === 'json' ? parseJsonProducts(content) : parseDelimitedProducts(content);
  return { source, products: parsed.products, errors: parsed.errors };
}

async function loadExistingProducts(): Promise<ExistingProduct[]> {
  try {
    const { data, error } = await insforgeAdmin.database
      .from('products')
      .select('id, name, source_url, source_id')
      .limit(5000);
    if (error || !Array.isArray(data)) return [];
    return data as ExistingProduct[];
  } catch {
    return [];
  }
}

function buildDuplicateWarnings(product: ParsedImportProduct, existing: ExistingProduct[]) {
  const warnings: string[] = [];
  const name = product.name.trim().toLowerCase();
  const sourceUrl = product.source_url?.trim().toLowerCase();
  const sourceId = product.source_id?.trim().toLowerCase();
  const duplicate = existing.find((item) => {
    const existingName = item.name?.trim().toLowerCase();
    const existingUrl = item.source_url?.trim().toLowerCase();
    const existingSourceId = item.source_id?.trim().toLowerCase();
    return Boolean(
      (sourceUrl && existingUrl && sourceUrl === existingUrl) ||
      (sourceId && existingSourceId && sourceId === existingSourceId) ||
      (name && existingName && name === existingName),
    );
  });
  if (duplicate) warnings.push(`Posible duplicado: ya existe un producto similar (${duplicate.id}).`);
  return warnings;
}

function validatePreviewProduct(product: ParsedImportProduct, existing: ExistingProduct[]) {
  const warnings: string[] = [];
  if (!product.source_url) warnings.push('Sin link de compra/proveedor.');
  if (product.source_url && !isValidHttpUrl(product.source_url)) warnings.push('Link de compra inválido.');
  if (!product.supplier_price || Number(product.supplier_price) <= 0) warnings.push('Sin precio de compra/proveedor.');
  if ((product.stock ?? 0) <= 0) warnings.push('Stock en cero o no informado.');
  if (/sin[_\s-]*stock|agotado|revisar/i.test(String(product.stock_status ?? ''))) warnings.push(`Estado de stock: ${product.stock_status}.`);
  warnings.push(...buildDuplicateWarnings(product, existing));
  return warnings;
}

function toDbRow(product: ParsedImportProduct, asDraft: boolean) {
  const { brand, capacity_btu, warranty, query_date, stock_status, installation_price, price_pack, price_offer, margin_pct, raw_price, rounded_price, ...rest } = product as ParsedImportProduct & Record<string, unknown>;
  const specs = {
    ...(product.specifications ?? {}),
    marca: brand ?? product.brand,
    capacidad_btu: capacity_btu ?? product.capacity_btu,
    garantia: warranty ?? product.warranty,
    fecha_consulta: query_date ?? product.query_date,
    estado_stock: stock_status ?? product.stock_status,
    instalacion: installation_price ?? product.installation_price,
    precio_pack: price_pack ?? product.price_pack,
    precio_oferta: price_offer ?? product.price_offer,
    margen_importacion: margin_pct ?? product.margin_pct,
    precio_calculado_sin_redondeo: raw_price,
    precio_redondeado: rounded_price,
  };

  return cleanProductForDb({
    ...rest,
    specifications: Object.fromEntries(Object.entries(specs).filter(([, value]) => value !== undefined && value !== null && value !== '')),
    activo: asDraft ? false : product.activo !== false,
    featured: !!product.featured,
    updated_at: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'create' });
  if (!auth.ok) return auth.response;

  let body: ImportBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });
  }

  const mode = body.mode === 'upsert' ? 'upsert' : 'insert';
  const action = body.action === 'publish' ? 'publish' : 'preview';
  const marginPct = normalizeMarginPct(body.marginPct);

  try {
    const parsed = await parseIncomingProducts(body);
    if (parsed.products.length === 0) {
      return NextResponse.json({ error: 'No se encontró ningún producto válido.', errors: parsed.errors }, { status: 422 });
    }

    const existing = await loadExistingProducts();
    const previewProducts = parsed.products.map((product, index) => {
      const withMargin = applyResellerMargin(product, normalizeMarginPct(product.margin_pct ?? marginPct));
      const warnings = validatePreviewProduct(withMargin, existing);
      return { ...withMargin, row: index + 2, warnings };
    });

    if (action === 'preview') {
      return NextResponse.json({
        ok: true,
        preview: true,
        products: previewProducts,
        total: previewProducts.length,
        skipped: parsed.errors.length,
        errors: parsed.errors,
        warnings: previewProducts.reduce((sum, item) => sum + item.warnings.length, 0),
        mode,
        source: parsed.source,
        marginPct,
      });
    }

    const rows = previewProducts.map((product) => toDbRow(product, !!body.asDraft));
    const query = insforgeAdmin.database.from('products');
    const { error } = mode === 'upsert' ? await query.upsert(rows) : await query.insert(rows);
    if (error) return NextResponse.json({ error: error.message || 'No se pudieron importar los productos.', parsed: parsed.products.length, errors: parsed.errors }, { status: 500 });

    return NextResponse.json({ ok: true, imported: rows.length, skipped: parsed.errors.length, errors: parsed.errors, mode, source: parsed.source, marginPct, asDraft: !!body.asDraft });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error importando productos.' }, { status: 500 });
  }
}
