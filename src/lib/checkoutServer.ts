import 'server-only';
import { insforgeAdmin } from '@/lib/insforge';
import type { LineItem } from '@/lib/checkout';
import type { ProductShippingMode } from '@/lib/shipping';

export class CheckoutHydrationError extends Error {
  status = 422;
}

type ProductCheckoutRow = {
  id: string;
  name: string;
  price: number;
  stock?: number | null;
  activo?: boolean | null;
  discount_percentage?: number | null;
  shipping_mode?: ProductShippingMode | null;
  shipping_fee?: number | null;
  shipping_weight_kg?: number | null;
  shipping_dimensions?: string | null;
  shipping_region_overrides?: Record<string, number> | null;
};

const PRODUCT_SELECT = 'id, name, price, stock, activo, discount_percentage, shipping_mode, shipping_fee, shipping_weight_kg, shipping_dimensions, shipping_region_overrides';
const MAX_DISTINCT_ITEMS = 25;
const MAX_QUANTITY_PER_ITEM = 50;

function normalizeQuantity(value: unknown) {
  const quantity = Math.floor(Number(value));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new CheckoutHydrationError('Cantidad inválida en el carrito.');
  }
  if (quantity > MAX_QUANTITY_PER_ITEM) {
    throw new CheckoutHydrationError(`La cantidad máxima por producto es ${MAX_QUANTITY_PER_ITEM}.`);
  }
  return quantity;
}

function finalUnitPrice(row: ProductCheckoutRow) {
  const basePrice = Math.round(Number(row.price));
  const discount = Math.min(95, Math.max(0, Math.round(Number(row.discount_percentage ?? 0))));
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    throw new CheckoutHydrationError(`El producto "${row.name}" no tiene precio válido.`);
  }
  return Math.max(1, Math.round(basePrice * (1 - discount / 100)));
}

/**
 * Build checkout line-items from authoritative product rows.
 *
 * Important: public checkout must never trust product names, prices, discounts,
 * shipping rules or stock sent by the browser. Those values are display-only in
 * the client; this function re-reads them from the database before creating an
 * order or a Mercado Pago preference.
 */
export async function hydrateCheckoutItemsWithShipping(items: LineItem[]): Promise<LineItem[]> {
  const ids = Array.from(new Set(items.map((item) => String(item.productoId)).filter(Boolean)));
  if (!ids.length) throw new CheckoutHydrationError('El carrito está vacío.');
  if (ids.length > MAX_DISTINCT_ITEMS) {
    throw new CheckoutHydrationError(`El checkout acepta máximo ${MAX_DISTINCT_ITEMS} productos distintos.`);
  }

  let rows: ProductCheckoutRow[] = [];
  try {
    const { data, error } = await insforgeAdmin.database
      .from('products')
      .select(PRODUCT_SELECT)
      .in('id', ids);

    if (error) throw new Error(error.message || 'No se pudo validar el catálogo.');
    rows = Array.isArray(data) ? data as ProductCheckoutRow[] : [];
  } catch (error) {
    if (error instanceof CheckoutHydrationError) throw error;
    throw new Error(error instanceof Error ? error.message : 'No se pudo validar el catálogo.');
  }

  const map = new Map(rows.map((row) => [String(row.id), row]));
  return items.map((item) => {
    const productId = String(item.productoId);
    const row = map.get(productId);
    if (!row) {
      throw new CheckoutHydrationError(`El producto "${item.nombre || productId}" no está disponible para compra.`);
    }
    if (row.activo === false) {
      throw new CheckoutHydrationError(`El producto "${row.name}" ya no está activo.`);
    }

    const quantity = normalizeQuantity(item.cantidad);
    if (typeof row.stock === 'number' && row.stock < quantity) {
      throw new CheckoutHydrationError(`Stock insuficiente para "${row.name}". Disponible: ${Math.max(0, row.stock)}.`);
    }

    return {
      ...item,
      productoId: row.id,
      cantidad: quantity,
      precioUnitario: finalUnitPrice(row),
      nombre: row.name,
      shippingMode: row.shipping_mode ?? 'inherit',
      shippingFee: row.shipping_fee ?? null,
      shippingWeightKg: row.shipping_weight_kg ?? null,
      shippingDimensions: row.shipping_dimensions ?? null,
      shippingRegionOverrides: row.shipping_region_overrides ?? null,
    };
  });
}
