'use client';

import { type FormEvent, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AirVent,
  ArrowLeft,
  ArrowRight,
  Bath,
  Blocks,
  Check,
  ChevronRight,
  ClipboardList,
  DoorOpen,
  Fence,
  Flame,
  Hammer,
  Home,
  HousePlug,
  Layers3,
  Lightbulb,
  MapPin,
  MessageCircle,
  PaintRoller,
  Plus,
  ReceiptText,
  Ruler,
  ShoppingBag,
  Sparkles,
  Trash2,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useCartContext } from '@/context/CartContext';
import { useQuoteCart } from '@/context/QuoteCartContext';
import { type CatalogProduct, useCatalogProducts } from '@/hooks/useCatalogProducts';
import type { Product as StoreProduct } from '@/hooks/useRealtimeProducts';
import { buildWhatsAppLink } from '@/lib/whatsapp';

type Unit = 'm²' | 'ml' | 'unidad' | 'punto';
type Category = 'Construcción' | 'Terminaciones' | 'Instalaciones' | 'Climatización' | 'Exterior' | 'Mueblería';

type Service = {
  id: string;
  category: Category;
  title: string;
  short: string;
  description: string;
  unit: Unit;
  min: number;
  max: number;
  defaultQuantity: number;
  icon: LucideIcon;
  includes: string[];
  note?: string;
  supportsHeight?: boolean;
};

type QuoteLine = {
  serviceId: string;
  quantity: number;
  dimensions?: { length?: number; width?: number; height?: number; facade?: boolean };
};

const SERVICES: Service[] = [
  { id: 'kit-basico', category: 'Construcción', title: 'Kit prefabricado básico', short: 'Kit básico', description: 'Estructura y cubierta para comenzar una vivienda por etapas.', unit: 'm²', min: 160000, max: 230000, defaultQuantity: 36, icon: Home, includes: ['Paneles forrados por una cara', 'Cerchas en madera o Metalcon', 'Zinc 0,35 mm y costaneras'], note: 'No incluye radier, montaje, traslado, puertas, ventanas ni instalaciones.' },
  { id: 'kit-avanzado', category: 'Construcción', title: 'Kit prefabricado avanzado', short: 'Kit avanzado', description: 'Base más completa para disminuir los trabajos posteriores.', unit: 'm²', min: 320000, max: 460000, defaultQuantity: 54, icon: Home, includes: ['Base del kit básico', 'Ventanas, puertas y forro interior', 'Puntos eléctricos y cielos considerados'], note: 'No incluye fundaciones, fosa, conexiones exteriores, pisos ni pintura.' },
  { id: 'llave-mano', category: 'Construcción', title: 'Casa llave en mano estándar', short: 'Llave en mano', description: 'Vivienda terminada con estándar y redes interiores preparadas.', unit: 'm²', min: 540000, max: 780000, defaultQuantity: 72, icon: Home, includes: ['Base del kit avanzado', 'Pisos y pintura estándar', 'Redes sanitarias y agua listas para conectar'], note: 'No incluye fosa, pozo, empalmes exteriores, permisos ni obras de terreno.' },
  { id: 'radier', category: 'Construcción', title: 'Radier de hormigón', short: 'Radier', description: 'Base nivelada para vivienda, ampliación, terraza o bodega.', unit: 'm²', min: 38000, max: 72000, defaultQuantity: 36, icon: Blocks, includes: ['Preparación y nivelación básica', 'Enfierradura según propuesta', 'Hormigón, afinado y juntas simples'], note: 'El espesor, el terreno, malla y accesos se validan antes de confirmar el valor.' },
  { id: 'techumbre', category: 'Construcción', title: 'Techumbre nueva o renovación', short: 'Techumbre', description: 'Cubierta y remates según el estado de la estructura.', unit: 'm²', min: 19990, max: 75000, defaultQuantity: 45, icon: Hammer, includes: ['Cubierta y fijaciones estándar', 'Remates básicos', 'Revisión visual de estructura existente'], note: 'No incluye reparación estructural oculta, aislación ni acceso especial.' },
  { id: 'montaje-kit', category: 'Construcción', title: 'Instalación de kit prefabricado', short: 'Montaje de kit', description: 'Armado y montaje del kit sobre una base previamente aprobada.', unit: 'm²', min: 65000, max: 120000, defaultQuantity: 54, icon: Hammer, includes: ['Montaje de estructura entregada', 'Fijaciones y aplome básico', 'Armado de cubierta según kit'], note: 'El radier o fundación, traslado y grúa se revisan de forma independiente.' },
  { id: 'ceramica', category: 'Terminaciones', title: 'Instalación de cerámica', short: 'Cerámica', description: 'Trazado, adhesivo, nivelación, fragüe y terminación.', unit: 'm²', min: 30000, max: 50000, defaultQuantity: 20, icon: Layers3, includes: ['Trazado y nivelación base', 'Adhesivo y fragüe estándar', 'Cortes y remates simples'], note: 'No incluye cerámica, retiro ni reparación mayor de la base.' },
  { id: 'laminado', category: 'Terminaciones', title: 'Piso laminado o flotante', short: 'Piso laminado', description: 'Instalación de piso, manta y encuentros básicos.', unit: 'm²', min: 10990, max: 25000, defaultQuantity: 25, icon: Layers3, includes: ['Manta y armado de palmetas', 'Cortes y encuentros básicos', 'Limpieza de término'], note: 'No incluye retiro de piso, nivelación mayor ni zócalos especiales.' },
  { id: 'siding', category: 'Terminaciones', title: 'Revestimiento siding', short: 'Siding', description: 'Fachada protegida y terminada sobre base preparada.', unit: 'm²', min: 25990, max: 65000, defaultQuantity: 30, icon: PaintRoller, includes: ['Evaluación de base', 'Siding y perfilería según propuesta', 'Cortes y remates estándar'], note: 'No incluye reparar humedad, aislación o retiro de revestimiento salvo que se indique.', supportsHeight: true },
  { id: 'pintura', category: 'Terminaciones', title: 'Pintura interior o exterior', short: 'Pintura', description: 'Preparación básica, protección y aplicación del sistema acordado.', unit: 'm²', min: 5000, max: 12000, defaultQuantity: 60, icon: PaintRoller, includes: ['Protección de áreas cercanas', 'Preparación básica', 'Aplicación según sistema definido'], supportsHeight: true },
  { id: 'puerta', category: 'Instalaciones', title: 'Instalación de puerta', short: 'Puerta', description: 'Montaje, nivelación, fijación y ajuste básico.', unit: 'unidad', min: 60000, max: 180000, defaultQuantity: 1, icon: DoorOpen, includes: ['Presentación y nivelación', 'Fijaciones estándar', 'Ajuste de apertura y cierre'] },
  { id: 'bano', category: 'Instalaciones', title: 'Instalación o renovación de baño', short: 'Baño', description: 'Artefactos, conexiones y terminaciones según alcance.', unit: 'unidad', min: 900000, max: 2800000, defaultQuantity: 1, icon: Bath, includes: ['Revisión de puntos existentes', 'Montaje de partidas acordadas', 'Pruebas básicas de conexión'], note: 'Demolición, porcelanatos y cambios de redes se revisan en visita.' },
  { id: 'enchufe', category: 'Instalaciones', title: 'Punto eléctrico o iluminación', short: 'Punto eléctrico', description: 'Canalización corta, caja, cableado y mecanismo estándar.', unit: 'punto', min: 25000, max: 50000, defaultQuantity: 8, icon: Lightbulb, includes: ['Caja, conexión y mecanismo', 'Canalización corta', 'Prueba de funcionamiento'], note: 'Tablero, recorridos largos y certificación se cotizan aparte.' },
  { id: 'gasfiteria', category: 'Instalaciones', title: 'Punto de agua o gasfitería', short: 'Gasfitería', description: 'Extensión corta, conexión, prueba y terminación básica.', unit: 'punto', min: 45000, max: 120000, defaultQuantity: 4, icon: Wrench, includes: ['Conexión definida en alcance', 'Prueba básica', 'Terminación visible estándar'] },
  { id: 'fosa', category: 'Instalaciones', title: 'Instalación de fosa séptica', short: 'Fosa séptica', description: 'Solución sanitaria según capacidad, terreno y factibilidad.', unit: 'unidad', min: 1800000, max: 4200000, defaultQuantity: 1, icon: Bath, includes: ['Evaluación inicial de capacidad', 'Instalación según sistema acordado', 'Conexión sanitaria definida'], note: 'No incluye permisos, estudio de suelo, pozo absorbente ni excavación compleja.' },
  { id: 'aire', category: 'Climatización', title: 'Instalación aire acondicionado split', short: 'Aire acondicionado', description: 'Montaje y conexión estándar de un equipo split.', unit: 'unidad', min: 250000, max: 360000, defaultQuantity: 1, icon: AirVent, includes: ['Montaje de unidades', 'Recorrido estándar de conexión', 'Prueba básica de funcionamiento'], note: 'No incluye equipo, metros extra, altura, canaleta adicional ni obras eléctricas.' },
  { id: 'pellet', category: 'Climatización', title: 'Instalación estufa a pellet', short: 'Estufa a pellet', description: 'Ubicación, salida de gases y puesta en marcha básica.', unit: 'unidad', min: 120000, max: 320000, defaultQuantity: 1, icon: Flame, includes: ['Definición de ubicación', 'Montaje y sellos básicos', 'Prueba inicial'] },
  { id: 'cierre', category: 'Exterior', title: 'Cierre perimetral', short: 'Cierre perimetral', description: 'Delimitación según material, altura y condiciones del terreno.', unit: 'ml', min: 45000, max: 95000, defaultQuantity: 20, icon: Fence, includes: ['Trazado del tramo', 'Postes y estructura definida', 'Instalación del cierre cotizado'], note: 'No incluye portón, roca, desniveles severos ni mejoramiento de terreno.' },
  { id: 'mueble', category: 'Mueblería', title: 'Mueble a medida', short: 'Mueble a medida', description: 'Diseño, fabricación e instalación según material y herrajes.', unit: 'ml', min: 250000, max: 700000, defaultQuantity: 3, icon: HousePlug, includes: ['Diseño inicial', 'Fabricación según material acordado', 'Instalación en ubicación definida'] },
];

const CATEGORIES: { id: Category; label: string; icon: LucideIcon }[] = [
  { id: 'Construcción', label: 'Construcción', icon: Home },
  { id: 'Terminaciones', label: 'Terminaciones', icon: Layers3 },
  { id: 'Instalaciones', label: 'Instalaciones', icon: HousePlug },
  { id: 'Climatización', label: 'Climatización', icon: AirVent },
  { id: 'Exterior', label: 'Exterior', icon: Fence },
  { id: 'Mueblería', label: 'Mueblería', icon: HousePlug },
];

const FORMAT = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const formatCLP = (value: number) => FORMAT.format(Math.round(value || 0));
const formatNumber = (value: number) => new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(value || 0);
const average = (service: Service) => Math.round((service.min + service.max) / 2);
const unitLabel = (unit: Unit) => unit === 'm²' ? 'm²' : unit === 'ml' ? 'metros lineales' : unit === 'punto' ? 'puntos' : 'unidades';
const motionConfig = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };

function numberFrom(value: string) {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function productForCart(product: CatalogProduct): StoreProduct {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    image_url: product.img || product.image_url || '',
    category_id: product.category_id || product.category,
    category_name: product.category_name || product.category,
    description: product.description,
    discount_percentage: product.discountPercentage || product.discount_percentage || 0,
    stock: product.stock,
    rating: product.rating,
  };
}

export default function UniversalServiceCalculator() {
  const [category, setCategory] = useState<Category>('Construcción');
  const [serviceId, setServiceId] = useState('kit-basico');
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [measureMode, setMeasureMode] = useState<'manual' | 'dimensions'>('dimensions');
  const [quantity, setQuantity] = useState('36');
  const [length, setLength] = useState('6');
  const [width, setWidth] = useState('6');
  const [height, setHeight] = useState('2.4');
  const [facadeMode, setFacadeMode] = useState(false);
  const [quoteLines, setQuoteLines] = useState<QuoteLine[]>([]);
  const [customer, setCustomer] = useState({ name: '', phone: '', place: '', note: '' });
  const stageRef = useRef<HTMLDivElement>(null);
  const { addToCart, totalItems: storeCartItems } = useCartContext();
  const { addItem: addServiceToPersistentCart } = useQuoteCart();
  const { products: storeProducts } = useCatalogProducts();

  const service = SERVICES.find((item) => item.id === serviceId) || SERVICES[0];
  const Icon = service.icon;
  const categoryServices = SERVICES.filter((item) => item.category === category);
  const manualQuantity = Math.max(1, Math.min(5000, numberFrom(quantity) || service.defaultQuantity));
  const long = numberFrom(length);
  const wide = numberFrom(width);
  const tall = numberFrom(height);
  const dimensionQuantity = service.unit === 'm²'
    ? Math.max(1, facadeMode && service.supportsHeight ? long * tall : long * wide)
    : service.unit === 'ml'
      ? Math.max(1, long)
      : manualQuantity;
  const selectedQuantity = (service.unit === 'm²' || service.unit === 'ml') && measureMode === 'dimensions'
    ? dimensionQuantity
    : manualQuantity;
  const selectedLow = selectedQuantity * service.min;
  const selectedHigh = selectedQuantity * service.max;
  const selectedAverage = Math.round((selectedLow + selectedHigh) / 2);
  const selectedLine = quoteLines.find((line) => line.serviceId === service.id);
  const cartLow = quoteLines.reduce((total, line) => {
    const item = SERVICES.find((candidate) => candidate.id === line.serviceId) || service;
    return total + line.quantity * item.min;
  }, 0);
  const cartHigh = quoteLines.reduce((total, line) => {
    const item = SERVICES.find((candidate) => candidate.id === line.serviceId) || service;
    return total + line.quantity * item.max;
  }, 0);
  const storePreview = storeProducts.slice(0, 6);

  const whatsappMessage = useMemo(() => {
    const lines = quoteLines.length ? quoteLines : [{ serviceId: service.id, quantity: selectedQuantity }];
    const details = lines.map((line) => {
      const item = SERVICES.find((candidate) => candidate.id === line.serviceId) || service;
      const low = line.quantity * item.min;
      const high = line.quantity * item.max;
      return '- ' + item.title + ': ' + formatNumber(line.quantity) + ' ' + item.unit + ' · ' + formatCLP(low) + ' a ' + formatCLP(high);
    });
    return [
      'Hola Soluciones Fabrick, necesito una cotización real.',
      '',
      'MI BOLETA REFERENCIAL',
      ...details,
      '',
      'Rango total orientativo: ' + formatCLP(cartLow || selectedLow) + ' a ' + formatCLP(cartHigh || selectedHigh),
      customer.name ? 'Nombre: ' + customer.name : '',
      customer.phone ? 'Teléfono: ' + customer.phone : '',
      customer.place ? 'Comuna / ubicación: ' + customer.place : '',
      customer.note ? 'Detalle: ' + customer.note : '',
      '',
      'Entiendo que el precio final se valida según visita, materiales, acceso y alcance.',
    ].filter(Boolean).join('\n');
  }, [cartHigh, cartLow, customer, quoteLines, selectedHigh, selectedLow, selectedQuantity, service]);

  function moveTo(next: 1 | 2 | 3) {
    setStage(next);
    window.requestAnimationFrame(() => stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function chooseService(next: Service) {
    setServiceId(next.id);
    setCategory(next.category);
    setQuantity(String(next.defaultQuantity));
    if (next.unit === 'm²') {
      setMeasureMode('dimensions');
    } else {
      setMeasureMode('manual');
    }
    moveTo(2);
  }

  function addSelectedService() {
    const nextLine: QuoteLine = {
      serviceId: service.id,
      quantity: selectedQuantity,
      dimensions: {
        length: long || undefined,
        width: wide || undefined,
        height: service.supportsHeight && facadeMode ? tall || undefined : undefined,
        facade: facadeMode,
      },
    };
    const existed = quoteLines.some((line) => line.serviceId === service.id);
    setQuoteLines((current) => {
      const withoutCurrent = current.filter((line) => line.serviceId !== service.id);
      return [...withoutCurrent, nextLine];
    });
    if (!existed) {
      addServiceToPersistentCart({
        kind: 'service',
        title: service.title,
        description: service.description,
        quantity: selectedQuantity,
        unit: service.unit,
        refPrice: average(service),
        notes: 'Referencia desde el presupuesto guiado',
        meta: nextLine.dimensions,
      });
    }
    moveTo(3);
  }

  function removeLine(serviceIdToRemove: string) {
    setQuoteLines((current) => current.filter((line) => line.serviceId !== serviceIdToRemove));
  }

  function addProduct(product: CatalogProduct) {
    addToCart(productForCart(product));
  }

  function sendWhatsApp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.open(buildWhatsAppLink(whatsappMessage), '_blank', 'noopener,noreferrer');
  }

  return (
    <section id="calculadora-universal" className="relative isolate overflow-hidden bg-[#080806] px-4 pb-32 pt-24 text-white sm:px-6 sm:pt-28 lg:px-8 lg:pb-24">
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:52px_52px]" />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_82%_0%,rgba(250,204,21,.16),transparent_27rem),radial-gradient(circle_at_4%_86%,rgba(249,115,22,.12),transparent_30rem),linear-gradient(180deg,#17130d_0%,#080806_55%,#080806_100%)]" />

      <div className="relative mx-auto max-w-[1180px]">
        <header className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-yellow-300/[.10] px-4 py-2 text-[10px] font-black uppercase tracking-[.24em] text-yellow-200 ring-1 ring-yellow-300/25">
            <Sparkles className="h-3.5 w-3.5" /> Cotización guiada
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-black leading-[.92] tracking-[-.065em] sm:text-6xl">
            Define el alcance. Ve el cálculo. Envía una boleta clara.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62 sm:text-base">
            No necesitas adivinar qué sigue: selecciona un servicio, mide en la misma pantalla y arma una solicitud lista para validar por WhatsApp.
          </p>
        </header>

        <div ref={stageRef} tabIndex={-1} className="mt-7 scroll-mt-24 outline-none">
          <div className="overflow-hidden rounded-[1.9rem] bg-[#11100d]/88 shadow-[0_32px_100px_rgba(0,0,0,.48)] ring-1 ring-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 sm:px-6">
              <StagePill number={1} active={stage === 1} done={stage > 1} label="Elige" />
              <span className={stage > 1 ? 'h-px flex-1 bg-yellow-300/70' : 'h-px flex-1 bg-white/10'} />
              <StagePill number={2} active={stage === 2} done={stage > 2} label="Calcula" />
              <span className={stage > 2 ? 'h-px flex-1 bg-yellow-300/70' : 'h-px flex-1 bg-white/10'} />
              <StagePill number={3} active={stage === 3} done={false} label="Boleta" />
              <span className="ml-auto hidden items-center gap-2 rounded-full bg-yellow-300/10 px-3 py-1.5 text-[10px] font-black text-yellow-200 sm:flex">
                <ClipboardList className="h-3.5 w-3.5" /> {quoteLines.length} servicio{quoteLines.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="p-4 sm:p-7">
              <AnimatePresence mode="wait" initial={false}>
                {stage === 1 && (
                  <motion.div key="select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={motionConfig}>
                    <StepHeading eyebrow="Paso 01" title="Selecciona lo que quieres resolver." text="Cada opción tiene un rango de mercado, un promedio referencial y un alcance breve. Tócala para abrir su cálculo." />
                    <div className="fabrick-scroll mt-5 flex gap-2 overflow-x-auto pb-2">
                      {CATEGORIES.map((item) => {
                        const CategoryIcon = item.icon;
                        const active = category === item.id;
                        return (
                          <button key={item.id} type="button" onClick={() => setCategory(item.id)} className={active ? 'flex shrink-0 items-center gap-2 rounded-full bg-yellow-300 px-4 py-2.5 text-xs font-black text-black shadow-[0_8px_28px_rgba(250,204,21,.20)]' : 'flex shrink-0 items-center gap-2 rounded-full bg-white/[.055] px-4 py-2.5 text-xs font-black text-white/65 transition hover:bg-white/[.11] hover:text-white'}>
                            <CategoryIcon className="h-4 w-4" /> {item.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {categoryServices.map((item) => {
                        const ServiceIcon = item.icon;
                        return (
                          <article key={item.id} className="group flex min-h-[226px] flex-col rounded-[1.45rem] bg-white/[.055] p-4 transition hover:-translate-y-0.5 hover:bg-white/[.085]">
                            <div className="flex items-start justify-between gap-3">
                              <span className="grid h-10 w-10 place-items-center rounded-xl bg-yellow-300/12 text-yellow-300"><ServiceIcon className="h-4.5 w-4.5" /></span>
                              <span className="rounded-full bg-white/[.06] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.13em] text-white/54">{unitLabel(item.unit)}</span>
                            </div>
                            <h3 className="mt-4 text-base font-black tracking-[-.035em]">{item.title}</h3>
                            <p className="mt-2 min-h-10 text-xs leading-5 text-white/57">{item.description}</p>
                            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
                              <div><p className="text-[9px] font-black uppercase tracking-[.13em] text-white/35">Mercado</p><b className="mt-1 block text-xs text-yellow-200">{formatCLP(item.min)} – {formatCLP(item.max)}</b></div>
                              <div><p className="text-[9px] font-black uppercase tracking-[.13em] text-white/35">Promedio</p><b className="mt-1 block text-xs">{formatCLP(average(item))}</b></div>
                            </div>
                            <button type="button" onClick={() => chooseService(item)} className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-yellow-300 px-3 text-xs font-black text-black transition hover:bg-white">
                              Ver detalle y calcular <ChevronRight className="h-4 w-4" />
                            </button>
                          </article>
                        );
                      })}
                    </div>

                    <StoreRibbon products={storePreview} onAdd={addProduct} cartItems={storeCartItems} />
                  </motion.div>
                )}

                {stage === 2 && (
                  <motion.div key="calculate" initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -22 }} transition={motionConfig}>
                    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1.15fr_.85fr]">
                      <div>
                        <StepHeading eyebrow="Paso 02" title="Mide el servicio sin perder el contexto." text="El plano se actualiza cuando cambias las medidas. Es una guía visual, no una simulación decorativa." />
                        <ServiceDetail service={service} />
                        <MeasurementControls
                          service={service}
                          quantity={quantity}
                          setQuantity={setQuantity}
                          measureMode={measureMode}
                          setMeasureMode={setMeasureMode}
                          length={length}
                          setLength={setLength}
                          width={width}
                          setWidth={setWidth}
                          height={height}
                          setHeight={setHeight}
                          facadeMode={facadeMode}
                          setFacadeMode={setFacadeMode}
                          result={selectedQuantity}
                        />
                      </div>
                      <aside className="order-first lg:order-none">
                        <MeasurementPlan service={service} quantity={selectedQuantity} length={long} width={wide} height={tall} facadeMode={facadeMode} />
                        <div className="mt-3 rounded-[1.45rem] bg-[linear-gradient(135deg,#facc15,#fb923c)] p-5 text-black">
                          <p className="text-[10px] font-black uppercase tracking-[.2em] text-black/58">Rango calculado</p>
                          <p className="mt-2 text-2xl font-black tracking-[-.055em]">{formatCLP(selectedLow)} – {formatCLP(selectedHigh)}</p>
                          <div className="mt-4 flex items-center justify-between border-t border-black/15 pt-3 text-xs"><span className="font-bold text-black/62">Promedio orientativo</span><b>{formatCLP(selectedAverage)}</b></div>
                        </div>
                      </aside>
                    </div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <button type="button" onClick={() => moveTo(1)} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-white/[.06] px-5 text-sm font-black text-white/75 transition hover:bg-white/[.11]"><ArrowLeft className="h-4 w-4" /> Cambiar servicio</button>
                      <button type="button" onClick={addSelectedService} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-yellow-300 px-5 text-sm font-black text-black transition hover:bg-white">
                        <Plus className="h-4 w-4" /> {selectedLine ? 'Actualizar mi boleta' : 'Añadir a mi boleta'}
                      </button>
                    </div>
                  </motion.div>
                )}

                {stage === 3 && (
                  <motion.div key="receipt" initial={{ opacity: 0, scale: .98, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={motionConfig}>
                    <StepHeading eyebrow="Paso 03" title="Revisa tu boleta y envíala." text="Esta referencia no es un precio final. Le da al equipo los datos necesarios para validar materiales, acceso y alcance." />
                    <div className="mt-6 grid gap-6 lg:grid-cols-[.92fr_1.08fr] lg:items-start">
                      <Receipt lines={quoteLines.length ? quoteLines : [{ serviceId: service.id, quantity: selectedQuantity }]} low={cartLow || selectedLow} high={cartHigh || selectedHigh} onRemove={removeLine} />
                      <form onSubmit={sendWhatsApp} className="rounded-[1.6rem] bg-black/24 p-5 sm:p-6">
                        <p className="text-[10px] font-black uppercase tracking-[.22em] text-yellow-300">Datos para validar</p>
                        <h3 className="mt-3 text-xl font-black tracking-[-.045em]">Envíala directo a WhatsApp.</h3>
                        <p className="mt-2 text-sm leading-6 text-white/56">Te respondemos con las preguntas que faltan y coordinamos la siguiente etapa.</p>
                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                          <Field label="Tu nombre" value={customer.name} onChange={(value) => setCustomer((current) => ({ ...current, name: value }))} placeholder="Nombre y apellido" required />
                          <Field label="Teléfono" value={customer.phone} onChange={(value) => setCustomer((current) => ({ ...current, phone: value }))} placeholder="+56 9..." required />
                          <Field label="Comuna o ciudad" value={customer.place} onChange={(value) => setCustomer((current) => ({ ...current, place: value }))} placeholder="Ej. Linares" />
                          <label className="block sm:col-span-2"><span className="text-[10px] font-black uppercase tracking-[.16em] text-white/42">Detalle importante</span><textarea value={customer.note} onChange={(event) => setCustomer((current) => ({ ...current, note: event.target.value }))} placeholder="Fotos, accesos, medidas exactas o fecha ideal…" className="mt-2 min-h-24 w-full resize-none rounded-2xl bg-white/[.055] px-4 py-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-yellow-300/60" /></label>
                        </div>
                        <button type="submit" className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,#facc15,#fb923c)] px-5 text-sm font-black text-black transition hover:brightness-110"><MessageCircle className="h-4 w-4" /> Enviar boleta a WhatsApp</button>
                        <button type="button" onClick={() => moveTo(1)} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-xs font-black text-white/56 transition hover:bg-white/[.055] hover:text-white"><Plus className="h-4 w-4" /> Añadir otro servicio</button>
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{'.fabrick-scroll::-webkit-scrollbar{display:none}.fabrick-scroll{scrollbar-width:none}'}</style>
    </section>
  );
}

function StagePill({ number, active, done, label }: { number: number; active: boolean; done: boolean; label: string }) {
  return <div className="flex shrink-0 items-center gap-2"><span className={active || done ? 'grid h-8 w-8 place-items-center rounded-full bg-yellow-300 text-[10px] font-black text-black' : 'grid h-8 w-8 place-items-center rounded-full bg-white/[.07] text-[10px] font-black text-white/35'}>{done ? <Check className="h-4 w-4" /> : '0' + number}</span><span className={active ? 'hidden text-[10px] font-black uppercase tracking-[.14em] text-white sm:block' : 'hidden text-[10px] font-black uppercase tracking-[.14em] text-white/35 sm:block'}>{label}</span></div>;
}

function StepHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <div><p className="text-[10px] font-black uppercase tracking-[.24em] text-yellow-300">{eyebrow}</p><h2 className="mt-3 max-w-2xl text-2xl font-black tracking-[-.05em] text-white sm:text-3xl">{title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/57">{text}</p></div>;
}

function ServiceDetail({ service }: { service: Service }) {
  const Icon = service.icon;
  return (
    <article className="mt-6 rounded-[1.5rem] bg-black/28 p-5">
      <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-yellow-300">Servicio seleccionado</p><h3 className="mt-2 text-xl font-black tracking-[-.045em]">{service.title}</h3><p className="mt-2 text-sm leading-6 text-white/58">{service.description}</p></div><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-yellow-300 text-black"><Icon className="h-5 w-5" /></span></div>
      <div className="mt-5 grid gap-2 border-t border-white/10 pt-4 sm:grid-cols-3"><InfoCell label="Desde" value={formatCLP(service.min) + ' / ' + service.unit} /><InfoCell label="Hasta" value={formatCLP(service.max) + ' / ' + service.unit} /><InfoCell label="Promedio mercado" value={formatCLP(average(service))} /></div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">{service.includes.map((item) => <p key={item} className="flex gap-2 text-xs leading-5 text-white/70"><Check className="h-4 w-4 shrink-0 text-yellow-300" />{item}</p>)}</div>
      {service.note && <p className="mt-4 border-t border-white/10 pt-4 text-[11px] leading-5 text-yellow-100/58">{service.note}</p>}
    </article>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/[.045] p-3"><p className="text-[9px] font-black uppercase tracking-[.14em] text-white/38">{label}</p><b className="mt-1 block text-xs text-yellow-100">{value}</b></div>;
}

function MeasurementControls({
  service, quantity, setQuantity, measureMode, setMeasureMode, length, setLength, width, setWidth, height, setHeight, facadeMode, setFacadeMode, result,
}: {
  service: Service; quantity: string; setQuantity: (value: string) => void; measureMode: 'manual' | 'dimensions'; setMeasureMode: (value: 'manual' | 'dimensions') => void; length: string; setLength: (value: string) => void; width: string; setWidth: (value: string) => void; height: string; setHeight: (value: string) => void; facadeMode: boolean; setFacadeMode: (value: boolean) => void; result: number;
}) {
  const canMeasure = service.unit === 'm²' || service.unit === 'ml';
  return (
    <section className="mt-5 rounded-[1.5rem] bg-white/[.055] p-5">
      <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-yellow-300">Calculadora flexible</p><h3 className="mt-2 text-lg font-black">¿Cómo quieres medir?</h3></div><Ruler className="h-5 w-5 text-yellow-300" /></div>
      {canMeasure && <div className="mt-5 grid grid-cols-2 rounded-xl bg-black/28 p-1"><button type="button" onClick={() => setMeasureMode('dimensions')} className={measureMode === 'dimensions' ? 'rounded-lg bg-yellow-300 px-3 py-2.5 text-xs font-black text-black' : 'rounded-lg px-3 py-2.5 text-xs font-black text-white/52'}>Largo y {service.unit === 'm²' ? 'ancho' : 'tramo'}</button><button type="button" onClick={() => setMeasureMode('manual')} className={measureMode === 'manual' ? 'rounded-lg bg-yellow-300 px-3 py-2.5 text-xs font-black text-black' : 'rounded-lg px-3 py-2.5 text-xs font-black text-white/52'}>Cantidad total</button></div>}
      {measureMode === 'dimensions' && canMeasure ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <NumberField label={service.unit === 'ml' ? 'Largo del tramo' : facadeMode ? 'Ancho de muro' : 'Largo'} value={length} onChange={setLength} suffix="m" />
          {service.unit === 'm²' && !facadeMode && <NumberField label="Ancho" value={width} onChange={setWidth} suffix="m" />}
          {service.unit === 'm²' && service.supportsHeight && <label className="flex items-center gap-3 rounded-xl bg-black/25 px-4 py-3 text-xs font-bold text-white/72 sm:col-span-2"><input checked={facadeMode} onChange={(event) => setFacadeMode(event.target.checked)} type="checkbox" className="h-4 w-4 accent-yellow-300" /> Medir una pared o fachada: usar ancho y alto</label>}
          {service.unit === 'm²' && service.supportsHeight && facadeMode && <NumberField label="Alto" value={height} onChange={setHeight} suffix="m" />}
        </div>
      ) : (
        <div className="mt-5"><NumberField label="Cantidad estimada" value={quantity} onChange={setQuantity} suffix={service.unit} /></div>
      )}
      <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/10 pt-4"><span className="text-xs text-white/54">Resultado para esta referencia</span><b className="text-lg font-black text-yellow-200">{formatNumber(result)} {service.unit}</b></div>
    </section>
  );
}

function NumberField({ label, value, onChange, suffix }: { label: string; value: string; onChange: (value: string) => void; suffix: string }) {
  return <label className="block"><span className="text-[10px] font-black uppercase tracking-[.16em] text-white/42">{label}</span><div className="mt-2 flex items-end gap-3 border-b border-white/15 pb-2 focus-within:border-yellow-300"><input type="number" min="0" step="0.1" inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent text-3xl font-black tracking-[-.055em] text-white outline-none" /><b className="mb-1 text-xs text-yellow-300">{suffix}</b></div></label>;
}

function MeasurementPlan({ service, quantity, length, width, height, facadeMode }: { service: Service; quantity: number; length: number; width: number; height: number; facadeMode: boolean }) {
  const isArea = service.unit === 'm²';
  const isLine = service.unit === 'ml';
  const ratio = Math.max(.46, Math.min(2.1, length && width ? length / width : 1.2));
  const planWidth = isArea ? 168 * ratio : 210;
  const planHeight = isArea ? 168 : 20;
  const displayHeight = facadeMode && height ? height : width;
  return (
    <article className="overflow-hidden rounded-[1.55rem] bg-[#0b0b09] p-5 ring-1 ring-white/10">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-yellow-300">Plano reactivo</p><h3 className="mt-2 text-lg font-black">Tu medida, en contexto.</h3></div><span className="rounded-full bg-white/[.06] px-3 py-1.5 text-[10px] font-black text-white/63">{formatNumber(quantity)} {service.unit}</span></div>
      <div className="mt-5 grid min-h-[235px] place-items-center overflow-hidden rounded-[1.2rem] bg-[linear-gradient(135deg,rgba(250,204,21,.11),rgba(255,255,255,.02))]">
        {isArea ? (
          <svg viewBox="0 0 300 260" className="h-[245px] w-full" role="img" aria-label="Plano de superficie con medidas">
            <defs><pattern id="plan-grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M 16 0 L 0 0 0 16" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="1" /></pattern></defs>
            <rect width="300" height="260" fill="url(#plan-grid)" />
            <rect x={(300 - planWidth) / 2} y={(230 - planHeight) / 2} width={planWidth} height={planHeight} rx="12" fill="rgba(250,204,21,.14)" stroke="#fde047" strokeWidth="2" />
            <path d={'M ' + ((300 - planWidth) / 2) + ' 34 H ' + ((300 + planWidth) / 2)} stroke="#fde047" strokeWidth="1.5" />
            <path d={'M ' + ((300 - planWidth) / 2) + ' 28 l -7 6 7 6 M ' + ((300 + planWidth) / 2) + ' 28 l 7 6 -7 6'} stroke="#fde047" fill="none" strokeWidth="1.5" />
            <text x="150" y="24" textAnchor="middle" fill="#fde047" fontSize="12" fontWeight="800">{formatNumber(length)} m {facadeMode ? 'de ancho' : 'de largo'}</text>
            <path d={'M ' + ((300 - planWidth) / 2 - 18) + ' ' + ((230 - planHeight) / 2) + ' V ' + ((230 + planHeight) / 2)} stroke="#fde047" strokeWidth="1.5" />
            <text x={(300 - planWidth) / 2 - 29} y="132" textAnchor="middle" fill="#fde047" fontSize="12" fontWeight="800" transform={'rotate(-90 ' + ((300 - planWidth) / 2 - 29) + ' 132)'}>{formatNumber(displayHeight)} m {facadeMode ? 'de alto' : 'de ancho'}</text>
            <text x="150" y="127" textAnchor="middle" fill="#ffffff" fontSize="28" fontWeight="900">{formatNumber(quantity)} m²</text>
            <text x="150" y="149" textAnchor="middle" fill="rgba(255,255,255,.57)" fontSize="11" fontWeight="700">{facadeMode ? 'Superficie de fachada' : 'Superficie de planta'}</text>
          </svg>
        ) : isLine ? (
          <svg viewBox="0 0 300 260" className="h-[245px] w-full" role="img" aria-label="Plano lineal con medida">
            <defs><pattern id="line-grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M 16 0 L 0 0 0 16" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="1" /></pattern></defs><rect width="300" height="260" fill="url(#line-grid)" />
            <path d="M 46 130 H 254" stroke="rgba(250,204,21,.2)" strokeWidth="18" strokeLinecap="round" /><path d="M 46 130 H 254" stroke="#fde047" strokeWidth="4" strokeLinecap="round" />
            <circle cx="46" cy="130" r="10" fill="#0b0b09" stroke="#fde047" strokeWidth="3" /><circle cx="254" cy="130" r="10" fill="#0b0b09" stroke="#fde047" strokeWidth="3" />
            <text x="150" y="103" textAnchor="middle" fill="#ffffff" fontSize="28" fontWeight="900">{formatNumber(quantity)} ml</text><text x="150" y="158" textAnchor="middle" fill="rgba(255,255,255,.57)" fontSize="11" fontWeight="700">Tramo aproximado a intervenir</text>
          </svg>
        ) : (
          <svg viewBox="0 0 300 260" className="h-[245px] w-full" role="img" aria-label="Representación de unidades">
            <defs><pattern id="point-grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M 16 0 L 0 0 0 16" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="1" /></pattern></defs><rect width="300" height="260" fill="url(#point-grid)" />
            {Array.from({ length: Math.min(8, Math.max(1, Math.round(quantity)) ) }).map((_, index) => <circle key={index} cx={64 + (index % 4) * 58} cy={90 + Math.floor(index / 4) * 62} r="16" fill="rgba(250,204,21,.13)" stroke="#fde047" strokeWidth="2" />)}
            <text x="150" y="218" textAnchor="middle" fill="#ffffff" fontSize="28" fontWeight="900">{formatNumber(quantity)} {service.unit}</text>
          </svg>
        )}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-white/45">El diagrama se adapta a las medidas que ingresas y ayuda a confirmar que la unidad elegida corresponde a tu proyecto.</p>
    </article>
  );
}

function StoreRibbon({ products, onAdd, cartItems }: { products: CatalogProduct[]; onAdd: (product: CatalogProduct) => void; cartItems: number }) {
  return (
    <section className="mt-7 overflow-hidden rounded-[1.55rem] bg-[linear-gradient(100deg,rgba(250,204,21,.14),rgba(255,255,255,.045),rgba(249,115,22,.12))] p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-yellow-200">Completa tu proyecto</p><h3 className="mt-2 text-lg font-black">Productos de la tienda, sin salir del flujo.</h3></div><Link href="/tienda" className="inline-flex items-center gap-1 text-xs font-black text-yellow-200 hover:text-white">Ver tienda <ArrowRight className="h-3.5 w-3.5" /></Link></div>
      <div className="fabrick-scroll mt-4 flex gap-3 overflow-x-auto pb-2">
        {products.map((product) => <article key={product.id} className="w-[180px] shrink-0 overflow-hidden rounded-2xl bg-[#11100d]/92 ring-1 ring-white/10"><div className="h-20 bg-black/30"><img src={product.img || product.image_url || ''} alt="" className="h-full w-full object-cover" loading="lazy" onError={(event) => { event.currentTarget.style.opacity = '0'; }} /></div><div className="p-3"><p className="line-clamp-2 min-h-9 text-xs font-black">{product.name}</p><p className="mt-2 text-[11px] font-black text-yellow-200">{formatCLP(product.price)}</p><button type="button" onClick={() => onAdd(product)} className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-yellow-300 px-2 py-2 text-[10px] font-black text-black transition hover:bg-white"><ShoppingBag className="h-3.5 w-3.5" /> Añadir</button></div></article>)}
      </div>
      <p className="mt-2 text-[10px] font-bold text-white/45">{cartItems ? cartItems + ' producto' + (cartItems === 1 ? '' : 's') + ' añadido' + (cartItems === 1 ? '' : 's') + ' al carrito.' : 'Puedes añadir productos y continuar después con tu compra.'}</p>
    </section>
  );
}

function Receipt({ lines, low, high, onRemove }: { lines: QuoteLine[]; low: number; high: number; onRemove: (serviceId: string) => void }) {
  return (
    <article className="receipt-shape overflow-hidden bg-[#fff4dc] px-5 pb-10 pt-6 text-[#17120c] shadow-[0_24px_65px_rgba(0,0,0,.28)]">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#9b6508]">Boleta referencial</p><h3 className="mt-2 text-xl font-black">Soluciones Fabrick</h3><p className="mt-1 text-[11px] text-[#6f604b]">No es documento tributario ni precio final.</p></div><span className="grid h-10 w-10 place-items-center rounded-full bg-[#17120c] text-yellow-300"><ReceiptText className="h-4 w-4" /></span></div>
      <div className="my-5 border-t border-dashed border-black/20" />
      <div className="space-y-4">{lines.map((line) => { const service = SERVICES.find((item) => item.id === line.serviceId) || SERVICES[0]; return <div key={line.serviceId} className="group relative"><p className="pr-8 text-sm font-black">{service.title}</p><p className="mt-1 text-[11px] text-[#6f604b]">{formatNumber(line.quantity)} {service.unit} · promedio {formatCLP(line.quantity * average(service))}</p>{lines.length > 1 && <button type="button" aria-label="Quitar servicio" onClick={() => onRemove(line.serviceId)} className="absolute right-0 top-0 grid h-7 w-7 place-items-center rounded-full text-[#7a6345] transition hover:bg-black/10 hover:text-[#17120c]"><Trash2 className="h-3.5 w-3.5" /></button>}</div>; })}</div>
      <div className="my-5 border-t border-dashed border-black/20" />
      <ReceiptLine label="Total desde" value={formatCLP(low)} /><ReceiptLine label="Total hasta" value={formatCLP(high)} /><ReceiptLine label="Promedio orientativo" value={formatCLP(Math.round((low + high) / 2))} strong />
      <div className="mt-5 rounded-2xl bg-[#17120c] p-4 text-[#fff4dc]"><p className="text-[9px] font-black uppercase tracking-[.19em] text-yellow-300">Antes de confirmar</p><p className="mt-2 text-[11px] leading-5 text-white/67">Validamos visita, acceso, materiales, dimensiones, instalación existente y partidas no incluidas.</p></div>
      <p className="mt-5 text-[10px] leading-4 text-[#6f604b]">Los valores son aproximados y se actualizan según disponibilidad, proveedor y condiciones reales del proyecto.</p>
    </article>
  );
}

function ReceiptLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className="mt-3 flex items-center justify-between gap-4 text-xs"><span className="text-[#6f604b]">{label}</span><b className={strong ? 'text-[#17120c]' : 'text-[#3d3020]'}>{value}</b></div>;
}

function Field({ label, value, onChange, placeholder, required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; required?: boolean }) {
  return <label className="block"><span className="text-[10px] font-black uppercase tracking-[.16em] text-white/42">{label}</span><input required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-2xl bg-white/[.055] px-4 py-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-yellow-300/60" /></label>;
}

export function PublicBudgetBottomNav() {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-[1.35rem] bg-[#11100d]/95 p-2 text-white shadow-[0_20px_70px_rgba(0,0,0,.55)] ring-1 ring-white/12 backdrop-blur-xl sm:hidden" aria-label="Navegación de presupuesto">
      <Link href="/" className="grid min-h-12 place-items-center rounded-xl text-[10px] font-black uppercase tracking-[.1em] text-white/45"><Home className="h-5 w-5" /><span>Inicio</span></Link>
      <a href="#calculadora-universal" className="grid min-h-12 place-items-center rounded-xl bg-yellow-300 text-[10px] font-black uppercase tracking-[.1em] text-black"><Ruler className="h-5 w-5" /><span>Calcular</span></a>
      <Link href="/tienda" className="grid min-h-12 place-items-center rounded-xl text-[10px] font-black uppercase tracking-[.1em] text-white/45"><Blocks className="h-5 w-5" /><span>Tienda</span></Link>
      <a href={buildWhatsAppLink('Hola Soluciones Fabrick, necesito orientación para un servicio de mi hogar.')} target="_blank" rel="noopener noreferrer" className="grid min-h-12 place-items-center rounded-xl text-[10px] font-black uppercase tracking-[.1em] text-white/45"><MessageCircle className="h-5 w-5" /><span>WhatsApp</span></a>
    </nav>
  );
}
