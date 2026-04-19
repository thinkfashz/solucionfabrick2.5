'use client';

import { useState, useEffect } from 'react';
import { X, Menu, Sun, Moon, LogOut, User } from 'lucide-react';
import FabrickLogo from './FabrickLogo';
import { navigateWithTransition } from '@/lib/routeTransition';
import { insforge } from '@/lib/insforge';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { getInitials } from '@/lib/initials';

type NavLink = { label: string; href: string };

const NAV_LINKS: NavLink[] = [
  { label: 'Servicios', href: '/servicios' },
  { label: 'Evolucion', href: '/evolucion' },
  { label: 'Soluciones', href: '/soluciones' },
  { label: 'Tienda', href: '/tienda' },
  { label: 'Proyectos', href: '/proyectos' },
  { label: 'Contacto', href: '/contacto' },
];

function UserAvatar({ name, email, onClick }: { name?: string; email?: string; onClick: () => void }) {
  const initials = getInitials(name || email);

  return (
    <button
      onClick={onClick}
      className="relative flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 text-[11px] font-black text-black ring-2 ring-yellow-400/30 transition hover:ring-yellow-400/60 hover:scale-105"
      aria-label="Mi cuenta"
      title={name || email || 'Mi cuenta'}
    >
      {initials || <User className="h-4 w-4" />}
    </button>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hasOffers, setHasOffers] = useState(false);
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();

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

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    navigateWithTransition('/');
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

        {/* Desktop nav */}
        <div className="hidden lg:flex gap-8 items-center">
          {NAV_LINKS.map(({ label, href }) => (
            <button
              key={href}
              onClick={() => handleNav(href)}
              className="nav-link-animated relative text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400 hover:text-yellow-400 transition-colors"
            >
              {label}
              {label === 'Tienda' && hasOffers && (
                <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          ))}
          <div className="w-px h-4 bg-white/20" />
          {user ? (
            <>
              <UserAvatar name={user.name} email={user.email} onClick={() => handleNav('/mi-cuenta')} />
              <button
                onClick={() => void handleSignOut()}
                className="text-[10px] font-medium uppercase tracking-widest text-zinc-500 hover:text-red-400 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => handleNav('/auth')}
              className="px-5 py-2 rounded-full border border-yellow-400/40 text-yellow-400 text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-400/10 hover:border-yellow-400 transition-all"
            >
              Iniciar Sesión
            </button>
          )}
          <button onClick={toggle} className="theme-toggle" aria-label="Cambiar tema">
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>

        {/* Mobile right controls */}
        <div className="lg:hidden flex items-center gap-3">
          {user && (
            <UserAvatar name={user.name} email={user.email} onClick={() => handleNav('/mi-cuenta')} />
          )}
          <button onClick={toggle} className="theme-toggle" aria-label="Cambiar tema">
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button
            className="text-white hover:text-yellow-400 transition-colors p-1"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu – minimalist slide-in panel */}
      <div
        className={`fixed inset-y-0 right-0 z-40 w-72 max-w-[85vw] flex flex-col transition-transform duration-400 ease-[cubic-bezier(0.32,0,0.67,0)] lg:hidden ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-[#0a0a0b]/98 backdrop-blur-2xl border-l border-white/6" />

        <div className="relative z-10 flex flex-col h-full pt-20 pb-8 px-6">
          {/* Nav items */}
          <nav className="flex-1 space-y-1">
            {[{ label: 'Inicio', href: '/' }, ...NAV_LINKS].map(({ label, href }) => (
              <button
                key={`${label}-${href}`}
                onClick={() => handleNav(href)}
                className="group flex w-full items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-medium text-zinc-300 hover:bg-white/5 hover:text-yellow-400 transition-all duration-200"
              >
                <span className="tracking-wide">{label}</span>
                {label === 'Tienda' && hasOffers && (
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>
            ))}
          </nav>

          {/* Divider */}
          <div className="my-4 h-px bg-white/6" />

          {/* Bottom actions */}
          <div className="space-y-2">
            {user ? (
              <>
                <button
                  onClick={() => handleNav('/mi-cuenta')}
                  className="flex w-full items-center gap-3 px-4 py-3.5 rounded-2xl bg-yellow-400/8 border border-yellow-400/20 text-sm font-semibold text-yellow-400 hover:bg-yellow-400/12 transition-all"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 text-[10px] font-black text-black flex-shrink-0">
                    {getInitials(user.name || user.email) || 'U'}
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs font-bold truncate">{user.name || 'Mi cuenta'}</p>
                    <p className="text-[10px] text-yellow-400/60 truncate">{user.email || ''}</p>
                  </div>
                </button>
                <button
                  onClick={() => void handleSignOut()}
                  className="flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-sm text-zinc-500 hover:bg-white/5 hover:text-red-400 transition-all"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Cerrar sesión</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => handleNav('/auth')}
                className="w-full py-3.5 rounded-2xl bg-yellow-400 text-black text-sm font-black uppercase tracking-widest hover:bg-yellow-300 transition-all"
              >
                Iniciar Sesión
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}

