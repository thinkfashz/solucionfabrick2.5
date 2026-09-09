'use client';

import Link from 'next/link';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';
import { FacebookBrandIcon, InstagramBrandIcon, WhatsAppBrandIcon } from '@/components/SocialBrandIcons';

const EXPLORE = [
  ['Inspiraciones', '/proyectos'],
  ['Tienda', '/tienda'],
  ['Servicios', '/servicios'],
] as const;

const PLAN = [
  ['Presupuesto', '/presupuesto'],
  ['Radier', '/herramientas/radier'],
  ['Aire acondicionado', '/herramientas/aire-acondicionado'],
] as const;

export default function InspirationFooter() {
  return (
    <footer className="border-t border-white/8 bg-[linear-gradient(180deg,#071015_0%,#05090C_58%,#030608_100%)] px-4 pb-28 pt-8 text-white sm:px-6 md:pb-10 lg:px-8">
      <div className="mx-auto max-w-[1380px]">
        <section className="overflow-hidden rounded-[1.5rem] border border-[#F6C64A]/16 bg-[radial-gradient(circle_at_92%_10%,rgba(87,212,255,.12),transparent_28%),linear-gradient(135deg,rgba(246,198,74,.1),rgba(255,255,255,.025))] p-5 sm:p-7">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#F6C64A]">De la referencia a la obra</p>
              <h2 className="mt-2 max-w-3xl text-3xl font-black leading-[.95] tracking-[-.055em] sm:text-5xl">Una idea buena debe terminar en una decisión clara.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/44">Guarda la referencia, define qué cambiarías y úsala como punto de partida para conversar sobre medidas, materiales y presupuesto.</p>
            </div>
            <Link href="/presupuesto" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#F6C64A] px-6 text-sm font-black text-black">Calcular mi proyecto</Link>
          </div>
        </section>

        <div className="mt-8 grid gap-7 border-b border-white/8 pb-7 md:grid-cols-[1.1fr_.9fr] md:items-start">
          <div>
            <div className="max-w-[235px]"><FabrickFullLogo compact priority theme="light" /></div>
            <p className="mt-3 max-w-md text-xs leading-6 text-white/36">Construcción, remodelación, herramientas y referencias visuales reunidas en un mismo flujo para decidir mejor antes de ejecutar.</p>
            <div className="mt-4 flex gap-2">
              <Social href="https://www.instagram.com/solucionesfabrick/" label="Instagram"><InstagramBrandIcon className="h-4 w-4" /></Social>
              <Social href="https://www.facebook.com/FabrickSoluciones" label="Facebook"><FacebookBrandIcon className="h-4 w-4" /></Social>
              <Social href="https://wa.me/56930121625" label="WhatsApp"><WhatsAppBrandIcon className="h-4 w-4" /></Social>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5 rounded-[1.25rem] border border-white/7 bg-white/[.02] p-4 sm:p-5">
            <FooterGroup title="Explorar" links={EXPLORE} />
            <FooterGroup title="Planificar" links={PLAN} />
          </div>
        </div>

        <div className="flex flex-col gap-1 pt-4 text-[9px] leading-5 text-white/28 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Soluciones Fabrick.</span>
          <span>Maule · Santiago · Chile</span>
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({ title, links }: { title: string; links: ReadonlyArray<readonly [string, string]> }) {
  return <div><p className="text-[9px] font-black uppercase tracking-[.17em] text-[#57D4FF]">{title}</p><div className="mt-3 grid gap-2.5">{links.map(([label, href]) => <Link key={label} href={href} className="text-[11px] leading-5 text-white/48 transition hover:text-[#F6C64A]">{label}</Link>)}</div></div>;
}

function Social({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white/58 transition hover:border-[#F6C64A]/45 hover:text-[#F6C64A]">{children}</a>;
}
