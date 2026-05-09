/**
 * Precios del Mercado Chileno 2026
 * Datos basados en consultas a proveedores y mercado inmobiliario
 */

export const MERCADO_2026 = {
  // Precios por m² en CLP (Pesos Chilenos)
  servicios: {
    // ESTRUCTURALES
    cimientos: {
      nombre: 'Cimientos y Fundaciones',
      categoria: 'Estructura',
      precioBase: 85000, // CLP/m²
      precioMax: 120000,
      descripcion: 'Excavación, preparación y hormigonado',
      materiales: {
        cemento: 4, // bolsas/m²
        arena: 0.8, // m³
        grava: 0.6, // m³
        acero: 15, // kg
      },
      tiempo: 3, // días/m²
    },
    
    // METALCON/ESTRUCTURA
    metalcon: {
      nombre: 'Estructura Metalcon',
      categoria: 'Estructura',
      precioBase: 45000, // CLP/m²
      precioMax: 65000,
      descripcion: 'Perfiles, placas de yeso y aislación',
      materiales: {
        perfil_c: 25, // kg
        placa_yeso: 1.5, // m²
        aislante: 1, // m²
      },
      tiempo: 2, // días/10m²
    },

    // REVESTIMIENTOS
    revestimiento: {
      nombre: 'Revestimiento Muro',
      categoria: 'Acabados',
      precioBase: 35000, // CLP/m²
      precioMax: 55000,
      descripcion: 'Mortero, aplanado y preparación para pintura',
      materiales: {
        cemento: 2,
        arena: 0.5,
        mortero: 30, // kg
      },
      tiempo: 1.5, // días/15m²
    },

    // PINTURA
    pintura: {
      nombre: 'Pintura Interior/Exterior',
      categoria: 'Acabados',
      precioBase: 12000, // CLP/m²
      precioMax: 25000,
      descripcion: 'Preparación, imprimación y 2 manos de pintura',
      materiales: {
        pintura: 0.15, // litros/m²
        imprimación: 0.1, // litros/m²
      },
      tiempo: 0.5, // días/30m²
    },

    // GASFITERÍA
    gasfiteria: {
      nombre: 'Instalación de Gasfitería',
      categoria: 'Instalaciones',
      precioBase: 35000, // CLP/punto (lavaplatos, ducha, etc)
      precioMax: 55000,
      descripcion: 'Tuberías, accesorios e instalación',
      materiales: {
        tuberia_cobre: 2, // metros
        accesorios: 8000, // CLP
      },
      tiempo: 1, // días/punto
    },

    // ELECTRICIDAD
    electricidad: {
      nombre: 'Instalación Eléctrica',
      categoria: 'Instalaciones',
      precioBase: 45000, // CLP/punto (enchufes, interruptores)
      precioMax: 75000,
      descripcion: 'Cable, canalizaciones y puntos',
      materiales: {
        cable: 5, // metros
        accesorios: 12000, // CLP
      },
      tiempo: 0.8, // días/punto
    },

    // AMPLIACIONES
    ampliaciones: {
      nombre: 'Ampliación de Estructura',
      categoria: 'Construcción',
      precioBase: 95000, // CLP/m²
      precioMax: 150000,
      descripcion: 'Estructura completa para nueva área',
      materiales: {
        cemento: 5,
        arena: 1,
        grava: 0.8,
        acero: 20,
      },
      tiempo: 4,
    },

    // SEGURIDAD
    seguridad: {
      nombre: 'Sistema de Seguridad',
      categoria: 'Tecnología',
      precioBase: 450000, // CLP/sistema base
      precioMax: 1200000,
      descripcion: 'Cámaras, sensores, alarma y monitoreo',
      materiales: {
        camaras: 4,
        sensores: 8,
        hub: 1,
      },
      tiempo: 1, // instalación
    },
  },

  // MATERIALES (CLP por unidad)
  materiales: {
    cemento_bolsa: { nombre: 'Cemento (bolsa 25kg)', precio: 5800, unidad: 'bolsa' },
    acero_kg: { nombre: 'Acero corrugado', precio: 1450, unidad: 'kg' },
    ladrillo: { nombre: 'Ladrillo industrial', precio: 1200, unidad: 'unidad' },
    plastico_m3: { nombre: 'Plástico construcción', precio: 2500, unidad: 'm' },
    yeso_m2: { nombre: 'Placa de yeso', precio: 8500, unidad: 'm²' },
    pintura_litro: { nombre: 'Pintura premium', precio: 15000, unidad: 'litro' },
    baldosa_m2: { nombre: 'Baldosa cerámica', precio: 18000, unidad: 'm²' },
    tuberia_cobre_m: { nombre: 'Tubería cobre 3/4"', precio: 8500, unidad: 'metro' },
    cable_electrico_m: { nombre: 'Cable eléctrico #2', precio: 350, unidad: 'metro' },
    ventana_m2: { nombre: 'Ventana aluminio', precio: 125000, unidad: 'm²' },
  },

  // COSTOS VARIABLES
  costos: {
    mano_obra_hora: 25000, // CLP/hora básica
    maestro_hora: 35000, // CLP/hora
    arriendo_andamio_m: 850, // CLP/m por mes
    combustible_diario: 45000, // CLP
    transporte_flat: 80000, // CLP por obra
  },

  // IVA Y MÁRGENES
  iva: 0.19, // 19% IVA Chile
  margen_empresa: 0.25, // 25% margen
  descuento_volumen: {
    minimo_5m2: 0.05, // 5% desde 5m²
    minimo_20m2: 0.10, // 10% desde 20m²
    minimo_50m2: 0.15, // 15% desde 50m²
  },
};

/**
 * Calcula el costo de un servicio basado en m²
 */
export function calcularPrecioServicio(
  servicio: keyof typeof MERCADO_2026.servicios,
  metros2: number,
  incluirIVA: boolean = true,
): { subtotal: number; iva: number; total: number; precioM2: number } {
  const svc = MERCADO_2026.servicios[servicio];
  if (!svc) throw new Error(`Servicio no encontrado: ${servicio}`);

  // Precio ajustado por m² (interpolación entre base y máximo)
  const precioM2Ajustado = svc.precioBase + (svc.precioMax - svc.precioBase) * 0.3;
  
  // Subtotal antes de descuentos
  let subtotal = precioM2Ajustado * metros2;

  // Aplicar descuento por volumen
  if (metros2 >= 50) {
    subtotal *= 1 - MERCADO_2026.descuento_volumen.minimo_50m2;
  } else if (metros2 >= 20) {
    subtotal *= 1 - MERCADO_2026.descuento_volumen.minimo_20m2;
  } else if (metros2 >= 5) {
    subtotal *= 1 - MERCADO_2026.descuento_volumen.minimo_5m2;
  }

  const iva = incluirIVA ? subtotal * MERCADO_2026.iva : 0;
  const total = subtotal + iva;

  return {
    subtotal,
    iva,
    total,
    precioM2: subtotal / metros2,
  };
}

/**
 * Obtiene todas las categorías de servicios
 */
export function obtenerCategorias(): string[] {
  const categorias = new Set<string>();
  Object.values(MERCADO_2026.servicios).forEach((svc) => {
    categorias.add(svc.categoria);
  });
  return Array.from(categorias).sort();
}

/**
 * Obtiene servicios por categoría
 */
export function obtenerServiciosPorCategoria(categoria: string) {
  return Object.entries(MERCADO_2026.servicios)
    .filter(([, svc]) => svc.categoria === categoria)
    .map(([key, svc]) => ({ id: key, ...svc }));
}

export type ServicioKey = keyof typeof MERCADO_2026.servicios;
