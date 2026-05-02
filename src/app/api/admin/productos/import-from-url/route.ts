import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { resolveProductFromUrl, type ImportedProduct } from '@/lib/productImport';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/productos/import-from-url
 *
 * Body:
 *   { url: string, persist?: boolean, category_id?: string }
 *
 * Behavior:
 *   - When `persist` is falsy (default): returns the resolved product
 *     preview without writing to the database. The admin UI uses this
 *     to render a confirmation card before the user clicks
 *     "Importar a mi Tienda".
 *   - When `persist` is true: also inserts a row into `public.products`
 *     with origin metadata (`source`, `source_url`, `source_id`,
 *     `supplier_price`, `supplier_currency`) so the admin can later
 *     click "Comprar y enviar" from `/admin/pedidos/[id]`.
 *
 * Supports any URL: Mercado Libre short links (`https://meli.la/…`),
 * full ML article URLs, or any third-party store with Open Graph /
 * Schema.org Product metadata (Falabella, Ripley, AliExpress, Amazon,
 * branded sites, etc.).
 */

interface RequestBody {
  url?: unknown;
  persist?: unknown;
  category_id?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const url = typeof body.url === 'string' ? body.url : '';
    const persist = body.persist === true;
    const categoryId = typeof body.category_id === 'string' ? body.category_id.trim() : '';

    if (!url.trim()) {
      return NextResponse.json({ error: 'Falta el campo "url".' }, { status: 400 });
    }

    let preview: ImportedProduct;
    try {
      preview = await resolveProductFromUrl(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo resolver la URL.';
      return NextResponse.json({ error: msg, code: 'IMPORT_RESOLVE_FAILED' }, { status: 400 });
    }

    if (!persist) {
      return NextResponse.json({ ok: true, preview });
    }

    // Persist into public.products with origin fields. Round price to
    // an integer when currency is CLP (Chilean peso has no decimals).
    const client = getAdminInsforge();
    const isClp = preview.currency.toUpperCase() === 'CLP';
    const priceForCatalog = isClp ? Math.round(preview.price) : preview.price;

    const insertPayload: Record<string, unknown> = {
      name: preview.title.slice(0, 280),
      description: preview.description ?? null,
      price: priceForCatalog,
      stock: preview.stock ?? 0,
      image_url: preview.imageUrl ?? null,
      activo: true,
      featured: false,
      // Origin fields — added via the products-migrate block.
      source: preview.source,
      source_url: preview.sourceUrl,
      source_id: preview.sourceId,
      supplier_price: preview.price,
      supplier_currency: preview.currency,
    };
    if (categoryId) insertPayload.category_id = categoryId;

    try {
      const { data, error } = await client.database
        .from('products')
        .insert([insertPayload])
        .select('id')
        .limit(1);
      if (error) {
        // The most common failure here is "column source does not exist"
        // when the products-migrate block hasn't been applied yet.
        const raw = (error.message ?? '').toLowerCase();
        if (/source.*does not exist|column .* does not exist|42703/.test(raw)) {
          return NextResponse.json(
            {
              error: error.message,
              hint:
                'Falta aplicar la migración de columnas de origen. Ve a /admin/setup → "Crear tablas ahora" para correr el bloque "products-migrate" (añade source, source_url, source_id, supplier_price, supplier_currency).',
              code: 'PRODUCTS_MIGRATE_REQUIRED',
              preview,
            },
            { status: 409 },
          );
        }
        return NextResponse.json({ error: error.message, preview }, { status: 500 });
      }
      const newId =
        Array.isArray(data) && data.length > 0
          ? (data[0] as { id?: string }).id ?? null
          : null;
      return NextResponse.json({ ok: true, preview, id: newId });
    } catch (err) {
      return NextResponse.json(
        {
          error: err instanceof Error ? err.message : 'Error al insertar el producto.',
          preview,
        },
        { status: 500 },
      );
    }
  } catch (err) {
    return adminError(err, 'IMPORT_FROM_URL_FAILED');
  }
}
