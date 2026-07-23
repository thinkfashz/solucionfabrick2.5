'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
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
  outcome: string;
  description: string;
  functions: string[];
  href: string;
  accent: string;
  glow: string;
  icon: LucideIcon;
};

const SERVICES: ServiceItem[] = [
  {
    id: 'albanileria', budgetId: 'albanileria', title: 'Albañilería', outcome: 'Obra gris preparada para continuar',
    description: 'Construcción y reparación de muros, sobrepisos, enchapes, radieres y elementos de hormigón o mampostería.',
    functions: ['Muros y divisiones', 'Radieres y sobrepisos', 'Enchapes y reparaciones'], href: '/servicios#albanileria', accent: '#f3a548', glow: 'rgba(243,165,72,.30)', icon: Building2,
  },
  {
    id: 'carpinteria', budgetId: 'carpinteria', title: 'Carpintería', outcome: 'Madera adaptada al espacio real',
    description: 'Fabricación, instalación y ajuste de puertas, muebles, divisiones, clósets y soluciones diseñadas a medida.',
    functions: ['Puertas y ventanas', 'Muebles a medida', 'Cocinas y clósets'], href: '/servicios#carpinteria', accent: '#bd8252', glow: 'rgba(189,130,82,.30)', icon: Ruler,
  },
  {
    id: 'gasfiteria', budgetId: 'gasfiteria', title: 'Gasfitería', outcome: 'Agua y desagües funcionando correctamente',
    description: 'Instalación, reparación y renovación de redes sanitarias, filtraciones, artefactos y puntos de agua.',
    functions: ['Redes de agua', 'Desagües sanitarios', 'Filtraciones y artefactos'], href: '/servicios#gasfiteria', accent: '#41bce8', glow: 'rgba(65,188,232,.30)', icon: Droplets,
  },
  {
    id: 'electricidad', budgetId: 'electricidad', title: 'Electricidad', outcome: 'Instalaciones seguras y preparadas para el uso',
    description: 'Puntos eléctricos, iluminación, canalización, tableros y adecuaciones para viviendas o espacios comerciales.',
    functions: ['Puntos y enchufes', 'Iluminación interior', 'Tableros y canalización'], href: '/servicios#electricidad', accent: '#f7cf38', glow: 'rgba(247,207,56,.28)', icon: Zap,
  },
  {
    id: 'fundaciones', budgetId: 'cimientos', title: 'Fundaciones', outcome: 'Una base definida para las cargas del proyecto',
    description: 'Trazado, excavación, armaduras, hormigón y soluciones de apoyo según terreno, estructura y alcance de la obra.',
    functions: ['Trazado y excavación', 'Armaduras y moldajes', 'Hormigón y nivelación'], href: '/servicios#fundaciones', accent: '#9f754f', glow: 'rgba(159,117,79,.32)', icon: Layers3,
  },
  {
    id: 'estructuras', budgetId: 'metalcon', title: 'Estructuras Metalcon', outcome: 'Estructura ligera, ordenada y dimensionada',
    description: 'Muros, techumbres y ampliaciones con perfilería galvanizada, modulación y encuentros coordinados.',
    functions: ['Muros estructurales', 'Cerchas y entramados', 'Ampliaciones livianas'], href: '/servicios#estructuras', accent: '#aeb9c5', glow: 'rgba(174,185,197,.25)', icon: PanelsTopLeft,
  },
  {
    id: 'techumbre', budgetId: 'techumbre', title: 'Techumbre', outcome: 'Protección frente a lluvia, viento y humedad',
    description: 'Reparación o renovación de cubiertas, sellos, fijaciones, canaletas, aislación y remates expuestos.',
    functions: ['Cubiertas y fijaciones', 'Canaletas y sellos', 'Aislación y remates'], href: '/servicios#techumbre', accent: '#f07b38', glow: 'rgba(240,123,56,.30)', icon: Hammer,
  },
  {
    id: 'terminaciones', budgetId: 'terminaciones', title: 'Terminaciones', outcome: 'Espacios listos para habitar y presentar',
    description: 'Pintura, revestimientos, cielos, pisos y detalles finales que unifican la apariencia y la entrega del proyecto.',
    functions: ['Pintura y preparación', 'Pisos y revestimientos', 'Remates finales'], href: '/servicios#terminaciones', accent: '#f2e9db', glow: 'rgba(242,233,219,.22)', icon: Paintbrush,
  },
];

export default function ServicesVerticalGallery() {
  const [activeIndex, setActiveIndex] = useState(0);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const orientationLink = buildWhatsAppLink('Hola Soluciones Fabrick, necesito orientación para coordinar varias especialidades en mi proyecto.');

  useEffect(() => {
    const cards = cardRefs.current.filter(Boolean) as HTMLElement[];
    if (!cards.length || typeof IntersectionObserver === 'undefined') return;
    const ratios = new Map<Element, number>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => ratios.set(entry.target, entry.intersectionRatio));
      const visible = cards.map((card, index) => ({ index, ratio: ratios.get(card) || 0 })).sort((a, b) => b.ratio - a.ratio)[0];
      if (visible && visible.ratio > 0.18) setActiveIndex(visible.index);
    }, { threshold: [0.18, 0.35, 0.55, 0.72], rootMargin: '-18% 0px -26% 0px' });
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="servicios" className="relative overflow-hidden bg-[#090806] px-4 pb-32 pt-16 text-white sm:px-6 md:px-12 lg:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_8%,rgba(250,204,21,.12),transparent_26%),radial-gradient(circle_at_88%_92%,rgba(249,115,22,.08),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[.035] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:44px_44px]" />

      <div className="relative mx-auto max-w-[1160px]">
        <header data-reveal className="mx-auto max-w-3xl text-center">
          <p className="text-[10px] font-black uppercase tracking-[.3em] text-yellow-300">Servicios coordinados</p>
          <h2 className="mt-4 text-4xl font-black leading-[.96] tracking-[-.055em] sm:text-6xl" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>Recorre cada especialidad y calcula la solución correcta.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">Explora cada trabajo, revisa sus funciones y abre directamente su calculadora para añadirlo al carrito general del proyecto.</p>
        </header>

        <div className="relative mt-12">
          <div className="pointer-events-none absolute bottom-16 left-1/2 top-16 hidden w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-yellow-300/24 to-transparent sm:block" />
          <div className="space-y-5 sm:space-y-8">
            {SERVICES.map((service, index) => {
              const Icon = service.icon;
              const active = index === activeIndex;
              const mirrored = index % 2 === 1;
              const style = { '--service-accent': service.accent, '--service-glow': service.glow } as CSSProperties;
              return (
                <article key={service.id} ref={(node) => { cardRefs.current[index] = node; }} style={style} className={`group relative mx-auto min-h-[330px] max-w-[880px] overflow-hidden rounded-[2.6rem] px-5 py-7 shadow-[0_24px_90px_rgba(0,0,0,.34)] transition-[transform,opacity,filter,box-shadow] duration-500 sm:min-h-[360px] sm:px-9 sm:py-9 ${active ? 'scale-100 opacity-100 saturate-100 shadow-[0_34px_110px_var(--service-glow)]' : 'scale-[.94] opacity-55 saturate-[.65]'}`}>
                  <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,.09),rgba(255,255,255,.025)_48%,rgba(0,0,0,.2))]" />
                  <div className="absolute inset-0 opacity-70 [background:radial-gradient(circle_at_18%_20%,var(--service-glow),transparent_34%)]" />
                  <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[var(--service-accent)] opacity-[.07] blur-3xl" />

                  <div className={`relative grid h-full items-center gap-7 sm:grid-cols-[180px_1fr] lg:gap-12 ${mirrored ? 'sm:grid-cols-[1fr_180px]' : ''}`}>
                    <div className={`relative mx-auto grid h-40 w-40 place-items-center rounded-full sm:h-44 sm:w-44 ${mirrored ? 'sm:order-2' : ''}`}>
                      <div className="absolute inset-0 rounded-full bg-[var(--service-accent)] opacity-15 blur-2xl transition duration-500 group-hover:opacity-30" />
                      <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_180deg,transparent,var(--service-accent),transparent_72%)] opacity-75 transition duration-700 group-hover:rotate-90" />
                      <div className="absolute inset-[7px] rounded-full bg-[#11100d] shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)]" />
                      <div className="absolute inset-[19px] rounded-full bg-[radial-gradient(circle_at_32%_28%,rgba(255,255,255,.23),transparent_28%),linear-gradient(145deg,var(--service-accent),#15130f_80%)] opacity-95" />
                      <Icon className="relative h-12 w-12 text-white drop-shadow-[0_7px_18px_rgba(0,0,0,.5)]" strokeWidth={1.7} />
                      <span className="absolute -bottom-1 rounded-full bg-yellow-300 px-3 py-1 text-[9px] font-black tracking-[.18em] text-black">{String(index + 1).padStart(2, '0')}</span>
                    </div>

                    <div className={mirrored ? 'sm:order-1 sm:text-right' : ''}>
                      <p className="text-[9px] font-black uppercase tracking-[.2em] text-[var(--service-accent)]">{service.outcome}</p>
                      <h3 className="mt-3 text-3xl font-black tracking-[-.045em] sm:text-4xl">{service.title}</h3>
                      <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300/80 sm:text-base">{service.description}</p>
                      <div className={`mt-5 flex flex-wrap gap-2 ${mirrored ? 'sm:justify-end' : ''}`}>{service.functions.map((item) => <span key={item} className="inline-flex items-center gap-1.5 rounded-full bg-white/[.075] px-3 py-2 text-[10px] font-bold text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,.07)]"><CheckCircle2 className="h-3.5 w-3.5 text-[var(--service-accent)]" /> {item}</span>)}</div>
                      <div className={`mt-7 flex flex-wrap gap-3 ${mirrored ? 'sm:justify-end' : ''}`}>
                        <Link href={service.href} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-yellow-300 px-5 text-xs font-black text-black shadow-[0_12px_34px_rgba(250,204,21,.16)] transition hover:-translate-y-0.5 hover:bg-white">Ver servicio <ArrowUpRight className="h-4 w-4" /></Link>
                        <Link href={`/presupuesto?servicio=${service.budgetId}`} className="inline-flex min-h-12 items-center justify-center rounded-full bg-white/[.08] px-5 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-white/[.14]">Abrir calculadora</Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div data-reveal className="mx-auto mt-10 flex max-w-3xl flex-col items-center gap-4 rounded-[2rem] bg-[linear-gradient(135deg,rgba(250,204,21,.14),rgba(249,115,22,.08))] px-5 py-6 text-center shadow-[0_24px_80px_rgba(0,0,0,.24)] sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-yellow-300 text-black"><Wrench className="h-5 w-5" /></span><div><p className="text-sm font-black">¿Tu proyecto necesita varias especialidades?</p><p className="mt-1 text-xs leading-5 text-zinc-400">Calcula cada partida, añádela al carrito y envía el conjunto para revisión.</p></div></div>
          <a href={orientationLink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-yellow-300 px-5 text-xs font-black text-black transition hover:bg-white">Orientar mi proyecto <MessageCircle className="h-4 w-4" /></a>
        </div>
      </div>
    </section>
  );
}
