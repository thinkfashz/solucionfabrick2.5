import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { requireAdminPermission } from '@/lib/adminPermissions';
import {
  googleSheetCsvUrl,
  parseDelimitedProducts,
  parseJsonProducts,
  type ParsedImportProduct,
  type ProductImportMode,
  type ProductImportSource,
} from '@/lib/productBulkImport';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ImportBody = {
  source?: ProductImportSource;
  mode?: ProductImportMode;
  content?: string;
  url?: string;
  markupPercentage?: number;
  applyMarkup?: boolean;
};

type CategoryRow = { id: string; name: string };
type CategoryStats = { created: number; matched: number; skipped: number; errors: Array<{ category: string; message: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUuid(value: unknown) { return typeof value === 'string' && UUID_RE.test(value.trim()); }
function normalizeCategoryName(value: unknown) { return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' '); }
function finite(value: unknown) { const result = Number(String(value ?? '').replace(/[^0-9.-]/g, '')); return Number.isFinite(result) ? result : 0; }
function rowsFromData(data: unknown): CategoryRow[] { if (!Array.isArray(data)) return []; return data.map((item) => item && typeof item === 'object' ? item as Record<string, unknown> : null).filter((item): item is Record<string, unknown> => Boolean(item)).map((item) => ({ id: String(item.id ?? ''), name: String(item.name ?? '') })).filter((item) => item.id && item.name); }
async function loadCategories() { const { data, error } = await insforgeAdmin.database.from('categories').select('id, name'); if (error) throw new Error(error.message || 'No se pudieron cargar las categorías.'); return rowsFromData(data); }
async function insertCategory(name: string) { const { data, error } = await insforgeAdmin.database.from('categories').insert([{ name, description: 'Creada automáticamente desde el importador de productos.' }]); if (error) throw new Error(error.message || `No se pudo crear la categoría ${name}.`); const rows = rowsFromData(data); if (rows[0]?.id) return rows[0]; const fresh = await loadCategories(); const found = fresh.find((category) => normalizeCategoryName(category.name) === normalizeCategoryName(name)); if (!found) throw new Error(`Categoría creada, pero no se pudo recuperar su ID: ${name}.`); return found; }

async function resolveProductCategories(products: ParsedImportProduct[]) {
  const stats: CategoryStats = { created: 0, matched: 0, skipped: 0, errors: [] };
  const categoryMap = new Map<string, CategoryRow>();
  try { (await loadCategories()).forEach((category) => categoryMap.set(normalizeCategoryName(category.name), category)); }
  catch (error) { if (products.some((product) => product.category_name || product.category_id)) stats.errors.push({ category: 'categories', message: error instanceof Error ? error.message : 'No se pudo leer la tabla de categorías.' }); }
  const resolved: ParsedImportProduct[] = [];
  for (const product of products) {
    const next: ParsedImportProduct = { ...product };
    if (isUuid(product.category_id)) { stats.matched += 1; resolved.push(next); continue; }
    const name = String(product.category_name || '').trim();
    if (!name) { delete next.category_id; delete next.category_name; stats.skipped += 1; resolved.push(next); continue; }
    const key = normalizeCategoryName(name);
    const existing = categoryMap.get(key);
    if (existing) { next.category_id = existing.id; stats.matched += 1; resolved.push(next); continue; }
    try { const created = await insertCategory(name); categoryMap.set(key, created); next.category_id = created.id; stats.created += 1; }
    catch (error) { delete next.category_id; stats.skipped += 1; stats.errors.push({ category: name, message: error instanceof Error ? error.message : 'No se pudo crear la categoría.' }); }
    resolved.push(next);
  }
  return { products: resolved, stats };
}

function cleanProductForDb(product: ParsedImportProduct & Record<string, unknown>, applyMarkup: boolean, markupPercentage: number) {
  const { category_name: _categoryName, ...rest } = product;
  const row: Record<string, unknown> = { ...rest };
  if (!isUuid(row.id)) delete row.id;
  if (!isUuid(row.category_id)) delete row.category_id;
  if (!row.source && row.source_url) row.source = 'importado';
  if (!row.supplier_currency && row.supplier_price) row.supplier_currency = 'CLP';

  const supplierPrice = finite(row.supplier_price);
  const incomingPrice = finite(row.price);
  if (applyMarkup) {
    const base = supplierPrice > 0 ? supplierPrice : incomingPrice;
    if (base > 0) row.price = Math.round(base * (1 + markupPercentage / 100));
  }

  const currentSpecs = row.specifications && typeof row.specifications === 'object' && !Array.isArray(row.specifications) ? row.specifications as Record<string, unknown> : {};
  row.specifications = {
    ...currentSpecs,
    default_markup_percentage: markupPercentage,
    auto_markup_enabled: applyMarkup,
    import_base_price: supplierPrice > 0 ? supplierPrice : incomingPrice,
  };

  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'create' });
  if (!auth.ok) return auth.response;
  let body: ImportBody;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 }); }
  const source = body.source || 'table';
  const mode = body.mode === 'upsert' ? 'upsert' : 'insert';
  const applyMarkup = body.applyMarkup !== false;
  const markupPercentage = Math.min(300, Math.max(0, Number(body.markupPercentage ?? 30) || 30));
  let content = String(body.content || '');
  try {
    if (source === 'google_sheets') {
      const response = await fetch(googleSheetCsvUrl(String(body.url || '')), { cache: 'no-store' });
      if (!response.ok) throw new Error(`Google Sheets respondió HTTP ${response.status}. Revisa que la hoja esté pública o publicada.`);
      content = await response.text();
    }
    if (!content.trim()) return NextResponse.json({ error: 'No hay contenido para importar.' }, { status: 400 });
    const parsed = source === 'json' ? parseJsonProducts(content) : parseDelimitedProducts(content);
    if (!parsed.products.length) return NextResponse.json({ error: 'No se encontró ningún producto válido.', errors: parsed.errors }, { status: 422 });
    const categorized = await resolveProductCategories(parsed.products);
    const rows = categorized.products.map((product) => cleanProductForDb({ ...product, activo: product.activo !== false, featured: !!product.featured, updated_at: new Date().toISOString() }, applyMarkup, markupPercentage));
    const query = insforgeAdmin.database.from('products');
    const { error } = mode === 'upsert' ? await query.upsert(rows) : await query.insert(rows);
    if (error) return NextResponse.json({ error: error.message || 'No se pudieron importar los productos.', parsed: parsed.products.length, errors: parsed.errors, categories: categorized.stats }, { status: 500 });
    return NextResponse.json({ ok: true, imported: rows.length, skipped: parsed.errors.length, errors: parsed.errors, categories: categorized.stats, mode, source, markupPercentage, applyMarkup });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Error importando productos.' }, { status: 500 }); }
}
