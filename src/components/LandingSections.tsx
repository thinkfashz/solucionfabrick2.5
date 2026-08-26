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

  const fbHref = socialLinks?.facebook?.trim() || 'https://www.facebook.com/FabrickSoluciones';
  const igHref = socialLinks?.instagram?.trim() || 'https://www.instagram.com/solucionesfabrick/';
  const ttHref = socialLinks?.tiktok?.trim() || '';
  const whatsappHref = 'https://wa.me/56930121625?text=Hola%20Soluciones%20Fabrick%2C%20quiero%20revisar%20mi%20proyecto.';

  const footerGroups: Array<{ title: string; items: Array<[string, string]> }> = [
    { title: 'Planificar', items: [['Calculadora', '#cotizador'], ['Presupuesto', '/presupuesto'], ['Inspiraciones', '/proyectos']] },
    { title: 'Herramientas', items: [['Radier', '/herramientas/radier'], ['Aire acondicionado', '/herramientas/aire-acondicionado'], ['Servicios', '/servicios']] },
    { title: 'Comprar', items: [['Tienda', '/tienda'], ['Mi cuenta', '/mi-cuenta'], ['Garantías', '/garantias']] },
    { title: 'Empresa', items: [['Por qué Fabrick', '#nosotros'], ['Contacto', '#contacto'], ['Privacidad', '/legal/privacidad']] },
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
              <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#B96F00]">Productos para completar la obra</p>
              <h2 className="mt-3 max-w-[10ch] text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl">Compra solo lo que ya sabes que necesitas.</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-black/48 sm:text-base">
              La tienda aparece después de medir y ordenar el proyecto por una razón: un producto tiene más sentido cuando ya sabes qué partida estás resolviendo y qué cantidad o especificación necesitas comparar.
            </p>
          </div>
          <div className="mt-5">
            <TiendaSection
              limit={6}
              variant="grid"
              title="Selección disponible"
              description="Productos y accesorios con precio final publicado e IVA incluido. Abre cada ficha para revisar stock, despacho, proveedor y detalles."
              primaryCtaLabel="Ver catálogo completo"
            />
          </div>
        </div>
      </section>

      <section id="contacto" className="scroll-mt-20 bg-[#F5871F] px-4 py-16 text-[#08090A] sm:px-6 md:px-12 lg:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#5E3F2A]">Conversemos con contexto</p>
              <h2 className="mt-3 max-w-[10ch] text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl">Cuéntanos qué quieres resolver.</h2>
              <p className="mt-5 max-w-lg text-sm leading-7 text-[#493B32] sm:text-base">
                No necesitas tener todo definido. Si puedes indicar comuna, medidas aproximadas, estado actual y el resultado que buscas, podremos hacer mejores preguntas desde el primer contacto.
              </p>
              <div className="mt-7 border-t border-[#08090A]/18">
                {[
                  ['01', 'Ubicación', 'Comuna o sector donde se realizaría el trabajo.'],
                  ['02', 'Medidas', 'Superficie, largo, ancho, altura o cantidad aproximada.'],
                  ['03', 'Objetivo', 'Qué quieres construir, reparar, instalar o mejorar.'],
                ].map(([n, title, text]) => (
                  <div key={n} className="grid grid-cols-[42px_1fr] gap-3 border-b border-[#08090A]/18 py-4">
                    <span className="text-xs font-black text-[#08090A]/35">{n}</span>
                    <div><b className="text-sm">{title}</b><p className="mt-1 text-xs leading-5 text-[#55463B]">{text}</p></div>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-xs leading-6 text-[#55463B]">Si todavía no sabes cómo resumir tu proyecto, puedes usar el asistente Fabrick para ordenar la información antes de enviarla.</p>
            </div>

            <div className="border-t border-[#08090A]/18 pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
              <div className="mb-5">
                <p className="text-sm font-black">Solicitud de evaluación</p>
                <p className="mt-1 text-[10px] text-[#6C5749]">Formulario breve · tus datos se usan para responderte</p>
              </div>
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
              <p className="mt-4 max-w-md text-sm leading-7 text-white/42">Medir, comparar y confirmar antes de construir. Servicios, productos, herramientas e inspiración dentro de una misma plataforma.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <SocialLink href={igHref} label="Instagram"><InstagramBrandIcon className="h-4 w-4" /></SocialLink>
                <SocialLink href={fbHref} label="Facebook"><FacebookBrandIcon className="h-4 w-4" /></SocialLink>
                <SocialLink href={whatsappHref} label="WhatsApp"><WhatsAppBrandIcon className="h-4 w-4" /></SocialLink>
                {ttHref ? <SocialLink href={ttHref} label="TikTok"><TikTokBrandIcon className="h-4 w-4" /></SocialLink> : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
              {footerGroups.map((group) => <FooterGroup key={group.title} {...group} />)}
            </div>
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
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-3 text-[10px] font-black text-white/70 transition hover:border-[#FFB000]/50 hover:text-[#FFF9EE]">
      {children}<span>{label}</span>
    </a>
  );
}

function FooterGroup({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#FFB000]">{title}</p>
      <div className="mt-3 grid gap-2.5">
        {items.map(([label, href]) => <Link key={label} href={href} className="text-sm text-white/44 transition hover:text-[#FFF9EE]">{label}</Link>)}
      </div>
    </div>
  );
}
