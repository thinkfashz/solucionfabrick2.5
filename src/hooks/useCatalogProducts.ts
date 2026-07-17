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
}

export const FALLBACK_CATALOG_PRODUCTS: CatalogProduct[] = [
  {
    id: 'FBK-01',
    name: 'Cerradura Biométrica Titanio',
    price: 189900,
    category: 'Seguridad',
    tagline: 'Tu familia, siempre segura',
    description:
      'Sistema de acceso biométrico de alta seguridad con apertura ultrarrápida, código de emergencia y gestión remota desde tu smartphone.',
    features: ['Sensor biométrico de alta precisión', 'Apertura de emergencia con código', 'Gestión remota desde tu móvil'],
    dimensions: '35 x 7 x 4 cm',
    delivery: 'Entrega inmediata',
    img: 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=800&auto=format&fit=crop',
    featured: true,
    rating: 5,
    stock: 12,
  },
  {
    id: 'FBK-02',
    name: 'Porcelanato Mármol Carrara 60×60',
    price: 68500,
    category: 'Pisos',
    tagline: 'Lujo bajo tus pies',
    description:
      'Porcelanato rectificado con acabado en mármol Carrara. Resistente, fácil de limpiar y de alto impacto visual para living, cocina y baños.',
    features: ['Rectificado de alta precisión', 'Resistente a manchas', 'Apto para piso calefaccionado'],
    dimensions: '60 x 60 cm · Caja 1.08 m²',
    delivery: 'Envío en 48h',
    img: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=800&auto=format&fit=crop',
    featured: true,
    rating: 4.9,
    discountPercentage: 10,
    stock: 8,
  },
  {
    id: 'FBK-03',
    name: 'Grifería Monomando Ónix',
    price: 145000,
    category: 'Grifería',
    tagline: 'Detalles que enamoran',
    description:
      'Terminación elegante en negro mate, suave al tacto y preparada para resistir el uso diario sin perder presencia. Instalación universal.',
    features: ['Acabado negro mate premium', 'Cartucho cerámico garantizado', 'Instalación universal'],
    dimensions: '32 x 22 cm',
    delivery: 'Entrega inmediata',
    img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop',
    rating: 4.9,
    stock: 3,
  },
];

const EXTRA_FALLBACK_PRODUCTS: CatalogProduct[] = [
  {
    id: 'FBK-04', name: 'Panel Acústico Roble', price: 42900, category: 'Revestimiento', tagline: 'Tu refugio de paz', description: 'Panel decorativo con núcleo absorbente y revestimiento de roble natural. Reduce el ruido y suma calidez a cualquier espacio.', features: ['Aislamiento acústico NRC 0.75', 'Madera de roble natural', 'Instalación con clips ocultos'], dimensions: '240 x 60 cm', delivery: 'Envío en 48h', img: 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=800&auto=format&fit=crop', rating: 4.7, stock: 14,
  },
  {
    id: 'FBK-05', name: 'Luz LED Arquitectónica', price: 85500, category: 'Iluminación', tagline: 'El alma de tu espacio', description: 'Perfil de aluminio con tira LED integrada para iluminación indirecta. Control de intensidad y temperatura de color vía WiFi.', features: ['Temperatura 2700–6500 K regulable', 'Control por WiFi y voz', 'Bajo consumo A++'], dimensions: '120 x 2 x 2 cm', delivery: 'Envío en 24h', img: 'https://images.unsplash.com/photo-1565814329452-e1efa11c5e8a?q=80&w=800&auto=format&fit=crop', rating: 4.8, stock: 22,
  },
  {
    id: 'FBK-06', name: 'Ducha Digital Termostática', price: 245000, category: 'Baños', tagline: 'La temperatura que mereces', description: 'Sistema de ducha con control digital de temperatura y caudal. Pantalla táctil, memorias de usuario y función anti-quemadura integrada.', features: ['Control digital de temperatura', '3 memorias de usuario', 'Función anti-quemadura'], dimensions: '22 x 14 x 6 cm', delivery: 'Envío en 48h', img: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?q=80&w=800&auto=format&fit=crop', featured: true, rating: 4.8, stock: 6,
  },
  {
    id: 'FBK-07', name: 'Cámara IP 360° Exterior', price: 78900, category: 'Seguridad', tagline: 'Vigilancia sin puntos ciegos', description: 'Cámara de seguridad IP con visión panorámica 360°, visión nocturna 4K y detección de movimiento con IA. Resistente a la intemperie IP67.', features: ['Resolución 4K HDR', 'Visión nocturna 30 m', 'Detección IA de personas'], dimensions: '12 x 12 x 10 cm', delivery: 'Envío en 24h', img: 'https://images.unsplash.com/photo-1580983218765-f663bec07b37?q=80&w=800&auto=format&fit=crop', rating: 4.7, stock: 11,
  },
  {
    id: 'FBK-08', name: 'Interruptor Smart Touch WiFi', price: 35900, category: 'Smart Home', tagline: 'Control total de tu hogar', description: 'Interruptor de superficie táctil con WiFi integrado. Compatible con Alexa, Google Home y Apple HomeKit. Instalación en caja estándar.', features: ['Compatible Alexa / Google / HomeKit', 'Panel de vidrio templado', 'Programación horaria'], dimensions: '8.6 x 8.6 x 3.3 cm', delivery: 'Envío en 24h', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800&auto=format&fit=crop', rating: 4.6, discountPercentage: 12, stock: 19,
  },
];

FALLBACK_CATALOG_PRODUCTS.push(...EXTRA_FALLBACK_PRODUCTS);

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  Seguridad: 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=800&auto=format&fit=crop',
  Iluminación: 'https://images.unsplash.com/photo-1565814329452-e1efa11c5e8a?q=80&w=800&auto=format&fit=crop',
  Iluminacion: 'https://images.unsplash.com/photo-1565814329452-e1efa11c5e8a?q=80&w=800&auto=format&fit=crop',
  Grifería: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop',
  Griferia: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop',
  Revestimiento: 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=800&auto=format&fit=crop',
  SmartHome: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800&auto=format&fit=crop',
  'Smart Home': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800&auto=format&fit=crop',
  Construccion: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=800&auto=format&fit=crop',
  Construcción: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=800&auto=format&fit=crop',
  Interiores: 'https://images.unsplash.com/photo-1616137466211-f939a420be84?q=80&w=800&auto=format&fit=crop',
  Puertas: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?q=80&w=800&auto=format&fit=crop',
  Pintura: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?q=80&w=800&auto=format&fit=crop',
  Herramientas: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?q=80&w=800&auto=format&fit=crop',
  Pisos: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=800&auto=format&fit=crop',
  Baños: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?q=80&w=800&auto=format&fit=crop',
  Banos: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?q=80&w=800&auto=format&fit=crop',
  Cocina: 'https://images.unsplash.com/photo-1556909172-8c2f041fca1e?q=80&w=800&auto=format&fit=crop',
  Energía: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=800&auto=format&fit=crop',
  Energia: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=800&auto=format&fit=crop',
  Exterior: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop',
};

const DEFAULT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=800&auto=format&fit=crop';

function mapRealtimeProductToCatalogProduct(product: RealtimeProduct): CatalogProduct {
  const category = product.category_name || resolveCategoryName(product.category_id, {});
  const fallbackImage = CATEGORY_FALLBACK_IMAGES[category] ?? DEFAULT_FALLBACK_IMAGE;
  const image = product.image_url || fallbackImage;
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    category,
    category_id: product.category_id,
    category_name: product.category_name,
    tagline: buildProductTagline(product.tagline, product.delivery_days),
    description: product.description || 'Producto sincronizado automáticamente desde nuestro catálogo.',
    features: [
      'Calidad garantizada',
      product.stock != null ? `Stock disponible: ${product.stock}` : 'Stock sujeto a confirmación',
      product.featured ? 'Producto destacado' : 'Disponible para cotizar',
    ],
    dimensions:
      typeof product.specifications?.['medidas'] === 'string'
        ? String(product.specifications['medidas'])
        : 'Especificación en ficha técnica',
    delivery: product.delivery_days || 'Entrega a coordinar',
    img: image,
    image_url: image,
    featured: product.featured,
    rating: product.rating,
    stock: product.stock,
    discountPercentage: product.discount_percentage,
    discount_percentage: product.discount_percentage,
  };
}

export function useCatalogProducts() {
  const realtime = useRealtimeProducts();

  const liveProducts = useMemo(
    () => realtime.products.map((product) => mapRealtimeProductToCatalogProduct(product)),
    [realtime.products],
  );
  const hasLiveData = liveProducts.length > 0;
  const products = useMemo(
    () => (hasLiveData ? liveProducts : FALLBACK_CATALOG_PRODUCTS),
    [hasLiveData, liveProducts],
  );

  return {
    products,
    loading: realtime.loading && !realtime.fetchComplete,
    fetchComplete: realtime.fetchComplete,
    connected: realtime.connected,
    lastEvent: realtime.lastEvent,
    updateCount: realtime.updateCount,
    hasLiveData,
    source: hasLiveData ? 'live' as const : realtime.fetchComplete ? 'fallback' as const : 'loading' as const,
    error: realtime.error,
    lastUpdated: realtime.lastUpdated,
    reload: realtime.reload,
  };
}
