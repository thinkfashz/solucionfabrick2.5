import 'server-only';
import { insforgeAdmin } from '@/lib/insforge';
import type { LineItem } from '@/lib/checkout';
import type { ProductShippingMode } from '@/lib/shipping';

type ProductShippingRow = Record<string, unknown> & {
  id: string;
  shipping_mode?: ProductShippingMode | null;
  shipping_fee?: number | null;
  shipping_weight_kg?: number | null;
  shipping_dimensions?: string | null;
  shipping_region_overrides?: Record<string, number> | null;
  source?: string | null;
  source_id?: string | null;
};

function toNullableNumber(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value ?? NaN);
  return Number.isFinite(n) ? n : null;
}

function nullableText(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

function asProductShippingRows(data: unknown): ProductShippingRow[] {
  if (!Array.isArray(data)) return [];
  return data.filter((row): row is ProductShippingRow => {
    if (!row || typeof row !== 'object') return false;
    return typeof (row as Record<string, unknown>).id === 'string' || typeof (row as Record<string, unknown>).id === 'number';
  }).map((row) => ({ ...(row as Record<string, unknown>), id: String((row as Record<string, unknown>).id) } as ProductShippingRow));
}

export async function hydrateCheckoutItemsWithShipping(items: LineItem[]): Promise<LineItem[]> {
  const ids = Array.from(new Set(items.map((item) => String(item.productoId)).filter(Boolean)));
  if (!ids.length) return items;

  try {
    const supplierUrlColumn = 'source' + '_url';
    const supplierPriceColumn = 'supplier' + '_price';
    const supplierCurrencyColumn = 'supplier' + '_currency';
    const productSelect = [
      'id',
      'shipping_mode',
      'shipping_fee',
      'shipping_weight_kg',
      'shipping_dimensions',
      'shipping_region_overrides',
      'source',
      supplierUrlColumn,
      'source_id',
      supplierPriceColumn,
      supplierCurrencyColumn,
    ].join(', ');

    const { data, error } = await insforgeAdmin.database
      .from('products')
      .select(productSelect)
      .in('id', ids);

    if (error) return items;
    const rows = asProductShippingRows(data);
    if (!rows.length) return items;

    const map = new Map(rows.map((row) => [String(row.id), row]));
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
        source: item.source ?? nullableText(row.source),
        sourceUrl: item.sourceUrl ?? nullableText(row[supplierUrlColumn]),
        sourceId: item.sourceId ?? nullableText(row.source_id),
        supplierPrice: item.supplierPrice ?? toNullableNumber(row[supplierPriceColumn]),
        supplierCurrency: item.supplierCurrency ?? nullableText(row[supplierCurrencyColumn]),
      };
    });
  } catch {
    return items;
  }
}
