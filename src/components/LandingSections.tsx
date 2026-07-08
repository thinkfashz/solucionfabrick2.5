'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Droplets,
  Hammer,
  Home,
  Lightbulb,
  MapPin,
  MessageCircle,
  Package,
  PaintRoller,
  SearchCheck,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react';
import TiendaSection from './TiendaSection';
import ContactMap from './ContactMap';
import ContactForm from './ContactForm';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { useSiteContent } from '@/hooks/useSiteContent';

const PRINCIPLES = [
  { Icon: SearchCheck, title: 'Entender antes de vender', text: 'Aclaramos si necesitas un kit, una cabaña, una ampliación, una remodelación o una casa llave en mano.' },
  { Icon: ShieldCheck, title: 'Números sin vueltas', text: 'Mostramos valores referenciales, lo incluido y lo que se cotiza aparte para evitar sorpresas.' },
  { Icon: CheckCircle2, title: 'Decisión más segura', text: 'Si el presupuesto tiene sentido, pasamos a medidas, terreno, terminaciones y una cotización más cerrada.' },
];

const SERVICES = [
  { Icon: Home, title: 'Kits, cabañas y casas', text: 'Opciones por etapas: kit básico, kit intermedio y llave en mano según presupuesto y necesidad.', href: '#calculadora-m2' },
  { Icon: Hammer, title: 'Construcción y ampliaciones', text: 'Estructura, montaje, revestimientos, terminaciones y coordinación de partidas para avanzar con orden.', href: '/servicios/metalcon' },
  { Icon: Wrench, title: 'Instalaciones y mejoras', text: 'Puntos eléctricos, agua PPR, gas interior, sanitarios, cocina, baño y soluciones prácticas para el hogar.', href: '/servicios' },
  { Icon: ClipboardCheck, title: 'Orientación antes de comprar', text: 'Te ayudamos a decidir entre materiales, productos y niveles de terminación sin gastar a ciegas.', href: '/contacto' },
];

const PRODUCT_CATEGORIES = [
  { Icon: Lightbulb, title: 'Iluminación', text: 'Focos, lámparas y reflectores para casas, patios, bodegas y fachadas.' },
  { Icon: Zap, title: 'Climatización', text: 'Equipos para mejorar confort y preparar espacios más habitables.' },
  { Icon: Droplets, title: 'Grifería', text: 'Opciones para cocina, lavamanos, baños y renovaciones rápidas.' },
  { Icon: Package, title: 'Sanitarios y espejos', text: 'Productos útiles para equipar baños y cerrar mejor una remodelación.' },
  { Icon: PaintRoller, title: 'Terminaciones', text: 'Complementos para mejorar presentación, acabado y funcionalidad.' },
  { Icon: ShoppingBag, title: 'Accesorios', text: 'Soluciones prácticas para el uso diario del hogar.' },
];

const WHY_US = [
  'Te damos una referencia de precio antes de pedirte una visita o una cotización larga.',
  'Separamos claramente lo incluido y lo que se cotiza aparte, como fosa, empalme o conexiones exteriores.',
  'Trabajamos con opciones por etapas para que puedas partir pequeño o avanzar a llave en mano.',
  'Buscamos que entiendas el proyecto antes de comprometer dinero.',
];

const PROCESS = [
  { step: '01', title: 'Calcula rápido', text: 'Elige kit básico, kit intermedio o llave en mano y revisa un valor referencial por m².' },
  { step: '02', title: 'Comparte tu caso', text: 'Nos cuentas ubicación, medidas, terreno, acceso y qué nivel de terminación buscas.' },
  { step: '03', title: 'Ordenamos alcance', text: 'Definimos qué incluye la propuesta, qué queda fuera y qué debe revisarse en terreno.' },
  { step: '04', title: 'Cotizamos mejor', text: 'Con más datos, armamos una propuesta más clara para avanzar sin improvisar.' },
];

export default function LandingSections({ copyrightText, socialLinks }: { copyrightText?: string; socialLinks?: { facebook?: string; instagram?: string; tiktok?: string } } = {}) {
  const footer = useSiteContent('footer');
  const copyrightHtml = (copyrightText && copyrightText.trim())
    ? copyrightText.replaceAll('{year}', String(new Date().getFullYear()))
    : (footer.legal || `© ${new Date().getFullYear()} Soluciones Fabrick · Todos los derechos reservados`).replaceAll('{year}', String(new Date().getFullYear()));
  const taglineText = footer.tagline || 'Kits, construcción y soluciones para avanzar con más claridad.';
  const fbHref = socialLinks?.facebook?.trim() || '#';
  const igHref = socialLinks?.instagram?.trim() || '#';
  const ttHref = socialLinks?.tiktok?.trim() || '#';

  return (
    <div className="overflow-x-hidden bg-[#050403] text-white">
      <section data-scroll-section className="border-t border-white/10 px-4 py-20 md:px-12 md:py-28">
        <div className="mx-auto max-w-[1500px]">
          <SectionHeader eyebrow="Enfoque Fabrick" title="Primero claridad. Después cotización." text="La mayoría de los problemas aparecen cuando se empieza sin saber qué incluye el precio. Por eso ordenamos opciones, alcances y costos antes de avanzar." />
          <div className="mt-12 grid divide-y divide-white/10 border-y border-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
            {PRINCIPLES.map(({ Icon, title, text }) => <LineItem key={title} Icon={Icon} title={title} text={text} />)}
          </div>
        </div>
      </section>

      <section data-scroll-section id="servicios" className="border-t border-white/10 bg-[#080706] px-4 py-20 md:px-12 md:py-28">
        <div className="mx-auto max-w-[1500px]">
          <SectionHeader eyebrow="Servicios" title="Opciones para partir simple o avanzar completo" text="Puedes comenzar con un kit básico, mejorar a un kit intermedio o avanzar a una casa llave en mano. Cada alternativa tiene un alcance distinto." />
          <div className="mt-12 divide-y divide-white/10 border-y border-white/10">
            {SERVICES.map(({ Icon, title, text, href }) => (
              <Link key={title} href={href} className="group grid gap-5 py-6 transition hover:bg-white/[0.025] sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:items-center sm:px-2">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-yellow-300 text-black transition group-hover:scale-105"><Icon className="h-5 w-5" /></span>
                <span><b className="block text-xl font-black leading-tight text-white">{title}</b><span className="mt-2 block max-w-3xl text-sm leading-7 text-zinc-400">{text}</span></span>
                <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Ver <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section data-scroll-section id="tienda" className="relative overflow-hidden border-t border-white/10 px-4 py-20 md:px-12 md:py-28">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_92%_0%,rgba(250,204,21,.12),transparent_26rem),radial-gradient(circle_at_10%_100%,rgba(20,184,166,.10),transparent_28rem)]" />
        <div className="relative mx-auto max-w-[1500px]">
          <SectionHeader eyebrow="Tienda" title="Productos para complementar tu proyecto" text="Además de construir, también reunimos productos útiles para iluminar, equipar, mejorar baños, cocinas y espacios del hogar." />
          <div className="mt-12 grid divide-y divide-white/10 border-y border-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
            {PRODUCT_CATEGORIES.map(({ Icon, title, text }) => (
              <Link key={title} href="/tienda" className="group flex items-start gap-4 p-5 transition hover:bg-white/[0.025]">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-yellow-300/30 text-yellow-300 transition group-hover:bg-yellow-300 group-hover:text-black"><Icon className="h-5 w-5" /></span>
                <span><b className="block text-sm font-black uppercase tracking-[0.12em] text-white">{title}</b><span className="mt-2 block text-sm leading-6 text-zinc-400">{text}</span></span>
              </Link>
            ))}
          </div>
          <div className="mt-14 border-t border-white/10 pt-10"><TiendaSection /></div>
        </div>
      </section>

      <section data-scroll-section className="border-t border-white/10 bg-[#080706] px-4 py-20 md:px-12 md:py-28">
        <div className="mx-auto grid max-w-[1500px] gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.34em] text-yellow-300">Por qué elegirnos</p>
            <h2 className="mt-4 text-4xl font-black leading-[0.98] tracking-tight text-white md:text-6xl">Menos confusión. Mejor punto de partida.</h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-zinc-400">Un cliente no necesita una explicación eterna; necesita saber cuánto podría costar, qué recibe y qué falta revisar. Esa es la base de la página.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contacto" className="inline-flex h-12 items-center gap-2 rounded-full bg-yellow-300 px-6 text-xs font-black uppercase tracking-[0.2em] text-black transition hover:bg-white">Hablar de mi proyecto <ArrowRight className="h-4 w-4" /></Link>
              <a href={buildWhatsAppLink('Hola Soluciones Fabrick, quiero orientación para calcular un kit, cabaña o casa llave en mano.')} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 px-6 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:border-yellow-300/40 hover:text-yellow-300">WhatsApp <MessageCircle className="h-4 w-4" /></a>
            </div>
          </div>
          <div className="divide-y divide-white/10 border-y border-white/10">{WHY_US.map((item) => <div key={item} className="flex gap-4 py-5"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-yellow-300" /><p className="text-sm leading-7 text-zinc-300">{item}</p></div>)}</div>
        </div>
      </section>

      <section data-scroll-section className="border-t border-white/10 px-4 py-20 md:px-12 md:py-28">
        <div className="mx-auto max-w-[1500px]">
          <SectionHeader eyebrow="Proceso" title="Cómo avanzamos" text="Un camino simple para que no tengas que partir adivinando precios ni alcances." />
          <div className="mt-12 grid divide-y divide-white/10 border-y border-white/10 md:grid-cols-4 md:divide-x md:divide-y-0">
            {PROCESS.map(({ step, title, text }) => <div key={step} className="p-6"><span className="text-4xl font-black text-yellow-300/35">{step}</span><h3 className="mt-5 text-lg font-black text-white">{title}</h3><p className="mt-3 text-sm leading-7 text-zinc-400">{text}</p></div>)}
          </div>
        </div>
      </section>

      <section data-scroll-section id="contacto" className="border-t border-white/10 bg-[#070707] px-4 py-20 md:px-12 md:py-28">
        <div className="mx-auto grid max-w-[1500px] gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="space-y-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.34em] text-yellow-300">Contacto directo</p>
              <h2 className="mt-4 text-4xl font-black leading-[0.98] tracking-tight text-white md:text-6xl">Cuéntanos qué quieres construir.</h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-zinc-400">Puede ser un kit, una cabaña, una ampliación o una casa llave en mano. Te ayudamos a ordenar precio, alcance y próximos pasos.</p>
            </div>
            <div className="grid divide-y divide-white/10 border-y border-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <ContactNote Icon={MapPin} title="Zona de atención" text="Base en Linares y Región del Maule; revisamos casos puntuales en otras zonas." />
              <ContactNote Icon={Sparkles} title="Primera orientación" text="Partimos con una guía simple para saber si el proyecto puede avanzar." />
            </div>
            <ContactMap className="min-h-[22rem]" title="Soluciones Fabrick" subtitle="Linares · Región del Maule" />
          </div>
          <div className="border-t border-yellow-300/35 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"><ContactForm /></div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black px-4 py-12 md:px-12">
        <div className="mx-auto grid max-w-[1500px] gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div><p className="text-lg font-black uppercase tracking-[0.14em] text-white">Soluciones <span className="text-yellow-300">Fabrick</span></p><p className="mt-4 max-w-md text-sm leading-7 text-zinc-400">{taglineText}</p><div className="mt-5 flex gap-3"><SocialLink href={fbHref} label="Facebook">F</SocialLink><SocialLink href={igHref} label="Instagram">I</SocialLink><SocialLink href={ttHref} label="TikTok">T</SocialLink></div></div>
          <FooterColumn title="Explorar" items={[["Calculadora", "#calculadora-m2"], ["Servicios", "/servicios"], ["Tienda", "/tienda"], ["Contacto", "/contacto"]]} />
          <FooterColumn title="Contacto" items={[["WhatsApp", buildWhatsAppLink('Hola Soluciones Fabrick, quiero orientación.')], ["Cotizar", "/contacto"], ["Productos", "/tienda"]]} />
        </div>
        <div className="mx-auto mt-10 max-w-[1500px] border-t border-white/10 pt-6 text-xs leading-6 text-zinc-500" dangerouslySetInnerHTML={{ __html: copyrightHtml }} />
      </footer>
    </div>
  );
}

function SectionHeader({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <div className="mx-auto max-w-3xl text-center"><p className="text-[10px] font-black uppercase tracking-[0.34em] text-yellow-300">{eyebrow}</p><h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-white md:text-5xl">{title}</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-zinc-400 md:text-base">{text}</p></div>;
}

function LineItem({ Icon, title, text }: { Icon: LucideIcon; title: string; text: string }) {
  return <div className="p-6"><span className="grid h-12 w-12 place-items-center rounded-full bg-yellow-300 text-black"><Icon className="h-5 w-5" /></span><h3 className="mt-5 text-xl font-black text-white">{title}</h3><p className="mt-3 text-sm leading-7 text-zinc-400">{text}</p></div>;
}

function ContactNote({ Icon, title, text }: { Icon: LucideIcon; title: string; text: string }) {
  return <div className="p-5"><Icon className="h-5 w-5 text-yellow-300" /><b className="mt-4 block text-sm font-black uppercase tracking-[0.12em] text-white">{title}</b><p className="mt-2 text-sm leading-6 text-zinc-400">{text}</p></div>;
}

function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  const isDisabled = !href || href === '#';
  return <a href={isDisabled ? undefined : href} aria-label={label} target={isDisabled ? undefined : '_blank'} rel={isDisabled ? undefined : 'noopener noreferrer'} className={`grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-sm font-black text-zinc-300 transition ${isDisabled ? 'cursor-not-allowed opacity-40' : 'hover:border-yellow-300/50 hover:text-yellow-300'}`}>{children}</a>;
}

function FooterColumn({ title, items }: { title: string; items: Array<[string, string]> }) {
  return <div><p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">{title}</p><div className="mt-4 grid gap-2">{items.map(([label, href]) => { const external = href.startsWith('http'); if (external) return <a key={label + href} href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 transition hover:text-yellow-300">{label}</a>; return <Link key={label + href} href={href} className="text-sm text-zinc-400 transition hover:text-yellow-300">{label}</Link>; })}</div></div>;
}
