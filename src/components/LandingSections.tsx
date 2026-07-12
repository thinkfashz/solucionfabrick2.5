'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, Boxes, CheckCircle2, Hammer, Lightbulb, MapPin, MessageCircle, Snowflake, Wrench } from 'lucide-react';
import TiendaSection from './TiendaSection';
import ContactForm from './ContactForm';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { useSiteContent } from '@/hooks/useSiteContent';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';

const SOLUTIONS = [
  {
    number: '01',
    Icon: Boxes,
    title: 'Construir desde cero',
    problem: 'Necesitas saber qué recibes antes de elegir solo por precio.',
    answer: 'Compara kit básico, kit avanzado y vivienda llave en mano con incluidos y exclusiones visibles.',
    reference: 'Desde $160.000/m²',
    href: '#calculadora-m2',
  },
  {
    number: '02',
    Icon: Hammer,
    title: 'Remodelar o ampliar',
    problem: 'Tu vivienda necesita más espacio, mejor distribución o terminaciones nuevas.',
    answer: 'Ordenamos estructura, revestimientos, instalaciones y terminaciones dentro de una sola propuesta.',
    reference: 'Referencia $380.000/m²',
    href: '/servicios',
  },
  {
    number: '03',
    Icon: Wrench,
    title: 'Equipar e instalar',
    problem: 'Comprar un producto no resuelve el traslado, montaje ni puesta en marcha.',
    answer: 'Encuentra climatización, iluminación y equipamiento con instalación coordinada desde la misma solución.',
    reference: 'Producto + instalación',
    href: '/tienda',
  },
] as const;

export default function LandingSections({ copyrightText, socialLinks }: { copyrightText?: string; socialLinks?: { facebook?: string; instagram?: string; tiktok?: string } } = {}) {
  const footer = useSiteContent('footer');
  const year = String(new Date().getFullYear());
  const legalText = (copyrightText && copyrightText.trim()) ? copyrightText.replaceAll('{year}', year) : (footer.legal || `© ${year} Soluciones Fabrick. Todos los derechos reservados.`).replaceAll('{year}', year);
  const fbHref = socialLinks?.facebook?.trim() || '#';
  const igHref = socialLinks?.instagram?.trim() || '#';
  const ttHref = socialLinks?.tiktok?.trim() || '#';

  return (
    <div className="overflow-x-hidden bg-[#050403] text-white">
      <section id="servicios" className="scroll-mt-20 border-b border-white/10 px-4 py-16 md:px-12 md:py-20">
        <div className="mx-auto max-w-[1380px]">
          <div className="grid gap-6 md:grid-cols-[.9fr_1.1fr] md:items-end">
            <div><p className="text-[10px] font-black uppercase tracking-[.3em] text-yellow-300">Soluciones Fabrick</p><h2 className="mt-3 max-w-3xl text-4xl font-black leading-[1.02] tracking-[-.045em] md:text-6xl">Tres problemas. Una sola forma clara de resolverlos.</h2></div>
            <p className="max-w-2xl text-sm leading-7 text-zinc-400">Construir, remodelar o instalar no debería obligarte a coordinar proveedores sin saber cuánto falta. Partimos por el problema y organizamos la solución completa.</p>
          </div>
          <div className="mt-10 grid gap-3 lg:grid-cols-3">
            {SOLUTIONS.map(({ number, Icon, title, problem, answer, reference, href }) => (
              <Link key={number} href={href} className="group relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/[.025] p-6 transition hover:-translate-y-1 hover:border-yellow-300/30 hover:bg-white/[.045]">
                <span className="absolute right-5 top-3 text-7xl font-black tracking-[-.09em] text-white/[.035] transition group-hover:text-yellow-300/[.07]">{number}</span>
                <div className="flex items-center justify-between"><span className="text-xs font-black text-yellow-300">{number}</span><Icon className="h-6 w-6 text-yellow-300" /></div>
                <h3 className="mt-8 text-2xl font-black tracking-[-.035em]">{title}</h3>
                <p className="mt-4 text-xs font-bold uppercase leading-5 tracking-[.08em] text-white/38">El problema</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{problem}</p>
                <div className="mt-5 border-t border-white/10 pt-5"><p className="text-xs font-bold uppercase tracking-[.08em] text-yellow-200/60">La solución</p><p className="mt-2 text-sm leading-6 text-zinc-300">{answer}</p></div>
                <div className="mt-6 flex items-center justify-between gap-3"><b className="text-xs text-yellow-200">{reference}</b><span className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[.18em] text-yellow-300">Ver opción <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></div>
              </Link>
            ))}
          </div>
          <div className="mt-5 flex flex-col justify-between gap-4 rounded-[1.4rem] border border-yellow-300/20 bg-yellow-300/[.06] px-5 py-4 sm:flex-row sm:items-center"><p className="text-sm text-zinc-300"><b className="text-white">Un recorrido simple:</b> calcula una referencia, validamos las condiciones y recién entonces preparamos la propuesta.</p><a href={buildWhatsAppLink('Hola Soluciones Fabrick, quiero saber cuál solución corresponde a mi proyecto.')} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-2 text-xs font-black text-yellow-300">Orientarme por WhatsApp <MessageCircle className="h-4 w-4" /></a></div>
        </div>
      </section>

      <section id="tienda" className="scroll-mt-20 border-b border-white/10 bg-[#080705] px-4 py-12 md:px-12 md:py-16">
        <div className="mx-auto max-w-[1380px]">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-zinc-500"><Snowflake className="h-4 w-4 text-yellow-300" /> Climatización <span>·</span><Lightbulb className="h-4 w-4 text-yellow-300" /> Iluminación <span>·</span><Wrench className="h-4 w-4 text-yellow-300" /> Instalación</div>
          <TiendaSection limit={3} title="Productos para resolver, no para acumular" description="Climatización, iluminación y equipamiento seleccionados por utilidad. Revisa el producto, consulta disponibilidad y coordina instalación desde la misma ficha." />
        </div>
      </section>

      <section id="contacto" className="scroll-mt-20 bg-[#080705] px-4 py-16 md:px-12 md:py-20">
        <div className="mx-auto grid max-w-[1380px] gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div><p className="text-[10px] font-black uppercase tracking-[.3em] text-yellow-300">Evaluación del proyecto</p><h2 className="mt-3 text-4xl font-black leading-[1.02] tracking-[-.045em] md:text-6xl">Pasa del rango estimado a una propuesta útil.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-zinc-400">Indícanos comuna, superficie, modalidad y estado actual del proyecto. Con esos datos podremos decirte qué falta revisar y cuál es el próximo paso real.</p><div className="mt-7 space-y-3 border-y border-white/10 py-5 text-sm text-zinc-300"><p className="flex gap-3"><MapPin className="h-5 w-5 shrink-0 text-yellow-300" /> Base operativa en Linares, Región del Maule</p><p className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-yellow-300" /> Evaluación de proyectos seleccionados en otras comunas</p></div></div>
          <div className="border-t border-yellow-300/30 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"><ContactForm /></div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black px-4 py-10 md:px-12">
        <div className="mx-auto grid max-w-[1380px] gap-8 md:grid-cols-[1.25fr_.75fr_.75fr]">
          <div><FabrickFullLogo priority theme="light" /><p className="mt-3 max-w-lg text-sm leading-6 text-zinc-400">Convertimos una necesidad de construcción, remodelación o equipamiento en una solución que puedes entender, comparar y validar antes de comenzar.</p><div className="mt-5 flex gap-2"><SocialLink href={fbHref} label="Facebook">F</SocialLink><SocialLink href={igHref} label="Instagram">I</SocialLink><SocialLink href={ttHref} label="TikTok">T</SocialLink></div></div>
          <FooterColumn title="Soluciones" items={[["Calculadora", "#calculadora-m2"], ["Servicios", "/servicios"], ["Tienda", "/tienda"]]} />
          <FooterColumn title="Ayuda" items={[["Presupuesto", "/presupuesto"], ["Contacto", "/contacto"], ["WhatsApp", buildWhatsAppLink('Hola Soluciones Fabrick, necesito orientación.')]]} />
        </div>
        <div className="mx-auto mt-8 max-w-[1380px] border-t border-white/10 pt-5 text-[11px] leading-5 text-zinc-600"><div dangerouslySetInnerHTML={{ __html: legalText }} /><p className="mt-1">Construcción, remodelación y equipamiento con información clara antes de comenzar. Los valores publicados son referenciales y están sujetos a evaluación técnica.</p></div>
      </footer>
    </div>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) { const disabled = !href || href === '#'; return <a href={disabled ? undefined : href} aria-label={label} target={disabled ? undefined : '_blank'} rel={disabled ? undefined : 'noopener noreferrer'} className={`grid h-9 w-9 place-items-center rounded-full border border-white/10 text-xs font-black transition ${disabled ? 'cursor-not-allowed opacity-35' : 'hover:border-yellow-300/50 hover:text-yellow-300'}`}>{children}</a>; }
function FooterColumn({ title, items }: { title: string; items: Array<[string, string]> }) { return <div><p className="text-[9px] font-black uppercase tracking-[.25em] text-yellow-300">{title}</p><div className="mt-4 grid gap-2">{items.map(([label, href]) => href.startsWith('http') ? <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 hover:text-yellow-300">{label}</a> : <Link key={label} href={href} className="text-sm text-zinc-400 hover:text-yellow-300">{label}</Link>)}</div></div>; }
