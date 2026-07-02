'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import FabrickLogo from '@/components/FabrickLogo';

const hiddenPrefixes = ['/admin', '/auth', '/checkout', '/presupuestos', '/p/'];

export default function LegalFooter() {
  const pathname = usePathname();
  if (hiddenPrefixes.some((prefix) => pathname?.startsWith(prefix))) return null;

  return (
    <footer className="border-t border-white/5 bg-black px-4 py-10 text-white md:px-12">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <FabrickLogo className="pointer-events-none" />
          <p className="mt-4 max-w-xl text-xs leading-6 text-zinc-500">
            Soluciones Fabrick entrega orientación, productos, cotizaciones y servicios para avanzar con más claridad. Los precios de calculadoras son referenciales hasta revisión final.
          </p>
        </div>
        <nav className="grid gap-3 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400 sm:grid-cols-2 md:text-right">
          <Link href="/legal/terminos-y-condiciones" className="transition hover:text-yellow-300">Términos y condiciones</Link>
          <Link href="/legal/cambios-y-devoluciones" className="transition hover:text-yellow-300">Cambios y devoluciones</Link>
          <Link href="/legal/privacidad" className="transition hover:text-yellow-300">Privacidad</Link>
          <Link href="/legal/cookies" className="transition hover:text-yellow-300">Cookies</Link>
        </nav>
      </div>
    </footer>
  );
}
