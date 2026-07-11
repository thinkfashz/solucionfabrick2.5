'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, CheckCircle2, Hammer, Home, Lightbulb, MapPin, MessageCircle, Snowflake, Wrench } from 'lucide-react';
import TiendaSection from './TiendaSection';
import ContactForm from './ContactForm';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { useSiteContent } from '@/hooks/useSiteContent';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';

const SERVICES = [
  { Icon: Home, title: 'Kits y casas', text: 'Kit básico, kit avanzado y llave en mano con alcance visible antes de cotizar.', href: '#calculadora-m2' },
  { Icon: Hammer, title: 'Construcción y remodelación', text: 'Estructura, ampliaciones, revestimientos y terminaciones coordinadas.', href: '/servicios' },
  { Icon: Wrench, title: 'Instalación y equipamiento', text: 'Electricidad, agua, climatización, iluminación y mejoras para el hogar.', href: '/servicios' },
] as const;

const PROCESS = [
  { step: '01', title: 'Calcula', text: 'Elige superficie y nivel de entrega.' },
  { step: '02', title: 'Aclara', text: 'Confirmamos ubicación, acceso, plano y materiales.' },
  { step: '03', title: 'Cotiza', text: 'Recibes un alcance preciso para decidir.' },
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
      <section id="servicios" className="border-b border-white/10 px-4 py-16 md:px-12 md:py-20">
        <div className="mx-auto max-w-[1380px]">
          <div className="grid gap-5 md:grid-cols-[.75fr_1.25fr] md:items-end"><div><p className="text-[10px] font-black uppercase tracking-[.3em] text-yellow-300">Qué resolvemos</p><h2 className="mt-3 text-3xl font-black tracking-[-.04em] md:text-5xl">Del material a la instalación.</h2></div><p className="max-w-2xl text-sm leading-7 text-zinc-400">No necesitas coordinar proveedores distintos para cada partida. Define el problema y ordenamos la solución adecuada.</p></div>
          <div className="mt-9 grid divide-y divide-white/10 border-y border-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">{SERVICES.map(({ Icon, title, text, href }) => <Link key={title} href={href} className="group p-6 transition hover:bg-white/[.025]"><Icon className="h-6 w-6 text-yellow-300" /><h3 className="mt-5 text-xl font-black">{title}</h3><p className="mt-3 text-sm leading-6 text-zinc-400">{text}</p><span className="mt-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-yellow-300">Ver solución <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></Link>)}</div>
        </div>
      </section>

      <section id="tienda" className="border-b border-white/10 bg-[#080705] px-4 py-12 md:px-12 md:py-16">
        <div className="mx-auto max-w-[1380px]">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-zinc-500"><Snowflake className="h-4 w-4 text-yellow-300" /> Climatización <span>·</span><Lightbulb className="h-4 w-4 text-yellow-300" /> Iluminación <span>·</span><Wrench className="h-4 w-4 text-yellow-300" /> Instalación</div>
          <TiendaSection limit={3} title="Productos que solucionan" description="Equipos y productos seleccionados para mejorar confort, iluminación y funcionamiento. Consulta la instalación desde la misma ficha." />
        </div>
      </section>

      <section className="border-b border-white/10 px-4 py-16 md:px-12 md:py-20">
        <div className="mx-auto grid max-w-[1380px] gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div><p className="text-[10px] font-black uppercase tracking-[.3em] text-yellow-300">Proceso breve</p><h2 className="mt-3 text-3xl font-black tracking-[-.04em] md:text-5xl">Primero el alcance. Después el compromiso.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400">La calculadora orienta; la evaluación convierte ese rango en una propuesta basada en tu terreno, plano y elecciones.</p><a href={buildWhatsAppLink('Hola Soluciones Fabrick, ya revisé la calculadora y quiero validar mi proyecto.')} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-yellow-300 px-6 text-xs font-black uppercase tracking-[.18em] text-black transition hover:bg-white">Validar mi proyecto <MessageCircle className="h-4 w-4" /></a></div>
          <div className="grid divide-y divide-white/10 border-y border-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">{PROCESS.map(({ step, title, text }) => <div key={step} className="p-5"><span className="text-xs font-black text-yellow-300">{step}</span><h3 className="mt-3 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-zinc-500">{text}</p></div>)}</div>
        </div>
      </section>

      <section id="contacto" className="bg-[#080705] px-4 py-16 md:px-12 md:py-20">
        <div className="mx-auto grid max-w-[1380px] gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div><p className="text-[10px] font-black uppercase tracking-[.3em] text-yellow-300">Contacto</p><h2 className="mt-3 text-3xl font-black tracking-[-.04em] md:text-5xl">Cuéntanos dónde y qué quieres construir.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400">Con superficie, comuna y nivel de entrega podemos darte una respuesta mucho más útil.</p><div className="mt-7 space-y-3 border-y border-white/10 py-5 text-sm text-zinc-300"><p className="flex gap-3"><MapPin className="h-5 w-5 shrink-0 text-yellow-300" /> Base en Linares, Región del Maule</p><p className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-yellow-300" /> Revisión de proyectos seleccionados en otras zonas</p></div></div>
          <div className="border-t border-yellow-300/30 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"><ContactForm /></div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black px-4 py-10 md:px-12">
        <div className="mx-auto grid max-w-[1380px] gap-8 md:grid-cols-[1.25fr_.75fr_.75fr]">
          <div><FabrickFullLogo priority theme="light" /><p className="mt-3 max-w-lg text-sm leading-6 text-zinc-400">Transformamos una idea difícil de presupuestar en una solución con alcance, materiales y próximos pasos claros.</p><div className="mt-5 flex gap-2"><SocialLink href={fbHref} label="Facebook">F</SocialLink><SocialLink href={igHref} label="Instagram">I</SocialLink><SocialLink href={ttHref} label="TikTok">T</SocialLink></div></div>
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
