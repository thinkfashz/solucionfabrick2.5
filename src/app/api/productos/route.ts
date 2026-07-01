import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import { DEFAULT_TENANT_ID } from '@/lib/tenant';

// Edge runtime is feasible here because the InsForge SDK only uses
// fetch + web-standard primitives (no Node-only APIs). See docs/perf-runtime.md.
export const runtime = 'edge';
export const revalidate = 60;

const CDN_CACHE = 'public, s-maxage=60, stale-while-revalidate=300';

function productosResponse(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': status === 200 ? CDN_CACHE : 'no-store',
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoria = searchParams.get('categoria');
  const featured = searchParams.get('featured');
  const rawLimit = Number.parseInt(searchParams.get('limit') ?? '20', 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20;

  // Tenant isolation: each subdomain only serves its own catalog
  const tenantId = (request as { headers: { get(n: string): string | null } })
    .headers.get('x-tenant-id') ?? DEFAULT_TENANT_ID;

  let query = insforge.database
    .from('products')
    .select('id, name, description, price, stock, image_url, specifications, featured, rating, delivery_days, discount_percentage, category_id')
    .eq('tenant_id', tenantId)
    .neq('activo', false)
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (featured === 'true') query = query.eq('featured', true);

  const { data, error } = await query;

  if (error) {
    return productosResponse({ error: error.message }, 500);
  }

  // Filtro por categoría (nombre) vía SQL separado si se especifica
  let productos = data ?? [];
  if (categoria) {
    productos = productos.filter((p: Record<string, unknown>) =>
      String(p.name ?? '').toLowerCase().includes(categoria.toLowerCase()) ||
      String(p.description ?? '').toLowerCase().includes(categoria.toLowerCase())
    );
  }

  return productosResponse({ data: productos, total: productos.length });
}
