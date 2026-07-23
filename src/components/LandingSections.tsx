'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  BadgeCheck,
  Clock3,
  MapPin,
  MessageCircle,
  ShoppingBag,
} from 'lucide-react';
import ContactForm from './ContactForm';
import TiendaSection from './TiendaSection';
import ServicesVerticalGallery from '@/components/landing/ServicesVerticalGallery';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';
import { useSiteContent } from '@/hooks/useSiteContent';

interface LandingSectionsProps {
  copyrightText?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
  };
}

export default function LandingSections({ copyrightText, socialLinks }: LandingSectionsProps = {}) {
  const footer = useSiteContent('footer');
  const year = String(new Date().getFullYear());
  const legalText = copyrightText?.trim()
    ? copyrightText.replaceAll('{year}', year)
    : (footer.legal || `© ${year} Soluciones Fabrick. Todos los derechos reservados.`).replaceAll('{year}', year);

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
      <ServicesVerticalGallery />

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
