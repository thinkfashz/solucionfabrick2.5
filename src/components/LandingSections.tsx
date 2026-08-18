'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  BadgeCheck,
  Clock3,
  MapPin,
  MessageCircle,
  ShoppingBag,
  Facebook,
  Instagram,
  Music2,
} from 'lucide-react';
import ContactForm from './ContactForm';
import TiendaSection from './TiendaSection';
import MetalconSeismicStory from '@/components/landing/MetalconSeismicStory';
import LandingProcessSection from '@/components/landing/LandingProcessSection';
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
    { title: 'Explorar', items: [['Cotizador', '#cotizador'], ['Más vendidos', '#mas-vendidos']] },
    { title: 'Herramientas', items: [['Estimador de radier', '/herramientas/radier'], ['Estimador de aire', '/herramientas/aire-acondicionado'], ['Presupuestos', '/presupuesto']] },
    { title: 'Empresa', items: [['Inspiraciones', '/proyectos'], ['Garantías', '/garantias'], ['Contacto', '#contacto']] },
    { title: 'Tienda', items: [['Catálogo', '/tienda'], ['Mi cuenta', '/mi-cuenta'], ['Privacidad', '/legal/privacidad']] },
  ];

  return (
    <div className="overflow-x-hidden bg-[#08090A] text-[#FFF9EE]">
      <LandingProcessSection />
      <MetalconSeismicStory />

      <section id="mas-vendidos" className="scroll-mt-20 bg-[#FFF9EE] px-4 py-16 text-[#08090A] sm:px-6 md:px-12 lg:py-20">
        <div data-reveal data-reveal-dir="up" className="mx-auto max-w-[1320px]">
          <TiendaSection
            limit={3}
            variant="banner"
            title="Productos elegidos para completar tu proyecto"
            description="Una selección breve de la tienda para complementar instalaciones, terminaciones y mejoras del hogar sin duplicar el catálogo completo."
            primaryCtaLabel="Explorar catálogo"
          />
        </div>
      </section>

      <section id="contacto" className="relative scroll-mt-20 overflow-hidden bg-[#F5871F] px-4 py-16 text-[#08090A] sm:px-6 md:px-12 lg:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_18%,rgba(248,240,233,.3),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-[1200px] gap-8 lg:grid-cols-[.78fr_1.22fr] lg:items-start">
          <div>
            <p data-reveal className="text-[10px] font-black uppercase tracking-[.24em] text-[#5E3F2A]">Solicitar evaluación</p>
            <h2 data-split className="mt-3 text-4xl font-black leading-[.96] tracking-[-.055em] sm:text-6xl" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>
              Cuéntanos qué quieres resolver y nosotros ordenamos el siguiente paso.
            </h2>
            <p data-reveal data-reveal-delay="0.15" className="mt-4 max-w-xl text-sm leading-7 text-[#493B32] sm:text-base">
              Indica comuna, medidas aproximadas y estado actual. El equipo técnico responderá con las preguntas necesarias para definir viabilidad, alcance y una cotización responsable.
            </p>

            <div data-reveal-group data-reveal-dir="up" className="mt-6 grid gap-2">
              <ProofLine icon={<MapPin className="h-4 w-4" />} title="Cobertura principal" text="Región del Maule y proyectos seleccionados en Santiago." />
              <ProofLine icon={<Clock3 className="h-4 w-4" />} title="Respuesta comercial" text="Revisamos la información y te indicamos qué falta para avanzar." />
              <ProofLine icon={<BadgeCheck className="h-4 w-4" />} title="Cotización responsable" text="El valor final se confirma con medidas y condiciones reales." />
            </div>
          </div>

          <div data-reveal data-reveal-dir="right" className="rounded-[1.8rem] bg-[#FFF9EE] p-4 text-[#08090A] shadow-[0_28px_80px_rgba(23,24,32,.22)] sm:p-6">
            <div className="mb-5 flex items-center gap-3 border-b border-[#08090A]/10 pb-4">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#08090A] text-[#FFB000]"><MessageCircle className="h-5 w-5" /></span>
              <div><p className="text-sm font-black">Hablemos de tu proyecto</p><p className="mt-1 text-[10px] text-[#BFB8AC]">Formulario breve · orientación personalizada</p></div>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>

      <footer data-reveal data-reveal-dir="up" className="bg-[#08090A] px-4 py-9 text-[#FFF9EE] sm:px-6 md:px-12">
        <div className="mx-auto max-w-[1320px]">
          <div className="grid gap-7 lg:grid-cols-[1.05fr_1.95fr] lg:items-start">
            <div>
              <FabrickFullLogo compact priority theme="light" />
              <p className="mt-3 max-w-md text-sm leading-6 text-[#BFB8AC]">Servicios, estimadores y productos para organizar una inversión antes de ejecutar.</p>
              <div className="mt-4 flex gap-2">
                <SocialLink href={fbHref} label="Facebook"><Facebook className="h-4 w-4" /></SocialLink>
                <SocialLink href={igHref} label="Instagram"><Instagram className="h-4 w-4" /></SocialLink>
                <SocialLink href={ttHref} label="TikTok"><Music2 className="h-4 w-4" /></SocialLink>
              </div>
              <a
                href="https://wa.me/56930121625?text=Hola%20Soluciones%20Fabrick%2C%20quiero%20d%C3%ADas%20y%20horarios%20para%20revisar%20mi%20proyecto."
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#FFB000] px-5 text-[11px] font-black text-[#08090A] transition hover:bg-[#FFD05A]"
              >
                <MessageCircle className="h-4 w-4" /> Escríbenos por WhatsApp
              </a>
            </div>
            <div className="grid gap-2 md:grid-cols-4 md:gap-6">
              {footerGroups.map((group) => <FooterGroup key={group.title} {...group} />)}
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-2 border-t border-[#FFF9EE]/8 pt-4 text-[9px] leading-5 text-[#81776F] md:flex-row md:items-center md:justify-between">
            <div dangerouslySetInnerHTML={{ __html: legalText }} />
            <span className="inline-flex items-center gap-1.5"><ShoppingBag className="h-3.5 w-3.5 text-[#FFB000]" /> Servicios y productos en una sola plataforma.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProofLine({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-[#FFF9EE]/35 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,.18)]">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#08090A] text-[#FFB000]">{icon}</span>
      <span><b className="block text-xs">{title}</b><span className="mt-1 block text-[10px] leading-5 text-[#55463B]">{text}</span></span>
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
      className={`grid h-10 w-10 place-items-center rounded-full border border-[#FFF9EE]/10 text-sm font-black transition ${disabled ? 'cursor-not-allowed opacity-35' : 'text-[#D4C7BD] hover:border-[#FFB000]/45 hover:bg-[#FFB000] hover:text-[#08090A]'}`}
    >
      {children}
    </a>
  );
}

function FooterGroup({ title, items }: { title: string; items: Array<[string, string]> }) {
  const links = (
    <div className="grid gap-2 pb-2 pt-3 md:pb-0">
      {items.map(([label, href]) => href.startsWith('http')
        ? <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-[#BFB8AC] transition hover:text-[#FFB000]">{label}</a>
        : <Link key={label} href={href} className="text-sm text-[#BFB8AC] transition hover:text-[#FFB000]">{label}</Link>)}
    </div>
  );

  return (
    <div>
      <details className="group border-t border-[#FFF9EE]/9 md:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-xs font-black text-[#FFF9EE]"><span>{title}</span><span className="text-[#FFB000] transition group-open:rotate-45">+</span></summary>
        {links}
      </details>
      <div className="hidden md:block"><p className="text-[8px] font-black uppercase tracking-[.22em] text-[#FFB000]">{title}</p>{links}</div>
    </div>
  );
}
