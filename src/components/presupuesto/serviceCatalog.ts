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
  marketMin: number;
  marketMax: number;
  defaultValues: MeasurementValues;
  icon: LucideIcon;
  includes: string[];
  disclaimer: string;
  accent: string;
};

/**
 * Rangos referenciales del mercado chileno (mano de obra + materiales básicos),
 * actualizados a Q2 2026 según fuentes públicas (MINVU/DITEC tabla de costos
 * unitarios, APU CDT-AOA 2026 y referencias comerciales de la Región del Maule /
 * Santiago). Son referencias comerciales, no presupuestos vinculantes.
 */

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

export const BUDGET_SERVICES: BudgetService[] = [
  {
    id: 'albanileria', category: 'Obra base', title: 'Albañilería y obra gruesa', short: 'Albañilería', unit: 'm²', measurement: 'wall', marketMin: 48000, marketMax: 105000,
    description: 'Muros, sobrepisos, enchapes y reparaciones de obra húmeda medidos según la superficie real a intervenir.', defaultValues: { length: 5, width: 4, height: 2.4, quantity: 1 }, icon: Hammer,
    includes: ['Preparación básica del área', 'Mano de obra y materiales según alcance', 'Remates estándar del sector intervenido'], disclaimer: 'Demoliciones, refuerzos, humedad, retiro de escombros y terminaciones especiales se validan en terreno.', accent: FABRICK_PALETTE.oak,
  },
  {
    id: 'cimientos', category: 'Obra base', title: 'Cimientos y fundaciones', short: 'Fundaciones', unit: 'm³', measurement: 'volume', marketMin: 155000, marketMax: 285000,
    description: 'Excavación, armaduras, moldajes y hormigón calculados por largo, ancho y profundidad.', defaultValues: { length: 6, width: 0.4, height: 0.5, quantity: 1 }, icon: Layers3,
    includes: ['Trazado y preparación básica', 'Hormigón y armaduras según propuesta', 'Nivelación y coordinación de apoyos'], disclaimer: 'El suelo, profundidad, bombeo, refuerzos, retiro de material y acceso pueden modificar el cálculo.', accent: '#9A765A',
  },
  {
    id: 'radier', category: 'Obra base', title: 'Radier de hormigón', short: 'Radier', unit: 'm²', measurement: 'slab', marketMin: 42000, marketMax: 78000,
    description: 'Base para vivienda, ampliación, terraza o bodega calculada por superficie y ajustada por espesor.', defaultValues: { length: 6, width: 6, height: 0.1, quantity: 1 }, icon: Blocks,
    includes: ['Preparación y nivelación básica', 'Refuerzo según propuesta', 'Hormigón, afinado y juntas simples'], disclaimer: 'Terreno, malla, pendientes, resistencia, accesos y transporte se revisan antes de confirmar.', accent: '#A98263',
  },
  {
    id: 'metalcon', category: 'Construcción', title: 'Estructura Metalcon', short: 'Metalcon', unit: 'm²', measurement: 'wall', marketMin: 50000, marketMax: 95000,
    description: 'Muros y estructuras livianas medidos por el largo y la altura de la superficie estructural.', defaultValues: { length: 6, width: 4, height: 2.4, quantity: 1 }, icon: PanelsTopLeft,
    includes: ['Modulación y estructura principal', 'Fijaciones y arriostramiento básico', 'Preparación de vanos según propuesta'], disclaimer: 'Placas, aislación, fundaciones, cálculo estructural y terminaciones se cotizan según el proyecto.', accent: '#A9A6A4',
  },
  {
    id: 'ampliaciones', category: 'Construcción', title: 'Ampliación residencial', short: 'Ampliación', unit: 'm²', measurement: 'floor', marketMin: 140000, marketMax: 350000,
    description: 'Nuevo recinto o crecimiento de vivienda calculado por el largo y ancho de la planta.', defaultValues: { length: 5, width: 4, height: 2.4, quantity: 1 }, icon: Building2,
    includes: ['Estructura y envolvente según nivel', 'Coordinación con la vivienda existente', 'Partidas definidas antes de ejecutar'], disclaimer: 'Fundaciones, instalaciones, permisos, empalmes y terminaciones pueden variar el valor final.', accent: FABRICK_PALETTE.oak,
  },
  {
    id: 'kit-basico', category: 'Construcción', title: 'Kit prefabricado básico', short: 'Kit básico', unit: 'm²', measurement: 'floor', marketMin: 170000, marketMax: 250000,
    description: 'Estructura y cubierta para comenzar una vivienda por etapas, calculadas por superficie de planta.', defaultValues: { length: 6, width: 6, height: 2.4, quantity: 1 }, icon: Home,
    includes: ['Paneles forrados por una cara', 'Cerchas en madera o Metalcon', 'Cubierta y costaneras estándar'], disclaimer: 'No incluye radier, montaje, traslado, puertas, ventanas ni instalaciones.', accent: FABRICK_PALETTE.oakLight,
  },
  {
    id: 'kit-avanzado', category: 'Construcción', title: 'Kit prefabricado avanzado', short: 'Kit avanzado', unit: 'm²', measurement: 'floor', marketMin: 340000, marketMax: 500000,
    description: 'Kit con mayor nivel de avance para reducir trabajos posteriores, calculado por superficie de planta.', defaultValues: { length: 9, width: 6, height: 2.4, quantity: 1 }, icon: Home,
    includes: ['Estructura y cubierta', 'Puertas, ventanas y forro interior', 'Cielos y puntos eléctricos referenciales'], disclaimer: 'No incluye fundaciones, fosa, conexiones exteriores, pisos ni pintura salvo propuesta expresa.', accent: '#D4B596',
  },
  {
    id: 'llave-mano', category: 'Construcción', title: 'Casa llave en mano estándar', short: 'Llave en mano', unit: 'm²', measurement: 'floor', marketMin: 580000, marketMax: 860000,
    description: 'Vivienda terminada con estándar acordado y redes interiores coordinadas, calculada por superficie construida.', defaultValues: { length: 9, width: 8, height: 2.4, quantity: 1 }, icon: Home,
    includes: ['Estructura y envolvente', 'Terminaciones interiores estándar', 'Redes interiores según propuesta'], disclaimer: 'Terreno, permisos, empalmes, fosa, pozo y obras especiales se revisan por separado.', accent: FABRICK_PALETTE.pearl,
  },
  {
    id: 'techumbre', category: 'Construcción', title: 'Techumbre nueva o renovación', short: 'Techumbre', unit: 'm²', measurement: 'floor', marketMin: 22000, marketMax: 80000,
    description: 'Cubierta, fijaciones, sellos y remates calculados por la superficie proyectada del techo.', defaultValues: { length: 9, width: 5, height: 2.4, quantity: 1 }, icon: HousePlug,
    includes: ['Cubierta y fijaciones estándar', 'Remates básicos', 'Revisión visual de estructura existente'], disclaimer: 'Pendiente, daños estructurales, aislación, canaletas, altura y acceso especial se cotizan aparte.', accent: '#C29A78',
  },
  {
    id: 'gasfiteria', category: 'Instalaciones', title: 'Gasfitería y redes sanitarias', short: 'Gasfitería', unit: 'ml', measurement: 'linear', marketMin: 32000, marketMax: 82000,
    description: 'Trazado, renovación o reparación de redes de agua y desagüe por longitud aproximada.', defaultValues: { length: 5, width: 1, height: 1, quantity: 1 }, icon: Wrench,
    includes: ['Conexiones definidas en alcance', 'Tuberías y accesorios estándar', 'Prueba básica de funcionamiento'], disclaimer: 'Artefactos, urgencias, picado, trazados ocultos y reposición de terminaciones se revisan aparte.', accent: '#AFC8D0',
  },
  {
    id: 'electricidad', category: 'Instalaciones', title: 'Instalación eléctrica', short: 'Electricidad', unit: 'punto', measurement: 'count', marketMin: 38000, marketMax: 95000,
    description: 'Puntos, canalización e iluminación para habilitar o actualizar espacios.', defaultValues: { length: 1, width: 1, height: 1, quantity: 8 }, icon: Lightbulb,
    includes: ['Caja, conexión y mecanismo estándar', 'Canalización corta', 'Prueba básica de operación'], disclaimer: 'Tableros, recorridos largos, certificación, muros complejos y aumento de carga cambian el valor.', accent: '#D6C4A8',
  },
  {
    id: 'bano', category: 'Instalaciones', title: 'Instalación o renovación de baño', short: 'Baño', unit: 'unidad', measurement: 'count', marketMin: 950000, marketMax: 2900000,
    description: 'Artefactos, conexiones y terminaciones coordinadas según el alcance de cada baño.', defaultValues: { length: 1, width: 1, height: 1, quantity: 1 }, icon: Bath,
    includes: ['Revisión de puntos existentes', 'Montaje de partidas acordadas', 'Pruebas básicas de conexión'], disclaimer: 'Demolición, porcelanatos, muebles y cambios mayores de redes se revisan en visita.', accent: '#B8C8C9',
  },
  {
    id: 'fosa', category: 'Instalaciones', title: 'Instalación de fosa séptica', short: 'Fosa séptica', unit: 'unidad', measurement: 'count', marketMin: 1900000, marketMax: 4500000,
    description: 'Solución sanitaria según capacidad, terreno, excavación y factibilidad.', defaultValues: { length: 1, width: 1, height: 1, quantity: 1 }, icon: Bath,
    includes: ['Evaluación inicial de capacidad', 'Instalación del sistema acordado', 'Conexión sanitaria definida'], disclaimer: 'Permisos, estudio de suelo, pozo absorbente y excavaciones complejas se cotizan aparte.', accent: '#9EB3B7',
  },
  {
    id: 'revestimiento', category: 'Terminaciones', title: 'Revestimiento y aislación', short: 'Revestimiento', unit: 'm²', measurement: 'wall', marketMin: 30000, marketMax: 68000,
    description: 'Capas de protección y terminación calculadas por largo y alto del muro o fachada.', defaultValues: { length: 6, width: 3, height: 2.4, quantity: 1 }, icon: PaintRoller,
    includes: ['Evaluación de la base', 'Revestimiento y perfilería definida', 'Cortes y remates estándar'], disclaimer: 'Humedad, retiro, aislación especial, altura y reparación de base pueden modificar el rango.', accent: '#D7C3AF',
  },
  {
    id: 'terminaciones', category: 'Terminaciones', title: 'Terminaciones integrales', short: 'Terminaciones', unit: 'm²', measurement: 'floor', marketMin: 28000, marketMax: 78000,
    description: 'Preparación, revestimientos, pisos y remates calculados sobre la superficie principal del espacio.', defaultValues: { length: 6, width: 5, height: 2.4, quantity: 1 }, icon: Sparkles,
    includes: ['Preparación básica', 'Materiales y aplicación según propuesta', 'Remates visibles del área intervenida'], disclaimer: 'La humedad, planeidad, material elegido y nivel de detalle determinan el precio final.', accent: FABRICK_PALETTE.pearl,
  },
  {
    id: 'pintura', category: 'Terminaciones', title: 'Pintura profesional', short: 'Pintura', unit: 'm²', measurement: 'room-walls', marketMin: 10000, marketMax: 28000,
    description: 'Pintura interior calculada con largo, ancho y alto para estimar la superficie de los muros del recinto.', defaultValues: { length: 5, width: 4, height: 2.4, quantity: 1 }, icon: PaintRoller,
    includes: ['Protección de áreas cercanas', 'Preparación básica', 'Aplicación del sistema definido'], disclaimer: 'Puertas, ventanas, reparaciones, humedad, cielos y pintura especial se ajustan después de revisar el lugar.', accent: FABRICK_PALETTE.pearl,
  },
  {
    id: 'ceramica', category: 'Terminaciones', title: 'Instalación de cerámica', short: 'Cerámica', unit: 'm²', measurement: 'floor', marketMin: 32000, marketMax: 55000,
    description: 'Trazado, adhesivo, nivelación, fragüe y terminación calculados por superficie de piso.', defaultValues: { length: 5, width: 4, height: 2.4, quantity: 1 }, icon: Layers3,
    includes: ['Trazado y nivelación básica', 'Adhesivo y fragüe estándar', 'Cortes y remates simples'], disclaimer: 'No incluye cerámica, retiro ni reparación mayor de la base salvo propuesta.', accent: '#D9CEC4',
  },
  {
    id: 'laminado', category: 'Terminaciones', title: 'Piso laminado o flotante', short: 'Piso laminado', unit: 'm²', measurement: 'floor', marketMin: 12000, marketMax: 28000,
    description: 'Instalación de piso, manta y encuentros básicos calculados por superficie.', defaultValues: { length: 5, width: 5, height: 2.4, quantity: 1 }, icon: Layers3,
    includes: ['Manta y armado de palmetas', 'Cortes y encuentros básicos', 'Limpieza del área intervenida'], disclaimer: 'No incluye piso, guardapolvos, nivelación, retiro ni reparación de humedad.', accent: '#C6A886',
  },
  {
    id: 'aire', category: 'Climatización', title: 'Instalación de aire acondicionado split', short: 'Aire acondicionado', unit: 'unidad', measurement: 'count', marketMin: 260000, marketMax: 390000,
    description: 'Montaje y conexión estándar de equipos split.', defaultValues: { length: 1, width: 1, height: 1, quantity: 1 }, icon: AirVent,
    includes: ['Montaje de unidad interior y exterior', 'Recorrido estándar', 'Prueba básica de funcionamiento'], disclaimer: 'No incluye equipo, metros extra, altura, canaletas adicionales ni adecuación eléctrica.', accent: '#B8C8D0',
  },
  {
    id: 'pellet', category: 'Climatización', title: 'Instalación de estufa a pellet', short: 'Estufa a pellet', unit: 'unidad', measurement: 'count', marketMin: 130000, marketMax: 340000,
    description: 'Ubicación, salida de gases, sellos y puesta en marcha básica.', defaultValues: { length: 1, width: 1, height: 1, quantity: 1 }, icon: Flame,
    includes: ['Definición de ubicación', 'Montaje y sellos básicos', 'Prueba inicial'], disclaimer: 'Equipo, ductos especiales, perforaciones y protecciones se revisan según el lugar.', accent: '#C28E69',
  },
  {
    id: 'seguridad', category: 'Exterior', title: 'Seguridad residencial', short: 'Seguridad', unit: 'unidad', measurement: 'count', marketMin: 300000, marketMax: 1250000,
    description: 'Sistema base de cámaras, sensores o control de acceso según cobertura.', defaultValues: { length: 1, width: 1, height: 1, quantity: 1 }, icon: ShieldCheck,
    includes: ['Definición de zonas', 'Montaje de equipos acordados', 'Configuración inicial'], disclaimer: 'Equipos, cableado extendido, almacenamiento, monitoreo y accesorios cambian el valor.', accent: '#A8B7AA',
  },
  {
    id: 'cierre', category: 'Exterior', title: 'Cierre perimetral', short: 'Cierre perimetral', unit: 'ml', measurement: 'linear', marketMin: 48000, marketMax: 105000,
    description: 'Delimitación calculada por metros lineales según material, altura y terreno.', defaultValues: { length: 20, width: 1, height: 1.8, quantity: 1 }, icon: Fence,
    includes: ['Trazado del tramo', 'Postes y estructura definida', 'Instalación del cierre acordado'], disclaimer: 'Portones, desniveles, roca, retiro y mejoramiento de terreno se cotizan aparte.', accent: '#9DA487',
  },
  {
    id: 'carpinteria', category: 'Carpintería', title: 'Carpintería y muebles a medida', short: 'Carpintería', unit: 'ml', measurement: 'linear', marketMin: 260000, marketMax: 720000,
    description: 'Diseño, fabricación e instalación según longitud, material, profundidad y herrajes.', defaultValues: { length: 3, width: 0.6, height: 2.2, quantity: 1 }, icon: DoorOpen,
    includes: ['Levantamiento de medidas', 'Fabricación según material acordado', 'Instalación y ajustes básicos'], disclaimer: 'Cubiertas, herrajes premium, electrodomésticos y modificaciones de redes se cotizan aparte.', accent: FABRICK_PALETTE.oak,
  },
];

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
