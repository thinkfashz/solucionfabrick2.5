'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ExternalLink, Home, Layers, Layout, ShoppingBag } from 'lucide-react';
import { HomeAdmin } from '../home/HomeAdmin';
import { TiendaAdmin } from '../tienda/TiendaAdmin';
import EditorClientInner from './EditorClient';

type Tab = 'home' | 'tienda' | 'estructura';

const TABS = [
  { id: 'home' as Tab, label: 'Inicio', icon: Home, previewPath: '/' },
  { id: 'tienda' as Tab, label: 'Tienda', icon: ShoppingBag, previewPath: '/tienda' },
  { id: 'estructura' as Tab, label: 'Estructura del sitio', icon: Layout, previewPath: '/' },
];

function ThemeEditorInner() {
  const searchParams = useSearchParams();
  const paramTab = searchParams.get('tab') as Tab | null;
  const validTabs: Tab[] = ['home', 'tienda', 'estructura'];
  const [tab, setTab] = useState<Tab>(validTabs.includes(paramTab as Tab) ? (paramTab as Tab) : 'home');
  const activeTabData = TABS.find((t) => t.id === tab)!;

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col bg-zinc-950">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-white/[0.07] bg-[#0d0d0f] px-3">
        <div className="hidden shrink-0 items-center gap-2 border-r border-white/[0.07] pr-3 sm:flex">
          <Layers className="h-3.5 w-3.5 text-amber-400/60" />
          <span className="text-[9px] font-black uppercase tracking-[0.32em] text-amber-400/60">Editor de temas</span>
        </div>
        <nav className="flex items-center gap-0.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={['flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-150',
                  active ? 'bg-amber-400/10 text-amber-300 shadow-[0_0_0_1px_rgba(251,191,36,0.2)]'
                         : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'].join(' ')}>
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{t.label}</span>
                {active && <span className="hidden h-1.5 w-1.5 rounded-full bg-amber-400 md:block" />}
              </button>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a href={activeTabData.previewPath} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 rounded-md border border-white/[0.08] px-2.5 py-1.5 text-[11px] text-zinc-500 transition hover:border-amber-400/25 hover:text-amber-300">
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ver en vivo</span>
          </a>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className={tab === 'home' ? 'h-full overflow-y-auto' : 'hidden'}><HomeAdmin /></div>
        <div className={tab === 'tienda' ? 'h-full overflow-y-auto' : 'hidden'}><TiendaAdmin /></div>
        <div className={tab === 'estructura' ? 'h-full' : 'hidden'}><EditorClientInner /></div>
      </div>
    </div>
  );
}

export function ThemeEditorClient() {
  return (
    <Suspense fallback={<div className="flex h-[calc(100vh-56px)] items-center justify-center bg-zinc-950"><div className="flex items-center gap-2 text-sm text-zinc-500"><Layers className="h-4 w-4 animate-pulse text-amber-400/50" /><span>Cargando editor de temas…</span></div></div>}>
      <ThemeEditorInner />
    </Suspense>
  );
}
