'use client';

import { useMemo } from 'react';
import { buildProductTagline, resolveCategoryName } from '@/lib/commerce';
import { Product as RealtimeProduct, useRealtimeProducts } from '@/hooks/useRealtimeProducts';

export interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  category_id?: string;
  category_name?: string;
  tagline: string;
  description: string;
  features: string[];
  dimensions: string;
  delivery: string;
  img: string;
  image_url?: string;
  featured?: boolean;
  rating?: number;
  stock?: number;
  discountPercentage?: number;
  discount_percentage?: number;
  specifications?: Record<string, unknown>;
  placement?: 'best_seller' | 'featured' | 'promotion' | 'catalog';
  placementOrder?: number;
  shipping_mode?: RealtimeProduct['shipping_mode'];
  shipping_fee?: number | null;
  shipping_weight_kg?: number | null;
  shipping_dimensions?: string | null;
  shipping_region_overrides?: Record<string, number> | null;
}

export const FALLBACK_CATALOG_PRODUCTS: CatalogProduct[] = [
  { id: 'FBK-01', name: 'Cerradura Biométrica Titanio', price: 189900, category: 'Seguridad', tagline: 'Tu familia, siempre segura', description: 'Sistema de acceso biométrico de alta seguridad con apertura ultrarrápida, código de emergencia y gestión remota desde tu smartphone.', features: ['Sensor biométrico de alta precisión', 'Apertura de emergencia con código', 'Gestión remota desde tu móvil'], dimensions: '35 x 7 x 4 cm', delivery: 'Entrega inmediata', img: 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=800&auto=format&fit=crop', featured: true, rating: 5, stock: 12, placement: 'featured', placementOrder: 1 },
  { id: 'FBK-02', name: 'Porcelanato Mármol Carrara 60×60', price: 68500, category: 'Pisos', tagline: 'Lujo bajo tus pies', description: 'Porcelanato rectificado con acabado en mármol Carrara. Resistente, fácil de limpiar y de alto impacto visual para living, cocina y baños.', features: ['Rectificado de alta precisión', 'Resistente a manchas', 'Apto para piso calefaccionado'], dimensions: '60 x 60 cm · Caja 1.08 m²', delivery: 'Envío en 48h', img: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=800&auto=format&fit=crop', featured: true, rating: 4.9, discountPercentage: 10, stock: 8, placement: 'promotion', placementOrder: 1 },
  { id: 'FBK-03', name: 'Grifería Monomando Ónix', price: 145000, category: 'Grifería', tagline: 'Detalles que enamoran', description: 'Terminación elegante en negro mate, suave al tacto y preparada para resistir el uso diario sin perder presencia. Instalación universal.', features: ['Acabado negro mate premium', 'Cartucho cerámico garantizado', 'Instalación universal'], dimensions: '32 x 22 cm', delivery: 'Entrega inmediata', img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop', rating: 4.9, stock: 3, placement: 'best_seller', placementOrder: 1 },
  { id: 'FBK-04', name: 'Panel Acústico Roble', price: 42900, category: 'Revestimiento', tagline: 'Tu refugio de paz', description: 'Panel decorativo con núcleo absorbente y revestimiento de roble natural. Reduce el ruido y suma calidez a cualquier espacio.', features: ['Aislamiento acústico NRC 0.75', 'Madera de roble natural', 'Instalación con clips ocultos'], dimensions: '240 x 60 cm', delivery: 'Envío en 48h', img: 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=800&auto=format&fit=crop', rating: 4.7, stock: 14, placement: 'best_seller', placementOrder: 2 },
  { id: 'FBK-05', name: 'Luz LED Arquitectónica', price: 85500, category: 'Iluminación', tagline: 'El alma de tu espacio', description: 'Perfil de aluminio con tira LED integrada para iluminación indirecta. Control de intensidad y temperatura de color vía WiFi.', features: ['Temperatura 2700–6500 K regulable', 'Control por WiFi y voz', 'Bajo consumo A++'], dimensions: '120 x 2 x 2 cm', delivery: 'Envío en 24h', img: 'https://images.unsplash.com/photo-1565814329452-e1efa11c5e8a?q=80&w=800&auto=format&fit=crop', rating: 4.8, stock: 22, placement: 'catalog', placementOrder: 1 },
  { id: 'FBK-06', name: 'Ducha Digital Termostática', price: 245000, category: 'Baños', tagline: 'La temperatura que mereces', description: 'Sistema de ducha con control digital de temperatura y caudal. Pantalla táctil, memorias de usuario y función anti-quemadura integrada.', features: ['Control digital de temperatura', '3 memorias de usuario', 'Función anti-quemadura'], dimensions: '22 x 14 x 6 cm', delivery: 'Envío en 48h', img: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?q=80&w=800&auto=format&fit=crop', featured: true, rating: 4.8, stock: 6, placement: 'featured', placementOrder: 2 },
];

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  Seguridad: 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=800&auto=format&fit=crop',
  Iluminación: 'https://images.unsplash.com/photo-1565814329452-e1efa11c5e8a?q=80&w=800&auto=format&fit=crop',
  Grifería: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop',
  Griferia: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop',
  Revestimiento: 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=800&auto=format&fit=crop',
  Construcción: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=800&auto=format&fit=crop',
  Construccion: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=800&auto=format&fit=crop',
  Pisos: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=800&auto=format&fit=crop',
  Baños: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?q=80&w=800&auto=format&fit=crop',
  Banos: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?q=80&w=800&auto=format&fit=crop',
  Cocina: 'https://images.unsplash.com/photo-1556909172-8c2f041fca1e?q=80&w=800&auto=format&fit=crop',
};

const DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=800&auto=format&fit=crop';

function mapRealtimeProductToCatalogProduct(product: RealtimeProduct): CatalogProduct {
  const category = product.category_name || resolveCategoryName(product.category_id, {});
  const fallbackImage = CATEGORY_FALLBACK_IMAGES[category] ?? DEFAULT_FALLBACK_IMAGE;
  const image = product.image_url || fallbackImage;
  const merchandising = product.specifications?.merchandising && typeof product.specifications.merchandising === 'object' && !Array.isArray(product.specifications.merchandising) ? product.specifications.merchandising as Record<string, unknown> : {};
  const placementRaw = String(merchandising.placement || (product.featured ? 'featured' : 'catalog'));
  const placement = ['best_seller', 'featured', 'promotion', 'catalog'].includes(placementRaw) ? placementRaw as CatalogProduct['placement'] : 'catalog';
  const placementOrder = Number(merchandising.order || 999);
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    category,
    category_id: product.category_id,
    category_name: product.category_name,
    tagline: buildProductTagline(product.tagline, product.delivery_days),
    description: product.description || 'Producto sincronizado automáticamente desde nuestro catálogo.',
    features: ['Calidad garantizada', product.stock != null ? `Stock disponible: ${product.stock}` : 'Stock sujeto a confirmación', product.featured ? 'Producto destacado' : 'Disponible para cotizar'],
    dimensions: typeof product.specifications?.medidas === 'string' ? String(product.specifications.medidas) : product.shipping_dimensions || 'Especificación en ficha técnica',
    delivery: product.delivery_days || 'Entrega a coordinar',
    img: image,
    image_url: image,
    featured: product.featured,
    rating: product.rating,
    stock: product.stock,
    discountPercentage: product.discount_percentage,
    discount_percentage: product.discount_percentage,
    specifications: product.specifications,
    placement,
    placementOrder: Number.isFinite(placementOrder) ? placementOrder : 999,
    shipping_mode: product.shipping_mode,
    shipping_fee: product.shipping_fee ?? null,
    shipping_weight_kg: product.shipping_weight_kg ?? null,
    shipping_dimensions: product.shipping_dimensions ?? null,
    shipping_region_overrides: product.shipping_region_overrides ?? null,
  };
}

export function useCatalogProducts() {
  const realtime = useRealtimeProducts();
  const liveProducts = useMemo(() => realtime.products.map((product) => mapRealtimeProductToCatalogProduct(product)), [realtime.products]);
  const hasLiveData = liveProducts.length > 0;
  const products = useMemo(() => (hasLiveData ? liveProducts : FALLBACK_CATALOG_PRODUCTS), [hasLiveData, liveProducts]);
  return { products, loading: realtime.loading && !realtime.fetchComplete, fetchComplete: realtime.fetchComplete, connected: realtime.connected, lastEvent: realtime.lastEvent, updateCount: realtime.updateCount, hasLiveData, source: hasLiveData ? 'live' as const : realtime.fetchComplete ? 'fallback' as const : 'loading' as const, error: realtime.error, lastUpdated: realtime.lastUpdated, reload: realtime.reload };
}
