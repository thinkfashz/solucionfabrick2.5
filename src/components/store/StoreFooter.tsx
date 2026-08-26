'use client';

import Link from 'next/link';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';
import { FacebookBrandIcon, InstagramBrandIcon, WhatsAppBrandIcon } from '@/components/SocialBrandIcons';

const GROUPS = [
  { title: 'Planificar', links: [['Presupuesto', '/presupuesto'], ['Servicios', '/servicios'], ['Inspiraciones', '/proyectos']] },
  { title: 'Comprar', links: [['Tienda', '/tienda'], ['Mi cuenta', '/mi-cuenta'], ['Garantías', '/garantias']] },
  { title: 'Herramientas', links: [['Radier', '/herramientas/radier'], ['Aire acondicionado', '/herramientas/aire-acondicionado'], ['Contacto', '/#contacto']] },
] as const;

export default function StoreFooter() {
  return (
    <footer className="border-t border-white/7 bg-[#08090A] px-4 pb-28 pt-10 text-[#FFF9EE] sm:px-6 md:pb-10 lg:px-8">
      <div className="mx-auto max-w-[1260px]">
        <div className="grid gap-9 lg:grid-cols-[1.05fr_1.45fr] lg:items-start">
          <div>
            <FabrickFullLogo compact priority theme="light" />
            <p className="mt-4 max-w-md text-sm leading-7 text-white/40">
              Mide, compara y confirma antes de construir. Servicios, productos y herramientas para ordenar cada decisión del proyecto.
            </p>
            <div className="mt-5 flex gap-2">
              <Social href="https://www.instagram.com/solucionesfabrick/" label="Instagram"><InstagramBrandIcon className="h-4 w-4" /></Social>
              <Social href="https://www.facebook.com/FabrickSoluciones" label="Facebook"><FacebookBrandIcon className="h-4 w-4" /></Social>
              <Social href="https://wa.me/56930121625" label="WhatsApp"><WhatsAppBrandIcon className="h-4 w-4" /></Social>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-white/8 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            {GROUPS.map((group) => (
              <div key={group.title}>
                <p className="text-[9px] font-black uppercase tracking-[.17em] text-[#FFB000]">{group.title}</p>
                <div className="mt-3 grid gap-2.5">
                  {group.links.map(([label, href]) => <Link key={label} href={href} className="text-[11px] leading-5 text-white/43 transition hover:text-white sm:text-sm">{label}</Link>)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-9 flex flex-col gap-1 border-t border-white/7 pt-4 text-[9px] leading-5 text-white/24 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Soluciones Fabrick. Todos los derechos reservados.</span>
          <span>Maule · proyectos seleccionados en Santiago</span>
        </div>
      </div>
    </footer>
  );
}

function Social({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-white/65 transition hover:border-[#FFB000]/55 hover:text-[#FFB000]">
      {children}
    </a>
  );
}
