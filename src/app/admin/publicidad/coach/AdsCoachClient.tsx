'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, BarChart3, Wand2, Plus, Loader2, CheckCircle2, XCircle } from 'lucide-react';

const ACTIONS: Array<{ id: 'analyze' | 'suggest' | 'create' | 'optimize'; label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'analyze', label: 'Analizar', description: 'Audita CTR, CPM, CPC y ROAS de la campaña seleccionada.', icon: BarChart3 },
  { id: 'suggest', label: 'Sugerir creatives', description: 'Propone copy A/B, llamados a la acción y hashtags.', icon: Wand2 },
  { id: 'create', label: 'Generar campaña', description: 'Objetivo, audiencia, presupuesto y copy listos para publicar.', icon: Plus },
  { id: 'optimize', label: 'Optimizar', description: 'Recomendaciones de pujas, públicos y horarios.', icon: Sparkles },
];

interface AgentRun {
  runId: string | null;
  response: Record<string, unknown>;
  applyState?: 'idle' | 'pending' | 'ok' | 'error';
  applyMessage?: string;
}

export default function AdsCoachClient() {
  const [running, setRunning] = useState<string | null>(null);
  const [run, setRun] = useState<AgentRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function execute(action: string) {
    setRunning(action);
    setRun(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/ads/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((json && json.error) || res.statusText || 'Error inesperado.');
        return;
      }
      setRun({
        runId: typeof json.runId === 'string' ? json.runId : null,
        response: (json.response ?? {}) as Record<string, unknown>,
        applyState: 'idle',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setRunning(null);
    }
  }

  async function applySuggestion() {
    if (!run?.runId) return;
    setRun((prev) => (prev ? { ...prev, applyState: 'pending', applyMessage: undefined } : prev));
    try {
      const res = await fetch(`/api/admin/ads/agent/${encodeURIComponent(run.runId)}/apply`, {
        method: 'POST',
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        result?: Record<string, unknown>;
      };
      if (!res.ok || !json.ok) {
        setRun((prev) =>
          prev ? { ...prev, applyState: 'error', applyMessage: json.error || `Error ${res.status}` } : prev,
        );
        return;
      }
      const note = typeof json.result?.note === 'string' ? json.result.note : '';
      const campaignId = typeof json.result?.campaign_id === 'string' ? ` (id: ${json.result.campaign_id})` : '';
      setRun((prev) =>
        prev ? { ...prev, applyState: 'ok', applyMessage: `${note}${campaignId}`.trim() || 'Aplicado.' } : prev,
      );
    } catch (err) {
      setRun((prev) =>
        prev
          ? { ...prev, applyState: 'error', applyMessage: err instanceof Error ? err.message : 'Error inesperado.' }
          : prev,
      );
    }
  }

  const responseKind = run?.response && typeof run.response.kind === 'string' ? (run.response.kind as string) : null;
  const canApply = Boolean(run?.runId) && responseKind !== 'analysis';

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-400/15 text-yellow-400">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Coach de campañas</h1>
          <p className="text-xs text-zinc-500">Agente IA multi-canal (Meta, Google Ads, TikTok). Persistido en ads_agent_runs.</p>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ACTIONS.map((a, i) => {
          const Icon = a.icon;
          const isRunning = running === a.id;
          return (
            <motion.button
              key={a.id}
              type="button"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => execute(a.id)}
              disabled={Boolean(running)}
              className="text-left rounded-2xl border border-white/10 bg-zinc-950/70 p-4 hover:border-yellow-400/40 transition disabled:opacity-60"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-yellow-400">
                {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
              </span>
              <h3 className="mt-3 text-[14px] font-bold text-white">{a.label}</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-zinc-400">{a.description}</p>
            </motion.button>
          );
        })}
      </section>

      {error && (
        <pre className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-[11px] leading-relaxed text-red-300 whitespace-pre-wrap">
          {error}
        </pre>
      )}

      {run && (
        <div className="space-y-3">
          <pre className="rounded-2xl border border-white/10 bg-black/60 p-4 text-[11px] leading-relaxed text-zinc-300 whitespace-pre-wrap">
            {JSON.stringify(run.response, null, 2)}
          </pre>

          {canApply && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={applySuggestion}
                disabled={run.applyState === 'pending' || run.applyState === 'ok'}
                className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-black hover:bg-yellow-300 transition disabled:opacity-60"
              >
                {run.applyState === 'pending' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : run.applyState === 'ok' ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {run.applyState === 'ok' ? 'Aplicada' : 'Aplicar sugerencia'}
              </button>
              {run.applyState === 'ok' && run.applyMessage && (
                <p className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {run.applyMessage}
                </p>
              )}
              {run.applyState === 'error' && run.applyMessage && (
                <p className="text-[11px] text-red-400 flex items-center gap-1.5">
                  <XCircle className="h-3.5 w-3.5" /> {run.applyMessage}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
