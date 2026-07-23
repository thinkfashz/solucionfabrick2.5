'use client';

import { type FormEvent, useMemo, useState } from 'react';
import {
  AirVent,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  CircleCheck,
  ClipboardList,
  Fence,
  Hammer,
  Home,
  HousePlug,
  Info,
  Layers3,
  PackageCheck,
  PaintRoller,
  Ruler,
  Send,
  ShieldCheck,
  Sparkles,
  TentTree,
  type LucideIcon,
} from 'lucide-react';

type Unit = 'm2' | 'ml' | 'unidad' | 'punto';
type Group = 'Kits y viviendas' | 'Instalaciones' | 'Exterior y estructura';

type Service = {
  id: string;
  name: string;
  short: string;
  group: Group;
  unit: Unit;
  low: number;
  high: number;
  defaultQuantity: number;
  icon: LucideIcon;
  summary: string;
  includes: string[];
  note: string;
};

const SERVICES: Service[] = [
  {
    id: 'kit-basico',
    name: 'Kit prefabricado básico',
    short: 'Kit básico',
    group: 'Kits y viviendas',
    unit: 'm2',
    low: 160000,
    high: 230000,
    defaultQuantity: 36,
    icon: PackageCheck,
    summary: 'Una estructura base para construir y avanzar por etapas.',
    includes: ['Paneles interiores y exteriores forrados por una cara', 'Cerchas en madera o Metalcon según definición', 'Zinc 0,35 mm, costaneras y estructura principal'],
    note: 'No incluye fundaciones, montaje, traslado, ventanas, puertas ni instalaciones.',
  },
  {
    id: 'kit-avanzado',
    name: 'Kit prefabricado avanzado',
    short: 'Kit avanzado',
    group: 'Kits y viviendas',
    unit: 'm2',
    low: 320000,
    high: 460000,
    defaultQuantity: 54,
    icon: Layers3,
    summary: 'Una solución más completa para reducir trabajos posteriores.',
    includes: ['Todo lo incluido en el kit básico', 'Ventanas estándar y puertas interiores', 'Forro interior, cielos y puntos eléctricos básicos'],
    note: 'No incluye fundaciones, fosa, conexiones exteriores, pisos ni pintura.',
  },
  {
    id: 'llave-en-mano',
    name: 'Casa llave en mano estándar',
    short: 'Llave en mano',
    group: 'Kits y viviendas',
    unit: 'm2',
    low: 540000,
    high: 780000,
    defaultQuantity: 72,
    icon: Home,
    summary: 'Vivienda terminada con redes interiores y estándar acordado.',
    includes: ['Todo lo incluido en el kit avanzado', 'Cerámica o porcelanato de marca acordada', 'Pintura y redes interiores listas para conectar'],
    note: 'No incluye fosa séptica, pozo, empalmes exteriores, permisos ni obras especiales de terreno.',
  },
  {
    id: 'montaje-kit',
    name: 'Instalación de kit prefabricado',
    short: 'Montaje de kit',
    group: 'Instalaciones',
    unit: 'm2',
    low: 45000,
    high: 75000,
    defaultQuantity: 36,
    icon: Hammer,
    summary: 'Montaje técnico de estructura y componentes definidos.',
    includes: ['Revisión previa del kit y área de montaje', 'Armado de estructura según alcance', 'Fijaciones y orden de trabajo base'],
    note: 'Altura, acceso, fundación disponible y modelo cambian el valor final.',
  },
  {
    id: 'radier',
    name: 'Radier para vivienda o ampliación',
    short: 'Radier',
    group: 'Exterior y estructura',
    unit: 'm2',
    low: 39000,
    high: 96000,
    defaultQuantity: 24,
    icon: Layers3,
    summary: 'Base calculada por superficie, espesor y nivel de refuerzo.',
    includes: ['Hormigón y base estimados', 'Preparación y nivelación según plan', 'Alternativa estándar o reforzada'],
    note: 'Excavación, pendientes, resistencia, acceso y transporte se validan en terreno.',
  },
  {
    id: 'fosa-septica',
    name: 'Instalación de fosa séptica',
    short: 'Fosa séptica',
    group: 'Instalaciones',
    unit: 'unidad',
    low: 900000,
    high: 1800000,
    defaultQuantity: 1,
    icon: ShieldCheck,
    summary: 'Solución sanitaria exterior según terreno y capacidad.',
    includes: ['Revisión técnica inicial', 'Excavación y nivelación según alcance', 'Instalación y conexión definida en cotización'],
    note: 'Capacidad, terreno, distancia, permisos y disposición final se confirman antes de iniciar.',
  },
  {
    id: 'siding',
    name: 'Instalación de revestimiento siding',
    short: 'Revestimiento siding',
    group: 'Instalaciones',
    unit: 'm2',
    low: 35000,
    high: 65000,
    defaultQuantity: 30,
    icon: PaintRoller,
    summary: 'Fachada renovada, protegida y con terminación definida.',
    includes: ['Revisión de superficie existente', 'Fijación e instalación de siding', 'Remates estándar definidos en el alcance'],
    note: 'Aislación, humedad, retiro previo, altura y reparaciones se revisan en terreno.',
  },
  {
    id: 'techumbre',
    name: 'Instalación o renovación de techumbre',
    short: 'Techumbre',
    group: 'Exterior y estructura',
    unit: 'm2',
    low: 55000,
    high: 95000,
    defaultQuantity: 45,
    icon: HousePlug,
    summary: 'Cubierta y protección para el área que necesitas intervenir.',
    includes: ['Evaluación de estructura existente', 'Cubierta y fijaciones según propuesta', 'Remates básicos del área intervenida'],
    note: 'Canaletas, aislación, reparación estructural, altura y acceso se revisan aparte.',
  },
  {
    id: 'aire',
    name: 'Instalación de aire acondicionado',
    short: 'Aire acondicionado',
    group: 'Instalaciones',
    unit: 'unidad',
    low: 130000,
    high: 240000,
    defaultQuantity: 1,
    icon: AirVent,
    summary: 'Instalación profesional para equipo split y recorrido estándar.',
    includes: ['Montaje de unidad interior y exterior', 'Tubería y cableado en recorrido estándar', 'Prueba básica de funcionamiento'],
    note: 'Equipo, metros extra, altura, canaleta y obras eléctricas se validan en visita.',
  },
  {
    id: 'electricidad',
    name: 'Instalación eléctrica domiciliaria',
    short: 'Electricidad',
    group: 'Instalaciones',
    unit: 'punto',
    low: 35000,
    high: 85000,
    defaultQuantity: 8,
    icon: HousePlug,
    summary: 'Puntos eléctricos para habilitar y ordenar tus espacios.',
    includes: ['Puntos considerados en propuesta', 'Canalización y accesorios estándar', 'Pruebas básicas de operación'],
    note: 'Tablero, aumento de carga, distancias, muros y certificaciones se revisan aparte.',
  },
  {
    id: 'cierre',
    name: 'Cierre perimetral',
    short: 'Cierre perimetral',
    group: 'Exterior y estructura',
    unit: 'ml',
    low: 45000,
    high: 90000,
    defaultQuantity: 20,
    icon: Fence,
    summary: 'Delimitación y protección según el trazado de tu terreno.',
    includes: ['Trazado del tramo a intervenir', 'Postes y estructura según propuesta', 'Instalación del cierre definido'],
    note: 'Portones, desniveles, tipo de suelo y material final se confirman al evaluar el lugar.',
  },
];

const GROUPS: Group[] = ['Kits y viviendas', 'Instalaciones', 'Exterior y estructura'];
const PRESETS = [
  { label: 'Cabaña', value: 15, icon: TentTree },
  { label: 'Compacta', value: 36, icon: Home },
  { label: 'Familiar', value: 54, icon: Home },
  { label: 'Ampliada', value: 72, icon: Home },
];

const money = (value: number) => new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
}).format(Math.round(value || 0));

const unitLabel = (unit: Unit) => ({ m2: 'm²', ml: 'ml', unidad: 'unidad', punto: 'punto' }[unit]);
const quantityLabel = (unit: Unit) => unit === 'm2'
  ? 'Superficie aproximada'
  : unit === 'ml'
    ? 'Metros lineales'
    : unit === 'punto'
      ? 'Cantidad de puntos'
      : 'Cantidad de unidades';

export default function ConstructionM2Calculator() {
  const [serviceId, setServiceId] = useState('kit-basico');
  const [showServices, setShowServices] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [quantity, setQuantity] = useState(36);
  const [customer, setCustomer] = useState({ name: '', phone: '', place: '', detail: '' });
  const [sent, setSent] = useState(false);

  const service = SERVICES.find((item) => item.id === serviceId) ?? SERVICES[0];
  const Icon = service.icon;
  const cleanQuantity = Math.max(service.unit === 'unidad' ? 1 : 0, Math.min(5000, Number(quantity) || 0));
  const low = cleanQuantity * service.low;
  const high = cleanQuantity * service.high;
  const average = (low + high) / 2;

  const message = useMemo(() => [
    'Hola Soluciones Fabrick, quiero una cotización real.',
    '',
    `Servicio: ${service.name}`,
    `${quantityLabel(service.unit)}: ${cleanQuantity} ${unitLabel(service.unit)}`,
    `Rango referencial mostrado: ${money(low)} a ${money(high)}`,
    customer.name && `Nombre: ${customer.name}`,
    customer.phone && `Teléfono: ${customer.phone}`,
    customer.place && `Comuna / ubicación: ${customer.place}`,
    customer.detail && `Detalle: ${customer.detail}`,
    '',
    'Entiendo que es una referencia y quiero validar alcance, visita y precio final.',
  ].filter(Boolean).join('\n'), [cleanQuantity, customer, high, low, service]);

  const choose = (next: Service) => {
    setServiceId(next.id);
    setQuantity(next.defaultQuantity);
    setShowServices(false);
    setSent(false);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
    window.open(`https://wa.me/56930121625?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <section id="calculadora-m2" className="relative overflow-hidden bg-[#0a0805] px-4 py-14 text-white sm:px-6 lg:px-8 lg:py-18">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div data-parallax="-10" className="absolute -left-36 top-10 h-80 w-80 rounded-full bg-yellow-300/10 blur-[110px]" />
        <div data-parallax="9" className="absolute -right-36 top-24 h-[30rem] w-[30rem] rounded-full bg-orange-500/10 blur-[130px]" />
        <div className="absolute inset-0 opacity-[.035] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:64px_64px]" />
      </div>

      <div className="relative mx-auto max-w-[1280px]">
        <header data-reveal className="grid gap-5 lg:grid-cols-[.82fr_1.18fr] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-yellow-300/18 bg-yellow-300/[.07] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.25em] text-yellow-200">
              <Sparkles className="h-3.5 w-3.5" /> Calculadora Fabrick
            </p>
            <h2 className="mt-4 text-4xl font-black leading-[.95] tracking-[-.06em] sm:text-6xl" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>
              De una medida aproximada a una decisión más clara.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
            Selecciona el servicio, define el alcance y recibe una boleta referencial. Verás el rango, lo que considera y la información necesaria para solicitar una revisión real.
          </p>
        </header>

        <div data-reveal className="fabrick-glass mt-8 overflow-hidden rounded-[2rem]">
          <div className="grid lg:grid-cols-[210px_minmax(0,1fr)_360px]">
            <aside className="border-b border-white/10 bg-black/20 p-4 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-yellow-300 text-black"><ClipboardList className="h-5 w-5" /></span>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.2em] text-yellow-300">Ruta guiada</p>
                  <p className="mt-1 text-xs font-bold text-zinc-400">3 pasos · sin compromiso</p>
                </div>
              </div>

              <nav className="mt-5 grid grid-cols-3 gap-2 lg:grid-cols-1" aria-label="Pasos de la calculadora">
                {[
                  { number: 1 as const, label: 'Servicio', helper: 'Qué necesitas' },
                  { number: 2 as const, label: 'Medida', helper: 'Cuánto necesitas' },
                  { number: 3 as const, label: 'Contacto', helper: 'Validación real' },
                ].map((item) => {
                  const active = step === item.number;
                  const complete = step > item.number;
                  return (
                    <button
                      key={item.number}
                      type="button"
                      onClick={() => setStep(item.number)}
                      className={`rounded-2xl border p-3 text-left transition ${active ? 'border-yellow-300/35 bg-yellow-300 text-black' : complete ? 'border-emerald-300/20 bg-emerald-300/[.07] text-emerald-100' : 'border-white/8 bg-white/[.025] text-zinc-400 hover:bg-white/[.05]'}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <b className="text-[10px] uppercase tracking-[.16em]">0{item.number}</b>
                        {complete ? <CircleCheck className="h-3.5 w-3.5" /> : null}
                      </span>
                      <strong className="mt-2 block text-xs">{item.label}</strong>
                      <small className={`mt-1 hidden text-[9px] leading-4 lg:block ${active ? 'text-black/55' : 'text-zinc-600'}`}>{item.helper}</small>
                    </button>
                  );
                })}
              </nav>

              <div className="mt-4 hidden rounded-2xl border border-white/8 bg-white/[.025] p-3 text-[10px] leading-5 text-zinc-500 lg:block">
                <BadgeCheck className="mb-2 h-4 w-4 text-yellow-300" />
                El resultado es orientativo. Antes de iniciar se validan medidas, ubicación, acceso y partidas.
              </div>
            </aside>

            <div className="min-w-0 p-4 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.22em] text-zinc-500">Paso {step} de 3</p>
                  <h3 className="mt-1 text-xl font-black tracking-[-.035em]">
                    {step === 1 ? 'Selecciona tu solución' : step === 2 ? 'Define el alcance' : 'Solicita una revisión real'}
                  </h3>
                </div>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-yellow-300/[.09] text-yellow-300">
                  {step === 1 ? <Icon className="h-5 w-5" /> : step === 2 ? <Ruler className="h-5 w-5" /> : <Send className="h-5 w-5" />}
                </span>
              </div>

              {step === 1 ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowServices((current) => !current)}
                    className="flex w-full items-center justify-between gap-4 rounded-[1.45rem] border border-yellow-300/16 bg-[linear-gradient(135deg,rgba(250,204,21,.11),rgba(255,255,255,.025))] p-4 text-left transition hover:border-yellow-300/35"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-yellow-300 text-black"><Icon className="h-5 w-5" /></span>
                      <span className="min-w-0">
                        <span className="block text-[9px] font-black uppercase tracking-[.18em] text-yellow-300">Servicio seleccionado</span>
                        <strong className="mt-1 block truncate text-base">{service.name}</strong>
                        <span className="mt-1 block truncate text-xs text-zinc-500">{service.summary}</span>
                      </span>
                    </span>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[.06] text-yellow-200">
                      <ChevronDown className={`h-5 w-5 transition ${showServices ? 'rotate-180' : ''}`} />
                    </span>
                  </button>

                  {showServices ? (
                    <div className="mt-3 max-h-[430px] space-y-4 overflow-y-auto rounded-[1.45rem] border border-white/8 bg-black/25 p-3">
                      {GROUPS.map((group) => (
                        <div key={group}>
                          <p className="mb-2 px-1 text-[8px] font-black uppercase tracking-[.22em] text-zinc-600">{group}</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {SERVICES.filter((item) => item.group === group).map((item) => {
                              const ItemIcon = item.icon;
                              const active = item.id === service.id;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => choose(item)}
                                  className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition ${active ? 'border-yellow-300 bg-yellow-300 text-black' : 'border-white/7 bg-white/[.025] text-zinc-200 hover:border-white/16 hover:bg-white/[.055]'}`}
                                >
                                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${active ? 'bg-black/10' : 'bg-yellow-300/10 text-yellow-300'}`}><ItemIcon className="h-4 w-4" /></span>
                                  <span>
                                    <b className="block text-xs leading-5">{item.short}</b>
                                    <small className={`mt-0.5 block text-[9px] leading-4 ${active ? 'text-black/60' : 'text-zinc-600'}`}>{money(item.low)}–{money(item.high)} / {unitLabel(item.unit)}</small>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 rounded-[1.4rem] border border-white/8 bg-black/20 p-4">
                    <p className="text-[9px] font-black uppercase tracking-[.2em] text-yellow-300">Qué considera esta referencia</p>
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {service.includes.map((item) => (
                        <li key={item} className="flex gap-2 text-xs leading-5 text-zinc-300">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />{item}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 flex gap-2 border-t border-white/8 pt-3 text-[10px] leading-5 text-zinc-500">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />{service.note}
                    </p>
                  </div>

                  <button type="button" onClick={() => setStep(2)} className="fabrick-gradient-button mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black text-black">
                    Continuar con la medida <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="rounded-[1.45rem] border border-white/8 bg-black/20 p-4 sm:p-5">
                  <p className="text-sm leading-6 text-zinc-400">Usaremos esta medida para mostrar un rango comercial. No reemplaza la visita ni un levantamiento técnico.</p>

                  {service.unit === 'm2' ? (
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {PRESETS.map(({ label, value, icon: PresetIcon }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setQuantity(value)}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left transition ${cleanQuantity === value ? 'border-yellow-300 bg-yellow-300 text-black' : 'border-white/8 bg-white/[.035] text-zinc-300 hover:bg-white/[.07]'}`}
                        >
                          <PresetIcon className="h-4 w-4" />
                          <span><b className="block text-xs">{label}</b><small className={cleanQuantity === value ? 'text-black/55' : 'text-zinc-600'}>{value} m²</small></span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <label className="mt-4 block">
                    <span className="text-[9px] font-black uppercase tracking-[.2em] text-zinc-500">{quantityLabel(service.unit)}</span>
                    <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/8 bg-[#080705] px-4 py-3 focus-within:border-yellow-300/45">
                      <input
                        type="number"
                        min={service.unit === 'unidad' ? 1 : 0}
                        inputMode="decimal"
                        value={quantity || ''}
                        onChange={(event) => setQuantity(Number(event.target.value) || 0)}
                        className="w-full bg-transparent text-3xl font-black text-white outline-none"
                      />
                      <strong className="text-sm uppercase tracking-widest text-yellow-300">{unitLabel(service.unit)}</strong>
                    </div>
                  </label>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-white/8 bg-white/[.03] p-3">
                      <span className="text-[8px] font-black uppercase tracking-[.16em] text-zinc-600">Desde</span>
                      <b className="mt-1 block text-lg text-zinc-200">{money(low)}</b>
                    </div>
                    <div className="rounded-2xl border border-yellow-300/18 bg-yellow-300/[.07] p-3">
                      <span className="text-[8px] font-black uppercase tracking-[.16em] text-yellow-300">Hasta</span>
                      <b className="mt-1 block text-lg text-yellow-100">{money(high)}</b>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button type="button" onClick={() => setStep(1)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[.035] px-5 text-sm font-bold text-zinc-300">
                      <ArrowLeft className="h-4 w-4" /> Cambiar servicio
                    </button>
                    <button type="button" onClick={() => setStep(3)} disabled={!cleanQuantity} className="fabrick-gradient-button inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black text-black disabled:opacity-40">
                      Continuar con mis datos <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : null}

              {step === 3 ? (
                <form onSubmit={submit} className="rounded-[1.45rem] border border-white/8 bg-black/20 p-4 sm:p-5">
                  <p className="text-sm leading-6 text-zinc-400">Tus datos se usarán para abrir una solicitud completa en WhatsApp con el servicio, la medida y el rango que estás viendo.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Field label="Tu nombre" value={customer.name} onChange={(value) => setCustomer((current) => ({ ...current, name: value }))} placeholder="Nombre y apellido" required />
                    <Field label="Teléfono" value={customer.phone} onChange={(value) => setCustomer((current) => ({ ...current, phone: value }))} placeholder="+56 9..." required />
                    <Field label="Comuna o ciudad" value={customer.place} onChange={(value) => setCustomer((current) => ({ ...current, place: value }))} placeholder="Ej. Linares" required />
                  </div>
                  <label className="mt-3 block">
                    <span className="text-[9px] font-black uppercase tracking-[.18em] text-zinc-500">Cuéntanos lo esencial</span>
                    <textarea
                      value={customer.detail}
                      onChange={(event) => setCustomer((current) => ({ ...current, detail: event.target.value }))}
                      placeholder="Medidas, dirección aproximada, fotos disponibles o fecha ideal para comenzar…"
                      className="mt-2 min-h-24 w-full resize-y rounded-2xl border border-white/8 bg-[#080705] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-yellow-300/45"
                    />
                  </label>
                  <button type="submit" className="fabrick-gradient-button mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black text-black">
                    Enviar solicitud por WhatsApp <ArrowRight className="h-4 w-4" />
                  </button>
                  {sent ? (
                    <p className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-yellow-200">
                      <CircleCheck className="h-4 w-4" /> Abrimos WhatsApp con tu solicitud lista.
                    </p>
                  ) : null}
                  <button type="button" onClick={() => setStep(2)} className="mt-3 w-full text-xs font-bold text-zinc-600">Volver y modificar alcance</button>
                </form>
              ) : null}
            </div>

            <QuoteTicket service={service} quantity={cleanQuantity} low={low} high={high} average={average} />
          </div>
        </div>
      </div>
    </section>
  );
}

function QuoteTicket({ service, quantity, low, high, average }: { service: Service; quantity: number; low: number; high: number; average: number }) {
  const Icon = service.icon;
  return (
    <aside className="border-t border-white/10 bg-[#f7eedb] text-[#17120c] lg:border-l lg:border-t-0">
      <div className="sticky top-24 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[.23em] text-orange-700">Boleta referencial</p>
            <h3 className="mt-2 text-xl font-black tracking-[-.04em]">Soluciones Fabrick</h3>
            <p className="mt-1 text-[10px] text-[#6b5c4a]">Orientación comercial · no tributaria</p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#1a140d] text-yellow-300"><Icon className="h-4 w-4" /></span>
        </div>

        <div className="my-4 border-t border-dashed border-[#2d2519]/25" />
        <p className="text-sm font-black leading-5">{service.name}</p>
        <p className="mt-1 text-xs text-[#6b5c4a]">{quantity} {unitLabel(service.unit)}</p>
        <div className="my-4 border-t border-dashed border-[#2d2519]/25" />

        <div className="space-y-3 text-xs">
          <Line label="Alcance aproximado" value={`${quantity} ${unitLabel(service.unit)}`} />
          <Line label="Rango estimado" value={`${money(low)} – ${money(high)}`} />
          <Line label="Valor medio orientativo" value={money(average)} bold />
        </div>

        <div className="mt-5 rounded-2xl bg-[#1b160f] p-4 text-[#fff4dd]">
          <p className="text-[8px] font-black uppercase tracking-[.2em] text-yellow-300">Incluye en esta referencia</p>
          <ul className="mt-3 space-y-2">
            {service.includes.slice(0, 3).map((item) => (
              <li key={item} className="flex gap-2 text-[10px] leading-4 text-[#f6e8d3]/78"><Check className="h-3.5 w-3.5 shrink-0 text-yellow-300" />{item}</li>
            ))}
          </ul>
        </div>

        <p className="mt-4 text-[9px] leading-4 text-[#6b5c4a]">El precio final depende de ubicación, acceso, medidas, estado existente, materiales y partidas adicionales. Todo se confirma antes de iniciar.</p>
      </div>
    </aside>
  );
}

function Line({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[#6b5c4a]">{label}</span>
      <span className={`max-w-[58%] text-right ${bold ? 'font-black text-[#17120c]' : 'font-bold text-[#302719]'}`}>{value}</span>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-[9px] font-black uppercase tracking-[.18em] text-zinc-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-2 w-full rounded-2xl border border-white/8 bg-[#080705] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-yellow-300/45"
      />
    </label>
  );
}
