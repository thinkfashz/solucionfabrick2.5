'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Bot, Check, Copy, KeyRound, Link2, ShieldCheck, Terminal, Wrench } from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

export default function AgentMcpBridgePage() {
  const [origin, setOrigin] = useState('https://www.solucionesfabrick.com');
  const [copied, setCopied] = useState('');
  useEffect(() => { if (window.location.origin) setOrigin(window.location.origin); }, []);
  const commercial = useMemo(() => `${origin}/api/mcp`, [origin]);
  const agent = useMemo(() => `${origin}/api/agent/mcp`, [origin]);

  async function copy(id: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    window.setTimeout(() => setCopied(''), 1800);
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="IA & análisis · interoperabilidad"
        title="Agent MCP Bridge"
        description="Conecta otros clientes y runners al mismo catálogo, memoria, analítica y gobernanza de Fabrick sin depender de ChatGPT Apps."
        icon={Link2}
        actions={<Link href="/admin/mcp/harness/agent" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white"><Bot className="h-4 w-4" /> Fabrick Agent</Link>}
        meta={<><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.13em] text-emerald-800">Misma identidad MCP</span><span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.13em] text-[#716b60]">Multi-cliente</span></>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Gateway comercial" value="/api/mcp" icon={Wrench} />
        <AdminStat label="Gateway agente" value="/api/agent/mcp" icon={Bot} accent="cyan" />
        <AdminStat label="Autorización" value="Scopes MCP" icon={ShieldCheck} accent="emerald" />
        <AdminStat label="Memoria" value="InsForge" icon={KeyRound} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminCard glow>
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Servidor 1</p>
          <h2 className="mt-1 text-xl font-black text-[#171612]">MCP Comercial</h2>
          <p className="mt-2 text-sm leading-6 text-[#716b60]">Productos, catálogo, mercado, creación/edición, publicación e Inventario V2. Conserva preview → commit y aprobaciones humanas.</p>
          <div className="mt-4 flex gap-2"><code className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-black/8 bg-white/70 p-3 text-xs font-bold text-[#514b42]">{commercial}</code><button onClick={() => void copy('commercial', commercial)} className="grid w-11 place-items-center rounded-xl border border-black/10 bg-white">{copied === 'commercial' ? <Check className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4" />}</button></div>
        </AdminCard>

        <AdminCard glow>
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Servidor 2</p>
          <h2 className="mt-1 text-xl font-black text-[#171612]">Agent MCP</h2>
          <p className="mt-2 text-sm leading-6 text-[#716b60]">Memoria persistente, conversaciones, analítica, visitas y auditoría del sitio. Permite que distintos motores compartan el mismo contexto Fabrick.</p>
          <div className="mt-4 flex gap-2"><code className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-black/8 bg-white/70 p-3 text-xs font-bold text-[#514b42]">{agent}</code><button onClick={() => void copy('agent', agent)} className="grid w-11 place-items-center rounded-xl border border-black/10 bg-white">{copied === 'agent' ? <Check className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4" />}</button></div>
        </AdminCard>
      </div>

      <AdminCard>
        <div className="flex items-start gap-3"><KeyRound className="mt-0.5 h-5 w-5 text-[#a56600]" /><div><h3 className="text-sm font-black text-[#171612]">Una sola credencial, permisos separados por scope</h3><p className="mt-1 text-xs leading-5 text-[#716b60]">Puedes usar la misma credencial `sfmcp_…` en ambos servidores. `products:*` e `inventory:write` controlan operaciones comerciales; `analytics:read`, `site:read` y `automation:run` controlan análisis, memoria y agente. El token solo se muestra al crearlo y no debe guardarse dentro de la memoria.</p></div></div>
      </AdminCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminCard>
          <div className="flex items-start gap-3"><Terminal className="mt-0.5 h-5 w-5 text-[#a56600]" /><div><h3 className="text-base font-black text-[#171612]">Claude Code</h3><p className="mt-2 text-sm leading-6 text-[#716b60]">Claude por API Anthropic funciona directamente dentro de Fabrick Agent. Para Claude Code CLI, configura estos MCP en el runner donde vive Claude Code. El CLI obtiene herramientas desde Fabrick; la memoria sigue en InsForge y no en la máquina del runner.</p><p className="mt-3 text-xs font-semibold text-[#514b42]">No necesitas darle acceso SQL ni copiar la base de datos al runner.</p></div></div>
        </AdminCard>
        <AdminCard>
          <div className="flex items-start gap-3"><Bot className="mt-0.5 h-5 w-5 text-[#a56600]" /><div><h3 className="text-base font-black text-[#171612]">Ollama, Gemini, Grok y OpenRouter</h3><p className="mt-2 text-sm leading-6 text-[#716b60]">Dentro del Harness basta configurar su API en Modelos IA y seleccionar el motor. Si una plataforma externa soporta MCP, también puede conectarse a estos endpoints con un perfil Fabrick limitado a los scopes que decidas.</p><Link href="/admin/modelos-ia" className="mt-3 inline-flex text-xs font-black text-[#9b6a12]">Abrir Modelos IA →</Link></div></div>
        </AdminCard>
      </div>

      <AdminCard>
        <h3 className="text-sm font-black text-[#171612]">Herramientas exclusivas del Agent MCP</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{['agent_memory_search','agent_memory_remember','agent_conversations_list','agent_conversation_get','agent_analytics_summary','agent_traffic_report','agent_site_audit'].map((tool) => <code key={tool} className="rounded-xl border border-black/8 bg-white/65 px-3 py-2 text-[11px] font-bold text-[#615b52]">{tool}</code>)}</div>
      </AdminCard>
    </AdminPage>
  );
}
