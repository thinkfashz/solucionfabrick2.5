'use client';

import { useState, useEffect } from 'react';
import { X, Menu, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import FabrickLogo from './FabrickLogo';
import { navigateWithTransition } from '@/lib/routeTransition';

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
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <>
      <nav
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 py-3 px-4 md:px-12 flex justify-between items-center ${
          scrolled
            ? 'bg-black/90 backdrop-blur-xl border-b border-white/5 shadow-lg'
            : 'bg-black/80 backdrop-blur-md'
        }`}
      >
        <FabrickLogo onClick={() => handleNav('/')} />

        <div className="hidden lg:flex gap-8 items-center">
          {NAV_LINKS.map(({ label, href }) => (
            <button
              key={href}
              onClick={() => handleNav(href)}
              className="relative text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400 hover:text-yellow-400 transition-colors duration-200 group"
            >
              {label}
              <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-yellow-400 group-hover:w-full transition-all duration-300" />
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

          {/* Theme toggle */}
          {mounted && (
            <motion.button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-yellow-400 transition-colors border border-white/10 hover:border-yellow-400/40"
              aria-label="Cambiar tema"
              whileTap={{ scale: 0.85 }}
            >
              <AnimatePresence mode="wait">
                {theme === 'dark' ? (
                  <motion.span
                    key="sun"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun size={14} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="moon"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon size={14} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )}
        </div>

        <div className="lg:hidden flex items-center gap-2">
          {/* Theme toggle mobile */}
          {mounted && (
            <motion.button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-yellow-400 transition-colors"
              aria-label="Cambiar tema"
              whileTap={{ scale: 0.85 }}
            >
              <AnimatePresence mode="wait">
                {theme === 'dark' ? (
                  <motion.span
                    key="sun-mob"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun size={16} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="moon-mob"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon size={16} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )}

          <button
            className="text-white hover:text-yellow-400 transition-colors p-2"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu — slide from top */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-40 bg-black/97 backdrop-blur-2xl flex flex-col items-center justify-center lg:hidden"
          >
            <div className="flex flex-col gap-0 text-center w-full px-8">
              {[
                { label: 'Inicio', href: '/' },
                ...NAV_LINKS,
                { label: 'Garantias', href: '/garantias' },
                { label: 'Mi Cuenta', href: '/mi-cuenta' },
                { label: 'Ajustes', href: '/ajustes' },
                { label: 'Checkout', href: '/checkout' },
              ].map(({ label, href }, i) => (
                <motion.button
                  key={`${label}-${href}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.04, duration: 0.3 }}
                  onClick={() => handleNav(href)}
                  className="text-xl font-light uppercase tracking-[0.2em] text-white hover:text-yellow-400 active:text-yellow-400 transition-colors w-full py-5 border-b border-white/5"
                >
                  {label}
                </motion.button>
              ))}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                onClick={() => handleNav('/auth')}
                className="mt-6 py-5 bg-yellow-400 text-black font-bold uppercase text-sm tracking-widest rounded-full hover:bg-white transition-all w-full text-center block"
              >
                Iniciar Sesion
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

