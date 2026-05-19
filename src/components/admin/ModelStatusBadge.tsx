'use client';

import { useEffect, useState } from 'react';
import { Zap, WifiOff } from 'lucide-react';

interface ModelStat {
  model: string;
  success_rate: number;
  avg_latency_ms: number;
  health: 'working' | 'flaky' | 'down' | 'unknown';
}

interface Status {
  connected: boolean;
  modelName: string | null;
  modelId: string | null;
  isFree: boolean;
  health: ModelStat['health'];
  latencyMs: number;
  successRate: number;
  freeCount: number;
}

const FALLBACK = 'meta-llama/llama-3.1-8b-instruct:free';

export function ModelStatusBadge({
  className,
  showDetail = false,
}: {
  className?: string;
  showDetail?: boolean;
}) {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [mRes, sRes] = await Promise.all([
          fetch('/api/admin/ai-chat/models'),
          fetch('/api/admin/ai-chat/stats?hours=6'),
        ]);
        if (cancelled) return;
        if (!mRes.ok) {
          setStatus({ connected: false, modelName: null, modelId: null, isFree: false, health: 'unknown', latencyMs: 0, successRate: 0, freeCount: 0 });
          return;
        }
        const mData = await mRes.json();
        const sData = sRes.ok ? await sRes.json() : { stats: [] };
        if (cancelled) return;

        const free = (mData.free ?? []) as Array<{ id: string; name: string; isFree: boolean }>;
        const recs = (mData.recommended_free ?? []) as string[];
        const bestId = recs.find((id) => free.some((m) => m.id === id)) ?? free[0]?.id ?? FALLBACK;
        const info = free.find((m) => m.id === bestId);
        const stats = (sData.stats ?? []) as ModelStat[];
        const stat = stats.find((s) => s.model === bestId);

        setStatus({
          connected: true,
          modelId: bestId,
          modelName: info?.name ?? bestId.split('/')[1]?.replace(':free', '') ?? bestId,
          isFree: info?.isFree ?? true,
          health: stat?.health ?? 'unknown',
          latencyMs: stat?.avg_latency_ms ?? 0,
          successRate: stat?.success_rate ?? 0,
          freeCount: free.length,
        });
      } catch {
        if (!cancelled) setStatus({ connected: false, modelName: null, modelId: null, isFree: false, health: 'unknown', latencyMs: 0, successRate: 0, freeCount: 0 });
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  if (!status) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] text-zinc-700 ${className ?? ''}`}>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-800" />
        cargando…
      </span>
    );
  }

  if (!status.connected) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] text-red-400/70 ${className ?? ''}`}>
        <WifiOff className="h-3 w-3" />
        Sin conexión OpenRouter
      </span>
    );
  }

  const dotCls =
    status.health === 'working' ? 'bg-emerald-400' :
    status.health === 'flaky' ? 'bg-amber-400' :
    status.health === 'down' ? 'bg-red-400' :
    'bg-zinc-500';

  const short = status.modelName
    ? status.modelName.length > 22 ? status.modelName.slice(0, 22) + '…' : status.modelName
    : '—';

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] ${className ?? ''}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotCls}`} />
      {status.isFree && <Zap className="h-2.5 w-2.5 shrink-0 text-emerald-400" />}
      <span className="text-zinc-400">{short}</span>
      {showDetail && (
        <>
          {status.successRate > 0 && (
            <span className="text-zinc-600">· {Math.round(status.successRate * 100)}%</span>
          )}
          {status.latencyMs > 0 && (
            <span className="text-zinc-600">· {(status.latencyMs / 1000).toFixed(1)}s</span>
          )}
          {status.freeCount > 0 && (
            <span className="text-zinc-700">· {status.freeCount} gratis disponibles</span>
          )}
        </>
      )}
    </span>
  );
}
