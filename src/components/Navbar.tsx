'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Menu, Home, Wrench, TrendingUp, Lightbulb, ShoppingBag, Building2, Phone, Gamepad2, ShieldCheck, BookOpen, Layers, Calculator } from 'lucide-react';
import FabrickLogo from './FabrickLogo';
import ThemeToggle from './ThemeToggle';
import { navigateWithTransition } from '@/lib/routeTransition';

type NavLink = { label: string; href: string };

const NAV_LINKS: NavLink[] = [
  { label: 'Servicios', href: '/servicios' },
  { label: 'Evolución', href: '/evolucion' },
  { label: 'Soluciones', href: '/soluciones' },
  { label: 'Tienda', href: '/tienda' },
  { label: 'Presupuesto', href: '/presupuesto' },
  { label: 'Proyectos', href: '/proyectos' },
  { label: 'Contacto', href: '/contacto' },
];

const MENU_ITEMS = [
  { label: 'Inicio',       href: '/',            Icon: Home },
  { label: 'Servicios',    href: '/servicios',   Icon: Wrench },
  { label: 'Evolución',    href: '/evolucion',   Icon: TrendingUp },
  { label: 'Soluciones',   href: '/soluciones',  Icon: Lightbulb },
  { label: 'Tienda',       href: '/tienda',      Icon: ShoppingBag },
  { label: 'Presupuesto',  href: '/presupuesto', Icon: Calculator },
  { label: 'Proyectos',    href: '/proyectos',   Icon: Building2 },
  { label: 'Casos',        href: '/casos',       Icon: Layers },
  { label: 'Blog',         href: '/blog',        Icon: BookOpen },
  { label: 'Contacto',     href: '/contacto',    Icon: Phone },
  { label: 'Garantías',    href: '/garantias',   Icon: ShieldCheck },
  { label: 'Juego',        href: '/juego',       Icon: Gamepad2 },
];

export default function Navbar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let mountedTimeout: ReturnType<typeof setTimeout> | undefined;
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      mountedTimeout = setTimeout(() => setMounted(true), 10);
    } else {
      setMounted(false);
    }
    return () => {
      document.body.style.overflow = '';
      if (mountedTimeout) clearTimeout(mountedTimeout);
    };
  }, [open]);

  const handleNav = (href: string) => {
    setOpen(false);
    navigateWithTransition(href, router);
  };

  return (
    <>
      <style>{`
        @keyframes menu-item-in {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .menu-item-anim {
          opacity: 0;
          animation: menu-item-in 0.4s ease forwards;
        }
      `}</style>

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
              className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400 hover:text-yellow-400 transition-colors"
            >
              {label}
            </button>
          ))}
          <div className="w-px h-4 bg-white/20" />
          <ThemeToggle />
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
            Iniciar Sesión
          </button>
        </div>

        <button
          className="lg:hidden text-white hover:text-yellow-400 transition-colors p-2"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
        {/* Mobile theme toggle — always visible in header */}
        <div className="lg:hidden">
          <ThemeToggle />
        </div>
      </nav>

      {/* Full-screen glamorous mobile menu */}
      <div
        className={`fixed inset-0 z-40 lg:hidden flex flex-col transition-all duration-500 ease-in-out ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Background layers */}
        <div className="absolute inset-0 bg-black" />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-black to-zinc-950" />
        {/* Golden orb blur decoration */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-yellow-400/5 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-64 h-64 rounded-full bg-yellow-400/3 blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full px-8 pt-24 pb-10 overflow-y-auto">
          {/* Logo centered */}
          <div className="flex justify-center mb-8">
            <FabrickLogo onClick={() => handleNav('/')} />
          </div>

          {/* Gradient divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent mb-8" />

          {/* Menu items with stagger animation */}
          <nav className="flex flex-col gap-1 flex-1">
            {MENU_ITEMS.map(({ label, href, Icon }, i) => (
              <button
                key={href}
                onClick={() => handleNav(href)}
                className={`menu-item-anim flex items-center gap-4 w-full py-4 px-3 rounded-2xl text-left group hover:bg-white/5 active:bg-white/10 transition-colors`}
                style={{ animationDelay: mounted ? `${i * 55}ms` : '0ms' }}
              >
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-900 border border-white/8 group-hover:border-yellow-400/30 group-hover:bg-yellow-400/10 transition-all">
                  <Icon size={18} className="text-zinc-400 group-hover:text-yellow-400 transition-colors" />
                </span>
                <span className="text-base font-semibold uppercase tracking-[0.15em] text-white/80 group-hover:text-yellow-400 transition-colors">
                  {label}
                </span>
              </button>
            ))}
          </nav>

          {/* Gradient divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent my-6" />

          {/* Auth button */}
          <button
            onClick={() => handleNav('/auth')}
            className="w-full py-4 bg-yellow-400 text-black font-black uppercase text-sm tracking-widest rounded-full hover:bg-yellow-300 transition-all shadow-[0_0_30px_rgba(250,204,21,0.2)] mb-4"
          >
            Iniciar Sesión
          </button>

          {/* Social icons */}
          <div className="flex justify-center gap-6 mt-2">
            <a href="https://www.instagram.com/fabrick.cl" target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-yellow-400 transition-colors">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>
            <a href="https://www.facebook.com/fabrick.cl" target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-yellow-400 transition-colors">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            <a href="https://www.tiktok.com/@fabrick.cl" target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-yellow-400 transition-colors">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/>
              </svg>
            </a>
          </div>

          {/* Branding */}
          <p className="text-center text-[9px] text-zinc-700 uppercase tracking-widest mt-4">
            © Fabrick — Construimos tu visión
          </p>
        </div>
      </div>
    </>
  );
}

