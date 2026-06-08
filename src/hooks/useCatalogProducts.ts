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
  },
  {
    id: 'FBK-04',
    name: 'Panel Acústico Roble',
    price: 42900,
    category: 'Revestimiento',
    tagline: 'Tu refugio de paz',
    description:
      'Panel decorativo con núcleo absorbente y revestimiento de roble natural. Reduce el ruido y suma calidez a cualquier espacio.',
    features: ['Aislamiento acústico NRC 0.75', 'Madera de roble natural', 'Instalación con clips ocultos'],
    dimensions: '240 x 60 cm',
    delivery: 'Envío en 48h',
    img: 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=800&auto=format&fit=crop',
    rating: 4.7,
  },
  {
    id: 'FBK-05',
    name: 'Luz LED Arquitectónica',
    price: 85500,
    category: 'Iluminación',
    tagline: 'El alma de tu espacio',
    description:
      'Perfil de aluminio con tira LED integrada para iluminación indirecta. Control de intensidad y temperatura de color vía WiFi.',
    features: ['Temperatura 2700–6500 K regulable', 'Control por WiFi y voz', 'Bajo consumo A++'],
    dimensions: '120 x 2 x 2 cm',
    delivery: 'Envío en 24h',
    img: 'https://images.unsplash.com/photo-1565814329452-e1efa11c5e8a?q=80&w=800&auto=format&fit=crop',
    rating: 4.8,
  },
  {
    id: 'FBK-06',
    name: 'Ducha Digital Termostática',
    price: 245000,
    category: 'Baños',
    tagline: 'La temperatura que mereces',
    description:
      'Sistema de ducha con control digital de temperatura y caudal. Pantalla táctil, memorias de usuario y función anti-quemadura integrada.',
    features: ['Control digital de temperatura', '3 memorias de usuario', 'Función anti-quemadura'],
    dimensions: '22 x 14 x 6 cm',
    delivery: 'Envío en 48h',
    img: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?q=80&w=800&auto=format&fit=crop',
    featured: true,
    rating: 4.8,
  },
  {
    id: 'FBK-07',
    name: 'Cámara IP 360° Exterior',
    price: 78900,
    category: 'Seguridad',
    tagline: 'Vigilancia sin puntos ciegos',
    description:
      'Cámara de seguridad IP con visión panorámica 360°, visión nocturna 4K y detección de movimiento con IA. Resistente a la intemperie IP67.',
    features: ['Resolución 4K HDR', 'Visión nocturna 30 m', 'Detección IA de personas'],
    dimensions: '12 x 12 x 10 cm',
    delivery: 'Envío en 24h',
    img: 'https://images.unsplash.com/photo-1580983218765-f663bec07b37?q=80&w=800&auto=format&fit=crop',
    rating: 4.7,
  },
  {
    id: 'FBK-08',
    name: 'Interruptor Smart Touch WiFi',
    price: 35900,
    category: 'Smart Home',
    tagline: 'Control total de tu hogar',
    description:
      'Interruptor de superficie táctil con WiFi integrado. Compatible con Alexa, Google Home y Apple HomeKit. Instalación en caja estándar.',
    features: ['Compatible Alexa / Google / HomeKit', 'Panel de vidrio templado', 'Programación horaria'],
    dimensions: '8.6 x 8.6 x 3.3 cm',
    delivery: 'Envío en 24h',
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800&auto=format&fit=crop',
    rating: 4.6,
    discountPercentage: 12,
  },
  {
    id: 'FBK-09',
    name: 'Parquet Roble Americano Natural',
    price: 94900,
    category: 'Pisos',
    tagline: 'Calor natural bajo tus pies',
    description:
      'Piso flotante de roble americano macizo con aceite natural. Compatible con calefacción radiante. Instala en flotante sin pegamento.',
    features: ['Roble macizo 14 mm', 'Compatible calefacción radiante', 'Acabado en aceite natural'],
    dimensions: '190 x 19 cm · Caja 1.52 m²',
    delivery: 'Envío en 72h',
    img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=800&auto=format&fit=crop',
    rating: 4.9,
    featured: true,
  },
  {
    id: 'FBK-10',
    name: 'Bañera Independiente Ovalada',
    price: 590000,
    category: 'Baños',
    tagline: 'Tu spa privado',
    description:
      'Bañera exenta en acrílico reforzado con diseño orgánico. Incluye desagüe cromado y válvula de llenado integrada. Espacio de bienestar premium.',
    features: ['Acrílico reforzado con fibra de vidrio', 'Desagüe y válvula incluidos', 'Garantía 10 años'],
    dimensions: '170 x 75 x 58 cm',
    delivery: 'Envío en 5 días',
    img: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?q=80&w=800&auto=format&fit=crop',
    rating: 4.9,
    featured: true,
  },
  {
    id: 'FBK-11',
    name: 'Lámpara Colgante Industrial Cobre',
    price: 129000,
    category: 'Iluminación',
    tagline: 'Caracter en cada espacio',
    description:
      'Lámpara colgante de diseño industrial en acabado cobre mate. Ideal para comedor, café o estudio. Cable textil trenzado de 2 metros incluido.',
    features: ['Acabado cobre mate', 'Cable textil ajustable 2 m', 'Bombilla E27 incluida'],
    dimensions: 'Ø 32 cm · Alto 28 cm',
    delivery: 'Envío en 48h',
    img: 'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?q=80&w=800&auto=format&fit=crop',
    rating: 4.8,
    discountPercentage: 15,
  },
  {
    id: 'FBK-12',
    name: 'Puerta Blindada Roble Oscuro',
    price: 389000,
    category: 'Puertas',
    tagline: 'La primera línea de defensa',
    description:
      'Puerta de acceso con núcleo de acero, revestimiento en roble tintado y cerradura multipunto de seguridad clase 3. Instalación incluida.',
    features: ['Núcleo de acero galvanizado', 'Cerradura multipunto clase 3', 'Instalación profesional incluida'],
    dimensions: '96 x 210 cm',
    delivery: 'Envío en 7 días',
    img: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?q=80&w=800&auto=format&fit=crop',
    rating: 4.8,
    discountPercentage: 5,
    featured: true,
  },
  {
    id: 'FBK-13',
    name: 'Grifería de Pie Dorado Mate',
    price: 198000,
    category: 'Grifería',
    tagline: 'Lujo en cada detalle',
    description:
      'Grifería de piso para bañera con acabado dorado mate PVD. Resistente a la corrosión, arañazos y tinciones. Diseño arquitectónico minimalista.',
    features: ['Acabado PVD dorado mate', 'Resistente a corrosión y arañazos', 'Compatible con bañera exenta'],
    dimensions: '65 x 24 x 18 cm',
    delivery: 'Envío en 48h',
    img: 'https://images.unsplash.com/photo-1620626011761-996317702149?q=80&w=800&auto=format&fit=crop',
    rating: 4.9,
  },
  {
    id: 'FBK-14',
    name: 'Revestimiento Piedra Laja Natural',
    price: 58500,
    category: 'Revestimiento',
    tagline: 'La textura de la naturaleza',
    description:
      'Piedra laja natural para revestimiento de muros interiores y exteriores. Cada pieza es única, resistente a la humedad y heladas.',
    features: ['Piedra 100% natural', 'Resistente a la humedad', 'Apto exterior e interior'],
    dimensions: 'Piezas irregulares · m² aprox',
    delivery: 'Envío en 72h',
    img: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=800&auto=format&fit=crop',
    rating: 4.6,
  },
  {
    id: 'FBK-15',
    name: 'Porcelanato Cemento Industrial 45×45',
    price: 48900,
    category: 'Pisos',
    tagline: 'Estilo urbano garantizado',
    description:
      'Porcelanato con acabado cemento industrial en tonos grises. Antideslizante R10, resistente a tráfico intenso. Ideal para interiores modernos.',
    features: ['Antideslizante R10', 'Resistencia tráfico intenso', 'Junta rectificada ≤ 1.5 mm'],
    dimensions: '45 x 45 cm · Caja 1.26 m²',
    delivery: 'Envío en 48h',
    img: 'https://images.unsplash.com/photo-1586500036706-41963de24d8b?q=80&w=800&auto=format&fit=crop',
    rating: 4.7,
    discountPercentage: 8,
  },
  {
    id: 'FBK-16',
    name: 'Mesón de Cuarzo Blanco Ártico',
    price: 345000,
    category: 'Cocina',
    tagline: 'La elegancia de lo simple',
    description:
      'Cuarzo engineered de 20 mm en blanco ártico con vetas sutiles. No poroso, no requiere sellado. Corte y terminación a medida incluidos.',
    features: ['Cuarzo engineered 20 mm', 'Sin porosidad · Sin sellado', 'Corte a medida incluido'],
    dimensions: 'A medida · hasta 320 cm largo',
    delivery: 'Fabricación 7 días',
    img: 'https://images.unsplash.com/photo-1556909172-8c2f041fca1e?q=80&w=800&auto=format&fit=crop',
    rating: 4.8,
    featured: true,
    discountPercentage: 8,
  },
  {
    id: 'FBK-17',
    name: 'Panel Solar Residencial 400W',
    price: 285000,
    category: 'Energía',
    tagline: 'Genera tu propia energía',
    description:
      'Panel fotovoltaico monocristalino 400W para instalación residencial. Eficiencia 21.5%, garantía de potencia 25 años. Incluye asesoría de instalación.',
    features: ['Eficiencia monocristalino 21.5%', 'Garantía de potencia 25 años', 'Asesoría de instalación incluida'],
    dimensions: '172 x 113 x 3.2 cm · 21 kg',
    delivery: 'Envío en 5 días',
    img: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=800&auto=format&fit=crop',
    rating: 4.7,
  },
  {
    id: 'FBK-18',
    name: 'Tira LED RGB Exterior IP67',
    price: 22900,
    category: 'Iluminación',
    tagline: 'Color para cada rincón',
    description:
      'Tira LED RGBW de alta luminosidad para uso exterior. 60 LEDs/m, IP67, compatible con controladores WiFi y DMX. Rollo de 5 metros.',
    features: ['IP67 apto exterior', '60 LEDs/m · Alta luminosidad', 'Compatible WiFi y DMX'],
    dimensions: '5 m · 10 mm ancho',
    delivery: 'Envío en 24h',
    img: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?q=80&w=800&auto=format&fit=crop',
    rating: 4.5,
  },
  {
    id: 'FBK-19',
    name: 'Toldo Motorizado Impermeable',
    price: 175000,
    category: 'Exterior',
    tagline: 'Tu espacio al aire libre',
    description:
      'Toldo extensible motorizado con tela acrílica impermeable UV90. Motor silencioso 36 dB. Control por app y sensor de viento automático.',
    features: ['Tela acrílica UV90 impermeable', 'Motor silencioso 36 dB', 'Sensor de viento automático'],
    dimensions: 'Proyección 3 m · Ancho 4 m',
    delivery: 'Envío en 5 días',
    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop',
    rating: 4.6,
  },
  {
    id: 'FBK-20',
    name: 'Mosaico de Vidrio Aqua 30×30',
    price: 62500,
    category: 'Revestimiento',
    tagline: 'Brilla donde otros no llegan',
    description:
      'Mosaico de vidrio reciclado en tonos aqua para revestimiento de duchas, piscinas y muros decorativos. Piezas de 2.5×2.5 cm sobre malla.',
    features: ['Vidrio reciclado certificado', 'Resistente al cloro de piscinas', 'Instalación sobre malla fácil'],
    dimensions: '30 x 30 cm · piezas 2.5 cm',
    delivery: 'Envío en 48h',
    img: 'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?q=80&w=800&auto=format&fit=crop',
    rating: 4.8,
  },
];

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

function mapRealtimeProductToCatalogProduct(product: RealtimeProduct, categoryMap: Record<string, string>): CatalogProduct {
  const category = product.category_id || 'General';
  const fallbackImage =
    CATEGORY_FALLBACK_IMAGES[category] ?? DEFAULT_FALLBACK_IMAGE;
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    category: resolveCategoryName(product.category_id, categoryMap),
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
    img: product.image_url || fallbackImage,
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
