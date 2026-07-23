'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  AirVent,
  ArrowRight,
  Bath,
  Blocks,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  DoorOpen,
  Fence,
  Flame,
  Hammer,
  Home,
  HousePlug,
  Layers3,
  Lightbulb,
  MessageCircle,
  Minus,
  PaintRoller,
  PanelsTopLeft,
  Plus,
  ReceiptText,
  Ruler,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Trash2,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useQuoteCart, type QuoteItem } from '@/context/QuoteCartContext';
import { buildWhatsAppLink } from '@/lib/whatsapp';

type Unit = 'm²' | 'm³' | 'ml' | 'punto' | 'unidad';
type Category = 'Obra base' | 'Construcción' | 'Instalaciones' | 'Terminaciones' | 'Climatización' | 'Exterior' | 'Carpintería';

type BudgetService = {
  id: string;
  category: Category;
  title: string;
  short: string;
  description: string;
  unit: Unit;
  marketMin: number;
  marketMax: number;
  defaultValues: { length: number; width: number; height: number; quantity: number };
  icon: LucideIcon;
  includes: string[];
  disclaimer: string;
  accent: string;
};

const SERVICES: BudgetService[] = [
  {
    id: 'albanileria', category: 'Obra base', title: 'Albañilería y obra gruesa', short: 'Albañilería', unit: 'm²', marketMin: 45000, marketMax: 95000,
    description: 'Muros, sobrepisos, enchapes y reparaciones de obra húmeda calculadas por superficie aproximada.', defaultValues: { length: 5, width: 4, height: 2.4, quantity: 20 }, icon: Hammer,
    includes: ['Preparación básica del área', 'Mano de obra y materiales según alcance', 'Remates estándar del trabajo intervenido'], disclaimer: 'Demoliciones, refuerzos, humedad, escombros y terminaciones especiales se validan en terreno.', accent: '#f59e0b',
  },
  {
    id: 'cimientos', category: 'Obra base', title: 'Cimientos y fundaciones', short: 'Fundaciones', unit: 'm³', marketMin: 145000, marketMax: 260000,
    description: 'Excavación, armaduras, moldajes y hormigón estimados por volumen de fundación.', defaultValues: { length: 6, width: 0.4, height: 0.5, quantity: 1.2 }, icon: Layers3,
    includes: ['Trazado y preparación básica', 'Hormigón y armaduras según propuesta', 'Nivelación y coordinación de apoyos'], disclaimer: 'El suelo, profundidad, bombeo, malla, retiro de material y acceso pueden modificar el cálculo.', accent: '#a16207',
  },
  {
    id: 'radier', category: 'Obra base', title: 'Radier de hormigón', short: 'Radier', unit: 'm²', marketMin: 38000, marketMax: 72000,
    description: 'Base para vivienda, ampliación, terraza o bodega calculada por superficie.', defaultValues: { length: 6, width: 6, height: 0.1, quantity: 36 }, icon: Blocks,
    includes: ['Preparación y nivelación básica', 'Refuerzo según propuesta', 'Hormigón, afinado y juntas simples'], disclaimer: 'Espesor, terreno, malla, pendientes, accesos y transporte se revisan antes de confirmar.', accent: '#b45309',
  },
  {
    id: 'metalcon', category: 'Construcción', title: 'Estructura Metalcon', short: 'Metalcon', unit: 'm²', marketMin: 45000, marketMax: 85000,
    description: 'Muros, ampliaciones y estructuras livianas en perfilería galvanizada.', defaultValues: { length: 6, width: 4, height: 2.4, quantity: 24 }, icon: PanelsTopLeft,
    includes: ['Modulación y estructura principal', 'Fijaciones y arriostramiento básico', 'Preparación de vanos según propuesta'], disclaimer: 'Placas, aislación, fundaciones, cálculo estructural y terminaciones se cotizan según el proyecto.', accent: '#94a3b8',
  },
  {
    id: 'ampliaciones', category: 'Construcción', title: 'Ampliación residencial', short: 'Ampliación', unit: 'm²', marketMin: 130000, marketMax: 320000,
    description: 'Nuevo recinto o crecimiento de vivienda calculado por superficie y nivel de avance.', defaultValues: { length: 5, width: 4, height: 2.4, quantity: 20 }, icon: Building2,
    includes: ['Estructura y envolvente según nivel', 'Coordinación básica con vivienda existente', 'Partidas definidas antes de ejecutar'], disclaimer: 'Fundaciones, instalaciones, permisos, empalmes y terminaciones pueden variar el valor final.', accent: '#f97316',
  },
  {
    id: 'kit-basico', category: 'Construcción', title: 'Kit prefabricado básico', short: 'Kit básico', unit: 'm²', marketMin: 160000, marketMax: 230000,
    description: 'Estructura y cubierta para comenzar una vivienda por etapas.', defaultValues: { length: 6, width: 6, height: 2.4, quantity: 36 }, icon: Home,
    includes: ['Paneles forrados por una cara', 'Cerchas en madera o Metalcon', 'Cubierta y costaneras estándar'], disclaimer: 'No incluye radier, montaje, traslado, puertas, ventanas ni instalaciones.', accent: '#eab308',
  },
  {
    id: 'kit-avanzado', category: 'Construcción', title: 'Kit prefabricado avanzado', short: 'Kit avanzado', unit: 'm²', marketMin: 320000, marketMax: 460000,
    description: 'Kit con mayor nivel de avance para reducir trabajos posteriores.', defaultValues: { length: 9, width: 6, height: 2.4, quantity: 54 }, icon: Home,
    includes: ['Estructura y cubierta', 'Puertas, ventanas y forro interior', 'Cielos y puntos eléctricos referenciales'], disclaimer: 'No incluye fundaciones, fosa, conexiones exteriores, pisos ni pintura salvo propuesta expresa.', accent: '#facc15',
  },
  {
    id: 'llave-mano', category: 'Construcción', title: 'Casa llave en mano estándar', short: 'Llave en mano', unit: 'm²', marketMin: 540000, marketMax: 780000,
    description: 'Vivienda terminada con estándar acordado y redes interiores coordinadas.', defaultValues: { length: 9, width: 8, height: 2.4, quantity: 72 }, icon: Home,
    includes: ['Estructura y envolvente', 'Terminaciones interiores estándar', 'Redes interiores según propuesta'], disclaimer: 'Terreno, permisos, empalmes, fosa, pozo y obras especiales se revisan por separado.', accent: '#fde047',
  },
  {
    id: 'techumbre', category: 'Construcción', title: 'Techumbre nueva o renovación', short: 'Techumbre', unit: 'm²', marketMin: 19990, marketMax: 75000,
    description: 'Cubierta, fijaciones, sellos y remates según el estado de la estructura.', defaultValues: { length: 9, width: 5, height: 2.4, quantity: 45 }, icon: HousePlug,
    includes: ['Cubierta y fijaciones estándar', 'Remates básicos', 'Revisión visual de estructura existente'], disclaimer: 'Daños estructurales, aislación, canaletas, altura y acceso especial se cotizan aparte.', accent: '#fb923c',
  },
  {
    id: 'gasfiteria', category: 'Instalaciones', title: 'Gasfitería y redes sanitarias', short: 'Gasfitería', unit: 'ml', marketMin: 30000, marketMax: 75000,
    description: 'Trazado, renovación o reparación de redes de agua y desagüe por tramo aproximado.', defaultValues: { length: 5, width: 1, height: 1, quantity: 5 }, icon: Wrench,
    includes: ['Conexiones definidas en alcance', 'Tuberías y accesorios estándar', 'Prueba básica de funcionamiento'], disclaimer: 'Artefactos, urgencias, picado, trazados ocultos y reposición de terminaciones se revisan aparte.', accent: '#38bdf8',
  },
  {
    id: 'electricidad', category: 'Instalaciones', title: 'Instalación eléctrica', short: 'Electricidad', unit: 'punto', marketMin: 35000, marketMax: 85000,
    description: 'Puntos, canalización e iluminación para habilitar o actualizar espacios.', defaultValues: { length: 1, width: 1, height: 1, quantity: 8 }, icon: Lightbulb,
    includes: ['Caja, conexión y mecanismo estándar', 'Canalización corta', 'Prueba básica de operación'], disclaimer: 'Tableros, recorridos largos, certificación, muros complejos y aumento de carga cambian el valor.', accent: '#fde047',
  },
  {
    id: 'bano', category: 'Instalaciones', title: 'Instalación o renovación de baño', short: 'Baño', unit: 'unidad', marketMin: 900000, marketMax: 2800000,
    description: 'Artefactos, conexiones y terminaciones coordinadas según alcance.', defaultValues: { length: 1, width: 1, height: 1, quantity: 1 }, icon: Bath,
    includes: ['Revisión de puntos existentes', 'Montaje de partidas acordadas', 'Pruebas básicas de conexión'], disclaimer: 'Demolición, porcelanatos, muebles y cambios mayores de redes se revisan en visita.', accent: '#22d3ee',
  },
  {
    id: 'fosa', category: 'Instalaciones', title: 'Instalación de fosa séptica', short: 'Fosa séptica', unit: 'unidad', marketMin: 1800000, marketMax: 4200000,
    description: 'Solución sanitaria según capacidad, terreno, excavación y factibilidad.', defaultValues: { length: 1, width: 1, height: 1, quantity: 1 }, icon: Bath,
    includes: ['Evaluación inicial de capacidad', 'Instalación del sistema acordado', 'Conexión sanitaria definida'], disclaimer: 'Permisos, estudio de suelo, pozo absorbente y excavaciones complejas se cotizan aparte.', accent: '#0891b2',
  },
  {
    id: 'revestimiento', category: 'Terminaciones', title: 'Revestimiento y aislación', short: 'Revestimiento', unit: 'm²', marketMin: 28000, marketMax: 62000,
    description: 'Capas de protección y terminación para muros interiores o fachadas.', defaultValues: { length: 6, width: 3, height: 2.4, quantity: 18 }, icon: PaintRoller,
    includes: ['Evaluación de la base', 'Revestimiento y perfilería definida', 'Cortes y remates estándar'], disclaimer: 'Humedad, retiro, aislación especial, altura y reparación de base pueden modificar el rango.', accent: '#c084fc',
  },
  {
    id: 'terminaciones', category: 'Terminaciones', title: 'Terminaciones integrales', short: 'Terminaciones', unit: 'm²', marketMin: 25000, marketMax: 70000,
    description: 'Preparación, revestimientos, pisos y remates para dejar el espacio listo.', defaultValues: { length: 6, width: 5, height: 2.4, quantity: 30 }, icon: Sparkles,
    includes: ['Preparación básica', 'Materiales y aplicación según propuesta', 'Remates visibles del área intervenida'], disclaimer: 'La humedad, planeidad, material elegido y nivel de detalle determinan el precio final.', accent: '#f5e7d0',
  },
  {
    id: 'pintura', category: 'Terminaciones', title: 'Pintura profesional', short: 'Pintura', unit: 'm²', marketMin: 9000, marketMax: 26000,
    description: 'Preparación básica y pintura interior o exterior por superficie.', defaultValues: { length: 10, width: 6, height: 2.4, quantity: 60 }, icon: PaintRoller,
    includes: ['Protección de áreas cercanas', 'Preparación básica', 'Aplicación del sistema definido'], disclaimer: 'Reparaciones, humedad, altura, cambio de color fuerte y pintura especial cambian el valor.', accent: '#f8fafc',
  },
  {
    id: 'ceramica', category: 'Terminaciones', title: 'Instalación de cerámica', short: 'Cerámica', unit: 'm²', marketMin: 30000, marketMax: 50000,
    description: 'Trazado, adhesivo, nivelación, fragüe y terminación.', defaultValues: { length: 5, width: 4, height: 2.4, quantity: 20 }, icon: Layers3,
    includes: ['Trazado y nivelación básica', 'Adhesivo y fragüe estándar', 'Cortes y remates simples'], disclaimer: 'No incluye cerámica, retiro ni reparación mayor de la base salvo propuesta.', accent: '#d6d3d1',
  },
  {
    id: 'laminado', category: 'Terminaciones', title: 'Piso laminado o flotante', short: 'Piso laminado', unit: 'm²', marketMin: 10990, marketMax: 25000,
    description: 'Instalación de piso, manta y encuentros básicos.', defaultValues: { length: 5, width: 5, height: 2.4, quantity: 25 }, icon: Layers3,
    includes: ['Manta y armado de palmetas', 'Cortes y encuentros básicos', 'Limpieza de término'], disclaimer: 'Retiro, nivelación mayor, guardapolvos y material se definen según propuesta.', accent: '#a8a29e',
  },
  {
    id: 'aire', category: 'Climatización', title: 'Instalación de aire acondicionado split', short: 'Aire acondicionado', unit: 'unidad', marketMin: 250000, marketMax: 360000,
    description: 'Montaje y conexión estándar de equipos split.', defaultValues: { length: 1, width: 1, height: 1, quantity: 1 }, icon: AirVent,
    includes: ['Montaje de unidad interior y exterior', 'Recorrido estándar', 'Prueba básica de funcionamiento'], disclaimer: 'No incluye equipo, metros extra, altura, canaletas adicionales ni adecuación eléctrica.', accent: '#67e8f9',
  },
  {
    id: 'pellet', category: 'Climatización', title: 'Instalación de estufa a pellet', short: 'Estufa a pellet', unit: 'unidad', marketMin: 120000, marketMax: 320000,
    description: 'Ubicación, salida de gases, sellos y puesta en marcha básica.', defaultValues: { length: 1, width: 1, height: 1, quantity: 1 }, icon: Flame,
    includes: ['Definición de ubicación', 'Montaje y sellos básicos', 'Prueba inicial'], disclaimer: 'Equipo, ductos especiales, perforaciones y protecciones se revisan según el lugar.', accent: '#f97316',
  },
  {
    id: 'seguridad', category: 'Exterior', title: 'Seguridad residencial', short: 'Seguridad', unit: 'unidad', marketMin: 280000, marketMax: 1200000,
    description: 'Sistema base de cámaras, sensores o control de acceso según cobertura.', defaultValues: { length: 1, width: 1, height: 1, quantity: 1 }, icon: ShieldCheck,
    includes: ['Definición de zonas', 'Montaje de equipos acordados', 'Configuración inicial'], disclaimer: 'Equipos, cableado extendido, almacenamiento, monitoreo y accesorios cambian el valor.', accent: '#4ade80',
  },
  {
    id: 'cierre', category: 'Exterior', title: 'Cierre perimetral', short: 'Cierre perimetral', unit: 'ml', marketMin: 45000, marketMax: 95000,
    description: 'Delimitación según material, altura y condiciones del terreno.', defaultValues: { length: 20, width: 1, height: 1.8, quantity: 20 }, icon: Fence,
    includes: ['Trazado del tramo', 'Postes y estructura definida', 'Instalación del cierre acordado'], disclaimer: 'Portones, desniveles, roca, retiro y mejoramiento de terreno se cotizan aparte.', accent: '#84cc16',
  },
  {
    id: 'carpinteria', category: 'Carpintería', title: 'Carpintería y muebles a medida', short: 'Carpintería', unit: 'ml', marketMin: 250000, marketMax: 700000,
    description: 'Diseño, fabricación e instalación según medidas, material y herrajes.', defaultValues: { length: 3, width: 1, height: 2.2, quantity: 3 }, icon: DoorOpen,
    includes: ['Levantamiento de medidas', 'Fabricación según material acordado', 'Instalación y ajustes básicos'], disclaimer: 'Cubiertas, herrajes premium, electrodomésticos y modificaciones de redes se cotizan aparte.', accent: '#d97706',
  },
];

const CATEGORY_ORDER: Category[] = ['Obra base', 'Construcción', 'Instalaciones', 'Terminaciones', 'Climatización', 'Exterior', 'Carpintería'];

const QUERY_ALIASES: Record<string, string> = {
  fundaciones: 'cimientos',
  estructuras: 'metalcon',
  mueble: 'carpinteria',
  enchufe: 'electricidad',
  siding: 'revestimiento',
  'aire-acondicionado': 'aire',
  'casa-llave-en-mano': 'llave-mano',
  remodelacion: 'ampliaciones',
};

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const NUMBER = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
const money = (value: number) => CLP.format(Math.round(value || 0));
const number = (value: number) => NUMBER.format(value || 0);
const average = (service: BudgetService) => Math.round((service.marketMin + service.marketMax) / 2);

function metaNumber(item: QuoteItem, key: string) {
  const value = item.meta?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function metaString(item: QuoteItem, key: string) {
  const value = item.meta?.[key];
  return typeof value === 'string' ? value : '';
}

function lineRange(item: QuoteItem) {
  const savedLow = metaNumber(item, 'marketLow');
  const savedHigh = metaNumber(item, 'marketHigh');
  const unitLow = metaNumber(item, 'marketMinUnit');
  const unitHigh = metaNumber(item, 'marketMaxUnit');
  const fallback = typeof item.refPrice === 'number' ? item.refPrice * item.quantity : 0;
  return {
    low: savedLow || (unitLow ? unitLow * item.quantity : fallback),
    high: savedHigh || (unitHigh ? unitHigh * item.quantity : fallback),
  };
}

function resolveQueryService(value: string | null) {
  if (!value) return SERVICES[0].id;
  const clean = value.trim().toLowerCase();
  const candidate = QUERY_ALIASES[clean] || clean;
  return SERVICES.some((service) => service.id === candidate) ? candidate : SERVICES[0].id;
}

export default function ServiceBudgetShop() {
  const calculatorRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState(SERVICES[0].id);
  const [category, setCategory] = useState<Category>(CATEGORY_ORDER[0]);
  const [length, setLength] = useState(5);
  const [width, setWidth] = useState(4);
  const [height, setHeight] = useState(0.5);
  const [quantity, setQuantity] = useState(1);
  const [customer, setCustomer] = useState({ name: '', place: '', note: '' });
  const [addedId, setAddedId] = useState('');
  const { items, addItem, removeItem, updateQuantity, clear } = useQuoteCart();

  const service = SERVICES.find((item) => item.id === selectedId) || SERVICES[0];
  const Icon = service.icon;
  const serviceItems = items.filter((item) => item.kind === 'service');
  const categoryServices = SERVICES.filter((item) => item.category === category);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = resolveQueryService(params.get('servicio'));
    const next = SERVICES.find((item) => item.id === requested) || SERVICES[0];
    selectService(next, false);
    if (params.get('servicio')) {
      window.setTimeout(() => calculatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 180);
    }
    // La lectura inicial de URL debe ejecutarse una sola vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const measuredQuantity = useMemo(() => {
    if (service.unit === 'm²') return Math.max(0.1, length * width);
    if (service.unit === 'm³') return Math.max(0.1, length * width * height);
    if (service.unit === 'ml') return Math.max(0.1, length);
    return Math.max(1, Math.round(quantity));
  }, [height, length, quantity, service.unit, width]);

  const selectedLow = measuredQuantity * service.marketMin;
  const selectedHigh = measuredQuantity * service.marketMax;
  const selectedAverage = Math.round((selectedLow + selectedHigh) / 2);

  const totals = useMemo(() => serviceItems.reduce((result, item) => {
    const range = lineRange(item);
    return { low: result.low + range.low, high: result.high + range.high };
  }, { low: 0, high: 0 }), [serviceItems]);

  const whatsappMessage = useMemo(() => {
    const details = serviceItems.map((item, index) => {
      const range = lineRange(item);
      return `${index + 1}. ${item.title}\n   ${number(item.quantity)} ${item.unit || 'unidad'} · ${money(range.low)} a ${money(range.high)}`;
    });
    return [
      'Hola Soluciones Fabrick, quiero revisar este carrito de servicios.',
      '',
      'SERVICIOS SELECCIONADOS',
      ...(details.length ? details : ['Sin servicios añadidos todavía.']),
      '',
      `TOTAL APROXIMADO: ${money(totals.low)} a ${money(totals.high)}`,
      `PROMEDIO ORIENTATIVO: ${money(Math.round((totals.low + totals.high) / 2))}`,
      customer.name ? `Nombre: ${customer.name}` : '',
      customer.place ? `Comuna / ubicación: ${customer.place}` : '',
      customer.note ? `Detalle: ${customer.note}` : '',
      '',
      'Entiendo que el valor final se confirma después de revisar medidas, acceso, materiales y alcance real.',
    ].filter(Boolean).join('\n');
  }, [customer, serviceItems, totals]);

  function selectService(next: BudgetService, updateUrl = true) {
    setSelectedId(next.id);
    setCategory(next.category);
    setLength(next.defaultValues.length);
    setWidth(next.defaultValues.width);
    setHeight(next.defaultValues.height);
    setQuantity(next.defaultValues.quantity);
    setAddedId('');
    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set('servicio', next.id);
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      window.requestAnimationFrame(() => calculatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  function addCurrentService() {
    addItem({
      id: `service_${service.id}`,
      kind: 'service',
      title: service.title,
      description: service.description,
      quantity: measuredQuantity,
      unit: service.unit,
      refPrice: average(service),
      notes: 'Cálculo generado en la página de presupuesto',
      meta: {
        serviceId: service.id,
        category: service.category,
        marketMinUnit: service.marketMin,
        marketMaxUnit: service.marketMax,
        marketLow: selectedLow,
        marketHigh: selectedHigh,
        length,
        width,
        height,
      },
    });
    setAddedId(service.id);
  }

  function editCartItem(item: QuoteItem) {
    const id = resolveQueryService(metaString(item, 'serviceId') || item.title);
    const next = SERVICES.find((candidate) => candidate.id === id);
    if (!next) return;
    selectService(next);
    const savedLength = metaNumber(item, 'length');
    const savedWidth = metaNumber(item, 'width');
    const savedHeight = metaNumber(item, 'height');
    if (savedLength) setLength(savedLength);
    if (savedWidth) setWidth(savedWidth);
    if (savedHeight) setHeight(savedHeight);
    if (next.unit === 'unidad' || next.unit === 'punto') setQuantity(item.quantity);
  }

  return (
    <section className="relative isolate overflow-hidden bg-[#080705] px-4 pb-36 pt-24 text-white sm:px-6 sm:pt-28 lg:px-8 lg:pb-24">
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px)] [background-size:52px_52px]" />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_86%_2%,rgba(250,204,21,.17),transparent_29rem),radial-gradient(circle_at_4%_70%,rgba(249,115,22,.11),transparent_32rem),linear-gradient(180deg,#17130d_0%,#080705_48%,#080705_100%)]" />

      <div className="relative mx-auto max-w-[1320px]">
        <header className="grid gap-7 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-yellow-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.24em] text-yellow-200 ring-1 ring-yellow-300/20"><Sparkles className="h-3.5 w-3.5" /> Presupuesto de servicios</p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[.92] tracking-[-.065em] sm:text-6xl lg:text-7xl">Calcula cada trabajo y arma tu proyecto como un carrito.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">Cada especialidad tiene su propia unidad y calculadora. Añade varias soluciones, compara el rango total y envía una solicitud completa por WhatsApp.</p>
          </div>
          <div className="rounded-[2rem] bg-white/[.055] p-5 shadow-[0_22px_70px_rgba(0,0,0,.28)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4"><span className="grid h-12 w-12 place-items-center rounded-full bg-yellow-300 text-black"><ShoppingCart className="h-5 w-5" /></span><span className="rounded-full bg-white/[.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.15em] text-white/56">{serviceItems.length} servicio{serviceItems.length === 1 ? '' : 's'}</span></div>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[.2em] text-yellow-300">Rango actual del carrito</p>
            <p className="mt-2 text-2xl font-black tracking-[-.045em]">{serviceItems.length ? `${money(totals.low)} – ${money(totals.high)}` : 'Aún sin servicios'}</p>
            <p className="mt-2 text-xs leading-5 text-white/45">Los valores son orientativos y se validan antes de comprometer una compra o ejecución.</p>
          </div>
        </header>

        <nav className="mt-10 flex gap-2 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Categorías de servicios">
          {CATEGORY_ORDER.map((item) => {
            const active = category === item;
            return <button key={item} type="button" onClick={() => setCategory(item)} className={active ? 'shrink-0 rounded-full bg-yellow-300 px-5 py-3 text-xs font-black text-black shadow-[0_10px_30px_rgba(250,204,21,.17)]' : 'shrink-0 rounded-full bg-white/[.055] px-5 py-3 text-xs font-black text-white/58 transition hover:bg-white/[.1] hover:text-white'}>{item}</button>;
          })}
        </nav>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categoryServices.map((item) => {
            const ServiceIcon = item.icon;
            const selected = item.id === selectedId;
            const inCart = serviceItems.some((line) => metaString(line, 'serviceId') === item.id || line.id === `service_${item.id}`);
            const style = { '--service-accent': item.accent } as CSSProperties;
            return (
              <button key={item.id} type="button" onClick={() => selectService(item)} style={style} className={`group min-h-[215px] rounded-[1.6rem] p-5 text-left shadow-[0_18px_55px_rgba(0,0,0,.18)] transition duration-300 ${selected ? 'scale-[1.015] bg-white text-black' : 'bg-white/[.055] text-white hover:-translate-y-1 hover:bg-white/[.085]'}`}>
                <div className="flex items-start justify-between gap-3"><span className={`grid h-12 w-12 place-items-center rounded-full ${selected ? 'bg-black text-yellow-300' : 'bg-[var(--service-accent)] text-black'}`}><ServiceIcon className="h-5 w-5" /></span>{inCart ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] text-emerald-500"><Check className="h-3 w-3" /> En carrito</span> : <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] ${selected ? 'bg-black/7 text-black/50' : 'bg-white/[.06] text-white/45'}`}>{item.unit}</span>}</div>
                <h2 className="mt-5 text-lg font-black tracking-[-.035em]">{item.short}</h2>
                <p className={`mt-2 line-clamp-2 text-xs leading-5 ${selected ? 'text-black/58' : 'text-white/48'}`}>{item.description}</p>
                <div className={`mt-4 flex items-end justify-between gap-3 border-t pt-3 ${selected ? 'border-black/10' : 'border-white/10'}`}><span className={`text-[9px] font-black uppercase tracking-[.15em] ${selected ? 'text-black/42' : 'text-white/35'}`}>Mercado por {item.unit}</span><b className={selected ? 'text-black' : 'text-yellow-200'}>{money(item.marketMin)}–{money(item.marketMax)}</b></div>
              </button>
            );
          })}
        </div>

        <div ref={calculatorRef} className="mt-10 scroll-mt-24 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
          <div className="overflow-hidden rounded-[2.2rem] bg-white text-[#17120c] shadow-[0_34px_100px_rgba(0,0,0,.34)]">
            <div className="bg-[linear-gradient(135deg,#fff8e8,#f4e4c5)] p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.23em] text-orange-700">Calculadora independiente</p><h2 className="mt-2 text-3xl font-black tracking-[-.05em] sm:text-4xl">{service.title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#71604b]">{service.description}</p></div><span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#17120c] text-yellow-300"><Icon className="h-6 w-6" /></span></div>
            </div>

            <div className="grid gap-6 p-5 sm:p-7 xl:grid-cols-[1fr_.82fr]">
              <div>
                <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-yellow-300"><Ruler className="h-4 w-4" /></span><div><p className="text-sm font-black">Ingresa las medidas</p><p className="mt-1 text-xs text-[#8a755b]">La unidad cambia automáticamente según el servicio.</p></div></div>

                {(service.unit === 'm²' || service.unit === 'm³') && <div className="mt-6 grid gap-4 sm:grid-cols-2"><NumberField label="Largo" value={length} onChange={setLength} suffix="m" /><NumberField label="Ancho" value={width} onChange={setWidth} suffix="m" />{service.unit === 'm³' && <NumberField label="Profundidad / alto" value={height} onChange={setHeight} suffix="m" />}</div>}
                {service.unit === 'ml' && <div className="mt-6"><NumberField label="Metros lineales" value={length} onChange={setLength} suffix="ml" /></div>}
                {(service.unit === 'punto' || service.unit === 'unidad') && <div className="mt-6"><QuantityField value={quantity} onChange={setQuantity} suffix={service.unit === 'punto' ? 'puntos' : 'unidades'} /></div>}

                <div className="mt-6 rounded-[1.5rem] bg-[#17120c] p-5 text-white"><div className="flex items-center justify-between gap-4"><span className="text-xs text-white/50">Cantidad calculada</span><b className="text-xl text-yellow-200">{number(measuredQuantity)} {service.unit}</b></div><div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4"><div><span className="text-[9px] font-black uppercase tracking-[.15em] text-white/35">Desde</span><strong className="mt-1 block text-lg">{money(selectedLow)}</strong></div><div><span className="text-[9px] font-black uppercase tracking-[.15em] text-yellow-300">Hasta</span><strong className="mt-1 block text-lg text-yellow-100">{money(selectedHigh)}</strong></div></div><div className="mt-4 flex items-center justify-between rounded-xl bg-white/[.055] px-3 py-2.5 text-xs"><span className="text-white/50">Promedio orientativo</span><b>{money(selectedAverage)}</b></div></div>

                <button type="button" onClick={addCurrentService} className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,#facc15,#fb923c)] px-5 text-sm font-black text-black transition hover:brightness-110"><Plus className="h-4 w-4" /> {addedId === service.id ? 'Servicio actualizado en el carrito' : 'Añadir cálculo al carrito'}</button>
              </div>

              <aside className="rounded-[1.6rem] bg-[#faf5eb] p-5">
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-700">Qué considera</p>
                <ul className="mt-4 grid gap-3">{service.includes.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-[#5f4d38]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />{item}</li>)}</ul>
                <div className="mt-5 rounded-[1.25rem] bg-orange-100/70 p-4"><p className="text-[10px] font-black uppercase tracking-[.16em] text-orange-800">Antes de confirmar</p><p className="mt-2 text-xs leading-5 text-[#735236]">{service.disclaimer}</p></div>
              </aside>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24">
            <article className="overflow-hidden rounded-[2rem] bg-[#fff3d8] text-[#17120c] shadow-[0_30px_85px_rgba(0,0,0,.35)]">
              <div className="flex items-start justify-between gap-4 bg-[#17120c] p-5 text-white"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-yellow-300">Carrito del proyecto</p><h2 className="mt-2 text-2xl font-black">Tus servicios</h2></div><span className="grid h-12 w-12 place-items-center rounded-full bg-yellow-300 text-black"><ReceiptText className="h-5 w-5" /></span></div>

              <div className="p-5">
                {serviceItems.length ? <div className="grid gap-3">{serviceItems.map((item) => { const range = lineRange(item); return <div key={item.id} className="rounded-[1.3rem] bg-white/70 p-4 shadow-[0_8px_24px_rgba(64,42,17,.06)]"><div className="flex items-start justify-between gap-3"><div><p className="font-black leading-5">{item.title}</p><p className="mt-1 text-[11px] text-[#79664e]">{number(item.quantity)} {item.unit}</p></div><button type="button" onClick={() => removeItem(item.id)} aria-label={`Quitar ${item.title}`} className="grid h-8 w-8 place-items-center rounded-full text-[#806a4e] transition hover:bg-red-100 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></div><div className="mt-3 flex items-end justify-between gap-3 border-t border-black/8 pt-3"><div><span className="text-[9px] font-black uppercase tracking-[.13em] text-[#927b5d]">Rango</span><b className="mt-1 block text-xs">{money(range.low)}–{money(range.high)}</b></div><button type="button" onClick={() => editCartItem(item)} className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[.13em] text-orange-700">Editar <ChevronRight className="h-3.5 w-3.5" /></button></div>{(item.unit === 'unidad' || item.unit === 'punto') && <div className="mt-3 flex items-center justify-between rounded-full bg-[#f4e6c9] p-1"><button type="button" onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))} className="grid h-8 w-8 place-items-center rounded-full bg-white"><Minus className="h-3.5 w-3.5" /></button><b className="text-xs">{number(item.quantity)}</b><button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="grid h-8 w-8 place-items-center rounded-full bg-[#17120c] text-yellow-300"><Plus className="h-3.5 w-3.5" /></button></div>}</div>; })}</div> : <div className="rounded-[1.5rem] bg-white/55 p-6 text-center"><ShoppingCart className="mx-auto h-8 w-8 text-[#a58b66]" /><p className="mt-3 font-black">Tu carrito está vacío</p><p className="mt-2 text-xs leading-5 text-[#806e57]">Selecciona un servicio, calcula sus medidas y añádelo aquí.</p></div>}

                <div className="my-5 border-t border-dashed border-black/18" />
                <TotalRow label="Total desde" value={money(totals.low)} /><TotalRow label="Total hasta" value={money(totals.high)} /><TotalRow label="Promedio orientativo" value={money(Math.round((totals.low + totals.high) / 2))} strong />

                {serviceItems.length > 0 && <button type="button" onClick={clear} className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-[#8d7657] transition hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /> Vaciar carrito</button>}
              </div>
            </article>

            <div className="mt-4 rounded-[1.7rem] bg-white/[.055] p-5 backdrop-blur-xl">
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-yellow-300">Datos para solicitar</p>
              <div className="mt-4 grid gap-3"><TextField label="Nombre" value={customer.name} onChange={(value) => setCustomer((current) => ({ ...current, name: value }))} placeholder="Nombre y apellido" /><TextField label="Comuna o ciudad" value={customer.place} onChange={(value) => setCustomer((current) => ({ ...current, place: value }))} placeholder="Ej. Linares" /><label><span className="text-[9px] font-black uppercase tracking-[.14em] text-white/40">Detalle del proyecto</span><textarea value={customer.note} onChange={(event) => setCustomer((current) => ({ ...current, note: event.target.value }))} placeholder="Estado actual, fecha ideal, acceso, fotografías…" className="mt-2 min-h-20 w-full resize-none rounded-xl bg-white/[.055] px-3 py-3 text-xs text-white outline-none ring-1 ring-white/9 placeholder:text-white/25 focus:ring-yellow-300/55" /></label></div>
              <a href={serviceItems.length ? buildWhatsAppLink(whatsappMessage) : undefined} target={serviceItems.length ? '_blank' : undefined} rel={serviceItems.length ? 'noopener noreferrer' : undefined} aria-disabled={!serviceItems.length} className={`mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition ${serviceItems.length ? 'bg-[linear-gradient(90deg,#facc15,#fb923c)] text-black hover:brightness-110' : 'cursor-not-allowed bg-white/[.055] text-white/25'}`}><MessageCircle className="h-4 w-4" /> Enviar carrito por WhatsApp</a>
              <p className="mt-3 text-center text-[10px] leading-5 text-white/35">No se realiza un cobro automático. El equipo valida el alcance y confirma el precio final.</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function NumberField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (value: number) => void; suffix: string }) {
  return <label><span className="text-[10px] font-black uppercase tracking-[.16em] text-[#806e56]">{label}</span><div className="mt-2 flex items-end gap-3 rounded-[1.25rem] bg-[#faf5eb] px-4 py-3 focus-within:ring-2 focus-within:ring-orange-400/35"><input type="number" min="0" step="0.1" inputMode="decimal" value={value || ''} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} className="min-w-0 flex-1 bg-transparent text-3xl font-black tracking-[-.05em] outline-none" /><b className="mb-1 text-xs text-orange-700">{suffix}</b></div></label>;
}

function QuantityField({ value, onChange, suffix }: { value: number; onChange: (value: number) => void; suffix: string }) {
  return <div><span className="text-[10px] font-black uppercase tracking-[.16em] text-[#806e56]">Cantidad</span><div className="mt-2 grid grid-cols-[52px_1fr_52px] items-center gap-2 rounded-[1.25rem] bg-[#faf5eb] p-2"><button type="button" onClick={() => onChange(Math.max(1, value - 1))} className="grid h-12 w-12 place-items-center rounded-full bg-white shadow-sm"><Minus className="h-4 w-4" /></button><div className="text-center"><input type="number" min="1" inputMode="numeric" value={value || ''} onChange={(event) => onChange(Math.max(1, Number(event.target.value) || 1))} className="w-full bg-transparent text-center text-3xl font-black outline-none" /><span className="text-[10px] font-bold uppercase tracking-[.13em] text-orange-700">{suffix}</span></div><button type="button" onClick={() => onChange(value + 1)} className="grid h-12 w-12 place-items-center rounded-full bg-[#17120c] text-yellow-300 shadow-sm"><Plus className="h-4 w-4" /></button></div></div>;
}

function TotalRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`mt-3 flex items-center justify-between gap-4 ${strong ? 'rounded-xl bg-[#17120c] px-3 py-3 text-[#fff3d8]' : 'text-xs'}`}><span className={strong ? 'text-yellow-200' : 'text-[#79664e]'}>{label}</span><b>{value}</b></div>;
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label><span className="text-[9px] font-black uppercase tracking-[.14em] text-white/40">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl bg-white/[.055] px-3 py-3 text-xs text-white outline-none ring-1 ring-white/9 placeholder:text-white/25 focus:ring-yellow-300/55" /></label>;
}
