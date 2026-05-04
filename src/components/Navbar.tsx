'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Menu,
  Home,
  Wrench,
  TrendingUp,
  Lightbulb,
  ShoppingBag,
  Building2,
  Phone,
  Gamepad2,
  ShieldCheck,
  BookOpen,
  Layers,
  Calculator,
  ShoppingCart,
  FileText,
} from 'lucide-react';
import FabrickLogo from './FabrickLogo';
import ThemeToggle from './ThemeToggle';
import { navigateWithTransition } from '@/lib/routeTransition';
import { useCartContextSafe } from '@/context/CartContext';
import { useQuoteCartSafe } from '@/context/QuoteCartContext';
import { useSiteContent } from '@/hooks/useSiteContent';

type NavLink = { label: string; href: string };

const FALLBACK_NAV_LINKS: NavLink[] = [
  { label: 'Servicios', href: '/servicios' },
  { label: 'Evolución', href: '/evolucion' },
  { label: 'Soluciones', href: '/soluciones' },
  { label: 'Tienda', href: '/tienda' },
  { label: 'Presupuesto', href: '/presupuesto' },
  { label: 'Proyectos', href: '/proyectos' },
  { label: 'Contacto', href: '/contacto' },
];

const PRIMARY_MENU_ITEMS = [
  { label: 'Inicio',           href: '/',             Icon: Home },
  { label: 'Servicios',        href: '/servicios',    Icon: Wrench },
  { label: 'Diseñar mi casa',  href: '/juego',        Icon: Gamepad2 },
  { label: 'Cotización',       href: '/cotizaciones', Icon: FileText, quoteCount: true },
  { label: 'Carrito tienda',   href: '/checkout',     Icon: ShoppingCart, cartCount: true },
  { label: 'Tienda',           href: '/tienda',       Icon: ShoppingBag },
];

const MENU_ITEMS = [
  ...PRIMARY_MENU_ITEMS,
  { label: 'Evolución',   href: '/evolucion',   Icon: TrendingUp },
  { label: 'Soluciones',  href: '/soluciones',  Icon: Lightbulb },
  { label: 'Presupuesto', href: '/presupuesto', Icon: Calculator },
  { label: 'Proyectos',   href: '/proyectos',   Icon: Building2 },
  { label: 'Casos',       href: '/casos',       Icon: Layers },
  { label: 'Blog',        href: '/blog',        Icon: BookOpen },
  { label: 'Contacto',    href: '/contacto',    Icon: Phone },
  { label: 'Garantías',   href: '/garantias',   Icon: ShieldCheck },
];

const drawerVariants = {
  hidden: { y: '-100%', opacity: 0 },
  visible: {
    y: '0%',
    opacity: 1,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
  exit: {
    y: '-100%',
    opacity: 0,
    transition: { duration: 0.3, ease: [0.55, 0, 1, 0.45] as [number, number, number, number] },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: -12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 + i * 0.035, duration: 0.32, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

export default function Navbar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const cartCtx = useCartContextSafe();
  const cartCount = cartCtx?.totalItems ?? 0;
  const quoteCart = useQuoteCartSafe();
  const quoteCount = quoteCart?.totalItems ?? 0;

  const navMenu = useSiteContent('nav-menu');
  const navLinks: NavLink[] = navMenu.links?.length ? navMenu.links : FALLBACK_NAV_LINKS;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
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
    navigateWithTransition(href, router);
  };

  const renderBadge = (count: number) =>
    count > 0 ? (
      <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-black text-black shadow-[0_0_8px_rgba(201,169,110,0.5)]">
        {count > 99 ? '99+' : count}
      </span>
    ) : null;

  return (
    <>
      <nav
        className={[
          'fixed top-0 left-0 z-50 flex w-full items-center justify-between',
          'px-4 py-3 md:px-12',
          'bg-black/80 backdrop-blur-md',
          'border-b transition-[box-shadow,border-color,background-color] duration-300',
          scrolled
            ? 'border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.45)]'
            : 'border-transparent shadow-none',
        ].join(' ')}
      >
        <FabrickLogo onClick={() => handleNav('/')} />

        {/* Desktop links */}
        <div className="hidden items-center gap-6 lg:flex">
          {navLinks.map(({ label, href }) => (
            <button
              key={href}
              onClick={() => handleNav(href)}
              className="group relative text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:text-[var(--accent)]"
            >
              <span className="relative">
                {label}
                <span className="absolute -bottom-1 left-0 h-[1.5px] w-full origin-left scale-x-0 rounded-full bg-[var(--accent)] transition-transform duration-300 group-hover:scale-x-100" />
              </span>
            </button>
          ))}

          <span className="h-4 w-px bg-white/15" />

          <button
            type="button"
            onClick={() => handleNav('/juego')}
            aria-label="Diseñar mi casa"
            title="Diseñar mi casa"
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition-all hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
          >
            <Gamepad2 className="h-4 w-4" />
          </button>

          <ThemeToggle />

          <span className="h-4 w-px bg-white/15" />

          <button
            onClick={() => handleNav('/mi-cuenta')}
            className="text-[10px] font-bold uppercase tracking-widest text-white/70 transition-colors hover:text-[var(--accent)]"
          >
            Mi Cuenta
          </button>
          <button
            onClick={() => handleNav('/auth')}
            className="rounded-full border border-[var(--accent)]/40 px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] transition-all hover:border-[var(--accent)] hover:bg-[var(--accent)]/10"
          >
            Iniciar Sesión
          </button>
        </div>

        {/* Mobile cluster */}
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition-all hover:border-[var(--accent)]/50 hover:text-[var(--accent)] active:scale-95"
          >
            <AnimatePresence mode="wait" initial={false}>
              {open ? (
                <motion.span
                  key="x"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X size={22} />
                </motion.span>
              ) : (
                <motion.span
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu size={22} />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </nav>

      {/* Mobile drawer — slides DOWN from the top */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            />

            {/* Drawer */}
            <motion.aside
              key="drawer"
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-x-0 top-0 z-50 flex max-h-[100dvh] flex-col overflow-y-auto bg-[var(--bg)] border-b border-[var(--accent)]/30 shadow-[0_24px_60px_rgba(0,0,0,0.5)] lg:hidden"
            >
              {/* Sticky header in drawer */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-[var(--bg)]/95 px-5 py-3 backdrop-blur-md">
                <FabrickLogo onClick={() => handleNav('/')} />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar menú"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-[var(--accent)]/60 hover:text-[var(--accent)] active:scale-95"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 px-6 pb-10 pt-6">
                <nav className="flex flex-col gap-1">
                  {MENU_ITEMS.map(({ label, href, Icon, ...flags }, i) => {
                    const showQuoteCount = 'quoteCount' in flags && quoteCount > 0;
                    const showCartCount = 'cartCount' in flags && cartCount > 0;
                    return (
                      <motion.button
                        key={href}
                        custom={i}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        onClick={() => handleNav(href)}
                        className="group flex w-full items-center gap-4 rounded-2xl px-3 py-3.5 text-left transition-colors hover:bg-white/5 active:bg-white/10"
                      >
                        <span className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/60 transition-all group-hover:border-[var(--accent)]/40 group-hover:bg-[var(--accent)]/10">
                          <Icon size={18} className="text-zinc-300 transition-colors group-hover:text-[var(--accent)]" />
                          {showQuoteCount && renderBadge(quoteCount)}
                          {showCartCount && renderBadge(cartCount)}
                        </span>
                        <span className="flex-1 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text)] transition-colors group-hover:text-[var(--accent)]">
                          {label}
                        </span>
                      </motion.button>
                    );
                  })}
                </nav>

                <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-[var(--accent)]/30 to-transparent" />

                <button
                  onClick={() => handleNav('/mi-cuenta')}
                  className="mb-3 w-full text-center text-xs font-bold uppercase tracking-widest text-[var(--text)]/70 transition-colors hover:text-[var(--accent)]"
                >
                  Mi Cuenta
                </button>
                <button
                  onClick={() => handleNav('/auth')}
                  className="w-full rounded-full bg-[var(--accent)] py-3.5 text-sm font-black uppercase tracking-widest text-black shadow-[0_8px_24px_rgba(201,169,110,0.35)] transition-all hover:bg-[var(--accent2,#b8860b)]"
                >
                  Iniciar Sesión
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
