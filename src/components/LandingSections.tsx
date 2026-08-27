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

interface LandingSectionsProps {
  copyrightText?: string;
  socialLinks?: { facebook?: string; instagram?: string; tiktok?: string };
}

export default function LandingSections({ copyrightText, socialLinks }: LandingSectionsProps = {}) {
  const footer = useSiteContent('footer');
  const year = String(new Date().getFullYear());
  const legalText = copyrightText?.trim() ? copyrightText.replaceAll('{year}', year) : (footer.legal || `© ${year} Soluciones Fabrick. Todos los derechos reservados.`).replaceAll('{year}', year);
  const fbHref = socialLinks?.facebook?.trim() || 'https://www.facebook.com/FabrickSoluciones';
  const igHref = socialLinks?.instagram?.trim() || 'https://www.instagram.com/solucionesfabrick/';
  const ttHref = socialLinks?.tiktok?.trim() || '';
  const whatsappHref = 'https://wa.me/56930121625?text=Hola%20Soluciones%20Fabrick%2C%20quiero%20cotizar%20un%20proyecto.';
  const footerGroups: Array<{ title: string; items: Array<[string, string]> }> = [
    { title: 'Proyectos', items: [['Calculadora', '#cotizador'], ['Presupuesto', '/presupuesto'], ['Inspiraciones', '/proyectos']] },
    { title: 'Servicios', items: [['Radier', '/herramientas/radier'], ['Aire acondicionado', '/herramientas/aire-acondicionado'], ['Ver todos', '/servicios']] },
    { title: 'Comprar', items: [['Tienda', '/tienda'], ['Mi cuenta', '/mi-cuenta'], ['Garantías', '/garantias']] },
    { title: 'Fabrick', items: [['Qué hacemos', '#nosotros'], ['Contacto', '#contacto'], ['Privacidad', '/legal/privacidad']] },
  ];

  return (
    <div className="overflow-x-hidden bg-[#08090A] text-[#FFF9EE]">
      <LandingProcessSection />
      <FabrickStorySection />
      <MetalconSeismicStory />

      <section id="mas-vendidos" className="scroll-mt-20 bg-[#FFF9EE] px-4 py-16 text-[#08090A] sm:px-6 md:px-12 lg:py-24">
        <div className="mx-auto max-w-[1320px]">
          <div className="grid gap-6 border-b border-black/10 pb-7 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#B96F00]">Tienda Fabrick</p>
              <h2 className="mt-3 max-w-[11ch] text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl">Productos para terminar, equipar y mejorar tu hogar.</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-black/48 sm:text-base">Materiales, equipamiento y soluciones seleccionadas para complementar una obra o resolver mejoras puntuales. Precio publicado con IVA incluido.</p>
          </div>
          <div className="mt-5">
            <TiendaSection limit={6} variant="grid" title="Selección disponible" description="Revisa precio, stock, despacho y detalles antes de comprar." primaryCtaLabel="Ver catálogo completo" />
          </div>
        </div>
      </section>

      <section id="contacto" className="scroll-mt-20 bg-[#F5871F] px-4 py-16 text-[#08090A] sm:px-6 md:px-12 lg:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#5E3F2A]">Hablemos</p>
              <h2 className="mt-3 max-w-[10ch] text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl">Cuéntanos qué quieres hacer.</h2>
              <p className="mt-5 max-w-lg text-sm leading-7 text-[#493B32] sm:text-base">Construcción, remodelación, instalación o una reparación puntual. Con una foto, una medida aproximada y tu comuna podemos empezar.</p>
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[#08090A] px-6 text-xs font-black text-[#FFF9EE] transition hover:bg-[#FFF9EE] hover:text-[#08090A] sm:text-sm">Escribir por WhatsApp</a>
            </div>
            <div className="border-t border-[#08090A]/18 pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
              <div className="mb-5"><p className="text-sm font-black">Cuéntanos tu proyecto</p><p className="mt-1 text-[10px] text-[#6C5749]">Formulario breve · respondemos con la información que falte</p></div>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#08090A] px-4 pb-28 pt-12 text-[#FFF9EE] sm:px-6 md:px-12 md:pb-12">
        <div className="mx-auto max-w-[1320px]">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr]">
            <div>
              <FabrickFullLogo compact priority theme="light" />
              <p className="mt-4 max-w-md text-sm leading-7 text-white/42">Construcción, remodelación, instalaciones, productos y herramientas para mejorar tu hogar.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <SocialLink href={igHref} label="Instagram"><InstagramBrandIcon className="h-4 w-4" /></SocialLink>
                <SocialLink href={fbHref} label="Facebook"><FacebookBrandIcon className="h-4 w-4" /></SocialLink>
                <SocialLink href={whatsappHref} label="WhatsApp"><WhatsAppBrandIcon className="h-4 w-4" /></SocialLink>
                {ttHref ? <SocialLink href={ttHref} label="TikTok"><TikTokBrandIcon className="h-4 w-4" /></SocialLink> : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">{footerGroups.map((group) => <FooterGroup key={group.title} {...group} />)}</div>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-white/8 pt-5 text-[9px] leading-5 text-white/28 md:flex-row md:justify-between">
            <div dangerouslySetInnerHTML={{ __html: legalText }} />
            <span>Soluciones Fabrick · Maule y proyectos seleccionados en Santiago</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-3 text-[10px] font-black text-white/70 transition hover:border-[#FFB000]/50 hover:text-[#FFF9EE]">{children}<span>{label}</span></a>;
}

function FooterGroup({ title, items }: { title: string; items: Array<[string, string]> }) {
  return <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#FFB000]">{title}</p><div className="mt-3 grid gap-2.5">{items.map(([label, href]) => <Link key={label} href={href} className="text-sm text-white/44 transition hover:text-[#FFF9EE]">{label}</Link>)}</div></div>;
}
