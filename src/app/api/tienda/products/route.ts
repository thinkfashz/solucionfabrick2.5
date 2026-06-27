import { NextResponse } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';

export const dynamic = 'force-dynamic';

const PRODUCT_SELECT = 'id, name, description, price, stock, image_url, featured, activo, tagline, rating, delivery_days, discount_percentage, specifications, category_id, shipping_mode, shipping_fee, shipping_weight_kg, shipping_dimensions, shipping_region_overrides, created_at';

export async function GET() {
  const { data, error } = await insforgeAdmin.database
    .from('products')
    .select(PRODUCT_SELECT)
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ products: [], error: error.message ?? 'No se pudieron cargar productos.' }, { status: 500 });
  }

  const products = (data ?? []).filter((product: { activo?: boolean | null }) => product.activo !== false);
  return NextResponse.json({ products });
}
