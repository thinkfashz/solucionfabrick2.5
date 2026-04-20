'use client';

import { useMemo } from 'react';
import { buildProductTagline, resolveCategoryName } from '@/lib/commerce';
import { useCategories } from '@/hooks/useCategories';
import { Product as RealtimeProduct, useRealtimeProducts } from '@/hooks/useRealtimeProducts';

export interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  tagline: string;
  description: string;
  features: string[];
  dimensions: string;
  delivery: string;
  img: string;
  featured?: boolean;
  rating?: number;
  discountPercentage?: number;
}

export const FALLBACK_CATALOG_PRODUCTS: CatalogProduct[] = [
  {
    id: 'FBK-01',
    name: 'Cerradura Biometrica Titanio',
    price: 189900,
    category: 'Seguridad',
    tagline: 'Tu familia, siempre segura',
    description:
      'Sistema de acceso pensado para proteger tu hogar con apertura rapida, segura y facil de usar.',
    features: ['Sensor de alta precision', 'Apertura de emergencia', 'Gestion desde tu movil'],
    dimensions: '35 x 7 x 4 cm',
    delivery: 'Entrega inmediata',
    img: 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=800&auto=format&fit=crop',
    featured: true,
    rating: 5,
  },
  {
    id: 'FBK-02',
    name: 'Luz LED Arquitectonica',
    price: 85500,
    category: 'Iluminacion',
    tagline: 'El alma de tu espacio',
    description:
      'Iluminacion adaptable para crear ambientes calidos, modernos y eficientes en cualquier proyecto.',
    features: ['Luz calida regulable', 'Control por WiFi', 'Bajo consumo'],
    dimensions: '120 x 2 x 2 cm',
    delivery: 'Envio en 24h',
    img: 'https://images.unsplash.com/photo-1565814329452-e1efa11c5e8a?q=80&w=800&auto=format&fit=crop',
    rating: 4.8,
  },
  {
    id: 'FBK-03',
    name: 'Griferia Monomando Onix',
    price: 145000,
    category: 'Griferia',
    tagline: 'Detalles que enamoran',
    description:
      'Terminacion elegante, suave al tacto y preparada para resistir el uso diario sin perder presencia.',
    features: ['Facil limpieza', 'Garantia extendida', 'Acabado premium'],
    dimensions: '32 x 22 cm',
    delivery: 'Entrega inmediata',
    img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop',
    rating: 4.9,
  },
  {
    id: 'FBK-04',
    name: 'Panel Acustico Roble',
    price: 42900,
    category: 'Revestimiento',
    tagline: 'Tu refugio de paz',
    description:
      'Panel decorativo con aislamiento acustico para elevar confort, silencio y calidez visual.',
    features: ['Aislamiento acustico', 'Madera natural', 'Facil instalacion'],
    dimensions: '240 x 60 cm',
    delivery: 'Envio en 48h',
    img: 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=800&auto=format&fit=crop',
    rating: 4.7,
  },
];

function mapRealtimeProductToCatalogProduct(product: RealtimeProduct, categoryMap: Record<string, string>): CatalogProduct {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    category: resolveCategoryName(product.category_id, categoryMap),
    tagline: buildProductTagline(product.tagline, product.delivery_days),
    description: product.description || 'Producto sincronizado automaticamente desde nuestro catalogo.',
    features: [
      'Calidad garantizada',
      product.stock != null ? `Stock disponible: ${product.stock}` : 'Stock sujeto a confirmacion',
      product.featured ? 'Producto destacado' : 'Disponible para cotizar',
    ],
    dimensions:
      typeof product.specifications?.['medidas'] === 'string'
        ? String(product.specifications['medidas'])
        : 'Especificacion en ficha tecnica',
    delivery: product.delivery_days || 'Entrega a coordinar',
    img:
      product.image_url ||
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070&auto=format&fit=crop',
    featured: product.featured,
    rating: product.rating,
    discountPercentage: product.discount_percentage,
  };
}

export function useCatalogProducts() {
  const realtime = useRealtimeProducts();
  const { categoryMap } = useCategories();

  const products = useMemo(() => {
    // While DB fetch hasn't completed yet, show fallback (loading state UX)
    if (!realtime.fetchComplete) {
      return FALLBACK_CATALOG_PRODUCTS;
    }
    // DB fetch is done — map live results (may be empty if all products are inactive)
    return realtime.products.map((product) => mapRealtimeProductToCatalogProduct(product, categoryMap));
  }, [categoryMap, realtime.products, realtime.fetchComplete]);

  return {
    products,
    loading: realtime.loading && !realtime.fetchComplete,
    fetchComplete: realtime.fetchComplete,
    connected: realtime.connected,
    lastEvent: realtime.lastEvent,
    updateCount: realtime.updateCount,
    hasLiveData: realtime.products.length > 0,
    reload: realtime.reload,
  };
}
