import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Droplets,
  Hammer,
  Layers3,
  MessageCircle,
  Paintbrush,
  PanelsTopLeft,
  Ruler,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { buildWhatsAppLink } from '@/lib/whatsapp';

 type ServiceItem = {
  id: string;
  budgetId: string;
  title: string;
  promise: string;
  description: string;
  functions: string[];
  href: string;
  tone: 'pearl' | 'oak' | 'ink';
  icon: LucideIcon;
};

const SERVICES: ServiceItem[] = [
  {
    id: 'albanileria', budgetId: 'albanileria', title: 'Albañilería', promise: 'Obra gris lista para avanzar',
    description: 'Muros, sobrepisos, enchapes y reparaciones medidos según la superficie real a intervenir.', functions: ['Muros y divisiones', 'Radieres y bases', 'Enchapes y reparación'], href: '/servicios#albanileria', tone: 'oak', icon: Building2,
  },
  {
    id: 'carpinteria', budgetId: 'carpinteria', title: 'Carpintería', promise: 'Muebles adaptados al espacio',
    description: 'Puertas, clósets, cocinas y mobiliario desarrollado desde las medidas y el uso esperado.', functions: ['Puertas y ventanas', 'Muebles a medida', 'Cocinas y clósets'], href: '/servicios#carpinteria', tone: 'pearl', icon: Ruler,
  },
  {
    id: 'gasfiteria', budgetId: 'gasfiteria', title: 'Gasfitería', promise: 'Agua y desagües bien resueltos',
    description: 'Redes sanitarias, filtraciones, artefactos y conexiones organizadas por recorrido y longitud.', functions: ['Redes de agua', 'Desagües', 'Filtraciones y artefactos'], href: '/servicios#gasfiteria', tone: 'ink', icon: Droplets,
  },
  {
    id: 'electricidad', budgetId: 'electricidad', title: 'Electricidad', promise: 'Puntos seguros y funcionales',
    description: 'Iluminación, enchufes, canalización y adecuaciones calculadas por cada punto requerido.', functions: ['Puntos y enchufes', 'Iluminación', 'Tableros y canalización'], href: '/servicios#electricidad', tone: 'oak', icon: Zap,
  },
  {
    id: 'fundaciones', budgetId: 'cimientos', title: 'Fundaciones', promise: 'Una base coherente con la obra',
    description: 'Trazado, excavación, armaduras y hormigón calculados por largo, ancho y profundidad.', functions: ['Trazado y excavación', 'Armaduras y moldajes', 'Hormigón y nivelación'], href: '/servicios#fundaciones', tone: 'ink', icon: Layers3,
  },
  {
    id: 'estructuras', budgetId: 'metalcon', title: 'Estructuras Metalcon', promise: 'Estructura ligera y ordenada',
    description: 'Muros, ampliaciones y techumbres en perfilería galvanizada medidos por superficie estructural.', functions: ['Muros estructurales', 'Cerchas y entramados', 'Ampliaciones livianas'], href: '/servicios#estructuras', tone: 'pearl', icon: PanelsTopLeft,
  },
  {
    id: 'techumbre', budgetId: 'techumbre', title: 'Techumbre', promise: 'Protección frente al clima',
    description: 'Cubiertas, fijaciones, sellos, canaletas y remates revisados como un sistema completo.', functions: ['Cubiertas y fijaciones', 'Canaletas y sellos', 'Aislación y remates'], href: '/servicios#techumbre', tone: 'oak', icon: Hammer,
  },
  {
    id: 'terminaciones', budgetId: 'terminaciones', title: 'Terminaciones', promise: 'Espacios realmente terminados',
    description: 'Pintura, revestimientos, pisos y remates finales coordinados con las capas anteriores.', functions: ['Pintura y preparación', 'Pisos y revestimientos', 'Remates finales'], href: '/servicios#terminaciones', tone: 'pearl', icon: Paintbrush,
  },
];

const TONE_CLASS = {
  pearl: 'bg-[#F8F0E9] text-[#171820]',
  oak: 'bg-[#B6906C] text-[#171820]',
  ink: 'bg-[#242630] text-[#F8F0E9]',
} as const;

const MUTED_CLASS = {
  pearl: 'text-[#685D55]',
  oak: 'text-[#3D3028]/75',
  ink: 'text-[#D0C3B8]/75',
} as const;

export default function ServicesVerticalGallery() {
  const orientationLink = buildWhatsAppLink('Hola Soluciones Fabrick, necesito orientación para coordinar varias especialidades en mi proyecto.');

  return (
    <section id="servicios" className="relative overflow-hidden bg-[#171820] px-4 pb-28 pt-16 text-white sm:px-6 md:px-12 lg:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_4%,rgba(204,177,150,.2),transparent_28rem),radial-gradient(circle_at_90%_86%,rgba(182,144,108,.15),transparent_30rem)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[.035] [background-image:linear-gradient(rgba(248,240,233,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(248,240,233,.8)_1px,transparent_1px)] [background-size:52px_52px]" />

      <div className="relative mx-auto max-w-[1320px]">
        <header data-reveal className="grid gap-5 lg:grid-cols-[.86fr_1.14fr] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.3em] text-[#CCB196]">Servicios con cálculo propio</p>
            <h2 className="mt-4 text-4xl font-black leading-[.96] tracking-[-.055em] text-[#F8F0E9] sm:text-6xl" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>Desliza, compara y abre la especialidad que necesitas.</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-[#CFC2B7] sm:text-base">Cada tarjeta resume el resultado esperado y abre su calculadora independiente. En móvil desliza horizontalmente; en escritorio pasa el cursor para proyectar el servicio.</p>
        </header>

        <div className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-8 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:-mx-12 md:px-12 [&::-webkit-scrollbar]:hidden">
          {SERVICES.map((service, index) => {
            const Icon = service.icon;
            return (
              <article key={service.id} className={`group relative min-h-[430px] min-w-[84%] snap-center overflow-hidden rounded-[2.3rem] p-6 shadow-[0_24px_80px_rgba(0,0,0,.24)] transition duration-500 hover:-translate-y-3 hover:scale-[1.025] hover:shadow-[0_34px_100px_rgba(0,0,0,.34)] sm:min-w-[360px] lg:min-w-[390px] ${TONE_CLASS[service.tone]}`}>
                <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full border border-current/10" />
                <div className="absolute -right-5 -top-5 h-28 w-28 rounded-full bg-current opacity-[.035] blur-xl" />
                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="relative grid h-24 w-24 place-items-center rounded-full bg-[#171820] text-[#CCB196] shadow-[0_18px_45px_rgba(0,0,0,.22)] transition duration-500 group-hover:scale-110 group-hover:rotate-3">
                      <div className="absolute inset-2 rounded-full border border-[#CCB196]/30" />
                      <Icon className="relative h-9 w-9" strokeWidth={1.7} />
                    </div>
                    <span className="rounded-full border border-current/12 px-3 py-1.5 text-[9px] font-black tracking-[.18em]">{String(index + 1).padStart(2, '0')}</span>
                  </div>

                  <p className="mt-8 text-[9px] font-black uppercase tracking-[.2em] opacity-60">{service.promise}</p>
                  <h3 className="mt-3 text-3xl font-black tracking-[-.045em]">{service.title}</h3>
                  <p className={`mt-4 text-sm leading-7 ${MUTED_CLASS[service.tone]}`}>{service.description}</p>

                  <div className="mt-5 grid gap-2">
                    {service.functions.map((item) => (
                      <span key={item} className="flex items-center gap-2 rounded-full bg-current/[.055] px-3 py-2 text-[10px] font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#9A6D4A]" /> {item}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto grid gap-2 pt-7 sm:grid-cols-2">
                    <Link href={`/presupuesto?servicio=${service.budgetId}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#171820] px-5 text-xs font-black text-[#F8F0E9] transition hover:bg-[#CCB196] hover:text-[#171820]">Calcular <ArrowRight className="h-4 w-4" /></Link>
                    <Link href={service.href} className="inline-flex min-h-12 items-center justify-center rounded-full border border-current/16 px-5 text-xs font-black transition hover:bg-current/[.07]">Ver servicio</Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div data-reveal className="mt-3 flex flex-col items-center justify-between gap-4 rounded-[2rem] bg-[#242630] px-5 py-6 text-center sm:flex-row sm:text-left">
          <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#CCB196] text-[#171820]"><Wrench className="h-5 w-5" /></span><div><p className="text-sm font-black text-[#F8F0E9]">¿Tu proyecto combina varias especialidades?</p><p className="mt-1 text-xs leading-5 text-[#BEB2A8]">Calcula cada partida, añádela al carrito y envía el conjunto para revisión.</p></div></div>
          <a href={orientationLink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#CCB196] px-5 text-xs font-black text-[#171820] transition hover:bg-[#F8F0E9]">Orientar mi proyecto <MessageCircle className="h-4 w-4" /></a>
        </div>
      </div>
    </section>
  );
}
