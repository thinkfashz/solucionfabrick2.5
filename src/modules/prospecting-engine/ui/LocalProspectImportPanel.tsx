'use client';

import { useMemo, useState } from 'react';
import { Brain, CheckCircle2, FileUp, Loader2, Power, Save, Search, Sparkles, Table2, UploadCloud, Wand2 } from 'lucide-react';
import { AI_PROVIDERS } from '../config/providers';
import { importProspects } from '../services/prospect.service';
import { detectHybridProspects, readLocalProspectFile } from '../services/local-hybrid-import.service';
import type { AiProviderId } from '../types/ai.types';
import type { LocalDetectedProspect, LocalImportDetectionResult } from '../types/import.types';

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function scoreClass(level?: string) {
  if (level === 'alta') return 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100';
  if (level === 'baja') return 'border-red-300/30 bg-red-400/10 text-red-100';
  return 'border-yellow-300/30 bg-yellow-400/10 text-yellow-100';
}

export default function LocalProspectImportPanel({
  onUseProspect,
  onSaved,
}: {
  onUseProspect?: (prospect: LocalDetectedProspect) => void;
  onSaved?: () => void;
}) {
  const [rawText, setRawText] = useState('');
  const [sourceName, setSourceName] = useState('manual.txt');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [provider, setProvider] = useState<AiProviderId>('openai');
  const [model, setModel] = useState('');
  const [result, setResult] = useState<LocalImportDetectionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [filter, setFilter] = useState('');
  const llmProviders = AI_PROVIDERS.filter((item) => item.category === 'llm');

  const prospects = result?.prospects || [];
  const selected = prospects.filter((p) => p.selected !== false);
  const filtered = useMemo(() => {
    const t = filter.toLowerCase().trim();
    if (!t) return prospects;
    return prospects.filter((p) => [p.brand, p.industry, p.city, p.instagram, p.problem_detected, p.opportunity, p.notes].filter(Boolean).join(' ').toLowerCase().includes(t));
  }, [prospects, filter]);

  async function handleFile(file?: File | null) {
    if (!file) return;
    const loaded = await readLocalProspectFile(file);
    setRawText(loaded.rawText);
    setSourceName(loaded.sourceName);
    setStatus(`Archivo cargado: ${loaded.sourceName}`);
  }

  async function detect() {
    if (!rawText.trim()) return setStatus('Sube un archivo o pega JSON/HTML/TXT primero.');
    setBusy(true);
    setStatus(aiEnabled ? 'Detectando localmente y mejorando con IA…' : 'Detectando prospectos localmente…');
    const next = await detectHybridProspects({ rawText, sourceName, aiEnabled, provider, model });
    setResult(next);
    setBusy(false);
    setStatus(next.aiUsed ? `${next.prospects.length} prospectos detectados y normalizados con IA.` : `${next.prospects.length} prospectos detectados en modo local.`);
  }

  function toggle(localId: string) {
    if (!result) return;
    setResult({ ...result, prospects: result.prospects.map((p) => p.local_id === localId ? { ...p, selected: p.selected === false } : p) });
  }

  async function saveSelected() {
    if (!selected.length) return setStatus('Selecciona al menos un prospecto.');
    setBusy(true);
    setStatus('Guardando prospectos en la base de datos…');
    try {
      const imported = await importProspects({ source: result?.aiUsed ? 'hybrid-ai-importer' : 'local-importer', prospects: selected });
      setStatus(`Guardados: ${imported.imported}. Omitidos: ${imported.skipped}.`);
      onSaved?.();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'No se pudieron guardar los prospectos.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="space-y-4 rounded-[1.8rem] border border-white/10 bg-black/40 p-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">Módulo 3.5</p>
        <h2 className="text-2xl font-black">Importador híbrido de prospectos</h2>
        <p className="mt-1 max-w-2xl text-sm text-white/45">Sube HTML, JSON o TXT. El detector local funciona sin IA; activa IA ON para limpiar, completar y clasificar con tus integraciones.</p>
      </div>
      <button onClick={() => setAiEnabled((v) => !v)} className={`rounded-2xl border px-4 py-3 text-sm font-black ${aiEnabled ? 'border-emerald-300/30 bg-emerald-400/15 text-emerald-100' : 'border-white/10 bg-white/[0.04] text-white/55'}`}>
        {aiEnabled ? <Brain className="mr-2 inline h-4 w-4" /> : <Power className="mr-2 inline h-4 w-4" />}
        IA {aiEnabled ? 'ON' : 'OFF'}
      </button>
    </header>

    <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input value={sourceName} onChange={(e) => setSourceName(e.target.value)} className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm outline-none" placeholder="nombre del archivo" />
          <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-black">
            <FileUp className="mr-2 h-4 w-4" />Subir HTML/JSON/TXT
            <input type="file" accept=".json,.html,.htm,.txt,text/plain,text/html,application/json" className="hidden" onChange={(e) => { void handleFile(e.currentTarget.files?.[0]); e.currentTarget.value = ''; }} />
          </label>
        </div>
        <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} className="min-h-[260px] w-full resize-y rounded-[1.4rem] border border-white/10 bg-[#050505] p-4 font-mono text-sm leading-6 text-yellow-50 outline-none focus:border-yellow-300/40" placeholder="Pega aquí JSON generado por ChatGPT, una tabla HTML, tarjetas de prospectos o texto separado por bloques…" />
      </div>

      <aside className="space-y-3 rounded-[1.4rem] border border-white/10 bg-white/[0.035] p-3">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Modo</p>
          <p className="mt-2 text-sm text-white/60">{aiEnabled ? 'Local + IA: detecta primero en navegador y luego normaliza con IA.' : 'Local puro: no depende de inteligencia artificial.'}</p>
        </div>
        {aiEnabled && <div className="space-y-2">
          <select value={provider} onChange={(e) => setProvider(e.target.value as AiProviderId)} className="w-full rounded-2xl border border-white/10 bg-black px-3 py-3 text-sm outline-none">
            {llmProviders.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <input value={model} onChange={(e) => setModel(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black px-3 py-3 text-sm outline-none" placeholder="modelo opcional" />
        </div>}
        <button onClick={detect} disabled={busy} className="w-full rounded-2xl bg-yellow-300 px-4 py-3 font-black text-black disabled:opacity-60">
          {busy ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : aiEnabled ? <Sparkles className="mr-2 inline h-4 w-4" /> : <Wand2 className="mr-2 inline h-4 w-4" />}
          Detectar prospectos
        </button>
        <button onClick={saveSelected} disabled={busy || !selected.length} className="w-full rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 font-black text-emerald-100 disabled:opacity-40"><Save className="mr-2 inline h-4 w-4" />Guardar seleccionados</button>
      </aside>
    </div>

    {status && <div className="rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-3 text-sm text-yellow-100">{status}</div>}
    {result?.warnings?.length ? <div className="rounded-2xl border border-orange-300/20 bg-orange-300/10 p-3 text-sm text-orange-100">{result.warnings.join(' ')}</div> : null}

    {prospects.length > 0 && <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><b className="text-lg">Prospectos detectados</b><p className="text-sm text-white/45">{selected.length} seleccionados de {prospects.length}. {result?.aiUsed ? result.aiMessage : 'Modo local sin IA.'}</p></div>
        <label className="flex h-11 min-w-[240px] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3"><Search className="h-4 w-4 text-white/35" /><input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="filtrar resultados" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">{filtered.map((p) => <article key={p.local_id} className={`overflow-hidden rounded-[1.4rem] border bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-4 ${p.selected === false ? 'border-white/10 opacity-55' : 'border-yellow-300/25'}`}>
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-xl font-black">{p.brand}</h3><p className="mt-1 text-sm text-white/45">{clean(p.industry) || 'Rubro no detectado'} · {clean(p.city) || 'Ciudad no detectada'}</p></div><button onClick={() => toggle(p.local_id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${p.selected === false ? 'bg-white/[0.06] text-white/50' : 'bg-yellow-300 text-black'}`}>{p.selected === false ? 'Omitido' : 'Seleccionado'}</button></div>
        <div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-full border px-3 py-1 text-xs font-black ${scoreClass(p.probability_level)}`}>{p.probability_level || 'media'} · {p.score ?? p.confidence}%</span><span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/55">Confianza local {p.confidence}%</span></div>
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2"><Info label="Problema" value={p.problem_detected} /><Info label="Oportunidad" value={p.opportunity} /><Info label="Instagram" value={p.instagram} /><Info label="WhatsApp" value={p.whatsapp} /><Info label="Web" value={p.website} /><Info label="Seguidores" value={p.followers} /></div>
        <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => onUseProspect?.(p)} className="rounded-2xl border border-yellow-300/25 bg-yellow-300/10 px-4 py-2 text-sm font-black text-yellow-100"><CheckCircle2 className="mr-2 inline h-4 w-4" />Usar en editor</button><button onClick={() => navigator.clipboard.writeText(JSON.stringify(p, null, 2))} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-white/60"><Table2 className="mr-2 inline h-4 w-4" />Copiar JSON</button></div>
      </article>)}</div>
    </div>}
  </section>;
}

function Info({ label, value }: { label: string; value?: unknown }) {
  return <div className="rounded-2xl border border-white/10 bg-black/30 p-3"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300/80">{label}</p><p className="mt-1 line-clamp-3 text-white/70">{clean(value) || '—'}</p></div>;
}
