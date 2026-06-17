import 'server-only';
import { insforgeAdmin } from '@/lib/insforge';
import type { LineItem } from '@/lib/checkout';
import type { ProductShippingMode } from '@/lib/shipping';

type ProductShippingRow = {
  id: string;
  shipping_mode?: ProductShippingMode | null;
  shipping_fee?: number | null;
  shipping_weight_kg?: number | null;
  shipping_dimensions?: string | null;
  shipping_region_overrides?: Record<string, number> | null;
};

export async function hydrateCheckoutItemsWithShipping(items: LineItem[]): Promise<LineItem[]> {
  const ids = Array.from(new Set(items.map((item) => String(item.productoId)).filter(Boolean)));
  if (!ids.length) return items;

  try {
    const { data, error } = await insforgeAdmin.database
      .from('products')
      .select('id, shipping_mode, shipping_fee, shipping_weight_kg, shipping_dimensions, shipping_region_overrides')
      .in('id', ids);

    if (error || !Array.isArray(data)) return items;
    const map = new Map((data as ProductShippingRow[]).map((row) => [String(row.id), row]));
    return items.map((item) => {
      const row = map.get(String(item.productoId));
      if (!row) return item;
      return {
        ...item,
        shippingMode: item.shippingMode ?? row.shipping_mode ?? 'inherit',
        shippingFee: item.shippingFee ?? row.shipping_fee ?? null,
        shippingWeightKg: item.shippingWeightKg ?? row.shipping_weight_kg ?? null,
        shippingDimensions: item.shippingDimensions ?? row.shipping_dimensions ?? null,
        shippingRegionOverrides: item.shippingRegionOverrides ?? row.shipping_region_overrides ?? null,
      };
    });
  } catch {
    return items;
  }
}
