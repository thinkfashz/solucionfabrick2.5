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
  { id: 'estructura' as Tab, label: 'Estructura', icon: Layout, previewPath: '/' },
];

function ThemeEditorInner() {
  const searchParams = useSearchParams();
  const paramTab = searchParams.get('tab') as Tab | null;
  const validTabs: Tab[] = ['home', 'tienda', 'estructura'];
  const [tab, setTab] = useState<Tab>(validTabs.includes(paramTab as Tab) ? (paramTab as Tab) : 'home');
  const activeTabData = TABS.find((item) => item.id === tab)!;

  return (
    <div data-admin-editor className="min-h-[70dvh] text-[#171612]">
      <div className="sticky top-[64px] z-30 -mx-3 mb-5 border-y border-black/10 bg-[#f3eee4]/95 px-3 py-2 backdrop-blur-xl sm:-mx-5 sm:px-5 lg:top-[72px]">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-2">
          <div className="mr-1 hidden items-center gap-2 pr-3 sm:flex">
            <Layers className="h-4 w-4 text-[#c77a00]" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.22em] text-[#9b6a12]">Editor unificado</p>
              <p className="text-xs font-bold text-[#514c43]">Contenido y estructura</p>
            </div>
          </div>

          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" aria-label="Secciones del editor">
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${active ? 'bg-[#171612] text-[#ffd05a]' : 'text-[#716b60] hover:bg-black/[.045] hover:text-[#171612]'}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <a
            href={activeTabData.previewPath}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-xl border border-black/10 bg-white/55 px-3 py-2 text-xs font-bold text-[#514c43] transition hover:border-[#c77a00]/30 hover:text-[#9b6a12]"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="hidden sm:inline">Ver en vivo</span>
          </a>
        </div>
      </div>

      <div className="min-w-0">
        <div className={tab === 'home' ? 'block' : 'hidden'}><HomeAdmin /></div>
        <div className={tab === 'tienda' ? 'block' : 'hidden'}><TiendaAdmin /></div>
        <div className={tab === 'estructura' ? 'min-h-[72dvh]' : 'hidden'}><EditorClientInner /></div>
      </div>
    </div>
  );
}

export function ThemeEditorClient() {
  return (
    <Suspense fallback={<div className="grid min-h-[60dvh] place-items-center"><div className="flex items-center gap-2 text-sm text-[#817a6f]"><Layers className="h-4 w-4 animate-pulse text-[#c77a00]" /><span>Cargando editor…</span></div></div>}>
      <ThemeEditorInner />
    </Suspense>
  );
}
