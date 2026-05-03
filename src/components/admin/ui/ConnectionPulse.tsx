'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import LiveDot, { type LiveDotStatus } from './LiveDot';

/**
 * Live connection indicator for an integration provider. Pings the supplied
 * `pingUrl` (typically `/api/admin/integrations/test?provider=…`) at the given
 * interval and renders a horizontal "breathing" bar whose colour reflects the
 * latest status: green/connected, amber/reconnecting, red/error, grey/unconfigured.
 *
 * Pings stop while the tab is hidden (visibilitychange) to avoid wasted calls.
 */

export type ConnectionStatus = 'connected' | 'reconnecting' | 'error' | 'unconfigured';

const STATUS_TO_DOT: Record<ConnectionStatus, LiveDotStatus> = {
  connected: 'ok',
  reconnecting: 'warn',
  error: 'error',
  unconfigured: 'idle',
};

const STATUS_COLOR: Record<ConnectionStatus, string> = {
  connected: '#22c55e',
  reconnecting: '#f59e0b',
  error: '#ef4444',
  unconfigured: '#52525b',
};

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connected: 'Conectado',
  reconnecting: 'Reconectando',
  error: 'Error',
  unconfigured: 'Sin configurar',
};

export interface ConnectionPulseProps {
  /** Display name of the provider (e.g. "Cloudinary", "MercadoPago"). */
  name: string;
  /** URL pinged on each interval. Should return JSON `{ ok: boolean, latencyMs?: number, message?: string }`. */
  pingUrl: string;
  /** Initial/static status when the integration has not been configured at all. */
  initialStatus?: ConnectionStatus;
  /** Interval in ms (default 30000). Pings are paused while the tab is hidden. */
  intervalMs?: number;
  /** Skip pinging entirely (useful when status is `unconfigured`). */
  disabled?: boolean;
}

interface PingResponse {
  ok?: boolean;
  latencyMs?: number;
  message?: string;
  error?: string;
}

export function ConnectionPulse({
  name,
  pingUrl,
  initialStatus = 'reconnecting',
  intervalMs = 30_000,
  disabled = false,
}: ConnectionPulseProps) {
  const [status, setStatus] = useState<ConnectionStatus>(initialStatus);
  const [latency, setLatency] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastPingAt, setLastPingAt] = useState<number | null>(null);
  const inflight = useRef(false);

  useEffect(() => {
    if (disabled) {
      setStatus('unconfigured');
      return;
    }

    let cancelled = false;

    async function ping() {
      if (inflight.current || document.visibilityState === 'hidden') return;
      inflight.current = true;
      const t0 = Date.now();
      // Abort the ping after 10 s so a hung integration endpoint doesn't
      // pile up requests when the interval re-fires.
      const ac = new AbortController();
      const timeoutId = setTimeout(() => ac.abort(), 10_000);
      try {
        const res = await fetch(pingUrl, { cache: 'no-store', signal: ac.signal });
        const json = (await res.json().catch(() => ({}))) as PingResponse;
        const dt = Date.now() - t0;
        if (cancelled) return;
        if (res.ok && json.ok !== false) {
          setStatus('connected');
          setLatency(typeof json.latencyMs === 'number' ? json.latencyMs : dt);
          setMessage(json.message ?? null);
        } else {
          setStatus('error');
          setLatency(dt);
          setMessage(json.error ?? json.message ?? `HTTP ${res.status}`);
        }
      } catch (e) {
        if (cancelled) return;
        setStatus('error');
        setLatency(null);
        setMessage(
          e instanceof Error
            ? e.name === 'AbortError'
              ? 'Timeout (10s)'
              : e.message
            : 'Error de red',
        );
      } finally {
        clearTimeout(timeoutId);
        inflight.current = false;
        if (!cancelled) setLastPingAt(Date.now());
      }
    }

    void ping();
    const id = setInterval(() => void ping(), intervalMs);
    const onVis = () => {
      if (document.visibilityState === 'visible') void ping();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [disabled, pingUrl, intervalMs]);

  const color = STATUS_COLOR[status];
  const dot = STATUS_TO_DOT[status];

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <LiveDot status={dot} size={9} />
          <span className="truncate text-sm font-semibold text-white">{name}</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color }}>
          {STATUS_LABEL[status]}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full"
          animate={{
            width:
              status === 'connected'
                ? ['20%', '100%', '20%']
                : status === 'reconnecting'
                ? ['10%', '70%', '10%']
                : status === 'error'
                ? ['0%', '40%', '0%']
                : ['0%', '0%'],
            opacity: status === 'unconfigured' ? 0.2 : [0.4, 1, 0.4],
          }}
          transition={{
            duration: status === 'error' ? 0.7 : 2.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ background: color, boxShadow: `0 0 6px ${color}aa` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
        <span className="truncate" title={message ?? undefined}>
          {message ?? '—'}
        </span>
        <span className="font-mono">
          {latency !== null ? `${latency} ms` : '—'}
          {lastPingAt && (
            <span className="ml-2 text-zinc-600">
              {new Date(lastPingAt).toLocaleTimeString('es-CL', { hour12: false })}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

export default ConnectionPulse;
