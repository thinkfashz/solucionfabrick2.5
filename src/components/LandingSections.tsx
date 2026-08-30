'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import ContactForm from './ContactForm';
import TiendaSection from './TiendaSection';
import MetalconSeismicStory from '@/components/landing/MetalconSeismicStory';
import LandingProcessSection from '@/components/landing/LandingProcessSection';
import FabrickStorySection from '@/components/landing/FabrickStorySection';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';
import { FacebookBrandIcon, InstagramBrandIcon, TikTokBrandIcon, WhatsAppBrandIcon } from '@/components/SocialBrandIcons';
import { useSiteContent } from '@/hooks/useSiteContent';
import {
  DEFAULT_HOME_PAGE,
  getHomeSection,
  textContent,
  type HomeVisualSection,
} from '@/lib/homeVisualCms';

interface LandingSectionsProps {
  copyrightText?: string;
  socialLinks?: { facebook?: string; instagram?: string; tiktok?: string };
}

function sectionStyle(section: HomeVisualSection, fallbackBackground: string, fallbackText: string) {
  return { backgroundColor: section.style.background || fallbackBackground, color: section.style.textColor || fallbackText };
}

export function LandingStoreSection({ section }: { section?: HomeVisualSection }) {
  const current = section ?? getHomeSection(DEFAULT_HOME_PAGE, 'store');
  const accent = current.style.accent || '#B96F00';
  const sectionAnchor = current.id === 'home-store' ? 'mas-vendidos' : current.id;
  return (
    <section id={sectionAnchor} data-cms-section="home-store" className="scroll-mt-20 px-4 py-16 sm:px-6 md:px-12 lg:py-24" style={sectionStyle(current, '#FFF9EE', '#08090A')}>
      <div className="mx-auto max-w-[1320px]">
        <div className="grid gap-6 border-b border-current/10 pb-7 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
          <div>
            <p data-cms-field="eyebrow" className="text-[10px] font-black uppercase tracking-[.22em]" style={{ color: accent }}>{textContent(current, 'eyebrow')}</p>
            <h2 data-cms-field="title" className="mt-3 max-w-[11ch] text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl">{textContent(current, 'title')}</h2>
          </div>
          <p data-cms-field="description" className="max-w-2xl text-sm leading-7 opacity-50 sm:text-base">{textContent(current, 'description')}</p>
        </div>
        <div className="mt-5" data-cms-field="product-list">
          <TiendaSection limit={6} variant="grid" title={textContent(current, 'listTitle', 'Selección disponible')} description={textContent(current, 'listDescription')} primaryCtaLabel={textContent(current, 'ctaLabel', 'Ver catálogo completo')} />
        </div>
      </div>
    </section>
  );
}

export function LandingContactSection({ section }: { section?: HomeVisualSection }) {
  const current = section ?? getHomeSection(DEFAULT_HOME_PAGE, 'contact');
  const background = current.style.background || '#F5871F';
  const textColor = current.style.textColor || '#08090A';
  const accent = current.style.accent || '#08090A';
  const sectionAnchor = current.id === 'home-contact' ? 'contacto' : current.id;
  return (
    <section id={sectionAnchor} data-cms-section="home-contact" className="scroll-mt-20 px-4 py-16 sm:px-6 md:px-12 lg:py-24" style={{ backgroundColor: background, color: textColor }}>
      <div className="mx-auto max-w-[1200px]">
        <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:items-start">
          <div>
            <p data-cms-field="eyebrow" className="text-[10px] font-black uppercase tracking-[.22em] opacity-65">{textContent(current, 'eyebrow')}</p>
            <h2 data-cms-field="title" className="mt-3 max-w-[10ch] text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl">{textContent(current, 'title')}</h2>
            <p data-cms-field="description" className="mt-5 max-w-lg text-sm leading-7 opacity-65 sm:text-base">{textContent(current, 'description')}</p>
            <a data-cms-field="whatsappLabel" href={textContent(current, 'whatsappHref')} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full px-6 text-xs font-black transition hover:brightness-110 sm:text-sm" style={{ backgroundColor: accent, color: background }}>{textContent(current, 'whatsappLabel', 'Escribir por WhatsApp')}</a>
          </div>
          <div className="border-t border-current/20 pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <div className="mb-5">
              <p data-cms-field="formTitle" className="text-sm font-black">{textContent(current, 'formTitle', 'Cuéntanos tu proyecto')}</p>
              <p data-cms-field="formSubtitle" className="mt-1 text-[10px] opacity-55">{textContent(current, 'formSubtitle')}</p>
            </div>
            <div data-cms-field="contact-form"><ContactForm /></div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingFooterSection({ section, copyrightText, socialLinks }: LandingSectionsProps & { section?: HomeVisualSection }) {
  const current = section ?? getHomeSection(DEFAULT_HOME_PAGE, 'footer');
  const footer = useSiteContent('footer');
  const year = String(new Date().getFullYear());
  const legalText = copyrightText?.trim() ? copyrightText.replaceAll('{year}', year) : (footer.legal || `© ${year} Soluciones Fabrick. Todos los derechos reservados.`).replaceAll('{year}', year);
  const fbHref = socialLinks?.facebook?.trim() || 'https://www.facebook.com/FabrickSoluciones';
  const igHref = socialLinks?.instagram?.trim() || 'https://www.instagram.com/solucionesfabrick/';
  const ttHref = socialLinks?.tiktok?.trim() || '';
  const whatsappHref = 'https://wa.me/56930121625?text=Hola%20Soluciones%20Fabrick%2C%20quiero%20cotizar%20un%20proyecto.';
  const accent = current.style.accent || '#FFB000';
  const footerGroups: Array<{ title: string; items: Array<[string, string]> }> = [
    { title: 'Proyectos', items: [['Calculadora', '#cotizador'], ['Presupuesto', '/presupuesto'], ['Inspiraciones', '/proyectos']] },
    { title: 'Servicios', items: [['Radier', '/herramientas/radier'], ['Aire acondicionado', '/herramientas/aire-acondicionado'], ['Ver todos', '/servicios']] },
    { title: 'Comprar', items: [['Tienda', '/tienda'], ['Mi cuenta', '/mi-cuenta'], ['Garantías', '/garantias']] },
    { title: 'Fabrick', items: [['Qué hacemos', '#nosotros'], ['Contacto', '#contacto'], ['Privacidad', '/legal/privacidad']] },
  ];

  return (
    <footer data-cms-section="home-footer" className="px-4 pb-28 pt-12 sm:px-6 md:px-12 md:pb-12" style={sectionStyle(current, '#08090A', '#FFF9EE')}>
      <div className="mx-auto max-w-[1320px]">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <div data-cms-field="logo"><FabrickFullLogo compact priority theme="light" /></div>
            <p data-cms-field="description" className="mt-4 max-w-md text-sm leading-7 opacity-45">{textContent(current, 'description')}</p>
            <div data-cms-field="social-links" className="mt-6 flex flex-wrap gap-2">
              <SocialLink href={igHref} label="Instagram" accent={accent}><InstagramBrandIcon className="h-4 w-4" /></SocialLink>
              <SocialLink href={fbHref} label="Facebook" accent={accent}><FacebookBrandIcon className="h-4 w-4" /></SocialLink>
              <SocialLink href={whatsappHref} label="WhatsApp" accent={accent}><WhatsAppBrandIcon className="h-4 w-4" /></SocialLink>
              {ttHref ? <SocialLink href={ttHref} label="TikTok" accent={accent}><TikTokBrandIcon className="h-4 w-4" /></SocialLink> : null}
            </div>
          </div>
          <div data-cms-field="footer-groups" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">{footerGroups.map((group) => <FooterGroup key={group.title} {...group} accent={accent} />)}</div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-current/10 pt-5 text-[9px] leading-5 opacity-30 md:flex-row md:justify-between">
          <div data-cms-field="legal" dangerouslySetInnerHTML={{ __html: legalText }} />
          <span data-cms-field="regionText">{textContent(current, 'regionText')}</span>
        </div>
      </div>
    </footer>
  );
}

export default function LandingSections({ copyrightText, socialLinks }: LandingSectionsProps = {}) {
  return <div className="overflow-x-hidden bg-[#08090A] text-[#FFF9EE]"><LandingProcessSection /><FabrickStorySection /><MetalconSeismicStory /><LandingStoreSection /><LandingContactSection /><LandingFooterSection copyrightText={copyrightText} socialLinks={socialLinks} /></div>;
}

function SocialLink({ href, label, children, accent }: { href: string; label: string; children: ReactNode; accent: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-current/10 px-3 text-[10px] font-black opacity-70 transition hover:opacity-100" style={{ ['--cms-accent' as string]: accent }}>{children}<span>{label}</span></a>;
}

function FooterGroup({ title, items, accent }: { title: string; items: Array<[string, string]>; accent: string }) {
  return <div><p className="text-[9px] font-black uppercase tracking-[.18em]" style={{ color: accent }}>{title}</p><div className="mt-3 grid gap-2.5">{items.map(([label, href]) => <Link key={label} href={href} className="text-sm opacity-45 transition hover:opacity-100">{label}</Link>)}</div></div>;
}
