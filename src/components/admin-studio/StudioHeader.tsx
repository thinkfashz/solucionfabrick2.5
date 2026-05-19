'use client';

import Link from 'next/link';
import {
  ChevronRight,
  ExternalLink,
  LogOut,
  Menu,
  Moon,
  PanelLeft,
  Search,
  Sun,
  User,
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
  profilePhoto?: string | null;
}

function HeaderAvatar({ photo }: { photo?: string | null }) {
  return (
    <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-orange-400/40 bg-zinc-900 shadow-[0_0_18px_rgba(251,146,60,0.18)]">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="Perfil" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-400/20 to-zinc-950">
          <User className="h-4 w-4 text-orange-300" />
        </span>
      )}
    </span>
  );
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
  profilePhoto,
}: StudioHeaderProps) {
  return (
    <header
      data-studio-header=""
      className={[
        'fixed top-0 right-0 z-40 flex h-12 items-center border-b px-3',
        'border-white/[0.08] bg-[rgba(9,9,11,0.85)] backdrop-blur-md',
        'transition-[left] duration-200 ease-in-out',
        collapsed ? 'left-14' : 'left-[272px]',
        'max-lg:left-0',
      ].join(' ')}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200 lg:flex"
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onOpenMobile}
          className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200 lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-4 w-4" />
        </button>

        <span className="h-4 w-px bg-white/[0.08]" />

        <div className="flex min-w-0 items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-zinc-600" />
          <span className="truncate text-[12px] font-medium text-zinc-300">
            {breadcrumb}
          </span>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onOpenPalette}
          className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200"
          title="Buscar (⌘K)"
          aria-label="Abrir buscador"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Buscar</span>
          <kbd className="hidden rounded border border-white/10 bg-white/5 px-1 py-px font-mono text-[9px] text-zinc-500 sm:inline-block">
            ⌘K
          </kbd>
        </button>

        <button
          type="button"
          onClick={onToggleDarkMode}
          className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200"
          aria-label={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          title={darkMode ? 'Modo claro' : 'Modo oscuro'}
        >
          {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>

        <span className="h-4 w-px bg-white/[0.08]" />

        <Link
          href="/tienda"
          className="hidden h-7 items-center gap-1 rounded-md px-2 text-[11px] text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200 sm:flex"
        >
          Ver tienda
          <ExternalLink className="h-3 w-3" />
        </Link>

        <Link href="/admin/perfil" title="Ver perfil" aria-label="Ver perfil" className="rounded-full p-0.5 transition hover:bg-white/10">
          <HeaderAvatar photo={profilePhoto} />
        </Link>

        <button
          type="button"
          onClick={onLogout}
          className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
          title="Cerrar sesión"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
}
