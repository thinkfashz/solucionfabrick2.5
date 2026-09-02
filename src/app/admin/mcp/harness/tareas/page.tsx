'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
import { AdminPage, AdminPageHeader } from '@/components/admin/ui';
import AgentTasksPanel from '@/components/admin/mcp/AgentTasksPanel';

type ModelEntry = { id: string; name: string };
type ProviderResult = { id: string; configured: boolean; models: ModelEntry[] };

export default function OllamaAgentTasksPage() {
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [model, setModel] = useState('');
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/admin/modelos-ia/list', { cache: 'no-store' });
        const body = await response.json() as { providers?: ProviderResult[]; error?: string };
        if (!response.ok) throw new Error(body.error || 'No se pudieron cargar los modelos.');
        const ollama = (body.providers || []).find((item) => item.id === 'ollama');
        if (cancelled) return;
        setConfigured(Boolean(ollama?.configured));
        setModels(ollama?.models || []);
        setModel((current) => current || ollama?.models?.[0]?.id || '');
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudieron cargar los modelos.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const ready = configured && Boolean(models.length) && Boolean(model);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="IA & análisis · automatización"
        title="Tareas Ollama"
        description="Programa el agente interno para revisar visitas, catálogo, stock y operaciones. Las tareas son de solo lectura por defecto y las escrituras programadas necesitan una doble autorización."
        icon={CalendarClock}
        meta={<span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[.13em] ${ready ? 'bg-emerald-500/10 text-emerald-800' : 'bg-amber-500/10 text-amber-800'}`}>{ready ? 'Automatización lista' : 'Ollama pendiente'}</span>}
      />

      {loading ? <div className="flex items-center gap-2 rounded-xl border border-black/8 bg-white/50 p-4 text-sm text-[#716b60]"><Loader2 className="h-4 w-4 animate-spin" /> Cargando Ollama…</div> : null}
      {error ? <div className="rounded-xl border border-rose-500/20 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</div> : null}
      {!loading && models.length ? <label className="mb-4 grid max-w-xl gap-1"><span className="text-[9px] font-black uppercase tracking-[.12em] text-[#8f887c]">Modelo para nuevas tareas</span><select value={model} onChange={(event) => setModel(event.target.value)} className="min-h-11 rounded-xl border border-black/10 bg-white/80 px-3.5 text-sm font-semibold text-[#171612]">{models.map((item) => <option key={item.id} value={item.id}>{item.name || item.id}</option>)}</select></label> : null}

      <AgentTasksPanel model={model} ready={ready} />
    </AdminPage>
  );
}
