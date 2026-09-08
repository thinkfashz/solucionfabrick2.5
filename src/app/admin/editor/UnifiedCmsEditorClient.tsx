'use client';

import { useEffect, useState } from 'react';
import { Bot, Braces, Home, LayoutDashboard } from 'lucide-react';
import HomeVisualEditorClient from './HomeVisualEditorClient';
import UniversalVisualEditorClient from './UniversalVisualEditorClient';

type Workspace = 'home' | 'site' | 'ai';

const workspaces: Array<{ id: Workspace; label: string; hint: string; icon: typeof Home }> = [
  { id: 'home', label: 'Inicio', hint: 'Estructura, bloques y contenido', icon: Home },
  { id: 'site', label: 'Páginas', hint: 'Edición visual del resto del sitio', icon: LayoutDashboard },
  { id: 'ai', label: 'IA / MCP', hint: 'Modelos, herramientas y automatización', icon: Bot },
];

const FABRICK_PALETTE = [
  { value: '#0E0E10', label: 'Carbón' },
  { value: '#111214', label: 'Negro suave' },
  { value: '#F6F1E8', label: 'Marfil' },
  { value: '#EEE7DD', label: 'Arena' },
  { value: '#D77A2D', label: 'Cobre Fabrick' },
  { value: '#C69A52', label: 'Oro técnico' },
];

export default function UnifiedCmsEditorClient() {
  const [workspace, setWorkspace] = useState<Workspace>('home');

  useEffect(() => {
    if (workspace !== 'home') return;
    const timer = window.setTimeout(() => {
      document.querySelectorAll<HTMLDetailsElement>('.sf-home-cms details[open]').forEach((detail) => detail.removeAttribute('open'));
    }, 80);
    return () => window.clearTimeout(timer);
  }, [workspace]);

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-[#08090A] text-white">
      <div className="sticky top-0 z-[70] min-h-[58px] border-b border-white/8 bg-[#08090A]/96 px-2 py-2 backdrop-blur-xl sm:px-3">
        <div className="mx-auto flex max-w-[1800px] items-center gap-2">
          <div className="hidden min-w-0 sm:block sm:w-[220px] xl:w-[260px]">
            <div className="flex items-center gap-2 text-[#D77A2D]"><Braces className="h-4 w-4" /><span className="text-[9px] font-black uppercase tracking-[.18em]">CMS Fabrick</span></div>
            <p className="mt-0.5 truncate text-[10px] font-semibold text-white/35">Un solo editor · cambios verificables</p>
          </div>

          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-xl border border-white/8 bg-black/30 p-1 [scrollbar-width:none]">
            {workspaces.map((item) => {
              const Icon = item.icon;
              const active = workspace === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setWorkspace(item.id)}
                  className={`flex min-w-[116px] flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-left transition sm:min-w-[150px] ${active ? 'bg-[#D77A2D] text-[#111214] shadow-[0_10px_30px_rgba(215,122,45,.16)]' : 'text-white/45 hover:bg-white/5 hover:text-white/75'}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0">
                    <b className="block truncate text-[10px] font-black sm:text-[11px]">{item.label}</b>
                    <small className={`hidden truncate text-[8px] font-semibold lg:block ${active ? 'text-black/55' : 'text-white/25'}`}>{item.hint}</small>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="hidden items-center gap-1.5 rounded-xl border border-white/8 bg-black/25 px-2.5 py-2 2xl:flex" aria-label="Paleta Fabrick">
            {FABRICK_PALETTE.map((color) => <span key={color.value} title={`${color.label} · ${color.value}`} className="h-5 w-5 rounded-full border border-white/15 shadow-inner" style={{ backgroundColor: color.value }} />)}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1800px]">
        {workspace === 'home' ? <div className="sf-home-cms [&_header]:top-[58px]"><HomeVisualEditorClient /></div> : null}
        {workspace === 'site' ? <div className="[&_header]:top-[58px]"><UniversalVisualEditorClient /></div> : null}
        {workspace === 'ai' ? (
          <div className="h-[calc(100dvh-9rem)] min-h-[620px] overflow-hidden bg-[#0B0C0E] sm:m-3 sm:rounded-2xl sm:border sm:border-white/8">
            <div className="flex min-h-11 items-center justify-between gap-3 border-b border-white/8 bg-[#111214] px-4 text-[9px] font-black uppercase tracking-[.13em] text-white/40">
              <span>Asistente IA · proveedores configurados</span>
              <span className="rounded-full border border-[#D77A2D]/25 bg-[#D77A2D]/8 px-2.5 py-1 text-[#DFA36D]">MCP CMS · /api/mcp/cms</span>
            </div>
            <iframe
              src="/admin/mcp/harness?embed=cms"
              title="Asistente IA y MCP de Soluciones Fabrick"
              className="h-[calc(100%-2.75rem)] w-full border-0 bg-[#F6F1E8]"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
