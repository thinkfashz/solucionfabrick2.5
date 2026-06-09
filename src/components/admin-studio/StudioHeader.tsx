'use client';

import Link from 'next/link';
import {
  ChevronRight,
  ExternalLink,
  LogOut,
  Menu,
  Moon,
  Palette,
  PanelLeft,
  Search,
  Sun,
} from 'lucide-react';

interface StudioHeaderProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMobile: () => void;
  onOpenPalette: () => void;
  breadcrumb: string;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
  onSwitchToFabrick?: () => void;
}

export function StudioHeader({
  collapsed,
  onToggleCollapse,
  onOpenMobile,
  onOpenPalette,
  breadcrumb,
  darkMode,
  onToggleDarkMode,
  onLogout,
  onSwitchToFabrick,
}: StudioHeaderProps) {
  return (
    <header
      data-studio-header=""
      className={[
        'fixed top-0 right-0 z-40 flex h-12 items-center border-b px-3',
        'border-[rgba(255,246,230,.10)] backdrop-blur-md',
        'transition-[left] duration-200 ease-in-out',
        collapsed ? 'left-14' : 'left-[272px]',
        'max-lg:left-0',
      ].join(' ')}
      style={{ background: 'rgba(7,5,4,0.88)' }}
    >
      {/* Left group */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {/* Desktop collapse toggle */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden h-7 w-7 items-center justify-center rounded-md text-[#9f8d74] transition-colors hover:bg-[rgba(255,138,31,.10)] hover:text-[#fff1d6] lg:flex"
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={onOpenMobile}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#9f8d74] transition-colors hover:bg-[rgba(255,138,31,.10)] hover:text-[#fff1d6] lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Separator */}
        <span className="h-4 w-px bg-[rgba(255,246,230,.10)]" />

        {/* Breadcrumb */}
        <div className="flex min-w-0 items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-[#9f8d74]" />
          <span className="truncate text-[12px] font-medium text-[#dccab0]">
            {breadcrumb}
          </span>
        </div>
      </div>

      {/* Right group */}
      <div className="flex flex-shrink-0 items-center gap-1">
        {/* Search / command palette */}
        <button
          type="button"
          onClick={onOpenPalette}
          className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] text-[#9f8d74] transition-colors hover:bg-[rgba(255,138,31,.10)] hover:text-[#fff1d6]"
          title="Buscar (⌘K)"
          aria-label="Abrir buscador"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Buscar</span>
          <kbd className="hidden rounded border border-[rgba(255,246,230,.10)] bg-[rgba(255,246,230,.04)] px-1 py-px font-mono text-[9px] text-[#9f8d74] sm:inline-block">
            ⌘K
          </kbd>
        </button>

        {/* Switch to Fabrick theme */}
        {onSwitchToFabrick && (
          <button
            type="button"
            onClick={onSwitchToFabrick}
            className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9f8d74] transition-colors hover:bg-[rgba(255,138,31,.10)] hover:text-[#ffd54a]"
            title="Cambiar a Fabrick Classic"
          >
            <Palette className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Fabrick</span>
          </button>
        )}

        {/* Dark/Light toggle */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#9f8d74] transition-colors hover:bg-[rgba(255,138,31,.10)] hover:text-[#fff1d6]"
          aria-label={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          title={darkMode ? 'Modo claro' : 'Modo oscuro'}
        >
          {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>

        {/* Separator */}
        <span className="h-4 w-px bg-[rgba(255,246,230,.10)]" />

        {/* Ver tienda */}
        <Link
          href="/tienda"
          className="hidden h-7 items-center gap-1 rounded-md px-2 text-[11px] text-[#9f8d74] transition-colors hover:bg-[rgba(255,138,31,.10)] hover:text-[#fff1d6] sm:flex"
        >
          Ver tienda
          <ExternalLink className="h-3 w-3" />
        </Link>

        {/* Logout */}
        <button
          type="button"
          onClick={onLogout}
          className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] text-[#9f8d74] transition-colors hover:bg-[rgba(255,107,116,.10)] hover:text-[#ff6b74]"
          title="Cerrar sesión"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
}
