'use client';

import { useState, useEffect } from 'react';
import { X, Menu, Sun, Moon } from 'lucide-react';
import FabrickLogo from './FabrickLogo';
import { navigateWithTransition } from '@/lib/routeTransition';
import { useTheme } from '@/context/ThemeContext';

type NavLink = { label: string; href: string };

const NAV_LINKS: NavLink[] = [
  { label: 'Servicios',   href: '/servicios' },
  { label: 'Evolucion',   href: '/evolucion' },
  { label: 'Soluciones',  href: '/soluciones' },
  { label: 'Tienda',      href: '/tienda' },
  { label: 'Proyectos',   href: '/proyectos' },
  { label: 'Contacto',    href: '/contacto' },
];

export default function Navbar() {
  const [open, setOpen]       = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggle }     = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleNav = (href: string) => {
    setOpen(false);
    navigateWithTransition(href);
  };

  return (
    <>
      {/* ── Barra principal ── */}
      <nav
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 py-3 px-4 md:px-10 flex justify-between items-center ${
          scrolled
            ? 'liquid-glass shadow-lg'
            : 'bg-transparent'
        }`}
      >
        <FabrickLogo onClick={() => handleNav('/')} />

        {/* Desktop links */}
        <div className="hidden lg:flex gap-7 items-center">
          {NAV_LINKS.map(({ label, href }) => (
            <button
              key={href}
              onClick={() => handleNav(href)}
              className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors duration-200"
            >
              {label}
            </button>
          ))}

          <div className="w-px h-4 bg-[var(--border-main)]" />

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="theme-toggle w-9 h-9 rounded-full flex items-center justify-center"
            aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
          >
            {theme === 'dark'
              ? <Sun  size={15} className="text-yellow-400" />
              : <Moon size={15} className="text-[var(--text-muted)]" />
            }
          </button>

          <button
            onClick={() => handleNav('/mi-cuenta')}
            className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-faint)] hover:text-[var(--accent)] transition-colors"
          >
            Mi Cuenta
          </button>

          <button
            onClick={() => handleNav('/auth')}
            className="liquid-btn liquid-btn-gold px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest"
          >
            Iniciar Sesion
          </button>
        </div>

        {/* Mobile: theme + hamburger */}
        <div className="lg:hidden flex items-center gap-3">
          <button
            onClick={toggle}
            className="theme-toggle w-9 h-9 rounded-full flex items-center justify-center"
            aria-label="Cambiar tema"
          >
            {theme === 'dark'
              ? <Sun  size={15} className="text-yellow-400" />
              : <Moon size={15} className="text-[var(--text-muted)]" />
            }
          </button>
          <button
            className="text-[var(--text-primary)] p-2 hover:text-[var(--accent)] transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* ── Menú móvil ── */}
      <div
        className={`fixed inset-0 z-40 flex flex-col items-center justify-center transition-transform duration-500 ease-in-out lg:hidden ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: theme === 'dark'
            ? 'rgba(0,0,0,0.97)'
            : 'rgba(245,243,239,0.97)',
          backdropFilter: 'blur(32px)',
        }}
      >
        <div className="flex flex-col gap-0 text-center w-full px-8">
          {[{ label: 'Inicio', href: '/' }, ...NAV_LINKS,
            { label: 'Garantias', href: '/garantias' },
            { label: 'Mi Cuenta', href: '/mi-cuenta' },
            { label: 'Ajustes',   href: '/ajustes'   },
          ].map(({ label, href }) => (
            <button
              key={`${label}-${href}`}
              onClick={() => handleNav(href)}
              className="text-xl font-light uppercase tracking-[0.2em] text-[var(--text-primary)] hover:text-[var(--accent)] active:text-[var(--accent)] transition-colors w-full py-5 border-b border-[var(--border-main)]"
            >
              {label}
            </button>
          ))}

          <button
            onClick={() => handleNav('/auth')}
            className="liquid-btn liquid-btn-gold mt-6 py-5 rounded-full font-black uppercase text-sm tracking-widest w-full text-center"
          >
            Iniciar Sesion
          </button>
        </div>
      </div>
    </>
  );
}
