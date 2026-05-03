'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, BarChart3, Wand2, Plus, Loader2 } from 'lucide-react';

const ACTIONS: Array<{ id: 'analyze' | 'suggest' | 'create' | 'optimize'; label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'analyze', label: 'Analizar', description: 'Audita CTR, CPM, CPC y ROAS de la campaña seleccionada.', icon: BarChart3 },
  { id: 'suggest', label: 'Sugerir creatives', description: 'Propone copy A/B, llamados a la acción y hashtags.', icon: Wand2 },
  { id: 'create', label: 'Generar campaña', description: 'Objetivo, audiencia, presupuesto y copy listos para publicar.', icon: Plus },
  { id: 'optimize', label: 'Optimizar', description: 'Recomendaciones de pujas, públicos y horarios.', icon: Sparkles },
];

export default function AdsCoachClient() {
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function run(action: string) {
    setRunning(action);
    setResult(null);
    try {
      const res = await fetch('/api/admin/ads/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult(`Endpoint pendiente: ${(json && json.error) || res.statusText}. Crear /api/admin/ads/agent en la PR siguiente.`);
        return;
      }
      setResult(JSON.stringify(json, null, 2));
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setRunning(null);
    }
  }

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
              onClick={() => run(a.id)}
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

      {result && (
        <pre className="rounded-2xl border border-white/10 bg-black/60 p-4 text-[11px] leading-relaxed text-zinc-300 whitespace-pre-wrap">
          {result}
        </pre>
      )}
    </div>
  );
}
