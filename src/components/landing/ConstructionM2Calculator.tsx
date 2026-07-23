'use client';

import { useMemo, useState } from 'react';
import {
  AirVent,
  Building2,
  Check,
  ChevronDown,
  CircleDollarSign,
  Fence,
  Home,
  HousePlug,
  Info,
  Layers3,
  MessageCircle,
  PaintRoller,
  Ruler,
  ShieldCheck,
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

  const whatsappMessage = useMemo(() => [
    'Hola Soluciones Fabrick, quiero revisar este cálculo.',
    '',
    `Servicio: ${service.name}`,
    `${quantityLabel(service.unit)}: ${cleanQuantity} ${unitLabel(service.unit)}`,
    `Rango mostrado: ${money(low)} a ${money(high)}`,
    '',
    'Quiero confirmar alcance, ubicación y precio final.',
  ].join('\n'), [cleanQuantity, high, low, service]);

  const chooseService = (nextId: string) => {
    const next = SERVICES.find((item) => item.id === nextId) ?? SERVICES[0];
    setServiceId(next.id);
    setQuantity(next.defaultQuantity);
  };

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

        <div data-reveal className="mt-8 grid overflow-hidden rounded-[2rem] border border-[#2f2518]/10 bg-white shadow-[0_30px_90px_rgba(70,48,22,.13)] lg:grid-cols-[minmax(0,1.08fr)_minmax(350px,.72fr)]">
          <div className="p-5 sm:p-7 lg:p-8">
            <div className="flex items-center gap-3 border-b border-[#2f2518]/10 pb-5">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#17120c] text-yellow-300"><Ruler className="h-5 w-5" /></span>
              <div>
                <p className="text-sm font-black">Configura tu referencia</p>
                <p className="mt-1 text-xs text-[#7a6a55]">Dos datos para obtener un rango inmediato.</p>
              </div>
            </div>

            <label className="mt-6 block">
              <span className="text-[10px] font-black uppercase tracking-[.18em] text-[#7a6a55]">¿Qué necesitas resolver?</span>
              <div className="relative mt-2">
                <select
                  value={serviceId}
                  onChange={(event) => chooseService(event.target.value)}
                  className="min-h-14 w-full appearance-none rounded-2xl border border-[#2f2518]/12 bg-[#faf6ee] px-4 pr-12 text-sm font-black text-[#17120c] outline-none transition focus:border-orange-500/55 focus:ring-4 focus:ring-orange-500/10"
                >
                  {SERVICES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-orange-700" />
              </div>
            </label>

            <div className="mt-5 rounded-2xl border border-[#2f2518]/10 bg-[#faf6ee] p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-yellow-300 text-black"><Icon className="h-5 w-5" /></span>
                <div>
                  <h3 className="text-base font-black">{service.name}</h3>
                  <p className="mt-1 text-xs leading-5 text-[#74634e]">{service.description}</p>
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
                      className={`rounded-xl border px-2 py-3 text-xs font-black transition ${cleanQuantity === value ? 'border-[#17120c] bg-[#17120c] text-yellow-300' : 'border-[#2f2518]/10 bg-white text-[#5d4d39] hover:border-orange-400/50'}`}
                    >
                      {value} m²
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <label className="mt-5 block">
              <span className="text-[10px] font-black uppercase tracking-[.18em] text-[#7a6a55]">{quantityLabel(service.unit)}</span>
              <div className="mt-2 flex items-center rounded-2xl border border-[#2f2518]/12 bg-[#faf6ee] px-4 focus-within:border-orange-500/55 focus-within:ring-4 focus-within:ring-orange-500/10">
                <input
                  type="number"
                  min={minimum}
                  inputMode="decimal"
                  value={quantity || ''}
                  onChange={(event) => setQuantity(Number(event.target.value) || 0)}
                  className="min-h-16 w-full bg-transparent text-3xl font-black text-[#17120c] outline-none"
                />
                <strong className="text-sm uppercase tracking-widest text-orange-700">{unitLabel(service.unit)}</strong>
              </div>
            </label>

            <div className="mt-5 rounded-2xl border border-orange-500/12 bg-orange-50 p-4">
              <p className="flex gap-2 text-xs leading-5 text-[#6b4b2d]"><Info className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />{service.note}</p>
            </div>
          </div>

          <aside className="bg-[#17120c] p-5 text-white sm:p-7 lg:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.22em] text-yellow-300">Rango comercial</p>
                <h3 className="mt-2 text-2xl font-black tracking-[-.04em]">Tu referencia inicial</h3>
              </div>
              <CircleDollarSign className="h-8 w-8 text-yellow-300" />
            </div>

            <div className="mt-6">
              <p className="text-xs text-zinc-400">Para {cleanQuantity} {unitLabel(service.unit)} de {service.name.toLowerCase()}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[.045] p-4">
                  <span className="text-[9px] font-black uppercase tracking-[.18em] text-zinc-500">Desde</span>
                  <strong className="mt-2 block text-xl font-black text-white">{money(low)}</strong>
                </div>
                <div className="rounded-2xl border border-yellow-300/22 bg-yellow-300/[.08] p-4">
                  <span className="text-[9px] font-black uppercase tracking-[.18em] text-yellow-300">Hasta</span>
                  <strong className="mt-2 block text-xl font-black text-yellow-100">{money(high)}</strong>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-[9px] font-black uppercase tracking-[.2em] text-yellow-300">Esta referencia considera</p>
              <ul className="mt-3 space-y-3">
                {service.includes.map((item) => (
                  <li key={item} className="flex gap-2 text-xs leading-5 text-zinc-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />{item}</li>
                ))}
              </ul>
            </div>

            <a
              href={`https://wa.me/56930121625?text=${encodeURIComponent(whatsappMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="fabrick-gradient-button mt-7 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black text-black"
            >
              Revisar este cálculo <MessageCircle className="h-4 w-4" />
            </a>

            <p className="mt-4 text-center text-[10px] leading-5 text-zinc-500">
              Sin pago ni compromiso. Confirmamos el valor después de revisar el alcance real.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
