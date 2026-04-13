'use client';

import { useState, useEffect } from 'react';
import { X, Menu } from 'lucide-react';
import FabrickLogo from './FabrickLogo';
import { navigateWithTransition } from '@/lib/routeTransition';

const NAV_LINKS = [
  { label: 'Servicios',  id: 'servicios'  },
  { label: 'Evolución',  id: 'evolucion'  },
  { label: 'Soluciones', id: 'soluciones' },
  { label: 'Tienda',     id: 'tienda'     },
  { label: 'Proyectos',  id: 'proyectos'  },
];

function scrollTo(id: string) {
  if (id === 'inicio') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.pageYOffset - 80;
  window.scrollTo({ top, behavior: 'smooth' });
}

export default function Navbar() {
  const [open, setOpen]         = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleNav = (id: string) => {
    setOpen(false);
    if (id === 'tienda') {
      navigateWithTransition('/tienda');
      return;
    }
    scrollTo(id);
  };

  return (
    <>
      <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 py-3 px-4 md:px-12 flex justify-between items-center ${
        scrolled
          ? 'bg-black/90 backdrop-blur-xl border-b border-white/5 shadow-lg'
          : 'bg-black/60 backdrop-blur-md'
      }`}>
        <FabrickLogo onClick={() => handleNav('inicio')} />

        {/* ── Desktop ── */}
        <div className="hidden lg:flex gap-8 items-center">
          {NAV_LINKS.map(({ label, id }) => (
            <button
              key={id}
              onClick={() => handleNav(id)}
              className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400 hover:text-yellow-400 transition-colors"
            >
              {label}
            </button>
          ))}
          <div className="w-px h-4 bg-white/20" />
          <a
            href="/auth"
            className="text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-yellow-400 transition-colors"
          >
            Mi Cuenta
          </a>
          <a
            href="/auth"
            className="px-5 py-2 rounded-full border border-yellow-400/40 text-yellow-400 text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-400/10 hover:border-yellow-400 transition-all"
          >
            Iniciar Sesión
          </a>
        </div>

        {/* ── Mobile toggle ── */}
        <button
          className="lg:hidden text-white hover:text-yellow-400 transition-colors p-2"
          onClick={() => setOpen(!open)}
          aria-label="Menú"
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </nav>

      {/* ── Mobile drawer ── */}
      <div className={`fixed inset-0 z-40 bg-black/97 backdrop-blur-2xl flex flex-col items-center justify-center transition-transform duration-500 ease-in-out lg:hidden ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col gap-0 text-center w-full px-8">
          {[{ label: 'Inicio', id: 'inicio' }, ...NAV_LINKS, { label: 'Contacto', id: 'contacto' }].map(({ label, id }) => (
            <button
              key={id}
              onClick={() => handleNav(id)}
              className="text-xl font-light uppercase tracking-[0.2em] text-white hover:text-yellow-400 active:text-yellow-400 transition-colors w-full py-5 border-b border-white/5"
            >
              {label}
            </button>
          ))}
          <a
            href="/auth"
            onClick={() => setOpen(false)}
            className="mt-6 py-5 bg-yellow-400 text-black font-bold uppercase text-sm tracking-widest rounded-full hover:bg-white transition-all w-full text-center block"
          >
            Iniciar Sesión
          </a>
        </div>
      </div>
    </>
  );
}
