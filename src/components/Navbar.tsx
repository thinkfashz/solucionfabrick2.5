'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Menu,
  Home,
  Wrench,
  Gamepad2,
  FileText,
  ShoppingCart,
  ShoppingBag,
  TrendingUp,
  Lightbulb,
  Calculator,
  Building2,
  Layers,
  BookOpen,
  Phone,
  ShieldCheck,
  User,
  LogIn,
} from 'lucide-react';
import FabrickLogo3DLazy from '@/components/FabrickLogo3DLazy';
import ThemeToggle from '@/components/ThemeToggle';
import { useCartContextSafe } from '@/context/CartContext';
import { useQuoteCartSafe } from '@/context/QuoteCartContext';
import { useSiteContent } from '@/hooks/useSiteContent';
import { navigateWithTransition } from '@/lib/routeTransition';
import type { NavLinkItem } from '@/lib/siteStructureTypes';

const PRIMARY_MENU_ITEMS = [
  { label: 'Inicio',           href: '/',             Icon: Home },
  { label: 'Servicios',        href: '/servicios',    Icon: Wrench },
  { label: 'Diseñar mi casa',  href: '/juego',        Icon: Gamepad2 },
  { label: 'Cotización',       href: '/cotizaciones', Icon: FileText, quoteCount: true },
  { label: 'Tienda',           href: '/tienda',       Icon: ShoppingBag, cartCount: true },
];

/** Segundo grupo del drawer: secciones de exploración / contenido. */
const SECONDARY_MENU_ITEMS = [
  { label: 'Evolución',   href: '/evolucion',   Icon: TrendingUp },
  { label: 'Soluciones',  href: '/soluciones',  Icon: Lightbulb },
  { label: 'Presupuesto', href: '/presupuesto', Icon: Calculator },
  { label: 'Proyectos',   href: '/proyectos',   Icon: Building2 },
  { label: 'Casos',       href: '/casos',       Icon: Layers },
  { label: 'Blog',        href: '/blog',        Icon: BookOpen },
];

/** Tercer grupo del drawer: contacto / soporte / garantías. */
const SUPPORT_MENU_ITEMS = [
  { label: 'Contacto',  href: '/contacto',  Icon: Phone },
  { label: 'Garantías', href: '/garantias', Icon: ShieldCheck },
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

/**
 * Botón-marca del Navbar.
 *
 * Layout: [cercha 3D animada] + [wordmark "SOLUCIONES FABRICK / Tu obra en
 * buenas manos"]. La cercha sigue renderizándose con `FabrickLogo3DLazy`
 * en modo `showText={false}` porque el texto rasterizado a `CanvasTexture`
 * pierde nitidez al downscalear al tamaño del navbar; en cambio, el
 * wordmark se renderiza como HTML real al lado, así queda crisp en todas
 * las densidades de pantalla.
 *
 * - `interactive={false}` y `showHint={false}` → el clic siempre navega a `/`.
 * - `cameraZ={14}` → cámara cerrada para que la cercha llene el cuadro.
 * - El wrapper conserva `role="button"` + `onKeyDown` para accesibilidad.
 * - El wordmark se muestra en todas las anchuras (compacto en mobile,
 *   completo desde `sm`). El eslogan se oculta en mobile muy estrecho
 *   (`<sm`) para no chocar con el botón hamburguesa.
 */
function NavbarBrandLogo({ onClick }: { onClick: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Soluciones Fabrick — inicio"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group flex flex-shrink-0 cursor-pointer select-none items-center gap-2 rounded-lg outline-none transition-transform duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60 sm:gap-3"
    >
      <div className="relative h-12 w-[60px] flex-shrink-0 sm:h-14 sm:w-[72px]">
        <FabrickLogo3DLazy
          height="100%"
          interactive={false}
          showHint={false}
          showText={false}
          cameraZ={14}
        />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-[11px] font-black uppercase tracking-[0.12em] text-white sm:text-[15px] sm:tracking-[0.14em]">
          SOLUCIONES <span className="text-[var(--accent)]">FABRICK</span>
        </span>
        <span className="mt-1 hidden text-[9px] font-medium italic tracking-[0.08em] text-zinc-400 sm:block sm:text-[10px]">
          Tu obra en buenas manos
        </span>
      </div>
    </div>
  );
}

/**
 * Etiqueta de sección dentro del drawer móvil — mismo lenguaje visual que el
 * `Eyebrow` de las secciones dinámicas del home (uppercase, tracking ancho,
 * color de acento), para que cada grupo de opciones se lea como un bloque
 * propio en lugar de una lista plana.
 */
function DrawerSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 mt-1 px-3 text-[10px] font-bold uppercase tracking-[0.32em] text-[var(--accent)]/70">
      {children}
    </p>
  );
}

export default function Navbar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const cartCtx = useCartContextSafe();
  const cartCount = cartCtx?.totalItems ?? 0;
  const quoteCart = useQuoteCartSafe();
  const quoteCount = quoteCart?.totalItems ?? 0;

  const navMenu = useSiteContent('nav-menu');
  const navLinks: NavLinkItem[] = navMenu.links ?? [];

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
        <NavbarBrandLogo onClick={() => handleNav('/')} />

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

          <button
            type="button"
            onClick={() => (cartCtx ? cartCtx.openCart() : handleNav('/tienda'))}
            aria-label={cartCount > 0 ? `Carrito de compras — ${cartCount} producto${cartCount === 1 ? '' : 's'}` : 'Carrito de compras'}
            title="Carrito"
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition-all hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
          >
            <ShoppingCart className="h-4 w-4" />
            {renderBadge(cartCount)}
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
          {open ? (
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              aria-expanded="true"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition-all hover:border-[var(--accent)]/50 hover:text-[var(--accent)] active:scale-95"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key="x"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X size={22} />
                </motion.span>
              </AnimatePresence>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Abrir menú"
              aria-expanded="false"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition-all hover:border-[var(--accent)]/50 hover:text-[var(--accent)] active:scale-95"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu size={22} />
                </motion.span>
              </AnimatePresence>
            </button>
          )}
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
              {/* Sticky header — visually separated from the scrolling list via
                  a stronger border + its own backdrop blur + soft shadow, so
                  it reads as a fixed "toolbar" rather than blending in. */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[var(--bg)]/95 px-5 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                <NavbarBrandLogo onClick={() => handleNav('/')} />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar menú"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-[var(--accent)]/60 hover:text-[var(--accent)] active:scale-95"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 px-5 pb-10 pt-5 sm:px-6">
                {/* Grupo 1 — navegación principal */}
                <DrawerSectionLabel>Navegar</DrawerSectionLabel>
                <nav className="flex flex-col gap-1">
                  {PRIMARY_MENU_ITEMS.map(({ label, href, Icon, ...flags }, i) => {
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
                        className="group flex w-full min-h-[44px] items-center gap-4 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/5 active:bg-white/10"
                      >
                        <span className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/60 transition-all group-hover:border-[var(--accent)]/40 group-hover:bg-[var(--accent)]/10 group-hover:shadow-[0_0_16px_rgba(250,204,21,0.18)]">
                          <Icon size={18} className="text-zinc-300 transition-colors group-hover:text-[var(--accent)]" />
                          {showQuoteCount && renderBadge(quoteCount)}
                          {showCartCount && renderBadge(cartCount)}
                        </span>
                        <span className="flex-1 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text)] transition-colors group-hover:text-[var(--accent)]">
                          {label}
                        </span>
                        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-transparent transition-colors group-hover:bg-[var(--accent)]" aria-hidden />
                      </motion.button>
                    );
                  })}
                </nav>

                <div className="my-5 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                {/* Grupo 2 — explorar / contenido */}
                <DrawerSectionLabel>Explorar</DrawerSectionLabel>
                <nav className="grid grid-cols-2 gap-1.5">
                  {SECONDARY_MENU_ITEMS.map(({ label, href, Icon }, i) => (
                    <motion.button
                      key={href}
                      custom={PRIMARY_MENU_ITEMS.length + i}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      onClick={() => handleNav(href)}
                      className="group flex min-h-[44px] items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-left transition-all hover:border-[var(--accent)]/25 hover:bg-white/5"
                    >
                      <Icon size={15} className="flex-shrink-0 text-zinc-400 transition-colors group-hover:text-[var(--accent)]" />
                      <span className="truncate text-xs font-semibold uppercase tracking-[0.1em] text-zinc-300 transition-colors group-hover:text-[var(--text)]">
                        {label}
                      </span>
                    </motion.button>
                  ))}
                </nav>

                <div className="my-5 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                {/* Grupo 3 — soporte / garantías */}
                <DrawerSectionLabel>Ayuda</DrawerSectionLabel>
                <nav className="flex flex-col gap-1">
                  {SUPPORT_MENU_ITEMS.map(({ label, href, Icon }, i) => (
                    <motion.button
                      key={href}
                      custom={PRIMARY_MENU_ITEMS.length + SECONDARY_MENU_ITEMS.length + i}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      onClick={() => handleNav(href)}
                      className="group flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/5 active:bg-white/10"
                    >
                      <Icon size={16} className="flex-shrink-0 text-zinc-400 transition-colors group-hover:text-[var(--accent)]" />
                      <span className="flex-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300 transition-colors group-hover:text-[var(--text)]">
                        {label}
                      </span>
                    </motion.button>
                  ))}
                </nav>

                <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-[var(--accent)]/30 to-transparent" />

                {/* Grupo 4 — cuenta / sesión, presentado como bloque "glass card"
                    diferenciado para que se lea como acción principal del cierre. */}
                <div className="flex flex-col gap-2.5 rounded-2xl border border-white/10 bg-zinc-950/80 p-3 backdrop-blur">
                  <button
                    onClick={() => handleNav('/mi-cuenta')}
                    className="group flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                  >
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all group-hover:border-[var(--accent)]/40 group-hover:bg-[var(--accent)]/10">
                      <User size={15} className="text-zinc-300 transition-colors group-hover:text-[var(--accent)]" />
                    </span>
                    <span className="flex-1 text-xs font-bold uppercase tracking-widest text-[var(--text)]/80 transition-colors group-hover:text-[var(--accent)]">
                      Mi Cuenta
                    </span>
                  </button>
                  <button
                    onClick={() => handleNav('/auth')}
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] py-3.5 text-sm font-black uppercase tracking-widest text-black shadow-[0_8px_24px_rgba(201,169,110,0.35)] transition-all hover:bg-[var(--accent2,#b8860b)] active:scale-[0.99]"
                  >
                    <LogIn size={16} aria-hidden />
                    Iniciar Sesión
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
