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
  {
    Icon: SearchCheck,
    title: 'Más claridad',
    text: 'Ordenamos necesidades, prioridades, presupuesto y alternativas antes de tomar una decisión.',
  },
  {
    Icon: ShieldCheck,
    title: 'Más responsabilidad',
    text: 'Comunicación directa, criterios técnicos y menos promesas infladas antes de comprometer dinero.',
  },
  {
    Icon: CheckCircle2,
    title: 'Menos incertidumbre',
    text: 'Construir, remodelar o comprar para el hogar debe sentirse más seguro y menos confuso.',
  },
];

const SERVICES = [
  {
    Icon: Home,
    title: 'Remodelación y mejoras del hogar',
    text: 'Ajustamos espacios para que funcionen mejor, se vean mejor y respondan a una necesidad real.',
    href: '/servicios',
  },
  {
    Icon: Hammer,
    title: 'Construcción y soluciones estructurales',
    text: 'Planificación, partidas, materiales y ejecución con más orden y menos improvisación.',
    href: '/servicios/metalcon',
  },
  {
    Icon: Wrench,
    title: 'Instalación y equipamiento',
    text: 'Baños, cocinas, climatización, terminaciones y mejoras prácticas para el hogar.',
    href: '/servicios',
  },
  {
    Icon: ClipboardCheck,
    title: 'Asesoría para elegir mejor',
    text: 'Comparamos opciones según uso, presupuesto, urgencia y durabilidad esperada.',
    href: '/contacto',
  },
];

const PRODUCT_CATEGORIES = [
  { Icon: Lightbulb, title: 'Iluminación', text: 'Lámparas, reflectores y soluciones para dar presencia a tus espacios.' },
  { Icon: Zap, title: 'Climatización', text: 'Aires acondicionados y equipos para mejorar confort.' },
  { Icon: Droplets, title: 'Grifería', text: 'Opciones para cocina, lavamanos y renovación de baños.' },
  { Icon: Package, title: 'Sanitarios y espejos', text: 'Elementos útiles para equipar y mejorar el hogar.' },
  { Icon: PaintRoller, title: 'Terminaciones', text: 'Complementos para cerrar mejor cada detalle visual.' },
  { Icon: ShoppingBag, title: 'Accesorios', text: 'Productos funcionales para baño, cocina y espacios diarios.' },
];

const WHY_US = [
  'Comunicación más clara antes de comprometer tu dinero.',
  'Menos improvisación en cada recomendación o solución.',
  'Productos y servicios pensados para resolver necesidades reales.',
  'Atención cercana desde la duda inicial hasta el avance del proyecto.',
];

const PROCESS = [
  {
    step: '01',
    title: 'Escuchamos tu necesidad',
    text: 'Entendemos qué quieres resolver, prioridad, urgencia y expectativas.',
  },
  {
    step: '02',
    title: 'Ordenamos opciones',
    text: 'Separamos servicio, producto, materialidad, costos variables y riesgos.',
  },
  {
    step: '03',
    title: 'Definimos camino',
    text: 'Aterrizamos una recomendación práctica según espacio, presupuesto y objetivo.',
  },
  {
    step: '04',
    title: 'Acompañamos avance',
    text: 'Buscamos que compra o ejecución tenga sentido técnico y comercial.',
  },
];

const MetaIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
  </svg>
);
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

export default function LandingSections({
  copyrightText,
  socialLinks,
}: { copyrightText?: string; socialLinks?: { facebook?: string; instagram?: string; tiktok?: string } } = {}) {
  const footer = useSiteContent('footer');
  const copyrightHtml = (copyrightText && copyrightText.trim())
    ? copyrightText.replaceAll('{year}', String(new Date().getFullYear()))
    : (footer.legal || `© ${new Date().getFullYear()} Soluciones Fabrick · Todos los derechos reservados`).replaceAll('{year}', String(new Date().getFullYear()));
  const taglineText = footer.tagline || 'Más claridad. Menos incertidumbre. Mejores decisiones para tu hogar.';
  const fbHref = socialLinks?.facebook?.trim() || '#';
  const igHref = socialLinks?.instagram?.trim() || '#';
  const ttHref = socialLinks?.tiktok?.trim() || '#';

  return (
    <div className="overflow-x-hidden bg-[#050403] text-white">
      <section className="border-t border-white/10 px-4 py-20 md:px-12 md:py-28">
        <div className="mx-auto max-w-[1500px]">
          <SectionHeader
            eyebrow="Enfoque Fabrick"
            title="Venimos a quitarle ruido a la construcción"
            text="La mala comunicación, la improvisación y las decisiones apuradas terminan costando caro. Nuestro enfoque es avanzar con más orden, criterio y confianza."
          />
          <div className="mt-12 grid divide-y divide-white/10 border-y border-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
            {PRINCIPLES.map(({ Icon, title, text }) => (
              <LineItem key={title} Icon={Icon} title={title} text={text} />
            ))}
          </div>
        </div>
      </section>

      <section id="servicios" className="border-t border-white/10 bg-[#080706] px-4 py-20 md:px-12 md:py-28">
        <div className="mx-auto max-w-[1500px]">
          <SectionHeader
            eyebrow="Servicios"
            title="Soluciones pensadas para resolver de verdad"
            text="No presentamos servicios como una lista fría. Los enfocamos en lo que realmente importa: mejorar espacios, evitar errores y ayudarte a decidir mejor."
          />
          <div className="mt-12 divide-y divide-white/10 border-y border-white/10">
            {SERVICES.map(({ Icon, title, text, href }) => (
              <Link key={title} href={href} className="group grid gap-5 py-6 transition hover:bg-white/[0.025] sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:items-center sm:px-2">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-yellow-300 text-black transition group-hover:scale-105">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <b className="block text-xl font-black leading-tight text-white">{title}</b>
                  <span className="mt-2 block max-w-3xl text-sm leading-7 text-zinc-400">{text}</span>
                </span>
                <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">
                  Ver solución <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="tienda" className="relative overflow-hidden border-t border-white/10 px-4 py-20 md:px-12 md:py-28">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_92%_0%,rgba(250,204,21,.12),transparent_26rem),radial-gradient(circle_at_10%_100%,rgba(20,184,166,.10),transparent_28rem)]" />
        <div className="relative mx-auto max-w-[1500px]">
          <SectionHeader
            eyebrow="Tienda"
            title="Productos seleccionados para tu hogar y tus proyectos"
            text="La idea no es vender por vender. Queremos ayudarte a encontrar productos útiles para equipar, renovar y mejorar espacios con mejor criterio de compra."
          />
          <div className="mt-12 grid divide-y divide-white/10 border-y border-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
            {PRODUCT_CATEGORIES.map(({ Icon, title, text }) => (
              <Link key={title} href="/tienda" className="group flex items-start gap-4 p-5 transition hover:bg-white/[0.025]">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-yellow-300/30 text-yellow-300 transition group-hover:bg-yellow-300 group-hover:text-black">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <b className="block text-sm font-black uppercase tracking-[0.12em] text-white">{title}</b>
                  <span className="mt-2 block text-sm leading-6 text-zinc-400">{text}</span>
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-14 border-t border-white/10 pt-10">
            <TiendaSection />
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#080706] px-4 py-20 md:px-12 md:py-28">
        <div className="mx-auto grid max-w-[1500px] gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.34em] text-yellow-300">Por qué elegirnos</p>
            <h2 className="mt-4 text-4xl font-black leading-[0.98] tracking-tight text-white md:text-6xl">Menos humo. Más claridad para avanzar.</h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-zinc-400">
              La confianza no se construye con cifras inventadas. Se construye explicando mejor, respondiendo mejor y ayudando al cliente a evitar decisiones irresponsables.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contacto" className="inline-flex h-12 items-center gap-2 rounded-full bg-yellow-300 px-6 text-xs font-black uppercase tracking-[0.2em] text-black transition hover:bg-white">
                Hablar de mi proyecto <ArrowRight className="h-4 w-4" />
              </Link>
              <a href={buildWhatsAppLink('Hola Soluciones Fabrick, quiero orientación para construir, remodelar o equipar mi espacio con más claridad.')} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 px-6 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:border-yellow-300/40 hover:text-yellow-300">
                WhatsApp <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div className="divide-y divide-white/10 border-y border-white/10">
            {WHY_US.map((item) => (
              <div key={item} className="flex gap-4 py-5">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-yellow-300" />
                <p className="text-sm leading-7 text-zinc-300">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-4 py-20 md:px-12 md:py-28">
        <div className="mx-auto max-w-[1500px]">
          <SectionHeader
            eyebrow="Proceso"
            title="Así trabajamos"
            text="Un proceso simple, claro y directo para pasar de la duda inicial a una decisión mejor tomada."
          />
          <div className="mt-12 grid divide-y divide-white/10 border-y border-white/10 md:grid-cols-4 md:divide-x md:divide-y-0">
            {PROCESS.map(({ step, title, text }) => (
              <div key={step} className="p-6">
                <span className="text-4xl font-black text-yellow-300/35">{step}</span>
                <h3 className="mt-5 text-lg font-black text-white">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contacto" className="border-t border-white/10 bg-[#070707] px-4 py-20 md:px-12 md:py-28">
        <div className="mx-auto grid max-w-[1500px] gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="space-y-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.34em] text-yellow-300">Contacto directo</p>
              <h2 className="mt-4 text-4xl font-black leading-[0.98] tracking-tight text-white md:text-6xl">Construye, mejora o equipa con más confianza.</h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-zinc-400">
                Cuéntanos qué necesitas y te ayudamos a ordenar la idea. Puede ser una remodelación, una instalación, una compra para tu hogar o una duda antes de avanzar.
              </p>
            </div>
            <div className="grid divide-y divide-white/10 border-y border-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <ContactNote Icon={MapPin} title="Zona de atención" text="Base en Linares y Región del Maule; consultas puntuales en otras zonas." />
              <ContactNote Icon={Sparkles} title="Primera orientación" text="Revisamos tu necesidad para indicar el mejor camino inicial." />
            </div>
            <ContactMap className="min-h-[22rem]" title="Soluciones Fabrick" subtitle="Linares · Región del Maule" />
          </div>
          <div className="border-t border-yellow-300/35 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <ContactForm />
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black px-4 py-12 md:px-12">
        <div className="mx-auto grid max-w-[1500px] gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <p className="text-lg font-black uppercase tracking-[0.14em] text-white">Soluciones <span className="text-yellow-300">Fabrick</span></p>
            <p className="mt-4 max-w-md text-sm leading-7 text-zinc-400">{taglineText}</p>
            <div className="mt-5 flex gap-3">
              <SocialLink href={fbHref} label="Facebook"><MetaIcon /></SocialLink>
              <SocialLink href={igHref} label="Instagram"><InstagramIcon /></SocialLink>
              <SocialLink href={ttHref} label="TikTok"><TikTokIcon /></SocialLink>
            </div>
          </div>
          <FooterColumn title="Explorar" items={[["Servicios", "/servicios"], ["Tienda", "/tienda"], ["Contacto", "/contacto"], ["Garantías", "/garantias"]]} />
          <FooterColumn title="Contacto" items={[["WhatsApp", buildWhatsAppLink('Hola Soluciones Fabrick, quiero orientación.')], ["Cotizar", "/contacto"], ["Productos", "/tienda"]]} />
        </div>
        <div className="mx-auto mt-10 max-w-[1500px] border-t border-white/10 pt-6 text-xs leading-6 text-zinc-500" dangerouslySetInnerHTML={{ __html: copyrightHtml }} />
      </footer>
    </div>
  );
}

function SectionHeader({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.34em] text-yellow-300">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-white md:text-5xl">{title}</h2>
      <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-zinc-400 md:text-base">{text}</p>
    </div>
  );
}

function LineItem({ Icon, title, text }: { Icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="p-6">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-yellow-300 text-black">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-5 text-xl font-black text-white">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-zinc-400">{text}</p>
    </div>
  );
}

function ContactNote({ Icon, title, text }: { Icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="p-5">
      <Icon className="h-5 w-5 text-yellow-300" />
      <b className="mt-4 block text-sm font-black uppercase tracking-[0.12em] text-white">{title}</b>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{text}</p>
    </div>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  const isDisabled = !href || href === '#';
  return (
    <a
      href={isDisabled ? undefined : href}
      aria-label={label}
      target={isDisabled ? undefined : '_blank'}
      rel={isDisabled ? undefined : 'noopener noreferrer'}
      className={`grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition ${isDisabled ? 'cursor-not-allowed opacity-40' : 'hover:border-yellow-300/50 hover:text-yellow-300'}`}
    >
      {children}
    </a>
  );
}

function FooterColumn({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">{title}</p>
      <div className="mt-4 grid gap-2">
        {items.map(([label, href]) => {
          const external = href.startsWith('http');
          if (external) {
            return <a key={label + href} href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 transition hover:text-yellow-300">{label}</a>;
          }
          return <Link key={label + href} href={href} className="text-sm text-zinc-400 transition hover:text-yellow-300">{label}</Link>;
        })}
      </div>
    </div>
  );
}
