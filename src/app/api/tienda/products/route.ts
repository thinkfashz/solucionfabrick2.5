import { NextResponse } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';

export const runtime = 'edge';
export const revalidate = 60;

const CDN_CACHE = 'public, s-maxage=60, stale-while-revalidate=300';
const PRODUCT_SELECT = 'id, name, description, price, stock, image_url, featured, activo, tagline, rating, delivery_days, discount_percentage, specifications, category_id, shipping_mode, shipping_fee, shipping_weight_kg, shipping_dimensions, shipping_region_overrides, created_at';
const CATEGORY_SELECT = 'id, name';

type ProductRow = {
  activo?: boolean | null;
  category_id?: string | null;
  [key: string]: unknown;
};

type CategoryRow = {
  id?: string | null;
  name?: string | null;
};

function catalogResponse(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': status === 200 ? CDN_CACHE : 'no-store',
    },
  });
}

export async function GET() {
  try {
    const [productsResult, categoriesResult] = await Promise.all([
      insforgeAdmin.database
        .from('products')
        .select(PRODUCT_SELECT)
        .neq('activo', false)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200),
      insforgeAdmin.database
        .from('categories')
        .select(CATEGORY_SELECT)
        .order('name', { ascending: true }),
    ]);

    if (productsResult.error) {
      return catalogResponse(
        { products: [], error: productsResult.error.message ?? 'No se pudieron cargar productos.' },
        500,
      );
    }

    const categories = Array.isArray(categoriesResult.data)
      ? (categoriesResult.data as CategoryRow[])
      : [];
    const categoryMap = categories.reduce<Record<string, string>>((acc, category) => {
      if (category.id && category.name) acc[category.id] = category.name;
      return acc;
    }, {});

    const products = ((productsResult.data ?? []) as ProductRow[])
      .filter((product) => product.activo !== false)
      .map((product) => {
        const categoryId = typeof product.category_id === 'string' ? product.category_id : '';
        return {
          ...product,
          category_name: categoryId ? categoryMap[categoryId] : undefined,
        };
      });

    return catalogResponse({ products, total: products.length });
  } catch {
    return catalogResponse({ products: [], error: 'No se pudieron cargar productos.' }, 500);
  }
}
