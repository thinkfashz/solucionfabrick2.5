'use client';

import { useMemo, useState } from 'react';
import { Brain, Code2, Copy, Loader2, RefreshCcw, Sparkles, Wand2 } from 'lucide-react';
import { AI_PROVIDERS } from '../config/providers';
import { detectEditableSections, improveSectionWithAi } from '../services/section-improvement.service';
import type { AiProviderId } from '../types/ai.types';

export default function AiSectionEditorPanel({
  fullHtml,
  prospectContext,
  onApply,
}: {
  fullHtml: string;
  prospectContext?: Record<string, unknown>;
  onApply?: (updatedHtml: string) => void;
}) {
  const [provider, setProvider] = useState<AiProviderId>('openai');
  const [model, setModel] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [instruction, setInstruction] = useState('Mejora este bloque para que se vea más premium, más claro y más vendedor.');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const sections = useMemo(() => detectEditableSections(fullHtml || ''), [fullHtml]);
  const activeSection = sections.find((item) => item.id === sectionId) || sections[0];
  const llmProviders = AI_PROVIDERS.filter((item) => item.category === 'llm');

  async function run() {
    if (!fullHtml.trim()) return setStatus('No hay HTML para editar.');
    if (!activeSection) return setStatus('No detecté secciones editables.');
    setBusy(true);
    setStatus('Mejorando sólo la sección seleccionada…');
    try {
      const result = await improveSectionWithAi({ provider, model, fullHtml, sectionId: activeSection.id, instruction, prospectContext, preserveLayout: true });
      setLastUpdated(result.updatedFullHtml);
      setStatus(result.summary || 'Sección mejorada.');
      onApply?.(result.updatedFullHtml);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'No se pudo mejorar la sección.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="space-y-4 rounded-[1.8rem] border border-white/10 bg-black/40 p-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">Módulo 04</p>
        <h2 className="text-2xl font-black">Editor IA por selección</h2>
        <p className="mt-1 max-w-2xl text-sm text-white/45">Detecta bloques con data-sf-editable/data-sf-block o textos principales y modifica sólo esa parte del HTML.</p>
      </div>
      <button onClick={() => setStatus(`${sections.length} secciones detectadas.`)} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black"><RefreshCcw className="mr-2 inline h-4 w-4" />Revisar</button>
    </header>

    <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <select value={activeSection?.id || ''} onChange={(e) => setSectionId(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#050505] px-4 py-3 text-sm outline-none">
          {sections.length ? sections.map((section) => <option key={`${section.id}-${section.start}`} value={section.id}>{section.label} · {section.type} · {section.confidence}%</option>) : <option value="">Sin secciones detectadas</option>}
        </select>
        <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} className="min-h-[140px] w-full resize-y rounded-2xl border border-white/10 bg-[#050505] p-4 text-sm leading-6 outline-none focus:border-yellow-300/40" />
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">HTML seleccionado</p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-black/60 p-3 text-xs text-white/60">{activeSection?.html || 'Sin sección seleccionada.'}</pre>
        </div>
      </div>
      <aside className="space-y-3 rounded-[1.4rem] border border-white/10 bg-white/[0.035] p-3">
        <div className="rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-3 text-sm text-yellow-100"><Wand2 className="mr-2 inline h-4 w-4" />{sections.length} bloques detectados. Usa IA para cambiar uno sin romper el resto.</div>
        <select value={provider} onChange={(e) => setProvider(e.target.value as AiProviderId)} className="w-full rounded-2xl border border-white/10 bg-black px-3 py-3 text-sm outline-none">{llmProviders.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
        <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="modelo opcional" className="w-full rounded-2xl border border-white/10 bg-black px-3 py-3 text-sm outline-none" />
        <button onClick={run} disabled={busy || !activeSection} className="w-full rounded-2xl bg-yellow-300 px-4 py-3 font-black text-black disabled:opacity-60">{busy ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 inline h-4 w-4" />}Mejorar sección</button>
        {lastUpdated && <button onClick={() => navigator.clipboard.writeText(lastUpdated)} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-black text-white/70"><Copy className="mr-2 inline h-4 w-4" />Copiar HTML actualizado</button>}
      </aside>
    </div>

    {status && <div className="rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-3 text-sm text-yellow-100"><Brain className="mr-2 inline h-4 w-4" />{status}</div>}
    {lastUpdated && <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"><p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300"><Code2 className="mr-2 inline h-4 w-4" />HTML completo actualizado</p><pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-black/70 p-3 text-xs text-white/60">{lastUpdated}</pre></div>}
  </section>;
}
