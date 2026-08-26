import type { CatalogProduct } from '@/hooks/useCatalogProducts';
import type { Product } from '@/hooks/useRealtimeProducts';

export const CLP = (value: number) => new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
}).format(value);

export function finalProductPrice(product: CatalogProduct) {
  const discount = product.discountPercentage ?? product.discount_percentage ?? 0;
  return discount > 0 ? Math.round(product.price * (1 - discount / 100)) : product.price;
}

export function displayProductName(name: string) {
  const withoutStore = name.split('|')[0]?.trim() || name.trim();
  const words = withoutStore.replace(/\s+/g, ' ').split(' ');
  const first = words[0] || '';
  const importedBrand = first.length >= 10 && first === first.toUpperCase() && !/\d/.test(first);
  return (importedBrand ? words.slice(1) : words).join(' ') || withoutStore;
}

export function toCartProduct(product: CatalogProduct): Product {
  const specifications = {
    ...(product.specifications ?? {}),
    ...(product.dimensions && product.dimensions !== 'Especificación en ficha técnica' ? { medidas: product.dimensions } : {}),
  };
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    stock: product.stock,
    image_url: product.image_url || product.img,
    featured: product.featured,
    tagline: product.tagline,
    delivery_days: product.delivery,
    discount_percentage: product.discountPercentage ?? product.discount_percentage ?? 0,
    category_id: product.category_id,
    category_name: product.category_name || product.category,
    specifications,
    shipping_mode: product.shipping_mode ?? null,
    shipping_fee: product.shipping_fee ?? null,
    shipping_weight_kg: product.shipping_weight_kg ?? null,
    shipping_dimensions: product.shipping_dimensions ?? null,
    shipping_region_overrides: product.shipping_region_overrides ?? null,
  };
}
