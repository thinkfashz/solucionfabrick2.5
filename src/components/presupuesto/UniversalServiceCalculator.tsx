'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AirVent,
  ArrowRight,
  Bath,
  Blocks,
  ChevronDown,
  DoorOpen,
  Fence,
  Flame,
  Hammer,
  Home,
  Layers3,
  Lightbulb,
  Mail,
  MessageCircle,
  PaintRoller,
  PanelsTopLeft,
  Ruler,
  Sofa,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { buildWhatsAppLink } from '@/lib/whatsapp';

type Unit = 'm²' | 'ml' | 'unidad' | 'punto' | 'trabajo';
type Category = 'Terminaciones' | 'Construcción' | 'Instalaciones' | 'Climatización' | 'Exterior' | 'Mueblería';

type Service = {
  id: string;
  category: Category;
  title: string;
  description: string;
  unit: Unit;
  min: number;
  max: number;
  icon: LucideIcon;
  note?: string;
};

const SERVICES: Service[] = [
  { id: 'pintura', category: 'Terminaciones', title: 'Pintura interior o exterior', description: 'Preparación básica, protección de superficies y aplicación de pintura.', unit: 'm²', min: 5000, max: 12000, icon: PaintRoller },
  { id: 'ceramica', category: 'Terminaciones', title: 'Instalación de cerámica', description: 'Trazado, adhesivo, nivelación, fragüe y terminación.', unit: 'm²', min: 12000, max: 28000, icon: Layers3, note: 'No incluye cerámica ni reparación mayor de la base.' },
  { id: 'laminado', category: 'Terminaciones', title: 'Piso laminado o flotante', description: 'Instalación de piso, manta y encuentros básicos.', unit: 'm²', min: 8000, max: 18000, icon: Layers3 },
  { id: 'siding', category: 'Terminaciones', title: 'Siding exterior', description: 'Montaje de revestimiento exterior sobre soporte preparado.', unit: 'm²', min: 18000, max: 45000, icon: Blocks },
  { id: 'wall-panel', category: 'Terminaciones', title: 'Wall panel interior', description: 'Instalación decorativa, cortes, encuentros y fijaciones.', unit: 'm²', min: 12000, max: 30000, icon: PanelsTopLeft },
  { id: 'madera-revestimiento', category: 'Terminaciones', title: 'Revestimiento en madera', description: 'Instalación de tablas o paneles decorativos interiores o exteriores.', unit: 'm²', min: 22000, max: 55000, icon: PanelsTopLeft },
  { id: 'panel-metalcon', category: 'Construcción', title: 'Panel en Metalcon', description: 'Estructura, armado y cierre básico según espesor y terminación.', unit: 'm²', min: 45000, max: 85000, icon: PanelsTopLeft },
  { id: 'panel-madera', category: 'Construcción', title: 'Panel en madera', description: 'Estructura liviana y cierre según materialidad seleccionada.', unit: 'm²', min: 35000, max: 70000, icon: PanelsTopLeft },
  { id: 'kit-basico', category: 'Construcción', title: 'Kit básico', description: 'Estructura principal y componentes base para avanzar por etapas.', unit: 'm²', min: 220000, max: 260000, icon: Home },
  { id: 'kit-avanzado', category: 'Construcción', title: 'Kit avanzado', description: 'Kit con instalación, forro interior y puntos básicos.', unit: 'm²', min: 280000, max: 360000, icon: Home },
  { id: 'llave-mano', category: 'Construcción', title: 'Casa llave en mano', description: 'Construcción completa según nivel de terminaciones.', unit: 'm²', min: 540000, max: 780000, icon: Home },
  { id: 'techumbre', category: 'Construcción', title: 'Techumbre nueva o renovación', description: 'Estructura, cubierta, encuentros y terminaciones según estado.', unit: 'm²', min: 30000, max: 85000, icon: Hammer },
  { id: 'gotera', category: 'Construcción', title: 'Reparación de gotera', description: 'Revisión, detección del punto de ingreso y reparación localizada.', unit: 'trabajo', min: 80000, max: 350000, icon: Wrench },
  { id: 'puerta', category: 'Instalaciones', title: 'Instalación de puerta', description: 'Montaje, nivelación, fijación y ajuste básico.', unit: 'unidad', min: 60000, max: 180000, icon: DoorOpen },
  { id: 'bano', category: 'Instalaciones', title: 'Instalación o renovación de baño', description: 'Montaje de artefactos, conexiones y terminaciones básicas.', unit: 'unidad', min: 900000, max: 2800000, icon: Bath },
  { id: 'enchufe', category: 'Instalaciones', title: 'Nuevo enchufe o punto eléctrico', description: 'Canalización corta, caja, cableado y mecanismo.', unit: 'punto', min: 30000, max: 70000, icon: Lightbulb },
  { id: 'punto-luz', category: 'Instalaciones', title: 'Punto de iluminación', description: 'Cableado, caja y conexión para luminaria.', unit: 'punto', min: 35000, max: 80000, icon: Lightbulb },
  { id: 'gasfiteria', category: 'Instalaciones', title: 'Punto de agua o gasfitería', description: 'Extensión corta, conexión, prueba y terminación básica.', unit: 'punto', min: 45000, max: 120000, icon: Wrench },
  { id: 'bajada-agua', category: 'Instalaciones', title: 'Bajada de agua lluvia', description: 'Instalación o recambio de bajada, fijaciones y conexión.', unit: 'unidad', min: 60000, max: 180000, icon: Wrench },
  { id: 'aire', category: 'Climatización', title: 'Instalación de aire acondicionado', description: 'Montaje de unidad interior/exterior y conexión estándar.', unit: 'unidad', min: 180000, max: 450000, icon: AirVent, note: 'El valor cambia por distancia de tubería, altura y alimentación eléctrica.' },
  { id: 'estufa-pellet', category: 'Climatización', title: 'Instalación de estufa a pellet', description: 'Ubicación, salida de gases, sellos y puesta en marcha básica.', unit: 'unidad', min: 120000, max: 320000, icon: Flame },
  { id: 'estufa-tradicional', category: 'Climatización', title: 'Instalación de estufa tradicional', description: 'Montaje, cañón, sellos y protección del paso de cubierta.', unit: 'unidad', min: 100000, max: 300000, icon: Flame },
  { id: 'cierre', category: 'Exterior', title: 'Cierre perimetral', description: 'Estructura y cierre según material, altura y terreno.', unit: 'ml', min: 35000, max: 120000, icon: Fence },
  { id: 'remodelacion', category: 'Construcción', title: 'Remodelación integral', description: 'Demoliciones, instalaciones, terminaciones y coordinación de especialidades.', unit: 'm²', min: 250000, max: 650000, icon: Hammer },
  { id: 'mueble', category: 'Mueblería', title: 'Mueble a medida', description: 'Diseño, fabricación e instalación según material y herrajes.', unit: 'ml', min: 250000, max: 700000, icon: Sofa },
];

const CATEGORY_ORDER: Category[] = ['Construcción', 'Terminaciones', 'Instalaciones', 'Climatización', 'Exterior', 'Mueblería'];

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(value || 0));
}

export default function UniversalServiceCalculator() {
  const [serviceId, setServiceId] = useState('pintura');
  const [quantity, setQuantity] = useState('20');
  const service = SERVICES.find((item) => item.id === serviceId) || SERVICES[0];
  const qty = Math.max(1, Number(quantity.replace(',', '.')) || 1);
  const low = qty * service.min;
  const high = qty * service.max;

  const message = useMemo(() => {
    return `Hola Soluciones Fabrick, calculé ${service.title}: ${qty} ${service.unit}. Rango referencial: ${formatCLP(low)} a ${formatCLP(high)}. Quiero revisar una cotización real para mi propiedad.`;
  }, [high, low, qty, service.title, service.unit]);

  const mailSubject = encodeURIComponent(`Cálculo gratuito: ${service.title}`);
  const mailBody = encodeURIComponent(`${message}\n\nEste cálculo es referencial y debe confirmarse según estado del lugar, materiales, acceso y ubicación.`);

  return (
    <section id="calculadora-universal" className="relative border-b border-white/10 bg-[#070604] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(250,204,21,.15),transparent_28rem),radial-gradient(circle_at_90%_30%,rgba(249,115,22,.10),transparent_26rem)]" />
      <div className="relative mx-auto max-w-[1380px]">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[10px] font-black uppercase tracking-[.34em] text-yellow-300">Cálculo aproximado gratuito</p>
          <h2 className="mt-4 text-3xl font-black tracking-[-.05em] sm:text-5xl">Calculadora universal de servicios</h2>
          <p className="mt-4 text-sm leading-7 text-zinc-400 sm:text-base">Elige el trabajo, indica la cantidad y recibe un rango referencial antes de solicitar una visita.</p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start">
          <div className="space-y-3">
            {CATEGORY_ORDER.map((category, index) => (
              <details key={category} open={index === 0} className="group overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[.025]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 text-left">
                  <span><b className="block text-lg font-black text-white">{category}</b><span className="mt-1 block text-xs text-zinc-500">{SERVICES.filter((item) => item.category === category).length} servicios disponibles</span></span>
                  <ChevronDown className="h-5 w-5 text-yellow-300 transition group-open:rotate-180" />
                </summary>
                <div className="grid gap-px border-t border-white/10 bg-white/10 sm:grid-cols-2">
                  {SERVICES.filter((item) => item.category === category).map((item) => {
                    const Icon = item.icon;
                    const active = item.id === serviceId;
                    return (
                      <button key={item.id} type="button" onClick={() => setServiceId(item.id)} className={`min-h-[150px] bg-[#0b0907] p-5 text-left transition ${active ? 'bg-yellow-300 text-black' : 'text-white hover:bg-[#12100c]'}`}>
                        <div className="flex items-start justify-between gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl ${active ? 'bg-black text-yellow-300' : 'bg-yellow-300 text-black'}`}><Icon className="h-4 w-4" /></span><span className={`text-[9px] font-black uppercase tracking-[.18em] ${active ? 'text-black/55' : 'text-zinc-600'}`}>{item.unit}</span></div>
                        <b className="mt-5 block text-base font-black">{item.title}</b>
                        <span className={`mt-2 block text-xs leading-5 ${active ? 'text-black/70' : 'text-zinc-400'}`}>{item.description}</span>
                      </button>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>

          <aside className="rounded-[2rem] border border-yellow-300/20 bg-black/55 p-5 shadow-[0_30px_90px_rgba(0,0,0,.42)] backdrop-blur-xl sm:p-7 lg:sticky lg:top-24">
            <p className="text-[10px] font-black uppercase tracking-[.3em] text-yellow-300">Servicio seleccionado</p>
            <h3 className="mt-3 text-2xl font-black tracking-[-.04em]">{service.title}</h3>
            <p className="mt-3 text-sm leading-7 text-zinc-400">{service.description}</p>

            <label className="mt-7 block text-[10px] font-black uppercase tracking-[.24em] text-zinc-500">Cantidad en {service.unit}</label>
            <div className="mt-3 flex items-end gap-3 border-b border-white/15 pb-3">
              <Ruler className="mb-2 h-5 w-5 text-yellow-300" />
              <input value={quantity} onChange={(event) => setQuantity(event.target.value.replace(/[^0-9.,]/g, ''))} inputMode="decimal" className="w-full bg-transparent text-5xl font-black tracking-[-.06em] text-white outline-none" />
              <span className="pb-2 text-sm font-black text-yellow-300">{service.unit}</span>
            </div>

            <div className="mt-7 border-y border-white/10 py-5">
              <p className="text-[10px] font-black uppercase tracking-[.22em] text-zinc-500">Rango aproximado de mano de obra</p>
              <b className="mt-2 block text-3xl font-black tracking-[-.05em] text-yellow-300">{formatCLP(low)} — {formatCLP(high)}</b>
              <p className="mt-3 text-xs leading-6 text-zinc-500">Referencia inicial. El valor final depende del estado previo, materiales, traslados, altura, accesos y terminaciones.</p>
              {service.note && <p className="mt-2 text-xs leading-6 text-yellow-100/70">{service.note}</p>}
            </div>

            <div className="mt-6 grid gap-3">
              <Link href={`/contacto?servicio=${encodeURIComponent(service.title)}&cantidad=${qty}`} className="inline-flex items-center justify-center gap-2 rounded-full bg-yellow-300 px-5 py-4 text-sm font-black text-black transition hover:bg-yellow-200">Quiero contratar la mano de obra <ArrowRight className="h-4 w-4" /></Link>
              <a href={buildWhatsAppLink(message)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300/30 px-5 py-4 text-sm font-black text-emerald-200 transition hover:bg-emerald-300 hover:text-black"><MessageCircle className="h-4 w-4" /> Enviarme el cálculo por WhatsApp</a>
              <a href={`mailto:faubricioedms@gmail.com?subject=${mailSubject}&body=${mailBody}`} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-4 text-sm font-black text-white transition hover:border-yellow-300/40 hover:text-yellow-300"><Mail className="h-4 w-4" /> Enviarme el cálculo por correo</a>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

export function PublicBudgetBottomNav() {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-[1.4rem] border border-white/15 bg-black/88 p-2 shadow-[0_20px_70px_rgba(0,0,0,.55)] backdrop-blur-xl sm:hidden" aria-label="Navegación de presupuesto">
      <Link href="/" className="grid min-h-12 place-items-center rounded-xl text-[10px] font-black uppercase tracking-[.12em] text-zinc-400"><Home className="h-5 w-5" /><span>Inicio</span></Link>
      <a href="#calculadora-universal" className="grid min-h-12 place-items-center rounded-xl bg-yellow-300 text-[10px] font-black uppercase tracking-[.12em] text-black"><Ruler className="h-5 w-5" /><span>Calcular</span></a>
      <Link href="/tienda" className="grid min-h-12 place-items-center rounded-xl text-[10px] font-black uppercase tracking-[.12em] text-zinc-400"><Blocks className="h-5 w-5" /><span>Tienda</span></Link>
      <a href={buildWhatsAppLink('Hola Soluciones Fabrick, necesito orientación para un servicio de mi hogar.')} target="_blank" rel="noopener noreferrer" className="grid min-h-12 place-items-center rounded-xl text-[10px] font-black uppercase tracking-[.12em] text-zinc-400"><MessageCircle className="h-5 w-5" /><span>WhatsApp</span></a>
    </nav>
  );
}
