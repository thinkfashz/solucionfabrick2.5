import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { googleSheetCsvUrl, parseDelimitedProducts, parseJsonProducts, type ProductImportMode, type ProductImportSource } from '@/lib/productBulkImport';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ImportBody = {
  source?: ProductImportSource;
  mode?: ProductImportMode;
  content?: string;
  url?: string;
};

function cleanProductForDb(product: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(product).filter(([, value]) => value !== undefined));
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

    const rows = parsed.products.map((product) => cleanProductForDb({
      ...product,
      activo: product.activo !== false,
      featured: !!product.featured,
      updated_at: new Date().toISOString(),
    }));

    const query = insforgeAdmin.database.from('products');
    const { error } = mode === 'upsert' ? await query.upsert(rows) : await query.insert(rows);
    if (error) return NextResponse.json({ error: error.message || 'No se pudieron importar los productos.', parsed: parsed.products.length, errors: parsed.errors }, { status: 500 });

    return NextResponse.json({ ok: true, imported: rows.length, skipped: parsed.errors.length, errors: parsed.errors, mode, source });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error importando productos.' }, { status: 500 });
  }
}
