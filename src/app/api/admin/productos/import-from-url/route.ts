import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { resolveProductFromUrl, type ImportedProduct } from '@/lib/productImport';
import { readImportCache, writeImportCache } from '@/lib/productImportCache';
import { isMissingOriginColumnError } from './errors';

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

interface OverridePayload {
  title?: unknown;
  description?: unknown;
  price?: unknown;
  currency?: unknown;
  imageUrl?: unknown;
  images?: unknown;
  delivery_days?: unknown;
  stock?: unknown;
}

interface RequestBody {
  url?: unknown;
  persist?: unknown;
  category_id?: unknown;
  overrides?: unknown;
}

/**
 * Coerces and validates a free-form overrides object coming from the
 * admin preview into the strict subset we actually persist. Unknown
 * shapes silently fall back to the scraped values.
 */
function sanitizeOverrides(raw: unknown): {
  title?: string;
  description?: string | null;
  price?: number;
  currency?: string;
  imageUrl?: string | null;
  images?: string[];
  delivery_days?: number | null;
  stock?: number | null;
} {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as OverridePayload;
  const out: ReturnType<typeof sanitizeOverrides> = {};

  if (typeof o.title === 'string') {
    const t = o.title.trim();
    if (t) out.title = t.slice(0, 280);
  }
  if (typeof o.description === 'string') {
    const d = o.description.trim();
    out.description = d ? d : null;
  } else if (o.description === null) {
    out.description = null;
  }
  if (typeof o.price === 'number' && Number.isFinite(o.price) && o.price >= 0) {
    out.price = o.price;
  } else if (typeof o.price === 'string') {
    // Locale-aware: handles "1.234,56" (EU), "1,234.56" (US), "49.990"
    // (CLP thousands), "49.99" (US decimal), "49,99" (EU decimal).
    let s = o.price.replace(/[^\d.,-]/g, '');
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    if (lastDot === -1 && lastComma === -1) {
      // plain integer
    } else if (lastDot >= 0 && lastComma === -1) {
      const tail = s.slice(lastDot + 1);
      if (tail.length === 3) s = s.replace(/\./g, '');
    } else if (lastComma >= 0 && lastDot === -1) {
      const tail = s.slice(lastComma + 1);
      if (tail.length === 3) s = s.replace(/,/g, '');
      else s = s.replace(/,/g, '.');
    } else if (lastDot > lastComma) {
      s = s.replace(/,/g, '');
    } else {
      s = s.replace(/\./g, '').replace(',', '.');
    }
    const n = Number.parseFloat(s);
    if (Number.isFinite(n) && n >= 0) out.price = n;
  }
  if (typeof o.currency === 'string') {
    const c = o.currency.trim().toUpperCase();
    if (c) out.currency = c.slice(0, 8);
  }
  if (typeof o.imageUrl === 'string') {
    const u = o.imageUrl.trim();
    out.imageUrl = u ? u : null;
  } else if (o.imageUrl === null) {
    out.imageUrl = null;
  }
  if (Array.isArray(o.images)) {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const entry of o.images) {
      if (typeof entry !== 'string') continue;
      const t = entry.trim();
      if (!t || seen.has(t)) continue;
      seen.add(t);
      list.push(t);
      if (list.length >= 32) break; // hard cap
    }
    out.images = list;
  }
  if (typeof o.delivery_days === 'number' && Number.isFinite(o.delivery_days) && o.delivery_days >= 0) {
    out.delivery_days = Math.round(o.delivery_days);
  } else if (typeof o.delivery_days === 'string' && o.delivery_days.trim()) {
    const n = Number.parseInt(o.delivery_days, 10);
    if (Number.isFinite(n) && n >= 0) out.delivery_days = n;
  } else if (o.delivery_days === null || o.delivery_days === '') {
    out.delivery_days = null;
  }
  if (typeof o.stock === 'number' && Number.isFinite(o.stock) && o.stock >= 0) {
    out.stock = Math.round(o.stock);
  } else if (typeof o.stock === 'string' && o.stock.trim()) {
    const n = Number.parseInt(o.stock, 10);
    if (Number.isFinite(n) && n >= 0) out.stock = n;
  } else if (o.stock === null || o.stock === '') {
    out.stock = null;
  }
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const url = typeof body.url === 'string' ? body.url : '';
    const persist = body.persist === true;
    const categoryId = typeof body.category_id === 'string' ? body.category_id.trim() : '';
    const overrides = sanitizeOverrides(body.overrides);

    if (!url.trim()) {
      return NextResponse.json({ error: 'Falta el campo "url".' }, { status: 400 });
    }

    let preview: ImportedProduct;
    let cacheHit = false;
    let cachedAt: string | undefined;
    let cachedHitCount: number | undefined;

    // For *preview* requests (persist=false) we serve cached resolutions
    // up to 24h old so repeated paste-test cycles in the admin UI don't
    // re-hit the upstream store. The persist branch always re-resolves
    // so the merchant sees the *current* upstream price/stock.
    if (!persist) {
      const cached = await readImportCache(url);
      if (cached) {
        preview = cached.preview;
        cacheHit = true;
        cachedAt = cached.fetchedAt;
        cachedHitCount = cached.hitCount;
      } else {
        try {
          preview = await resolveProductFromUrl(url);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'No se pudo resolver la URL.';
          return NextResponse.json({ error: msg, code: 'IMPORT_RESOLVE_FAILED' }, { status: 400 });
        }
        // Fire-and-forget cache write so we don't slow down the response.
        void writeImportCache(url, preview);
      }
    } else {
      try {
        preview = await resolveProductFromUrl(url);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'No se pudo resolver la URL.';
        return NextResponse.json({ error: msg, code: 'IMPORT_RESOLVE_FAILED' }, { status: 400 });
      }
      void writeImportCache(url, preview);
    }

    if (!persist) {
      return NextResponse.json({ ok: true, preview, cached: cacheHit, cachedAt, hitCount: cachedHitCount });
    }

    // Merge the admin-supplied overrides on top of the scraped preview.
    const merged: ImportedProduct = {
      ...preview,
      title: overrides.title ?? preview.title,
      description: overrides.description !== undefined ? overrides.description : preview.description,
      price: overrides.price !== undefined ? overrides.price : preview.price,
      currency: overrides.currency ?? preview.currency,
      imageUrl: overrides.imageUrl !== undefined ? overrides.imageUrl : preview.imageUrl,
      images: overrides.images ?? preview.images,
      stock: overrides.stock !== undefined ? overrides.stock : preview.stock,
    };
    const deliveryDays =
      overrides.delivery_days !== undefined ? overrides.delivery_days : null;

    // Persist into public.products with origin fields. Round price to
    // an integer when currency is CLP (Chilean peso has no decimals).
    const client = getAdminInsforge();
    const isClp = merged.currency.toUpperCase() === 'CLP';
    const priceForCatalog = isClp ? Math.round(merged.price) : merged.price;

    const insertPayload: Record<string, unknown> = {
      name: merged.title.slice(0, 280),
      description: merged.description ?? null,
      price: priceForCatalog,
      stock: merged.stock ?? 0,
      image_url: merged.imageUrl ?? null,
      activo: true,
      featured: false,
      delivery_days: deliveryDays,
      // Origin fields — added via the products-migrate block.
      source: merged.source,
      source_url: merged.sourceUrl,
      source_id: merged.sourceId,
      supplier_price: preview.price, // record the *scraped* price as supplier price
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
        // The most common failure here is the products table missing
        // the origin columns (`source`, `source_url`, `source_id`,
        // `supplier_price`, `supplier_currency`) because the
        // `products-migrate` block in `scripts/create-tables.sql`
        // hasn't been applied yet on the production database.
        //
        // The error surfaces in two flavours depending on whether the
        // request hit PostgreSQL directly or went through PostgREST:
        //   - PostgreSQL: `column "source" does not exist` (SQLSTATE 42703)
        //   - PostgREST:  `Could not find the 'source' column of 'products' in the schema cache` (code PGRST204)
        // We surface the same actionable hint for both.
        if (isMissingOriginColumnError(error.message)) {
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
