'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Menu,
  Home,
  Wrench,
  FileText,
  ShoppingCart,
  ShoppingBag,
  Calculator,
  Phone,
  ShieldCheck,
  User,
  LogIn,
  MessageCircle,
} from 'lucide-react';
import { FabrickNavLogo } from '@/components/FabrickBrandIcon';
import { useCartContextSafe } from '@/context/CartContext';
import { useQuoteCartSafe } from '@/context/QuoteCartContext';
import { navigateWithTransition } from '@/lib/routeTransition';

const MAIN_MENU_ITEMS = [
  { label: 'Inicio', description: 'Conoce Fabrick y calcula tu proyecto', href: '/', Icon: Home },
  { label: 'Servicios', description: 'Construcción, instalaciones y terminaciones', href: '/servicios', Icon: Wrench },
  { label: 'Cotizar', description: 'Arma tu presupuesto en tiempo real', href: '/presupuesto', Icon: FileText, quoteCount: true },
  { label: 'Tienda', description: 'Productos para construir y mejorar', href: '/tienda', Icon: ShoppingBag, cartCount: true },
  { label: 'Contacto', description: 'WhatsApp, ubicación y evaluación', href: '/contacto', Icon: Phone },
];

const SUPPORT_MENU_ITEMS = [
  { label: 'Presupuesto', href: '/presupuesto', Icon: Calculator },
  { label: 'Garantías', href: '/garantias', Icon: ShieldCheck },
  { label: 'WhatsApp', href: 'https://wa.me/56930121625', Icon: MessageCircle, external: true },
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

function NavbarBrandLogo({ onClick }: { onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      aria-label="Soluciones Fabrick — inicio"
      onClick={onClick}
      className="group flex flex-shrink-0 cursor-pointer select-none items-center rounded-lg outline-none transition-transform duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-yellow-300/60"
    >
      <FabrickNavLogo theme="light" />
    </button>
  );
}

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

  const handleNav = (href: string, external = false) => {
    setOpen(false);
    if (external) {
      window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }
    navigateWithTransition(href, router);
  };

  const renderBadge = (count: number) =>
    count > 0 ? (
      <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-black text-black shadow-[0_0_8px_rgba(255, 176, 0,0.5)]">
        {count > 99 ? '99+' : count}
      </span>
    ) : null;

  return (
    <>
      <nav
        className={[
          'fixed left-0 top-0 z-50 flex w-full items-center justify-between',
          'px-4 py-3 md:px-12',
          'bg-black/82 backdrop-blur-md',
          'border-b transition-[box-shadow,border-color,background-color] duration-300',
          scrolled
            ? 'border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.45)]'
            : 'border-transparent shadow-none',
        ].join(' ')}
      >
        <div className="hidden lg:block">
          <NavbarBrandLogo onClick={() => handleNav('/')} />
        </div>

        {/* Mobile left: menu */}
        <div className="flex items-center lg:hidden">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition-all hover:border-[var(--accent)]/50 hover:text-[var(--accent)] active:scale-95"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={open ? 'x' : 'menu'}
                initial={{ rotate: open ? -90 : 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: open ? 90 : -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {open ? <X size={22} /> : <Menu size={22} />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>

        {/* Mobile centered brand */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:hidden">
          <NavbarBrandLogo compact onClick={() => handleNav('/')} />
        </div>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 lg:flex">
          {MAIN_MENU_ITEMS.map(({ label, href }) => (
            <button
              key={href + label}
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
            onClick={() => (cartCtx ? cartCtx.openCart() : handleNav('/tienda'))}
            aria-label={cartCount > 0 ? `Carrito de compras — ${cartCount} producto${cartCount === 1 ? '' : 's'}` : 'Carrito de compras'}
            title="Carrito"
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition-all hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
          >
            <ShoppingCart className="h-4 w-4" />
            {renderBadge(cartCount)}
          </button>

          <button
            onClick={() => handleNav('/contacto')}
            className="rounded-full bg-[var(--accent)] px-5 py-2 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:-translate-y-0.5 hover:bg-white"
          >
            Cotizar ahora
          </button>
        </div>

        {/* Mobile right: cart */}
        <div className="flex items-center lg:hidden">
          <button
            type="button"
            onClick={() => (cartCtx ? cartCtx.openCart() : handleNav('/tienda'))}
            aria-label="Carrito de compras"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition-all hover:border-[var(--accent)]/50 hover:text-[var(--accent)] active:scale-95"
          >
            <ShoppingCart size={20} />
            {renderBadge(cartCount)}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            />

            <motion.aside
              key="drawer"
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-x-0 top-0 z-50 flex max-h-[100dvh] flex-col overflow-y-auto border-b border-[var(--accent)]/30 bg-[var(--bg)] shadow-[0_24px_60px_rgba(0,0,0,0.5)] lg:hidden"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[var(--bg)]/95 px-5 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                <NavbarBrandLogo compact onClick={() => handleNav('/')} />
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
                <DrawerSectionLabel>Navegar</DrawerSectionLabel>
                <nav className="flex flex-col gap-1">
                  {MAIN_MENU_ITEMS.map(({ label, description, href, Icon, ...flags }, i) => {
                    const showQuoteCount = 'quoteCount' in flags && quoteCount > 0;
                    const showCartCount = 'cartCount' in flags && cartCount > 0;
                    return (
                      <motion.button
                        key={href + label}
                        custom={i}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        onClick={() => handleNav(href)}
                        className="group flex min-h-[44px] w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/5 active:bg-white/10"
                      >
                        <span className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/60 transition-all group-hover:border-[var(--accent)]/40 group-hover:bg-[var(--accent)]/10 group-hover:shadow-[0_0_16px_rgba(255, 176, 0,0.18)]">
                          <Icon size={18} className="text-zinc-300 transition-colors group-hover:text-[var(--accent)]" />
                          {showQuoteCount && renderBadge(quoteCount)}
                          {showCartCount && renderBadge(cartCount)}
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-black text-white transition-colors group-hover:text-yellow-300">{label}</span>
                          <span className="mt-1 block text-xs leading-5 text-zinc-500">{description}</span>
                        </span>
                      </motion.button>
                    );
                  })}
                </nav>

                <div className="my-5 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <DrawerSectionLabel>Ayuda rápida</DrawerSectionLabel>
                <nav className="grid grid-cols-1 gap-1.5">
                  {SUPPORT_MENU_ITEMS.map(({ label, href, Icon, external }, i) => (
                    <motion.button
                      key={href}
                      custom={MAIN_MENU_ITEMS.length + i}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      onClick={() => handleNav(href, external)}
                      className="group flex min-h-[44px] items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-left transition-all hover:border-[var(--accent)]/25 hover:bg-white/5"
                    >
                      <Icon size={15} className="flex-shrink-0 text-zinc-400 transition-colors group-hover:text-[var(--accent)]" />
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-300 transition-colors group-hover:text-[var(--text)]">
                        {label}
                      </span>
                    </motion.button>
                  ))}
                </nav>

                <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-[var(--accent)]/30 to-transparent" />

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
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] py-3.5 text-sm font-black uppercase tracking-widest text-black shadow-[0_8px_24px_rgba(255, 176, 0,0.35)] transition-all hover:bg-white active:scale-[0.99]"
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
