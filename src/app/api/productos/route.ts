import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

// Edge runtime is feasible here because the InsForge SDK only uses
// fetch + web-standard primitives (no Node-only APIs). See docs/perf-runtime.md.
export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoria = searchParams.get('categoria');
  const featured = searchParams.get('featured');
  const limit = parseInt(searchParams.get('limit') ?? '20');

  let query = insforge.database
    .from('products')
    .select('id, name, description, price, stock, image_url, specifications, featured, rating, delivery_days, discount_percentage, category_id')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (featured === 'true') query = query.eq('featured', true);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filtro por categoría (nombre) vía SQL separado si se especifica
  let productos = data ?? [];
  if (categoria) {
    productos = productos.filter((p: Record<string, unknown>) =>
      String(p.name ?? '').toLowerCase().includes(categoria.toLowerCase()) ||
      String(p.description ?? '').toLowerCase().includes(categoria.toLowerCase())
    );
  }

  return NextResponse.json({ data: productos, total: productos.length }, { status: 200 });
}
