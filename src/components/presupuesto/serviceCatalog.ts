import {
  AirVent,
  Bath,
  Blocks,
  Building2,
  DoorOpen,
  Fence,
  Flame,
  Hammer,
  Home,
  HousePlug,
  Layers3,
  Lightbulb,
  PaintRoller,
  PanelsTopLeft,
  ShieldCheck,
  Sparkles,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export type ServiceUnit = 'm²' | 'm³' | 'ml' | 'punto' | 'unidad';
export type ServiceCategory = 'Obra base' | 'Construcción' | 'Instalaciones' | 'Terminaciones' | 'Climatización' | 'Exterior' | 'Carpintería';
export type MeasurementKind = 'floor' | 'wall' | 'room-walls' | 'slab' | 'volume' | 'linear' | 'count';
export type PriceMode = 'labor' | 'complete';

export type MeasurementValues = {
  length: number;
  width: number;
  height: number;
  quantity: number;
};

export type BudgetService = {
  id: string;
  category: ServiceCategory;
  title: string;
  short: string;
  description: string;
  unit: ServiceUnit;
  measurement: MeasurementKind;
  /** Solo ejecución / instalación. Materiales principales fuera del rango. */
  laborMin: number;
  laborMax: number;
  /** Trabajo vendido: ejecución + materiales/insumos base descritos en el alcance. */
  marketMin: number;
  marketMax: number;
  defaultValues: MeasurementValues;
  icon: LucideIcon;
  includes: string[];
  disclaimer: string;
  accent: string;
};

export type MeasurementResult = {
  quantity: number;
  priceFactor: number;
  formula: string;
  detail: string;
  secondary?: string;
};

export const FABRICK_PALETTE = {
  pearl: '#FFF9EE',
  oak: '#F5871F',
  oakLight: '#FFB000',
  ink: '#08090A',
  inkSoft: '#1A1B1F',
} as const;

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  'Obra base',
  'Construcción',
  'Instalaciones',
  'Terminaciones',
  'Climatización',
  'Exterior',
  'Carpintería',
];

export const SERVICE_QUERY_ALIASES: Record<string, string> = {
  fundaciones: 'cimientos',
  estructuras: 'metalcon',
  mueble: 'carpinteria',
  enchufe: 'electricidad',
  siding: 'revestimiento',
  'aire-acondicionado': 'aire',
  'casa-llave-en-mano': 'llave-mano',
  remodelacion: 'ampliaciones',
  techos: 'techumbre',
};

/**
 * Rangos comerciales de referencia para Chile 2026.
 * Separamos mano de obra de trabajo vendido para evitar comparar una instalación
 * con un servicio que además considera materiales/insumos base. Los valores son
 * orientativos y se confirman según comuna, acceso, terminación y condiciones reales.
 */
export const BUDGET_SERVICES: BudgetService[] = [
  {
    id: 'albanileria', category: 'Obra base', title: 'Albañilería y obra gruesa', short: 'Albañilería', unit: 'm²', measurement: 'wall', laborMin: 16000, laborMax: 32000, marketMin: 32000, marketMax: 65000,
    description: 'Muros, sobrepisos, enchapes y reparaciones de obra húmeda según la superficie real a intervenir.', defaultValues: { length: 5, width: 4, height: 2.4, quantity: 1 }, icon: Hammer,
    includes: ['Preparación básica del área', 'Ejecución de la partida definida', 'Materiales base y remates simples en trabajo vendido'], disclaimer: 'Demoliciones, refuerzos, humedad, retiro de escombros y terminaciones especiales se revisan aparte.', accent: FABRICK_PALETTE.oak,
  },
  {
    id: 'cimientos', category: 'Obra base', title: 'Cimientos y fundaciones', short: 'Fundaciones', unit: 'm³', measurement: 'volume', laborMin: 60000, laborMax: 105000, marketMin: 135000, marketMax: 235000,
    description: 'Excavación, armaduras, moldajes y hormigón calculados por volumen.', defaultValues: { length: 6, width: 0.4, height: 0.5, quantity: 1 }, icon: Layers3,
    includes: ['Trazado y preparación básica', 'Ejecución de excavación y moldaje según alcance', 'Hormigón y armaduras base en trabajo vendido'], disclaimer: 'El suelo, profundidad, bombeo, refuerzos, retiro de material y acceso pueden cambiar el valor.', accent: '#9A765A',
  },
  {
    id: 'radier', category: 'Obra base', title: 'Radier de hormigón', short: 'Radier', unit: 'm²', measurement: 'slab', laborMin: 9000, laborMax: 15000, marketMin: 20000, marketMax: 34000,
    description: 'Radier para vivienda, ampliación, terraza o bodega, ajustado por superficie y espesor.', defaultValues: { length: 6, width: 6, height: 0.1, quantity: 1 }, icon: Blocks,
    includes: ['Preparación y nivelación básica', 'Mano de obra de vaciado y afinado', 'Hormigón y refuerzo base en trabajo vendido'], disclaimer: 'Rellenos, malla especial, resistencia del hormigón, pendientes, bomba y accesos se revisan antes de confirmar.', accent: '#A98263',
  },
  {
    id: 'metalcon', category: 'Construcción', title: 'Estructura Metalcon', short: 'Metalcon', unit: 'm²', measurement: 'wall', laborMin: 18000, laborMax: 35000, marketMin: 42000, marketMax: 75000,
    description: 'Muros y estructuras livianas calculados por la superficie estructural.', defaultValues: { length: 6, width: 4, height: 2.4, quantity: 1 }, icon: PanelsTopLeft,
    includes: ['Modulación y montaje', 'Fijaciones y arriostramiento base', 'Perfilería estructural base en trabajo vendido'], disclaimer: 'Placas, aislación, fundaciones, cálculo estructural y terminaciones se cotizan según proyecto.', accent: '#A9A6A4',
  },
  {
    id: 'ampliaciones', category: 'Construcción', title: 'Ampliación residencial', short: 'Ampliación', unit: 'm²', measurement: 'floor', laborMin: 85000, laborMax: 150000, marketMin: 280000, marketMax: 470000,
    description: 'Nuevo recinto o crecimiento de vivienda calculado por la superficie de planta.', defaultValues: { length: 5, width: 4, height: 2.4, quantity: 1 }, icon: Building2,
    includes: ['Montaje y ejecución de partidas acordadas', 'Coordinación con la vivienda existente', 'Materiales base del nivel elegido en trabajo vendido'], disclaimer: 'Fundaciones, instalaciones, permisos, empalmes y terminaciones especiales pueden modificar el rango.', accent: FABRICK_PALETTE.oak,
  },
  {
    id: 'kit-basico', category: 'Construcción', title: 'Kit prefabricado básico', short: 'Kit básico', unit: 'm²', measurement: 'floor', laborMin: 55000, laborMax: 85000, marketMin: 160000, marketMax: 230000,
    description: 'Estructura y cubierta para comenzar una vivienda por etapas.', defaultValues: { length: 6, width: 6, height: 2.4, quantity: 1 }, icon: Home,
    includes: ['Mano de obra: montaje referencial del kit', 'Paneles forrados por una cara en trabajo vendido', 'Cerchas, cubierta y costaneras estándar en trabajo vendido'], disclaimer: 'No incluye radier, traslado, puertas, ventanas ni instalaciones salvo propuesta expresa.', accent: FABRICK_PALETTE.oakLight,
  },
  {
    id: 'kit-avanzado', category: 'Construcción', title: 'Kit prefabricado avanzado', short: 'Kit avanzado', unit: 'm²', measurement: 'floor', laborMin: 70000, laborMax: 105000, marketMin: 260000, marketMax: 390000,
    description: 'Kit con mayor nivel de avance para reducir trabajos posteriores.', defaultValues: { length: 9, width: 6, height: 2.4, quantity: 1 }, icon: Home,
    includes: ['Mano de obra de montaje', 'Estructura, cubierta y envolvente base', 'Puertas, ventanas y partidas interiores según propuesta'], disclaimer: 'No incluye fundaciones, fosa, conexiones exteriores, pisos ni pintura salvo que se indique.', accent: '#D4B596',
  },
  {
    id: 'llave-mano', category: 'Construcción', title: 'Casa llave en mano estándar', short: 'Llave en mano', unit: 'm²', measurement: 'floor', laborMin: 180000, laborMax: 280000, marketMin: 520000, marketMax: 720000,
    description: 'Vivienda terminada con estándar acordado y redes interiores coordinadas.', defaultValues: { length: 9, width: 8, height: 2.4, quantity: 1 }, icon: Home,
    includes: ['Mano de obra global de ejecución', 'Estructura y envolvente en trabajo vendido', 'Terminaciones y redes interiores estándar según propuesta'], disclaimer: 'Terreno, permisos, empalmes, fosa, pozo y obras especiales se revisan por separado.', accent: FABRICK_PALETTE.pearl,
  },
  {
    id: 'techumbre', category: 'Construcción', title: 'Techumbre nueva o renovación', short: 'Techumbre', unit: 'm²', measurement: 'floor', laborMin: 12000, laborMax: 24000, marketMin: 25000, marketMax: 58000,
    description: 'Cubierta, fijaciones, sellos y remates calculados por superficie.', defaultValues: { length: 9, width: 5, height: 2.4, quantity: 1 }, icon: HousePlug,
    includes: ['Retiro o preparación simple según alcance', 'Montaje y remates básicos', 'Cubierta y fijaciones estándar en trabajo vendido'], disclaimer: 'Daños estructurales, aislación, canaletas, altura y acceso especial se cotizan aparte.', accent: '#C29A78',
  },
  {
    id: 'gasfiteria', category: 'Instalaciones', title: 'Gasfitería y redes sanitarias', short: 'Gasfitería', unit: 'ml', measurement: 'linear', laborMin: 14000, laborMax: 28000, marketMin: 28000, marketMax: 55000,
    description: 'Trazado, renovación o reparación de redes de agua y desagüe por longitud.', defaultValues: { length: 5, width: 1, height: 1, quantity: 1 }, icon: Wrench,
    includes: ['Trazado y montaje de la red definida', 'Prueba básica de funcionamiento', 'Tuberías y accesorios estándar en trabajo vendido'], disclaimer: 'Artefactos, urgencias, picado, trazados ocultos y reposición de terminaciones se revisan aparte.', accent: '#AFC8D0',
  },
  {
    id: 'electricidad', category: 'Instalaciones', title: 'Instalación eléctrica', short: 'Electricidad', unit: 'punto', measurement: 'count', laborMin: 15000, laborMax: 28000, marketMin: 28000, marketMax: 55000,
    description: 'Puntos, canalización e iluminación para habilitar o actualizar espacios.', defaultValues: { length: 1, width: 1, height: 1, quantity: 8 }, icon: Lightbulb,
    includes: ['Instalación y conexión del punto', 'Prueba básica', 'Caja, cableado y mecanismo estándar en trabajo vendido'], disclaimer: 'Tableros, recorridos largos, certificación, muros complejos y aumento de carga cambian el valor.', accent: '#D6C4A8',
  },
  {
    id: 'bano', category: 'Instalaciones', title: 'Instalación o renovación de baño', short: 'Baño', unit: 'unidad', measurement: 'count', laborMin: 320000, laborMax: 650000, marketMin: 700000, marketMax: 1600000,
    description: 'Renovación de baño según artefactos, conexiones y nivel de terminación.', defaultValues: { length: 1, width: 1, height: 1, quantity: 1 }, icon: Bath,
    includes: ['Mano de obra de montaje y terminación', 'Conexiones básicas acordadas', 'Materiales base del alcance en trabajo vendido'], disclaimer: 'Demolición mayor, porcelanatos premium, muebles y cambios importantes de redes se revisan en visita.', accent: '#B8C8C9',
  },
  {
    id: 'fosa', category: 'Instalaciones', title: 'Instalación de fosa séptica', short: 'Fosa séptica', unit: 'unidad', measurement: 'count', laborMin: 450000, laborMax: 850000, marketMin: 1200000, marketMax: 2600000,
    description: 'Solución sanitaria según capacidad, terreno, excavación y factibilidad.', defaultValues: { length: 1, width: 1, height: 1, quantity: 1 }, icon: Bath,
    includes: ['Mano de obra de excavación y montaje estándar', 'Conexión sanitaria definida', 'Sistema e insumos base en trabajo vendido'], disclaimer: 'Permisos, estudio de suelo, pozo absorbente y excavaciones complejas se cotizan aparte.', accent: '#9EB3B7',
  },
  {
    id: 'revestimiento', category: 'Terminaciones', title: 'Revestimiento y aislación', short: 'Revestimiento', unit: 'm²', measurement: 'wall', laborMin: 12000, laborMax: 24000, marketMin: 26000, marketMax: 52000,
    description: 'Protección y terminación de muro o fachada calculada por superficie.', defaultValues: { length: 6, width: 3, height: 2.4, quantity: 1 }, icon: PaintRoller,
    includes: ['Preparación básica de la base', 'Cortes y remates estándar', 'Revestimiento/perfilería base en trabajo vendido'], disclaimer: 'Humedad, retiro, aislación especial, altura y reparación de base pueden modificar el rango.', accent: '#D7C3AF',
  },
  {
    id: 'terminaciones', category: 'Terminaciones', title: 'Terminaciones integrales', short: 'Terminaciones', unit: 'm²', measurement: 'floor', laborMin: 14000, laborMax: 27000, marketMin: 28000, marketMax: 56000,
    description: 'Preparación, revestimientos, pisos y remates de un espacio.', defaultValues: { length: 6, width: 5, height: 2.4, quantity: 1 }, icon: Sparkles,
    includes: ['Preparación básica', 'Aplicación y remates', 'Materiales base del nivel elegido en trabajo vendido'], disclaimer: 'Humedad, planeidad, material elegido y nivel de detalle determinan el precio final.', accent: FABRICK_PALETTE.pearl,
  },
  {
    id: 'pintura', category: 'Terminaciones', title: 'Pintura profesional', short: 'Pintura', unit: 'm²', measurement: 'room-walls', laborMin: 3500, laborMax: 6500, marketMin: 6000, marketMax: 11000,
    description: 'Pintura interior calculada sobre la superficie real de muros.', defaultValues: { length: 5, width: 4, height: 2.4, quantity: 1 }, icon: PaintRoller,
    includes: ['Protección de áreas cercanas', 'Preparación básica y aplicación', 'Pintura e insumos estándar en trabajo vendido'], disclaimer: 'Reparaciones, humedad, cielos, fachadas y pinturas especiales se ajustan después de revisar el lugar.', accent: FABRICK_PALETTE.pearl,
  },
  {
    id: 'ceramica', category: 'Terminaciones', title: 'Instalación de cerámica', short: 'Cerámica', unit: 'm²', measurement: 'floor', laborMin: 10000, laborMax: 18000, marketMin: 22000, marketMax: 38000,
    description: 'Trazado, nivelación, adhesivo, fragüe y terminación por superficie.', defaultValues: { length: 5, width: 4, height: 2.4, quantity: 1 }, icon: Layers3,
    includes: ['Trazado y colocación', 'Cortes y remates simples', 'Adhesivo y fragüe estándar en trabajo vendido'], disclaimer: 'El trabajo vendido no incluye la cerámica elegida, retiro ni reparación mayor de la base salvo propuesta.', accent: '#D9CEC4',
  },
  {
    id: 'laminado', category: 'Terminaciones', title: 'Piso laminado o flotante', short: 'Piso laminado', unit: 'm²', measurement: 'floor', laborMin: 4500, laborMax: 8000, marketMin: 9000, marketMax: 16000,
    description: 'Instalación de piso, manta y encuentros básicos por superficie.', defaultValues: { length: 5, width: 5, height: 2.4, quantity: 1 }, icon: Layers3,
    includes: ['Armado, cortes y encuentros', 'Limpieza del área intervenida', 'Manta e insumos básicos en trabajo vendido'], disclaimer: 'El trabajo vendido no incluye piso, guardapolvos, nivelación, retiro ni reparación de humedad.', accent: '#C6A886',
  },
  {
    id: 'aire', category: 'Climatización', title: 'Instalación de aire acondicionado split', short: 'Aire acondicionado', unit: 'unidad', measurement: 'count', laborMin: 80000, laborMax: 150000, marketMin: 120000, marketMax: 220000,
    description: 'Montaje y conexión estándar de un equipo split.', defaultValues: { length: 1, width: 1, height: 1, quantity: 1 }, icon: AirVent,
    includes: ['Montaje de unidades interior y exterior', 'Vacío y prueba de funcionamiento', 'Insumos de instalación estándar en trabajo vendido'], disclaimer: 'No incluye el equipo. Metros extra, altura, canaletas especiales y adecuación eléctrica se cotizan aparte.', accent: '#B8C8D0',
  },
  {
    id: 'pellet', category: 'Climatización', title: 'Instalación de estufa a pellet', short: 'Estufa a pellet', unit: 'unidad', measurement: 'count', laborMin: 70000, laborMax: 140000, marketMin: 110000, marketMax: 220000,
    description: 'Montaje, salida de gases, sellos y puesta en marcha básica.', defaultValues: { length: 1, width: 1, height: 1, quantity: 1 }, icon: Flame,
    includes: ['Definición de ubicación', 'Montaje y prueba inicial', 'Sellos e insumos base en trabajo vendido'], disclaimer: 'No incluye la estufa. Ductos especiales, perforaciones y protecciones se revisan según el lugar.', accent: '#C28E69',
  },
  {
    id: 'seguridad', category: 'Exterior', title: 'Seguridad residencial', short: 'Seguridad', unit: 'unidad', measurement: 'count', laborMin: 80000, laborMax: 160000, marketMin: 180000, marketMax: 480000,
    description: 'Sistema base de cámaras, sensores o control de acceso según cobertura.', defaultValues: { length: 1, width: 1, height: 1, quantity: 1 }, icon: ShieldCheck,
    includes: ['Montaje y configuración', 'Pruebas iniciales', 'Equipamiento base acordado en trabajo vendido'], disclaimer: 'Cantidad/calidad de equipos, cableado extendido, almacenamiento y monitoreo pueden cambiar el valor.', accent: '#A8B7AA',
  },
  {
    id: 'cierre', category: 'Exterior', title: 'Cierre perimetral', short: 'Cierre perimetral', unit: 'ml', measurement: 'linear', laborMin: 16000, laborMax: 32000, marketMin: 36000, marketMax: 72000,
    description: 'Cierre calculado por metros lineales según material, altura y terreno.', defaultValues: { length: 20, width: 1, height: 1.8, quantity: 1 }, icon: Fence,
    includes: ['Trazado y montaje', 'Aplome y fijación', 'Postes y cierre base en trabajo vendido'], disclaimer: 'Portones, desniveles, roca, retiro y mejoramiento de terreno se cotizan aparte.', accent: '#9DA487',
  },
  {
    id: 'carpinteria', category: 'Carpintería', title: 'Carpintería y muebles a medida', short: 'Carpintería', unit: 'ml', measurement: 'linear', laborMin: 85000, laborMax: 170000, marketMin: 210000, marketMax: 460000,
    description: 'Diseño, fabricación e instalación según longitud, material y herrajes.', defaultValues: { length: 3, width: 0.6, height: 2.2, quantity: 1 }, icon: DoorOpen,
    includes: ['Levantamiento y fabricación', 'Instalación y ajustes', 'Tableros/herrajes estándar en trabajo vendido'], disclaimer: 'Cubiertas, herrajes premium, electrodomésticos y modificaciones de redes se cotizan aparte.', accent: FABRICK_PALETTE.oak,
  },
];

export function getServicePriceRange(service: BudgetService, mode: PriceMode) {
  return mode === 'labor'
    ? { min: service.laborMin, max: service.laborMax, label: 'Mano de obra', shortLabel: 'Mano de obra' }
    : { min: service.marketMin, max: service.marketMax, label: 'Trabajo vendido', shortLabel: 'Completo' };
}

export function priceModeDescription(mode: PriceMode) {
  return mode === 'labor'
    ? 'Solo ejecución o instalación. Materiales principales se cotizan aparte.'
    : 'Ejecución + materiales o insumos base descritos en el alcance. Revisa las exclusiones.';
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number(value) || 0));
const clean = (value: number, fallback = 0.1) => Math.max(fallback, Number(value) || 0);
const compact = (value: number) => new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(value);

export function calculateServiceMeasurement(service: BudgetService, values: MeasurementValues): MeasurementResult {
  const length = clean(values.length);
  const width = clean(values.width);
  const height = clean(values.height);
  const quantity = Math.max(1, Math.round(values.quantity || 1));

  switch (service.measurement) {
    case 'wall': {
      const area = length * height;
      return { quantity: area, priceFactor: 1, formula: 'Largo × alto', detail: `${compact(length)} m × ${compact(height)} m`, secondary: `${compact(area)} m² de muro` };
    }
    case 'room-walls': {
      const perimeter = 2 * (length + width);
      const area = perimeter * height;
      return { quantity: area, priceFactor: 1, formula: '2 × (largo + ancho) × alto', detail: `Perímetro ${compact(perimeter)} m × ${compact(height)} m`, secondary: `${compact(area)} m² de muros interiores` };
    }
    case 'slab': {
      const area = length * width;
      const volume = area * height;
      const factor = clamp(height / 0.1, 0.75, 2.5);
      return { quantity: area, priceFactor: factor, formula: 'Largo × ancho; ajuste por espesor', detail: `${compact(length)} m × ${compact(width)} m × ${compact(height)} m`, secondary: `${compact(area)} m² · ${compact(volume)} m³ de hormigón` };
    }
    case 'volume': {
      const volume = length * width * height;
      return { quantity: volume, priceFactor: 1, formula: 'Largo × ancho × alto', detail: `${compact(length)} m × ${compact(width)} m × ${compact(height)} m`, secondary: `${compact(volume)} m³` };
    }
    case 'linear':
      return { quantity: length, priceFactor: 1, formula: 'Largo total', detail: `${compact(length)} metros lineales`, secondary: service.id === 'cierre' ? `Altura referencial: ${compact(height)} m` : undefined };
    case 'count':
      return { quantity, priceFactor: 1, formula: 'Cantidad × tarifa por unidad', detail: `${quantity} ${service.unit === 'punto' ? 'puntos' : 'unidades'}` };
    case 'floor':
    default: {
      const area = length * width;
      return { quantity: area, priceFactor: 1, formula: 'Largo × ancho', detail: `${compact(length)} m × ${compact(width)} m`, secondary: `${compact(area)} m² de superficie` };
    }
  }
}

export function resolveServiceId(value: string | null | undefined) {
  if (!value) return BUDGET_SERVICES[0].id;
  const cleanValue = value.trim().toLowerCase();
  const candidate = SERVICE_QUERY_ALIASES[cleanValue] || cleanValue;
  return BUDGET_SERVICES.some((service) => service.id === candidate) ? candidate : BUDGET_SERVICES[0].id;
}

export function getBudgetService(id: string | null | undefined) {
  const resolved = resolveServiceId(id);
  return BUDGET_SERVICES.find((service) => service.id === resolved) || BUDGET_SERVICES[0];
}
