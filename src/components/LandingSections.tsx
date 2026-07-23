'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  AirVent,
  ArrowRight,
  BadgeCheck,
  Building2,
  Clock3,
  Hammer,
  Home,
  MapPin,
  MessageCircle,
  PaintRoller,
  ShieldCheck,
  ShoppingBag,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import ContactForm from './ContactForm';
import TiendaSection from './TiendaSection';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';
import { useSiteContent } from '@/hooks/useSiteContent';
import { buildWhatsAppLink } from '@/lib/whatsapp';

interface LandingSectionsProps {
  copyrightText?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
  };
}

type ServiceItem = {
  title: string;
  outcome: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const SERVICES: ServiceItem[] = [
  {
    title: 'Construcción y ampliaciones',
    outcome: 'De terreno disponible a espacio habitable',
    description: 'Viviendas, cabañas, kits y ampliaciones organizadas por etapas, partidas y nivel de terminación.',
    href: '#cotizador',
    icon: Home,
  },
  {
    title: 'Remodelación integral',
    outcome: 'Más espacio, mejor uso y una sola coordinación',
    description: 'Redistribución, revestimientos, terminaciones y especialidades bajo una propuesta común.',
    href: '/servicios',
    icon: PaintRoller,
  },
  {
    title: 'Radier y obra base',
    outcome: 'Una base calculada para el uso real',
    description: 'Superficie, espesor, preparación, hormigón y refuerzo definidos antes de ejecutar.',
    href: '/herramientas/radier',
    icon: Building2,
  },
  {
    title: 'Techumbre y filtraciones',
    outcome: 'Protección antes de que el daño avance',
    description: 'Diagnóstico, reparación o renovación de cubierta, fijaciones, canaletas, sellos y remates.',
    href: '/servicios',
    icon: Hammer,
  },
  {
    title: 'Gasfitería y electricidad',
    outcome: 'Instalaciones coordinadas con la obra',
    description: 'Puntos de agua, desagüe, electricidad, iluminación y adecuaciones para espacios nuevos o existentes.',
    href: '/servicios',
    icon: Zap,
  },
  {
    title: 'Climatización y equipamiento',
    outcome: 'Producto, instalación y soporte en una sola ruta',
    description: 'Selección de aire acondicionado y equipamiento para el hogar con instalación evaluada.',
    href: '/herramientas/aire-acondicionado',
    icon: AirVent,
  },
];

export default function LandingSections({ copyrightText, socialLinks }: LandingSectionsProps = {}) {
  const footer = useSiteContent('footer');
  const year = String(new Date().getFullYear());
  const legalText = copyrightText?.trim()
    ? copyrightText.replaceAll('{year}', year)
    : (footer.legal || `© ${year} Soluciones Fabrick. Todos los derechos reservados.`).replaceAll('{year}', year);

  const orientationLink = buildWhatsAppLink('Hola Soluciones Fabrick, necesito orientación para definir mi proyecto.');
  const fbHref = socialLinks?.facebook?.trim() || '#';
  const igHref = socialLinks?.instagram?.trim() || '#';
  const ttHref = socialLinks?.tiktok?.trim() || '#';

  const footerGroups: Array<{ title: string; items: Array<[string, string]> }> = [
    { title: 'Explorar', items: [['Cotizador', '#cotizador'], ['Servicios', '#servicios'], ['Más vendidos', '#mas-vendidos']] },
    { title: 'Herramientas', items: [['Calculadora de radier', '/herramientas/radier'], ['Calculadora de aire', '/herramientas/aire-acondicionado'], ['Presupuestos', '/presupuesto']] },
    { title: 'Empresa', items: [['Proyectos', '/proyectos'], ['Garantías', '/garantias'], ['Contacto', '#contacto']] },
    { title: 'Tienda', items: [['Catálogo', '/tienda'], ['Mi cuenta', '/mi-cuenta'], ['Privacidad', '/legal/privacidad']] },
  ];

  return (
    <div className="overflow-x-hidden bg-[#080705] text-white">
      <section id="servicios" className="relative overflow-hidden px-4 py-16 sm:px-6 md:px-12 lg:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_15%,rgba(250,204,21,.09),transparent_28%),radial-gradient(circle_at_92%_88%,rgba(249,115,22,.08),transparent_28%)]" />
        <div className="relative mx-auto max-w-[1320px]">
          <header data-reveal className="grid gap-5 lg:grid-cols-[.82fr_1.18fr] lg:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.24em] text-yellow-300">Servicios</p>
              <h2 className="mt-3 text-4xl font-black leading-[.96] tracking-[-.055em] sm:text-6xl" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>
                Una sola empresa para resolver la parte difícil.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
              No vendemos tareas aisladas: organizamos el problema, definimos el alcance y conectamos las especialidades necesarias para que el proyecto avance con menos improvisación.
            </p>
          </header>

          <div data-reveal-group className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {SERVICES.map(({ title, outcome, description, href, icon: Icon }) => (
              <Link key={title} href={href} className="group flex min-h-[250px] flex-col rounded-[1.65rem] border border-white/9 bg-white/[.03] p-5 transition duration-300 hover:-translate-y-1 hover:border-yellow-300/28 hover:bg-yellow-300/[.045]">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-yellow-300 text-black"><Icon className="h-5 w-5" /></span>
                  <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-yellow-300" />
                </div>
                <p className="mt-6 text-[9px] font-black uppercase tracking-[.18em] text-yellow-300">{outcome}</p>
                <h3 className="mt-2 text-xl font-black tracking-[-.035em]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{description}</p>
                <span className="mt-auto pt-5 text-[10px] font-black uppercase tracking-[.16em] text-zinc-300">Conocer solución</span>
              </Link>
            ))}
          </div>

          <div data-reveal className="mt-5 flex flex-col gap-4 rounded-[1.5rem] border border-yellow-300/14 bg-yellow-300/[.055] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-yellow-300 text-black"><ShieldCheck className="h-4 w-4" /></span>
              <div>
                <p className="text-sm font-black">¿Tu proyecto mezcla varias especialidades?</p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">Describe el resultado que buscas; nosotros te ayudamos a ordenar el alcance.</p>
              </div>
            </div>
            <a href={orientationLink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-yellow-300 px-5 text-xs font-black text-black transition hover:bg-white">
              Orientar mi proyecto <MessageCircle className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <section id="mas-vendidos" className="border-y border-white/8 bg-[#0d0b08] px-4 py-16 sm:px-6 md:px-12 lg:py-20">
        <div data-reveal className="mx-auto max-w-[1320px]">
          <TiendaSection
            limit={3}
            variant="banner"
            title="Los más vendidos para mejorar tu hogar"
            description="Productos destacados directamente desde la tienda. Revisa precio, disponibilidad y características sin repetir el catálogo completo en la portada."
            primaryCtaLabel="Explorar catálogo"
          />
        </div>
      </section>

      <section id="contacto" className="relative overflow-hidden px-4 py-16 sm:px-6 md:px-12 lg:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_18%,rgba(249,115,22,.1),transparent_28%)]" />
        <div className="relative mx-auto grid max-w-[1200px] gap-8 lg:grid-cols-[.78fr_1.22fr] lg:items-start">
          <div data-reveal>
            <p className="text-[10px] font-black uppercase tracking-[.24em] text-yellow-300">Solicitar evaluación</p>
            <h2 className="mt-3 text-4xl font-black leading-[.96] tracking-[-.055em] sm:text-6xl" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>
              Cuéntanos el resultado que necesitas lograr.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">
              Indica comuna, superficie aproximada y tipo de trabajo. Te responderemos con las preguntas correctas para definir viabilidad, alcance y próximos pasos.
            </p>

            <div className="mt-6 grid gap-2">
              <ProofLine icon={<MapPin className="h-4 w-4" />} title="Cobertura principal" text="Región del Maule y proyectos seleccionados en Santiago." />
              <ProofLine icon={<Clock3 className="h-4 w-4" />} title="Respuesta comercial" text="Revisamos tu solicitud y te indicamos qué información falta." />
              <ProofLine icon={<BadgeCheck className="h-4 w-4" />} title="Cotización responsable" text="El valor final se confirma con medidas y condiciones reales." />
            </div>
          </div>

          <div data-reveal className="rounded-[1.8rem] border border-white/10 bg-white/[.04] p-4 shadow-[0_28px_80px_rgba(0,0,0,.28)] sm:p-6">
            <div className="mb-5 flex items-center gap-3 border-b border-white/9 pb-4">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-yellow-300 text-black"><MessageCircle className="h-5 w-5" /></span>
              <div><p className="text-sm font-black">Hablemos de tu proyecto</p><p className="mt-1 text-[10px] text-zinc-500">Formulario breve · orientación personalizada</p></div>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>

      <footer className="border-t border-white/8 bg-black px-4 py-9 sm:px-6 md:px-12">
        <div className="mx-auto max-w-[1320px]">
          <div className="grid gap-7 lg:grid-cols-[1.05fr_1.95fr] lg:items-start">
            <div>
              <FabrickFullLogo compact priority theme="light" />
              <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">Construcción, remodelación y equipamiento con alcance claro antes de ejecutar.</p>
              <div className="mt-4 flex gap-2">
                <SocialLink href={fbHref} label="Facebook"><span aria-hidden>f</span></SocialLink>
                <SocialLink href={igHref} label="Instagram"><span aria-hidden>◎</span></SocialLink>
                <SocialLink href={ttHref} label="TikTok"><span aria-hidden>♪</span></SocialLink>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-4 md:gap-6">
              {footerGroups.map((group) => <FooterGroup key={group.title} {...group} />)}
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-2 border-t border-white/8 pt-4 text-[9px] leading-5 text-zinc-600 md:flex-row md:items-center md:justify-between">
            <div dangerouslySetInnerHTML={{ __html: legalText }} />
            <span className="inline-flex items-center gap-1.5"><ShoppingBag className="h-3.5 w-3.5 text-yellow-300" /> Servicios y productos en una sola plataforma.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProofLine({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/8 bg-white/[.025] p-3.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-yellow-300/[.09] text-yellow-300">{icon}</span>
      <span><b className="block text-xs">{title}</b><span className="mt-1 block text-[10px] leading-5 text-zinc-500">{text}</span></span>
    </div>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  const disabled = !href || href === '#';
  return (
    <a
      href={disabled ? undefined : href}
      aria-label={label}
      target={disabled ? undefined : '_blank'}
      rel={disabled ? undefined : 'noopener noreferrer'}
      className={`grid h-10 w-10 place-items-center rounded-full border border-white/10 text-sm font-black transition ${disabled ? 'cursor-not-allowed opacity-35' : 'text-zinc-300 hover:border-yellow-300/45 hover:bg-yellow-300 hover:text-black'}`}
    >
      {children}
    </a>
  );
}

function FooterGroup({ title, items }: { title: string; items: Array<[string, string]> }) {
  const links = (
    <div className="grid gap-2 pb-2 pt-3 md:pb-0">
      {items.map(([label, href]) => href.startsWith('http')
        ? <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 transition hover:text-yellow-300">{label}</a>
        : <Link key={label} href={href} className="text-sm text-zinc-400 transition hover:text-yellow-300">{label}</Link>)}
    </div>
  );

  return (
    <div>
      <details className="group border-t border-white/9 md:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-xs font-black text-white"><span>{title}</span><span className="text-yellow-300 transition group-open:rotate-45">+</span></summary>
        {links}
      </details>
      <div className="hidden md:block"><p className="text-[8px] font-black uppercase tracking-[.22em] text-yellow-300">{title}</p>{links}</div>
    </div>
  );
}
