'use client';

import { useState, useEffect } from 'react';
import { X, Menu } from 'lucide-react';
import FabrickLogo from './FabrickLogo';
import { navigateWithTransition } from '@/lib/routeTransition';
import { insforge } from '@/lib/insforge';

type NavLink = { label: string; href: string };

const NAV_LINKS: NavLink[] = [
  { label: 'Servicios', href: '/servicios' },
  { label: 'Evolucion', href: '/evolucion' },
  { label: 'Soluciones', href: '/soluciones' },
  { label: 'Tienda', href: '/tienda' },
  { label: 'Proyectos', href: '/proyectos' },
  { label: 'Contacto', href: '/contacto' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hasOffers, setHasOffers] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    async function checkOffers() {
      try {
        const { data } = await insforge.database
          .from('productos')
          .select('id')
          .eq('en_oferta', true)
          .eq('activo', true)
          .limit(1);
        setHasOffers(!!(data && data.length > 0));
      } catch {
        setHasOffers(false);
      }
    }
    void checkOffers();
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleNav = (href: string) => {
    setOpen(false);
    navigateWithTransition(href);
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 py-3 px-4 md:px-12 flex justify-between items-center ${
          scrolled
            ? 'bg-black/90 backdrop-blur-xl border-b border-white/5 shadow-lg'
            : 'bg-black/60 backdrop-blur-md'
        }`}
      >
        <FabrickLogo onClick={() => handleNav('/')} />

        <div className="hidden lg:flex gap-8 items-center">
          {NAV_LINKS.map(({ label, href }) => (
            <button
              key={href}
              onClick={() => handleNav(href)}
              className="relative text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400 hover:text-yellow-400 transition-colors"
            >
              {label}
              {label === 'Tienda' && hasOffers && (
                <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          ))}
          <div className="w-px h-4 bg-white/20" />
          <button
            onClick={() => handleNav('/mi-cuenta')}
            className="text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-yellow-400 transition-colors"
          >
            Mi Cuenta
          </button>
          <button
            onClick={() => handleNav('/auth')}
            className="px-5 py-2 rounded-full border border-yellow-400/40 text-yellow-400 text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-400/10 hover:border-yellow-400 transition-all"
          >
            Iniciar Sesion
          </button>
        </div>

        <button
          className="lg:hidden text-white hover:text-yellow-400 transition-colors p-2"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </nav>

      <div
        className={`fixed inset-0 z-40 bg-black/97 backdrop-blur-2xl flex flex-col items-center justify-center transition-transform duration-500 ease-in-out lg:hidden ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col gap-0 text-center w-full px-8">
          {[
            { label: 'Inicio', href: '/' },
            ...NAV_LINKS,
            { label: 'Garantias', href: '/garantias' },
            { label: 'Mi Cuenta', href: '/mi-cuenta' },
            { label: 'Ajustes', href: '/ajustes' },
            { label: 'Checkout', href: '/checkout' },
          ].map(({ label, href }) => (
            <button
              key={`${label}-${href}`}
              onClick={() => handleNav(href)}
              className="relative text-xl font-light uppercase tracking-[0.2em] text-white hover:text-yellow-400 active:text-yellow-400 transition-colors w-full py-5 border-b border-white/5"
            >
              {label}
              {label === 'Tienda' && hasOffers && (
                <span className="absolute top-1/2 -translate-y-1/2 ml-2 inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          ))}
          <button
            onClick={() => handleNav('/auth')}
            className="mt-6 py-5 bg-yellow-400 text-black font-bold uppercase text-sm tracking-widest rounded-full hover:bg-white transition-all w-full text-center block"
          >
            Iniciar Sesion
          </button>
        </div>
      </div>
    </>
  );
}
