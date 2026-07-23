'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  AirVent,
  ArrowRight,
  Building2,
  Check,
  CircleDollarSign,
  Fence,
  Home,
  HousePlug,
  Info,
  Layers3,
  MessageCircle,
  Minus,
  PaintRoller,
  Plus,
  ReceiptText,
  Ruler,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

type Unit = 'm2' | 'ml' | 'unidad' | 'punto';

type Service = {
  id: string;
  name: string;
  unit: Unit;
  low: number;
  high: number;
  defaultQuantity: number;
  icon: LucideIcon;
  description: string;
  includes: string[];
  note: string;
};

const SERVICES: Service[] = [
  {
    id: 'casa-llave-en-mano',
    name: 'Casa llave en mano',
    unit: 'm2',
    low: 540000,
    high: 780000,
    defaultQuantity: 72,
    icon: Home,
    description: 'Vivienda terminada bajo un estándar acordado y con partidas coordinadas.',
    includes: ['Estructura y envolvente', 'Terminaciones interiores estándar', 'Redes interiores según propuesta'],
    note: 'Terreno, permisos, empalmes, fosa, pozo y obras especiales se cotizan después de la evaluación técnica.',
  },
  {
    id: 'kit-prefabricado',
    name: 'Kit prefabricado',
    unit: 'm2',
    low: 160000,
    high: 460000,
    defaultQuantity: 36,
    icon: Building2,
    description: 'Estructura preparada para avanzar por etapas según tu presupuesto.',
    includes: ['Paneles y estructura principal', 'Cerchas y cubierta según nivel elegido', 'Despiece definido para montaje'],
    note: 'Fundación, montaje, traslado, puertas, ventanas e instalaciones dependen del nivel contratado.',
  },
  {
    id: 'remodelacion',
    name: 'Remodelación o ampliación',
    unit: 'm2',
    low: 320000,
    high: 620000,
    defaultQuantity: 20,
    icon: PaintRoller,
    description: 'Transformación de espacios con estructura, terminaciones e instalaciones coordinadas.',
    includes: ['Demoliciones menores definidas', 'Obra gruesa y terminaciones acordadas', 'Coordinación de especialidades'],
    note: 'El estado existente, las interferencias y el nivel de terminación pueden modificar el rango.',
  },
  {
    id: 'radier',
    name: 'Radier y base de hormigón',
    unit: 'm2',
    low: 39000,
    high: 96000,
    defaultQuantity: 25,
    icon: Layers3,
    description: 'Base dimensionada según superficie, espesor, preparación y refuerzo.',
    includes: ['Preparación y nivelación base', 'Hormigón según alcance', 'Alternativa estándar o reforzada'],
    note: 'Excavación, pendientes, acceso de camión, resistencia y transporte se validan antes de cotizar.',
  },
  {
    id: 'techumbre',
    name: 'Techumbre y filtraciones',
    unit: 'm2',
    low: 55000,
    high: 110000,
    defaultQuantity: 45,
    icon: HousePlug,
    description: 'Reparación o renovación de cubierta, fijaciones, sellos y remates.',
    includes: ['Revisión de la cubierta', 'Materiales y fijaciones acordados', 'Remates básicos del área intervenida'],
    note: 'Canaletas, aislación, daño estructural, altura y accesos especiales se revisan por separado.',
  },
  {
    id: 'gasfiteria',
    name: 'Gasfitería y sanitarios',
    unit: 'punto',
    low: 45000,
    high: 120000,
    defaultQuantity: 4,
    icon: ShieldCheck,
    description: 'Habilitación, reparación o renovación de puntos de agua y desagüe.',
    includes: ['Puntos definidos en la propuesta', 'Tuberías y accesorios estándar', 'Pruebas básicas de funcionamiento'],
    note: 'Roturas, trazados ocultos, artefactos y reparación de terminaciones se confirman al revisar el lugar.',
  },
  {
    id: 'electricidad',
    name: 'Electricidad domiciliaria',
    unit: 'punto',
    low: 35000,
    high: 85000,
    defaultQuantity: 8,
    icon: HousePlug,
    description: 'Puntos, canalización e iluminación para habilitar o actualizar tus espacios.',
    includes: ['Puntos incluidos en el cálculo', 'Canalización y accesorios estándar', 'Pruebas básicas de operación'],
    note: 'Tablero, aumento de carga, certificación, distancias y muros especiales se revisan aparte.',
  },
  {
    id: 'aire-acondicionado',
    name: 'Instalación de aire acondicionado',
    unit: 'unidad',
    low: 130000,
    high: 260000,
    defaultQuantity: 1,
    icon: AirVent,
    description: 'Montaje de equipos split con recorrido estándar y prueba de funcionamiento.',
    includes: ['Unidad interior y exterior', 'Tubería y cableado estándar', 'Puesta en marcha básica'],
    note: 'El equipo, metros adicionales, altura, canaletas y adecuaciones eléctricas se cotizan según el caso.',
  },
  {
    id: 'cierre-perimetral',
    name: 'Cierre perimetral',
    unit: 'ml',
    low: 45000,
    high: 90000,
    defaultQuantity: 20,
    icon: Fence,
    description: 'Delimitación del terreno con estructura y terminación según necesidad.',
    includes: ['Trazado del tramo', 'Postes y estructura definida', 'Instalación del cierre acordado'],
    note: 'Portones, desniveles, tipo de suelo y material final se confirman en la evaluación.',
  },
];

const AREA_PRESETS = [15, 36, 54, 72] as const;

const money = (value: number) => new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
}).format(Math.round(value || 0));

const unitLabel = (unit: Unit) => ({ m2: 'm²', ml: 'ml', unidad: 'unidad', punto: 'punto' }[unit]);

const quantityLabel = (unit: Unit) => {
  if (unit === 'm2') return 'Superficie aproximada';
  if (unit === 'ml') return 'Metros lineales';
  if (unit === 'punto') return 'Cantidad de puntos';
  return 'Cantidad de unidades';
};

export default function ConstructionM2Calculator() {
  const [serviceId, setServiceId] = useState(SERVICES[0].id);
  const [quantity, setQuantity] = useState(SERVICES[0].defaultQuantity);

  const service = SERVICES.find((item) => item.id === serviceId) ?? SERVICES[0];
  const Icon = service.icon;
  const minimum = service.unit === 'unidad' || service.unit === 'punto' ? 1 : 0;
  const cleanQuantity = Math.max(minimum, Math.min(5000, Number(quantity) || 0));
  const low = cleanQuantity * service.low;
  const high = cleanQuantity * service.high;
  const step = 1;

  const reference = useMemo(() => {
    const compactService = service.id
      .split('-')
      .map((part) => part.slice(0, 2).toUpperCase())
      .join('')
      .slice(0, 8);
    return `FBK-${compactService}-${String(Math.round(cleanQuantity)).padStart(3, '0')}`;
  }, [cleanQuantity, service.id]);

  const whatsappMessage = useMemo(() => [
    'Hola Soluciones Fabrick, quiero revisar este cálculo.',
    '',
    `Referencia: ${reference}`,
    `Servicio: ${service.name}`,
    `${quantityLabel(service.unit)}: ${cleanQuantity} ${unitLabel(service.unit)}`,
    `Rango mostrado: ${money(low)} a ${money(high)}`,
    '',
    'Quiero confirmar alcance, ubicación y precio final.',
  ].join('\n'), [cleanQuantity, high, low, reference, service]);

  const chooseService = (nextId: string) => {
    const next = SERVICES.find((item) => item.id === nextId) ?? SERVICES[0];
    setServiceId(next.id);
    setQuantity(next.defaultQuantity);
  };

  const decrease = () => setQuantity(Math.max(minimum, cleanQuantity - step));
  const increase = () => setQuantity(Math.min(5000, cleanQuantity + step));

  return (
    <section id="cotizador" className="relative overflow-hidden bg-[#f3ecdf] px-4 py-16 text-[#17120c] sm:px-6 lg:px-8 lg:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(250,204,21,.2),transparent_26%),radial-gradient(circle_at_90%_78%,rgba(249,115,22,.13),transparent_30%)]" />

      <div className="relative mx-auto max-w-[1260px]">
        <header data-reveal className="grid gap-5 lg:grid-cols-[.82fr_1.18fr] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.24em] text-orange-700">Cotizador inicial</p>
            <h2 className="mt-3 text-4xl font-black leading-[.96] tracking-[-.055em] sm:text-6xl" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>
              Calcula un rango antes de comprometer tu inversión.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-[#6c5d49] sm:text-base">
            Selecciona el trabajo y agrega una medida aproximada. El resultado sirve para comparar alternativas y preparar una conversación útil; el precio definitivo se confirma con medidas, ubicación y condiciones reales.
          </p>
        </header>

        <div data-reveal className="mt-8 grid overflow-hidden rounded-[2.25rem] bg-white shadow-[0_32px_100px_rgba(70,48,22,.16)] lg:grid-cols-[minmax(0,1.08fr)_minmax(370px,.72fr)]">
          <div className="p-5 sm:p-7 lg:p-8">
            <div className="flex items-center gap-3 pb-2">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#17120c] text-yellow-300"><Ruler className="h-5 w-5" /></span>
              <div>
                <p className="text-sm font-black">Configura tu referencia</p>
                <p className="mt-1 text-xs text-[#7a6a55]">Elige una solución y ajusta la medida del proyecto.</p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#7a6a55]">¿Qué necesitas resolver?</p>
                  <p className="mt-1 text-xs text-[#9a896f]">Desliza las opciones en móvil o selecciona una tarjeta.</p>
                </div>
                <span className="hidden rounded-full bg-[#17120c] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.15em] text-yellow-300 sm:inline">{SERVICES.length} soluciones</span>
              </div>

              <div className="-mx-1 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-3 [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
                {SERVICES.map((item) => {
                  const ItemIcon = item.icon;
                  const active = item.id === serviceId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => chooseService(item.id)}
                      className={`group min-w-[78%] snap-center rounded-[1.35rem] p-4 text-left shadow-[0_10px_28px_rgba(55,37,18,.06)] transition duration-300 sm:min-w-0 ${active ? 'scale-[1.01] bg-[#17120c] text-white shadow-[0_18px_42px_rgba(23,18,12,.22)]' : 'bg-[#faf6ee] text-[#342719] hover:-translate-y-0.5 hover:bg-[#f7edda]'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className={`grid h-10 w-10 place-items-center rounded-full transition ${active ? 'bg-yellow-300 text-black' : 'bg-white text-orange-700 shadow-sm'}`}><ItemIcon className="h-4 w-4" /></span>
                        <span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-[.12em] ${active ? 'bg-white/10 text-yellow-200' : 'bg-white text-[#8c775d]'}`}>{unitLabel(item.unit)}</span>
                      </div>
                      <strong className="mt-4 block text-sm leading-5">{item.name}</strong>
                      <span className={`mt-2 block text-[9px] leading-4 ${active ? 'text-zinc-400' : 'text-[#927e64]'}`}>{money(item.low)}–{money(item.high)} / {unitLabel(item.unit)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 rounded-[1.6rem] bg-[linear-gradient(135deg,#fff8e9,#f7ebd4)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.85)] sm:p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-yellow-300 text-black"><Icon className="h-5 w-5" /></span>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.16em] text-orange-700">Solución seleccionada</p>
                  <h3 className="mt-1 text-lg font-black">{service.name}</h3>
                  <p className="mt-2 text-xs leading-5 text-[#74634e]">{service.description}</p>
                </div>
              </div>
            </div>

            {service.unit === 'm2' ? (
              <div className="mt-5">
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#7a6a55]">Medidas frecuentes</p>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {AREA_PRESETS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setQuantity(value)}
                      className={`rounded-xl px-2 py-3 text-xs font-black transition ${cleanQuantity === value ? 'bg-[#17120c] text-yellow-300 shadow-[0_10px_24px_rgba(23,18,12,.18)]' : 'bg-[#faf6ee] text-[#5d4d39] hover:bg-[#f4e5ca]'}`}
                    >
                      {value} m²
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-5">
              <span className="text-[10px] font-black uppercase tracking-[.18em] text-[#7a6a55]">{quantityLabel(service.unit)}</span>
              <div className="mt-2 grid grid-cols-[52px_1fr_52px] items-center gap-2 rounded-[1.5rem] bg-[#faf6ee] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,.9)]">
                <button type="button" onClick={decrease} aria-label="Disminuir cantidad" className="grid h-12 w-12 place-items-center rounded-full bg-white text-[#17120c] shadow-sm transition hover:bg-yellow-300"><Minus className="h-4 w-4" /></button>
                <label className="flex min-w-0 items-center justify-center gap-3 px-2">
                  <input
                    type="number"
                    min={minimum}
                    inputMode="decimal"
                    value={quantity || ''}
                    onChange={(event) => setQuantity(Number(event.target.value) || 0)}
                    className="min-w-0 max-w-[170px] bg-transparent text-center text-3xl font-black text-[#17120c] outline-none"
                  />
                  <strong className="shrink-0 text-sm uppercase tracking-widest text-orange-700">{unitLabel(service.unit)}</strong>
                </label>
                <button type="button" onClick={increase} aria-label="Aumentar cantidad" className="grid h-12 w-12 place-items-center rounded-full bg-[#17120c] text-yellow-300 shadow-sm transition hover:bg-yellow-300 hover:text-black"><Plus className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="mt-5 rounded-[1.35rem] bg-orange-50 px-4 py-3.5">
              <p className="flex gap-2 text-xs leading-5 text-[#6b4b2d]"><Info className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />{service.note}</p>
            </div>
          </div>

          <aside className="relative overflow-hidden bg-[linear-gradient(160deg,#1b150e_0%,#100d09_55%,#070605_100%)] p-5 text-white sm:p-7 lg:p-8">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-yellow-300/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-20 h-60 w-60 rounded-full bg-orange-500/10 blur-3xl" />

            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.23em] text-yellow-300">Estimación preliminar</p>
                  <h3 className="mt-2 text-2xl font-black tracking-[-.04em]">Recibo de cálculo</h3>
                </div>
                <span className="grid h-12 w-12 place-items-center rounded-full bg-yellow-300 text-black shadow-[0_12px_34px_rgba(250,204,21,.18)]"><ReceiptText className="h-5 w-5" /></span>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-full bg-white/[.065] px-4 py-2.5 text-[9px] font-black uppercase tracking-[.13em] text-zinc-400">
                <span>Referencia</span>
                <span className="text-yellow-200">{reference}</span>
              </div>

              <div className="mt-5 rounded-[1.5rem] bg-white/[.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
                <ReceiptRow label="Servicio" value={service.name} />
                <ReceiptRow label={quantityLabel(service.unit)} value={`${cleanQuantity} ${unitLabel(service.unit)}`} />
                <ReceiptRow label="Tarifa referencial" value={`${money(service.low)}–${money(service.high)} / ${unitLabel(service.unit)}`} last />
              </div>

              <div className="mt-4 overflow-hidden rounded-[1.7rem] bg-[linear-gradient(135deg,#fde047,#fb923c)] p-5 text-black shadow-[0_22px_54px_rgba(249,115,22,.18)]">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.17em] text-black/60"><Sparkles className="h-4 w-4" /> Rango estimado del proyecto</div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-[.15em] text-black/55">Desde</span>
                    <strong className="mt-1 block text-2xl font-black tracking-[-.045em]">{money(low)}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-[.15em] text-black/55">Hasta</span>
                    <strong className="mt-1 block text-2xl font-black tracking-[-.045em]">{money(high)}</strong>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.2em] text-yellow-300"><CircleDollarSign className="h-4 w-4" /> Esta referencia considera</div>
                <ul className="mt-3 grid gap-2">
                  {service.includes.map((item) => (
                    <li key={item} className="flex gap-2 rounded-xl bg-white/[.045] px-3 py-2.5 text-xs leading-5 text-zinc-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />{item}</li>
                  ))}
                </ul>
              </div>

              <p className="mt-5 rounded-[1.25rem] bg-white/[.045] px-4 py-3 text-[10px] leading-5 text-zinc-500">
                Este recibo funciona como referencia inicial. El valor final se confirma al revisar ubicación, acceso, medidas, materialidad y condiciones existentes.
              </p>

              <a
                href={`https://wa.me/56930121625?text=${encodeURIComponent(whatsappMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="fabrick-gradient-button mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black text-black"
              >
                Revisar por WhatsApp <MessageCircle className="h-4 w-4" />
              </a>

              <Link href="/presupuesto" className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/[.075] px-5 text-xs font-black text-white transition hover:bg-white/[.13]">
                Abrir presupuesto detallado <ArrowRight className="h-4 w-4" />
              </Link>

              <p className="mt-4 text-center text-[10px] leading-5 text-zinc-600">Sin pago ni compromiso para revisar el cálculo.</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function ReceiptRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`grid gap-1 py-3 sm:grid-cols-[120px_1fr] sm:items-start ${last ? '' : 'border-b border-white/8'}`}>
      <span className="text-[9px] font-black uppercase tracking-[.14em] text-zinc-500">{label}</span>
      <strong className="text-xs leading-5 text-zinc-100 sm:text-right">{value}</strong>
    </div>
  );
}
