import 'server-only';
import { unstable_cache } from 'next/cache';
import { insforgeAdmin } from '@/lib/insforge';
import { isAirCatalogProduct, normalizeAirCatalogProducts, type AirCatalogProduct } from '@/lib/airConditioning';

const PRODUCT_SELECT = 'id,name,description,price,stock,image_url,featured,activo,rating,discount_percentage,specifications,category_id';

const readAirCatalog = unstable_cache(async (): Promise<AirCatalogProduct[]> => {
  try {
    const { data, error } = await insforgeAdmin.database
      .from('products')
      .select(PRODUCT_SELECT)
      .neq('activo', false)
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return [];
    return normalizeAirCatalogProducts(data).filter(isAirCatalogProduct);
  } catch {
    return [];
  }
}, ['air-catalog-preload-v1'], { revalidate: 60, tags: ['catalog-products', 'air-catalog'] });

export async function preloadAirCatalogProducts() {
  return readAirCatalog();
}
