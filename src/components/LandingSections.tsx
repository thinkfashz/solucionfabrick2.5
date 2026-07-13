'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, CheckCircle2, Hammer, Home, MapPin, MessageCircle, Snowflake, Wrench } from 'lucide-react';
import TiendaSection from './TiendaSection';
import ContactForm from './ContactForm';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { useSiteContent } from '@/hooks/useSiteContent';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';

const SOLUTIONS = [
  { number: '01', Icon: Home, title: 'Construir desde cero', text: 'Kits, cabañas y viviendas con alcance visible antes de comprometer tu inversión.', reference: 'Desde $160.000/m²', href: '#calculadora-m2' },
  { number: '02', Icon: Hammer, title: 'Remodelar o ampliar', text: 'Ordenamos estructura, instalaciones y terminaciones para que no coordines cada partida por separado.', reference: 'Referencia $380.000/m²', href: '/servicios' },
  { number: '03', Icon: Wrench, title: 'Equipar e instalar', text: 'Climatización, iluminación y productos para el hogar con instalación coordinada cuando corresponde.', reference: 'Producto + instalación', href: '/tienda' },
] as const;

export default function LandingSections({ copyrightText, socialLinks }: { copyrightText?: string; socialLinks?: { facebook?: string; instagram?: string; tiktok?: string } } = {}) {
  const footer = useSiteContent('footer');
  const year = String(new Date().getFullYear());
  const legalText = (copyrightText && copyrightText.trim()) ? copyrightText.replaceAll('{year}', year) : (footer.legal || `© ${year} Soluciones Fabrick. Todos los derechos reservados.`).replaceAll('{year}', year);
  const fbHref = socialLinks?.facebook?.trim() || '#';
  const igHref = socialLinks?.instagram?.trim() || '#';
  const ttHref = socialLinks?.tiktok?.trim() || '#';
  const orientationLink = buildWhatsAppLink('Hola Soluciones Fabrick, revisé la calculadora y quiero validar mi proyecto.');
  const footerGroups: Array<{ title: string; items: Array<[string, string]> }> = [
    { title: 'Servicios', items: [['Calculadora', '#calculadora-m2'], ['Construcción', '/servicios'], ['Tienda', '/tienda']] },
    { title: 'Empresa', items: [['Proyectos', '/proyectos'], ['Garantías', '/garantias'], ['Contacto', '/contacto']] },
    { title: 'Ayuda', items: [['Presupuesto', '/presupuesto'], ['Mi cuenta', '/mi-cuenta'], ['Privacidad', '/legal/privacidad']] },
    { title: 'Contacto', items: [['WhatsApp', buildWhatsAppLink('Hola Soluciones Fabrick, necesito orientación.')], ['Solicitar evaluación', '/contacto']] },
  ];

  return (
    <div className="overflow-x-hidden bg-[#050403] text-white">
      <section id="servicios" className="scroll-mt-20 border-b border-white/10 px-4 py-14 md:px-12 md:py-20">
        <div className="mx-auto max-w-[1380px]">
          <div className="grid gap-4 md:grid-cols-[.78fr_1.22fr] md:items-end">
            <div><p className="text-[10px] font-black uppercase tracking-[.3em] text-yellow-300">Soluciones Fabrick</p><h2 className="mt-3 text-3xl font-black tracking-[-.045em] md:text-5xl">Un problema. Una ruta clara.</h2></div>
            <p className="max-w-2xl text-sm leading-7 text-zinc-300">Primero identificamos qué necesitas resolver. Después ordenamos materiales, trabajo e instalación en una propuesta entendible.</p>
          </div>

          <div className="mt-8 overflow-hidden rounded-[1.6rem] border border-white/10">
            {SOLUTIONS.map(({ number, Icon, title, text, reference, href }) => (
              <Link key={number} href={href} className="group grid gap-4 border-b border-white/10 p-5 transition last:border-b-0 hover:bg-white/[.035] sm:grid-cols-[54px_1fr_auto] sm:items-center md:p-6">
                <span className="text-3xl font-black tracking-[-.06em] text-white/18 transition group-hover:text-yellow-300">{number}</span>
                <span className="grid grid-cols-[38px_1fr] gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-yellow-300 text-black"><Icon className="h-4 w-4" /></span>
                  <span><span className="block text-lg font-black text-white">{title}</span><span className="mt-1 block max-w-2xl text-sm leading-6 text-zinc-300">{text}</span></span>
                </span>
                <span className="flex items-center justify-between gap-3 pl-[50px] sm:block sm:pl-0 sm:text-right"><span className="block text-xs font-black text-yellow-300">{reference}</span><ArrowRight className="h-4 w-4 text-white/50 transition group-hover:translate-x-1 group-hover:text-yellow-300 sm:ml-auto sm:mt-2" /></span>
              </Link>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-yellow-200/15 bg-yellow-200/[.055] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-200"><strong className="text-white">¿No sabes cuál ruta elegir?</strong> Cuéntanos comuna, superficie y objetivo; te orientamos sin compromiso.</p>
            <a href={orientationLink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-yellow-300 px-5 text-xs font-black text-black transition hover:bg-white">Hablar con una persona <MessageCircle className="h-4 w-4" /></a>
          </div>
        </div>
      </section>

      <section id="tienda" className="scroll-mt-20 border-b border-white/10 bg-[#080705] px-4 py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-[1380px]">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-zinc-400"><Snowflake className="h-4 w-4 text-yellow-300" /> Climatización <span>·</span><Wrench className="h-4 w-4 text-yellow-300" /> Equipamiento e instalación</div>
          <TiendaSection limit={3} title="Productos que resuelven" description="Una selección breve de equipos y productos útiles. Entra a la ficha para ver especificaciones, disponibilidad y opciones de instalación." />
        </div>
      </section>

      <section id="contacto" className="scroll-mt-20 bg-[#080705] px-4 py-14 md:px-12 md:py-20">
        <div className="mx-auto grid max-w-[1380px] gap-9 lg:grid-cols-[.82fr_1.18fr] lg:items-start">
          <div><p className="text-[10px] font-black uppercase tracking-[.3em] text-yellow-300">Siguiente paso</p><h2 className="mt-3 text-3xl font-black tracking-[-.045em] md:text-5xl">Pasa del rango estimado a una propuesta útil.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-zinc-300">Con comuna, superficie y tipo de solución podemos revisar viabilidad, alcance y la información que todavía falta.</p><div className="mt-7 space-y-3 border-y border-white/10 py-5 text-sm text-zinc-200"><p className="flex gap-3"><MapPin className="h-5 w-5 shrink-0 text-yellow-300" /> Base en Linares, Región del Maule</p><p className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-yellow-300" /> Evaluamos proyectos seleccionados en otras zonas</p></div></div>
          <div className="rounded-[1.6rem] border border-white/10 bg-white/[.025] p-5 md:p-6"><ContactForm /></div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black px-4 py-8 md:px-12 md:py-10">
        <div className="mx-auto max-w-[1380px]">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_1.85fr] lg:items-start">
            <div><FabrickFullLogo compact priority theme="light" /><p className="mt-2 max-w-md text-sm leading-6 text-zinc-300">Construcción, remodelación y productos con información clara antes de decidir.</p><div className="mt-4 flex gap-2"><SocialLink href={fbHref} label="Facebook">F</SocialLink><SocialLink href={igHref} label="Instagram">I</SocialLink><SocialLink href={ttHref} label="TikTok">T</SocialLink></div></div>
            <div className="grid gap-2 md:grid-cols-4 md:gap-6">{footerGroups.map((group) => <FooterGroup key={group.title} {...group} />)}</div>
          </div>
          <div className="mt-6 border-t border-white/10 pt-4 text-[10px] leading-5 text-zinc-500">
            <p className="md:hidden">© {year} Soluciones Fabrick · Valores referenciales sujetos a evaluación técnica.</p>
            <div className="hidden md:block" dangerouslySetInnerHTML={{ __html: legalText }} />
          </div>
        </div>
      </footer>
    </div>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  const disabled = !href || href === '#';
  return <a href={disabled ? undefined : href} aria-label={label} target={disabled ? undefined : '_blank'} rel={disabled ? undefined : 'noopener noreferrer'} className={`grid h-9 w-9 place-items-center rounded-full border border-white/12 text-xs font-black transition ${disabled ? 'cursor-not-allowed opacity-35' : 'text-zinc-200 hover:border-yellow-300/50 hover:text-yellow-300'}`}>{children}</a>;
}

function FooterGroup({ title, items }: { title: string; items: Array<[string, string]> }) {
  const links = <div className="grid gap-2 pb-2 pt-3 md:pb-0">{items.map(([label, href]) => href.startsWith('http') ? <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-300 transition hover:text-yellow-300">{label}</a> : <Link key={label} href={href} className="text-sm text-zinc-300 transition hover:text-yellow-300">{label}</Link>)}</div>;
  return <div><details className="group border-t border-white/10 md:hidden"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-xs font-black text-white"><span>{title}</span><span className="text-yellow-300 transition group-open:rotate-45">+</span></summary>{links}</details><div className="hidden md:block"><p className="text-[9px] font-black uppercase tracking-[.22em] text-yellow-300">{title}</p>{links}</div></div>;
}
