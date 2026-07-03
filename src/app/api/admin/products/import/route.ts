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
};

type CategoryRow = { id: string; name: string };

type CategoryStats = {
  created: number;
  matched: number;
  skipped: number;
  errors: Array<{ category: string; message: string }>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown) {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

function normalizeCategoryName(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function rowsFromData(data: unknown): CategoryRow[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => item && typeof item === 'object' ? item as Record<string, unknown> : null)
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => ({ id: String(item.id ?? ''), name: String(item.name ?? '') }))
    .filter((item) => item.id && item.name);
}

async function loadCategories() {
  const { data, error } = await insforgeAdmin.database
    .from('categories')
    .select('id, name');

  if (error) throw new Error(error.message || 'No se pudieron cargar las categorías.');
  return rowsFromData(data);
}

async function insertCategory(name: string) {
  const { data, error } = await insforgeAdmin.database
    .from('categories')
    .insert([{ name, description: 'Creada automáticamente desde el importador de productos.' }]);

  if (error) throw new Error(error.message || `No se pudo crear la categoría ${name}.`);
  const rows = rowsFromData(data);
  if (rows[0]?.id) return rows[0];

  const fresh = await loadCategories();
  const normalized = normalizeCategoryName(name);
  const found = fresh.find((category) => normalizeCategoryName(category.name) === normalized);
  if (!found) throw new Error(`Categoría creada, pero no se pudo recuperar su ID: ${name}.`);
  return found;
}

async function resolveProductCategories(products: ParsedImportProduct[]) {
  const stats: CategoryStats = { created: 0, matched: 0, skipped: 0, errors: [] };
  const categoryMap = new Map<string, CategoryRow>();

  try {
    const existing = await loadCategories();
    existing.forEach((category) => categoryMap.set(normalizeCategoryName(category.name), category));
  } catch (err) {
    const needsCategory = products.some((product) => product.category_name || product.category_id);
    if (needsCategory) {
      stats.errors.push({ category: 'categories', message: err instanceof Error ? err.message : 'No se pudo leer la tabla de categorías.' });
    }
  }

  const resolved: ParsedImportProduct[] = [];

  for (const product of products) {
    const next: ParsedImportProduct = { ...product };

    if (isUuid(product.category_id)) {
      stats.matched += 1;
      resolved.push(next);
      continue;
    }

    const categoryName = String(product.category_name || '').trim();
    if (!categoryName) {
      delete next.category_id;
      delete next.category_name;
      stats.skipped += 1;
      resolved.push(next);
      continue;
    }

    const key = normalizeCategoryName(categoryName);
    const existing = categoryMap.get(key);
    if (existing) {
      next.category_id = existing.id;
      stats.matched += 1;
      resolved.push(next);
      continue;
    }

    try {
      const created = await insertCategory(categoryName);
      categoryMap.set(key, created);
      next.category_id = created.id;
      stats.created += 1;
    } catch (err) {
      delete next.category_id;
      stats.skipped += 1;
      stats.errors.push({ category: categoryName, message: err instanceof Error ? err.message : 'No se pudo crear la categoría.' });
    }

    resolved.push(next);
  }

  return { products: resolved, stats };
}

function cleanProductForDb(product: ParsedImportProduct) {
  const { category_name: _categoryName, ...rest } = product;
  const row: Record<string, unknown> = { ...rest };

  if (!isUuid(row.id)) delete row.id;
  if (!isUuid(row.category_id)) delete row.category_id;

  if (!row.source && row.source_url) row.source = 'importado';
  if (!row.supplier_currency && row.supplier_price) row.supplier_currency = 'CLP';

  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));
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

  const source = body.source || 'table';
  const mode = body.mode === 'upsert' ? 'upsert' : 'insert';
  let content = String(body.content || '');

  try {
    if (source === 'google_sheets') {
      const csvUrl = googleSheetCsvUrl(String(body.url || ''));
      const response = await fetch(csvUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Google Sheets respondió HTTP ${response.status}. Revisa que la hoja esté pública o publicada.`);
      content = await response.text();
    }

    if (!content.trim()) return NextResponse.json({ error: 'No hay contenido para importar.' }, { status: 400 });

    const parsed = source === 'json' ? parseJsonProducts(content) : parseDelimitedProducts(content);
    if (parsed.products.length === 0) {
      return NextResponse.json({ error: 'No se encontró ningún producto válido.', errors: parsed.errors }, { status: 422 });
    }

    const categorized = await resolveProductCategories(parsed.products);
    const rows = categorized.products.map((product) => cleanProductForDb({
      ...product,
      activo: product.activo !== false,
      featured: !!product.featured,
      updated_at: new Date().toISOString(),
    }));

    const query = insforgeAdmin.database.from('products');
    const { error } = mode === 'upsert' ? await query.upsert(rows) : await query.insert(rows);
    if (error) {
      return NextResponse.json({
        error: error.message || 'No se pudieron importar los productos.',
        parsed: parsed.products.length,
        errors: parsed.errors,
        categories: categorized.stats,
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      imported: rows.length,
      skipped: parsed.errors.length,
      errors: parsed.errors,
      categories: categorized.stats,
      mode,
      source,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error importando productos.' }, { status: 500 });
  }
}
