'use client';

import { type FormEvent, useMemo, useState } from 'react';
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
  DoorOpen,
  Fence,
  Flame,
  Hammer,
  Home,
  HousePlug,
  Layers3,
  Lightbulb,
  Mail,
  MapPin,
  MessageCircle,
  PaintRoller,
  PanelsTopLeft,
  Ruler,
  Send,
  Sofa,
  Sparkles,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { buildWhatsAppLink } from '@/lib/whatsapp';

type Unit = 'm²' | 'ml' | 'unidad' | 'punto' | 'trabajo';
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
};

const SERVICES: Service[] = [
  { id: 'kit-basico', category: 'Construcción', title: 'Kit prefabricado básico', short: 'Kit básico', description: 'La base para construir y avanzar por etapas con estructura y cubierta estándar.', unit: 'm²', min: 160000, max: 230000, defaultQuantity: 36, icon: Home, includes: ['Paneles forrados por una cara', 'Cerchas en madera o Metalcon', 'Zinc 0,35 mm y costaneras'], note: 'No incluye fundaciones, montaje, traslado, ventanas, puertas ni instalaciones.' },
  { id: 'kit-avanzado', category: 'Construcción', title: 'Kit prefabricado avanzado', short: 'Kit avanzado', description: 'Una base más completa para reducir trabajos posteriores.', unit: 'm²', min: 320000, max: 460000, defaultQuantity: 54, icon: Home, includes: ['Base del kit básico', 'Ventanas, puertas y forro interior', 'Puntos eléctricos y cielos considerados'], note: 'No incluye fundaciones, fosa, conexiones exteriores, pisos ni pintura.' },
  { id: 'llave-mano', category: 'Construcción', title: 'Casa llave en mano estándar', short: 'Llave en mano', description: 'Vivienda terminada con estándar acordado y redes interiores preparadas.', unit: 'm²', min: 540000, max: 780000, defaultQuantity: 72, icon: Home, includes: ['Base del kit avanzado', 'Pisos y pintura estándar', 'Redes sanitarias y agua listas para conectar'], note: 'No incluye fosa, pozo, empalmes exteriores, permisos ni obras de terreno.' },
  { id: 'techumbre', category: 'Construcción', title: 'Techumbre nueva o renovación', short: 'Techumbre', description: 'Cubierta, fijaciones y remates definidos según el estado de la estructura.', unit: 'm²', min: 19990, max: 75000, defaultQuantity: 45, icon: Hammer, includes: ['Cubierta y fijaciones estándar', 'Remates básicos', 'Revisión visual de estructura existente'], note: 'No incluye reparación estructural oculta, aislación ni acceso especial.' },
  { id: 'remodelacion', category: 'Construcción', title: 'Remodelación integral', short: 'Remodelación', description: 'Renovación coordinada de espacios existentes y sus partidas principales.', unit: 'm²', min: 300000, max: 460000, defaultQuantity: 30, icon: Hammer, includes: ['Diagnóstico inicial de partidas', 'Coordinación de especialidades', 'Terminaciones según alcance'], note: 'Referencia central: $380.000/m². El estado previo y las demoliciones se validan en visita.' },
  { id: 'ceramica', category: 'Terminaciones', title: 'Instalación de cerámica', short: 'Cerámica', description: 'Trazado, adhesivo, nivelación, fragüe y terminación.', unit: 'm²', min: 30000, max: 50000, defaultQuantity: 20, icon: Layers3, includes: ['Trazado y nivelación base', 'Adhesivo y fragüe estándar', 'Cortes y remates simples'], note: 'No incluye cerámica, retiro ni reparación mayor de la base.' },
  { id: 'laminado', category: 'Terminaciones', title: 'Piso laminado o flotante', short: 'Piso laminado', description: 'Instalación de piso, manta y encuentros básicos.', unit: 'm²', min: 10990, max: 25000, defaultQuantity: 25, icon: Layers3, includes: ['Manta y armado de palmetas', 'Cortes y encuentros básicos', 'Limpieza de término'], note: 'No incluye retiro de piso, nivelación mayor ni zócalos especiales.' },
  { id: 'siding', category: 'Terminaciones', title: 'Revestimiento siding', short: 'Siding', description: 'Fachada protegida y terminada sobre una base preparada.', unit: 'm²', min: 25990, max: 65000, defaultQuantity: 30, icon: PaintRoller, includes: ['Evaluación de base', 'Siding y perfilería según propuesta', 'Cortes y remates estándar'], note: 'No incluye reparar humedad, aislación o retiro de revestimiento salvo que se indique.' },
  { id: 'pintura', category: 'Terminaciones', title: 'Pintura interior o exterior', short: 'Pintura', description: 'Preparación básica, protección de superficies y aplicación.', unit: 'm²', min: 5000, max: 12000, defaultQuantity: 60, icon: PaintRoller, includes: ['Protección de áreas cercanas', 'Preparación básica', 'Aplicación según sistema definido'] },
  { id: 'puerta', category: 'Instalaciones', title: 'Instalación de puerta', short: 'Puerta', description: 'Montaje, nivelación, fijación y ajuste básico.', unit: 'unidad', min: 60000, max: 180000, defaultQuantity: 1, icon: DoorOpen, includes: ['Presentación y nivelación', 'Fijaciones estándar', 'Ajuste de apertura y cierre'] },
  { id: 'bano', category: 'Instalaciones', title: 'Instalación o renovación de baño', short: 'Baño', description: 'Artefactos, conexiones y terminaciones básicas según alcance.', unit: 'unidad', min: 900000, max: 2800000, defaultQuantity: 1, icon: Bath, includes: ['Revisión de puntos existentes', 'Montaje de partidas acordadas', 'Pruebas básicas de conexión'], note: 'La demolición, porcelanatos y cambios de redes se cotizan luego de revisar el recinto.' },
  { id: 'enchufe', category: 'Instalaciones', title: 'Punto eléctrico o iluminación', short: 'Punto eléctrico', description: 'Canalización corta, caja, cableado y mecanismo estándar.', unit: 'punto', min: 25000, max: 50000, defaultQuantity: 8, icon: Lightbulb, includes: ['Caja, conexión y mecanismo', 'Canalización corta', 'Prueba de funcionamiento'], note: 'Tablero, recorridos largos, muros complejos y certificación se cotizan aparte.' },
  { id: 'gasfiteria', category: 'Instalaciones', title: 'Punto de agua o gasfitería', short: 'Gasfitería', description: 'Extensión corta, conexión, prueba y terminación básica.', unit: 'punto', min: 45000, max: 120000, defaultQuantity: 4, icon: Wrench, includes: ['Conexión definida en alcance', 'Prueba básica', 'Terminación visible estándar'] },
  { id: 'aire', category: 'Climatización', title: 'Instalación aire acondicionado split', short: 'Aire acondicionado', description: 'Montaje interior/exterior y conexión estándar para un equipo split.', unit: 'unidad', min: 250000, max: 360000, defaultQuantity: 1, icon: AirVent, includes: ['Montaje de unidades', 'Recorrido estándar de conexión', 'Prueba básica de funcionamiento'], note: 'No incluye equipo, metros extra, altura, canaleta adicional ni obras eléctricas.' },
  { id: 'pellet', category: 'Climatización', title: 'Instalación estufa a pellet', short: 'Estufa a pellet', description: 'Ubicación, salida de gases, sellos y puesta en marcha básica.', unit: 'unidad', min: 120000, max: 320000, defaultQuantity: 1, icon: Flame, includes: ['Definición de ubicación', 'Montaje y sellos básicos', 'Prueba inicial'] },
  { id: 'cierre', category: 'Exterior', title: 'Cierre perimetral', short: 'Cierre perimetral', description: 'Delimitación y protección según material, altura y terreno.', unit: 'ml', min: 45000, max: 95000, defaultQuantity: 20, icon: Fence, includes: ['Trazado del tramo', 'Postes y estructura definida', 'Instalación del cierre cotizado'], note: 'No incluye portón, roca, desniveles severos ni mejoramiento de terreno.' },
  { id: 'mueble', category: 'Mueblería', title: 'Mueble a medida', short: 'Mueble a medida', description: 'Diseño, fabricación e instalación según material y herrajes.', unit: 'ml', min: 250000, max: 700000, defaultQuantity: 3, icon: Sofa, includes: ['Diseño inicial', 'Fabricación según material acordado', 'Instalación en la ubicación definida'] },
];

const CATEGORIES: { id: Category; label: string; icon: LucideIcon }[] = [
  { id: 'Construcción', label: 'Construcción', icon: Home },
  { id: 'Terminaciones', label: 'Terminaciones', icon: Layers3 },
  { id: 'Instalaciones', label: 'Instalaciones', icon: HousePlug },
  { id: 'Climatización', label: 'Climatización', icon: AirVent },
  { id: 'Exterior', label: 'Exterior', icon: Fence },
  { id: 'Mueblería', label: 'Mueblería', icon: Sofa },
];

const FORMAT = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const formatCLP = (value: number) => FORMAT.format(Math.round(value || 0));
const unitLabel = (unit: Unit) => unit === 'm²' ? 'm²' : unit === 'ml' ? 'metros lineales' : unit === 'punto' ? 'puntos' : unit === 'unidad' ? 'unidades' : 'trabajo';

function presetsFor(service: Service) {
  if (service.unit === 'm²') return [15, 36, 54, 72];
  if (service.unit === 'ml') return [10, 20, 30, 50];
  if (service.unit === 'punto') return [1, 4, 8, 12];
  return [1, 2, 3, 4];
}

const motionConfig = { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const };

export default function UniversalServiceCalculator() {
  const [category, setCategory] = useState<Category>('Construcción');
  const [serviceId, setServiceId] = useState('kit-basico');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [quantity, setQuantity] = useState(36);
  const [customer, setCustomer] = useState({ name: '', phone: '', place: '', note: '' });

  const service = SERVICES.find((item) => item.id === serviceId) ?? SERVICES[0];
  const Icon = service.icon;
  const categoryServices = SERVICES.filter((item) => item.category === category);
  const cleanQuantity = Math.max(1, Math.min(5000, Number(quantity) || 0));
  const low = cleanQuantity * service.min;
  const high = cleanQuantity * service.max;
  const middle = Math.round((low + high) / 2);

  const message = useMemo(() => [
    'Hola Soluciones Fabrick, necesito una cotización real.',
    '',
    `Servicio: ${service.title}`,
    `Cantidad: ${cleanQuantity} ${service.unit}`,
    `Rango mostrado: ${formatCLP(low)} a ${formatCLP(high)}`,
    `Valor medio orientativo: ${formatCLP(middle)}`,
    customer.name && `Nombre: ${customer.name}`,
    customer.phone && `Teléfono: ${customer.phone}`,
    customer.place && `Comuna / ubicación: ${customer.place}`,
    customer.note && `Detalle: ${customer.note}`,
    '',
    'Entiendo que es una referencia y deseo validar visita, alcance y precio final.',
  ].filter(Boolean).join('\n'), [cleanQuantity, customer, high, low, middle, service]);

  function chooseService(next: Service) {
    setServiceId(next.id);
    setCategory(next.category);
    setQuantity(next.defaultQuantity);
  }

  function openWhatsApp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.open(buildWhatsAppLink(message), '_blank', 'noopener,noreferrer');
  }

  return (
    <section id="calculadora-universal" className="relative isolate overflow-hidden bg-[#070706] px-4 pb-16 pt-28 text-white sm:px-6 sm:pt-36 lg:px-8 lg:pb-24">
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:52px_52px]" />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_78%_4%,rgba(250,204,21,.18),transparent_26rem),radial-gradient(circle_at_6%_95%,rgba(249,115,22,.10),transparent_30rem),linear-gradient(180deg,#17130d_0%,#090806_46%,#070706_100%)]" />
      <div aria-hidden className="absolute inset-0 bg-black/15" />

      <div className="relative mx-auto max-w-[1220px]">
        <header className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-yellow-300/[.10] px-4 py-2 text-[10px] font-black uppercase tracking-[.28em] text-yellow-200 ring-1 ring-yellow-300/25">
            <Sparkles className="h-3.5 w-3.5" /> Presupuesto guiado
          </p>
          <h1 className="mt-5 text-4xl font-black leading-[.93] tracking-[-.065em] sm:text-6xl">
            Recorrer tu presupuesto debería sentirse tan claro como recorrer tu proyecto.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
            Avanza por tres etapas y recibe un rango referencial con el servicio, la medida y los detalles que debemos validar en terreno.
          </p>
        </header>

        <div className="mt-10 grid gap-6 lg:grid-cols-[.76fr_1.24fr] lg:items-stretch">
          <PerspectiveScene step={step} service={service} low={low} high={high} />

          <div className="overflow-hidden rounded-[2rem] bg-[#11100d]/84 shadow-[0_30px_100px_rgba(0,0,0,.48)] ring-1 ring-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-2 border-b border-white/10 p-3 sm:p-4">
              {[1, 2, 3].map((number) => (
                <div key={number} className="flex min-w-0 flex-1 items-center gap-2">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-black transition ${step >= number ? 'bg-yellow-300 text-black' : 'bg-white/[.07] text-white/35'}`}>0{number}</span>
                  <span className={`hidden truncate text-[9px] font-black uppercase tracking-[.14em] sm:block ${step >= number ? 'text-white' : 'text-white/30'}`}>
                    {number === 1 ? 'Servicio' : number === 2 ? 'Medida' : 'Boleta'}
                  </span>
                  {number < 3 && <span className={`h-px flex-1 ${step > number ? 'bg-yellow-300' : 'bg-white/10'}`} />}
                </div>
              ))}
            </div>

            <div className="min-h-[590px] p-4 sm:min-h-[620px] sm:p-7">
              <AnimatePresence mode="wait" initial={false}>
                {step === 1 && (
                  <motion.div key="service" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={motionConfig}>
                    <StepHeading eyebrow="Etapa 01" title="¿Qué quieres resolver?" text="Elige la familia y toca el servicio que más se acerca a tu necesidad." />
                    <div className="store-scroll mt-6 flex gap-2 overflow-x-auto pb-2">
                      {CATEGORIES.map(({ id, label, icon: CategoryIcon }) => {
                        const active = category === id;
                        return <button key={id} type="button" onClick={() => setCategory(id)} className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-xs font-black transition ${active ? 'bg-yellow-300 text-black shadow-[0_8px_28px_rgba(250,204,21,.24)]' : 'bg-white/[.055] text-white/65 hover:bg-white/[.10] hover:text-white'}`}><CategoryIcon className="h-4 w-4" />{label}</button>;
                      })}
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {categoryServices.map((item) => {
                        const ItemIcon = item.icon;
                        const active = item.id === service.id;
                        return <button key={item.id} type="button" onClick={() => chooseService(item)} className={`group relative overflow-hidden rounded-[1.45rem] p-4 text-left transition duration-300 ${active ? 'bg-[linear-gradient(135deg,#facc15,#f59e0b)] text-black shadow-[0_18px_45px_rgba(250,204,21,.20)]' : 'bg-white/[.055] text-white hover:-translate-y-0.5 hover:bg-white/[.09]'}`}>
                          <span className={`grid h-10 w-10 place-items-center rounded-xl ${active ? 'bg-black/12' : 'bg-yellow-300/12 text-yellow-300'}`}><ItemIcon className="h-4 w-4" /></span>
                          <b className="mt-5 block text-sm font-black">{item.short}</b>
                          <span className={`mt-1 block min-h-10 text-xs leading-5 ${active ? 'text-black/65' : 'text-white/52'}`}>{item.description}</span>
                          <span className={`mt-4 block text-[10px] font-black uppercase tracking-[.16em] ${active ? 'text-black/60' : 'text-yellow-300'}`}>{formatCLP(item.min)} – {formatCLP(item.max)} / {item.unit}</span>
                        </button>;
                      })}
                    </div>

                    <ServiceScope service={service} />
                    <button type="button" onClick={() => setStep(2)} className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-yellow-300 px-5 text-sm font-black text-black transition hover:bg-white">
                      Continuar con la medida <ArrowRight className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="measure" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={motionConfig}>
                    <StepHeading eyebrow="Etapa 02" title="Dale una escala a tu proyecto." text={`Ingresa una referencia en ${unitLabel(service.unit)}. Después la confirmamos contigo.`} />
                    <div className="mt-7 rounded-[1.7rem] bg-black/28 p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-5">
                        <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-yellow-300">Servicio elegido</p><h3 className="mt-2 text-xl font-black">{service.title}</h3></div>
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-yellow-300 text-black"><Icon className="h-5 w-5" /></span>
                      </div>
                      <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {presetsFor(service).map((preset) => <button key={preset} type="button" onClick={() => setQuantity(preset)} className={`rounded-2xl px-3 py-3 text-left transition ${cleanQuantity === preset ? 'bg-yellow-300 text-black' : 'bg-white/[.06] text-white/70 hover:bg-white/[.11]'}`}><b className="block text-base font-black">{preset}</b><span className="mt-1 block text-[10px] font-bold uppercase tracking-[.12em] opacity-60">{service.unit}</span></button>)}
                      </div>
                      <label className="mt-6 block"><span className="text-[10px] font-black uppercase tracking-[.2em] text-white/40">Cantidad estimada</span><div className="mt-2 flex items-end gap-3 border-b border-white/15 pb-3 focus-within:border-yellow-300"><Ruler className="mb-2 h-5 w-5 text-yellow-300" /><input type="number" min="1" max="5000" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} inputMode="decimal" className="w-full bg-transparent text-5xl font-black tracking-[-.06em] text-white outline-none" /><b className="mb-2 text-sm text-yellow-300">{service.unit}</b></div></label>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <button type="button" onClick={() => setStep(1)} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-white/[.06] px-5 text-sm font-black text-white/75 transition hover:bg-white/[.11]"><ArrowLeft className="h-4 w-4" /> Cambiar servicio</button>
                      <button type="button" onClick={() => setStep(3)} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-yellow-300 px-5 text-sm font-black text-black transition hover:bg-white">Ver mi boleta <ChevronRight className="h-4 w-4" /></button>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div key="receipt" initial={{ opacity: 0, scale: .98, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, x: -24 }} transition={motionConfig}>
                    <StepHeading eyebrow="Etapa 03" title="Tu referencia está lista." text="Completa tus datos y la enviamos a WhatsApp para validar la cotización real." />
                    <Receipt service={service} quantity={cleanQuantity} low={low} high={high} middle={middle} />
                    <form onSubmit={openWhatsApp} className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Field label="Tu nombre" value={customer.name} onChange={(value) => setCustomer((current) => ({ ...current, name: value }))} placeholder="Nombre y apellido" required />
                      <Field label="Teléfono" value={customer.phone} onChange={(value) => setCustomer((current) => ({ ...current, phone: value }))} placeholder="+56 9..." required />
                      <Field label="Comuna o ciudad" value={customer.place} onChange={(value) => setCustomer((current) => ({ ...current, place: value }))} placeholder="Ej. Linares" />
                      <label className="block sm:col-span-2"><span className="text-[10px] font-black uppercase tracking-[.16em] text-white/42">Algo que debamos considerar</span><textarea value={customer.note} onChange={(event) => setCustomer((current) => ({ ...current, note: event.target.value }))} placeholder="Fotos, accesos, medidas exactas o fecha ideal…" className="mt-2 min-h-20 w-full resize-none rounded-2xl bg-black/30 px-4 py-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-yellow-300/60" /></label>
                      <button type="button" onClick={() => setStep(2)} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-white/[.06] px-5 text-sm font-black text-white/75 transition hover:bg-white/[.11]"><ArrowLeft className="h-4 w-4" /> Ajustar medida</button>
                      <button type="submit" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,#facc15,#fb923c)] px-5 text-sm font-black text-black transition hover:brightness-110"><MessageCircle className="h-4 w-4" /> Cotizar por WhatsApp</button>
                    </form>
                    <a href={`mailto:faubricioedms@gmail.com?subject=${encodeURIComponent(`Cálculo Fabrick: ${service.title}`)}&body=${encodeURIComponent(message)}`} className="mt-3 inline-flex w-full items-center justify-center gap-2 text-xs font-bold text-white/50 transition hover:text-yellow-200"><Mail className="h-4 w-4" /> Prefiero recibirlo por correo</a>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .store-scroll::-webkit-scrollbar { display: none; }
        .store-scroll { scrollbar-width: none; }
      `}</style>
    </section>
  );
}

function PerspectiveScene({ step, service, low, high }: { step: number; service: Service; low: number; high: number }) {
  const Icon = service.icon;
  return (
    <aside className="relative min-h-[420px] overflow-hidden rounded-[2rem] bg-[#19140d] shadow-[0_28px_85px_rgba(0,0,0,.38)] lg:min-h-full">
      <div aria-hidden className="absolute inset-0 bg-cover bg-center opacity-45 mix-blend-luminosity" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1400&q=82')" }} />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,4,4,.12),rgba(6,5,4,.9)),radial-gradient(circle_at_80%_18%,rgba(250,204,21,.32),transparent_25rem)]" />
      <div className="relative flex h-full min-h-[420px] flex-col justify-between p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[10px] font-black uppercase tracking-[.26em] text-yellow-200">Visor de recorrido</p><p className="mt-2 text-sm font-semibold text-white/64">La escena cambia mientras avanzas.</p></div>
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-yellow-300 text-black"><Icon className="h-5 w-5" /></span>
        </div>

        <div className="relative mx-auto my-8 h-48 w-full max-w-sm [perspective:900px] sm:h-56">
          <div className={`absolute inset-x-[12%] bottom-2 h-[72%] bg-[linear-gradient(135deg,rgba(250,204,21,.34),rgba(255,255,255,.04))] shadow-[0_24px_40px_rgba(0,0,0,.5)] transition duration-700 [transform:rotateX(58deg)_rotateZ(-30deg)] ${step === 1 ? 'translate-y-5 opacity-55' : step === 2 ? 'translate-y-1 opacity-85' : '-translate-y-3 opacity-100'}`} />
          <div className={`absolute bottom-[26%] left-[25%] h-[40%] w-[54%] bg-[linear-gradient(135deg,#33250e,#13100a)] shadow-[20px_20px_30px_rgba(0,0,0,.42)] transition duration-700 [transform:rotateY(-30deg)_rotateX(7deg)] ${step === 1 ? 'scale-90 opacity-55' : step === 2 ? 'scale-100 opacity-85' : 'scale-110 opacity-100'}`} />
          <div className={`absolute bottom-[56%] left-[20%] h-0 w-0 border-b-[72px] border-l-[92px] border-r-[92px] border-b-[#facc15]/75 border-l-transparent border-r-transparent drop-shadow-[0_14px_12px_rgba(0,0,0,.38)] transition duration-700 ${step === 3 ? '-translate-y-2' : 'translate-y-3'}`} />
          <div className="absolute bottom-[39%] left-[44%] h-11 w-8 rounded-t-full bg-yellow-200/40 shadow-[0_0_24px_rgba(250,204,21,.25)]" />
          <div className={`absolute left-[8%] top-[8%] h-2 w-2 rounded-full bg-yellow-300 shadow-[0_0_18px_rgba(250,204,21,1)] transition duration-700 ${step === 1 ? 'translate-x-0 translate-y-0' : step === 2 ? 'translate-x-32 translate-y-16' : 'translate-x-60 translate-y-4'}`} />
        </div>

        <div className="rounded-[1.45rem] bg-black/42 p-4 backdrop-blur-xl">
          <p className="text-[9px] font-black uppercase tracking-[.19em] text-yellow-200">Vista {step} de 3</p>
          <h2 className="mt-2 text-xl font-black">{step === 1 ? 'Encuentra el servicio.' : step === 2 ? 'Dale una escala.' : 'Revisa la inversión.'}</h2>
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/10 pt-4 text-xs"><span className="text-white/55">{service.short}</span><b className="text-yellow-200">{formatCLP(low)} – {formatCLP(high)}</b></div>
        </div>
      </div>
    </aside>
  );
}

function StepHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <div><p className="text-[10px] font-black uppercase tracking-[.24em] text-yellow-300">{eyebrow}</p><h2 className="mt-3 text-2xl font-black tracking-[-.05em] text-white sm:text-3xl">{title}</h2><p className="mt-3 text-sm leading-6 text-white/57">{text}</p></div>;
}

function ServiceScope({ service }: { service: Service }) {
  return <div className="mt-5 rounded-[1.4rem] bg-black/28 p-4"><p className="text-[10px] font-black uppercase tracking-[.2em] text-yellow-300">Incluye en esta referencia</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{service.includes.map((item) => <p key={item} className="flex gap-2 text-xs leading-5 text-white/68"><Check className="h-4 w-4 shrink-0 text-yellow-300" />{item}</p>)}</div>{service.note && <p className="mt-3 text-[11px] leading-5 text-yellow-100/60">{service.note}</p>}</div>;
}

function Receipt({ service, quantity, low, high, middle }: { service: Service; quantity: number; low: number; high: number; middle: number }) {
  return <article className="receipt mt-6 overflow-hidden rounded-t-[1.6rem] bg-[#fff4dd] px-5 pb-8 pt-6 text-[#17120c] shadow-[0_20px_55px_rgba(0,0,0,.25)]"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#9b6508]">Boleta referencial</p><h3 className="mt-2 text-xl font-black">Soluciones Fabrick</h3><p className="mt-1 text-[11px] text-[#6f604b]">No es documento tributario</p></div><span className="grid h-10 w-10 place-items-center rounded-full bg-[#17120c] text-yellow-300"><Ruler className="h-4 w-4" /></span></div><div className="my-5 border-t border-dashed border-black/20" /><p className="font-black">{service.title}</p><p className="mt-1 text-xs text-[#6f604b]">{quantity} {service.unit}</p><div className="my-5 border-t border-dashed border-black/20" /><ReceiptLine label="Desde" value={formatCLP(low)} /><ReceiptLine label="Hasta" value={formatCLP(high)} /><ReceiptLine label="Media orientativa" value={formatCLP(middle)} strong /><div className="mt-5 rounded-2xl bg-[#17120c] p-4 text-[#fff4dd]"><p className="text-[9px] font-black uppercase tracking-[.19em] text-yellow-300">Considera</p>{service.includes.slice(0, 3).map((item) => <p key={item} className="mt-2 flex gap-2 text-[11px] leading-4 text-white/65"><Check className="h-3.5 w-3.5 shrink-0 text-yellow-300" />{item}</p>)}</div><p className="mt-5 text-[10px] leading-4 text-[#6f604b]">El precio final depende de ubicación, acceso, estado existente, materiales y partidas adicionales. Lo validamos antes de iniciar.</p></article>;
}

function ReceiptLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className="mt-3 flex items-center justify-between gap-4 text-xs"><span className="text-[#6f604b]">{label}</span><b className={strong ? 'text-[#17120c]' : 'text-[#3d3020]'}>{value}</b></div>;
}

function Field({ label, value, onChange, placeholder, required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; required?: boolean }) {
  return <label className="block"><span className="text-[10px] font-black uppercase tracking-[.16em] text-white/42">{label}</span><input required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-2xl bg-black/30 px-4 py-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-yellow-300/60" /></label>;
}

export function PublicBudgetBottomNav() {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-[1.35rem] bg-[#11100d]/92 p-2 text-white shadow-[0_20px_70px_rgba(0,0,0,.55)] ring-1 ring-white/12 backdrop-blur-xl sm:hidden" aria-label="Navegación de presupuesto">
      <Link href="/" className="grid min-h-12 place-items-center rounded-xl text-[10px] font-black uppercase tracking-[.1em] text-white/45"><Home className="h-5 w-5" /><span>Inicio</span></Link>
      <a href="#calculadora-universal" className="grid min-h-12 place-items-center rounded-xl bg-yellow-300 text-[10px] font-black uppercase tracking-[.1em] text-black"><Ruler className="h-5 w-5" /><span>Calcular</span></a>
      <Link href="/tienda" className="grid min-h-12 place-items-center rounded-xl text-[10px] font-black uppercase tracking-[.1em] text-white/45"><Blocks className="h-5 w-5" /><span>Tienda</span></Link>
      <a href={buildWhatsAppLink('Hola Soluciones Fabrick, necesito orientación para un servicio de mi hogar.')} target="_blank" rel="noopener noreferrer" className="grid min-h-12 place-items-center rounded-xl text-[10px] font-black uppercase tracking-[.1em] text-white/45"><MessageCircle className="h-5 w-5" /><span>WhatsApp</span></a>
    </nav>
  );
}
