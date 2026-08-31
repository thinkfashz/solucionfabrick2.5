'use client';

import Link from 'next/link';
import { Bot, Link2 } from 'lucide-react';
import AdminIntegrationsWorkspace from '@/components/admin/integrations/AdminIntegrationsWorkspace';
import SiiIntegrationShortcut from '@/components/admin/integrations/SiiIntegrationShortcut';

export default function AdminIntegracionesPage() {
  return <>
    <div className="mx-auto mb-5 max-w-7xl px-4 pt-4 md:px-6">
      <Link
        href="/admin/mcp"
        className="group flex items-center gap-4 rounded-[2rem] border border-violet-300/20 bg-[linear-gradient(135deg,rgba(139,92,246,.16),rgba(34,211,238,.08),rgba(255,255,255,.035))] p-5 transition hover:border-violet-300/40 hover:bg-violet-400/10"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-400/15 text-violet-200"><Bot className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[.24em] text-violet-300">Nuevo · MCP Gateway</p>
          <h2 className="mt-1 text-lg font-black text-white">ChatGPT, Ollama Cloud y conectores IA</h2>
          <p className="mt-1 text-sm text-zinc-400">Conecta agentes externos al catálogo e Inventario V2 y configura proveedores OpenAI-compatible.</p>
        </div>
        <Link2 className="h-5 w-5 shrink-0 text-zinc-500 transition group-hover:text-violet-200" />
      </Link>
    </div>
    <SiiIntegrationShortcut />
    <AdminIntegrationsWorkspace />
  </>;
}
