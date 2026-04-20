'use client';

/**
 * Sync Status Button
 * ------------------------------------------------------------------
 * Pill-shaped button that reflects the live sync status between the
 * admin dashboard and InsForge, with three visual states:
 *
 *   1. SINCRONIZADO  — InsForge reachable (green pulsing ring, slow ⟳)
 *   2. SINCRONIZANDO — A health check is in flight (yellow, fast ⟳)
 *   3. SIN CONEXIÓN  — InsForge unreachable (red, padlock)
 *
 * Behaviour:
 *   - On mount the state is "syncing" while the first check runs.
 *   - We poll /api/admin/health every 30 s.
 *   - Clicking the button forces a new verification and plays a
 *     small animation.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Lock, RefreshCw } from 'lucide-react';

export type SyncState = 'synced' | 'syncing' | 'offline';

interface HealthApiLike {
  services?: Record<string, { status?: string }>;
}

const STATE_CONFIG: Record<SyncState, {
  label: string;
  color: string;
  dot: string;
  spin: string; // tailwind animation class
  dotAnim: string;
}> = {
  synced:  {
    label: 'SINCRONIZADO',
    color: '#00ff88',
    dot: '#00ff88',
    spin: 'sync-spin-slow',
    dotAnim: 'sync-dot-pulse',
  },
  syncing: {
    label: 'SINCRONIZANDO...',
    color: '#f5c800',
    dot: '#f5c800',
    spin: 'sync-spin-fast',
    dotAnim: 'sync-dot-blink',
  },
  offline: {
    label: 'SIN CONEXIÓN',
    color: '#ff3344',
    dot: '#ff3344',
    spin: '',
    dotAnim: '',
  },
};

/** Derive a sync state from the /api/admin/health payload. */
function deriveState(data: HealthApiLike): SyncState {
  const insforge = data?.services?.insforge?.status;
  if (!insforge) return 'offline';
  if (insforge === 'online' || insforge === 'slow') return 'synced';
  return 'offline';
}

interface Props {
  /** Optional label override for the "synced" state (e.g. when a richer message is wanted). */
  syncedLabel?: string;
}

export default function SyncStatusButton({ syncedLabel }: Props) {
  const [state, setState] = useState<SyncState>('syncing');
  // Track the in-flight controller so a manual click can cancel a stale poll.
  const inflight = useRef<AbortController | null>(null);
  const disposedRef = useRef(false);

  const check = useCallback(async () => {
    // Cancel any in-flight request so we never race with an older response.
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;

    setState('syncing');
    try {
      const res = await fetch('/api/admin/health', {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!res.ok) {
        if (!disposedRef.current) setState('offline');
        return;
      }
      const data: HealthApiLike = await res.json();
      if (!disposedRef.current) setState(deriveState(data));
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      if (!disposedRef.current) setState('offline');
    } finally {
      if (inflight.current === controller) inflight.current = null;
    }
  }, []);

  // Initial check + 30s polling.
  useEffect(() => {
    disposedRef.current = false;
    void check();
    const id = setInterval(() => void check(), 30_000);
    return () => {
      disposedRef.current = true;
      clearInterval(id);
      inflight.current?.abort();
    };
  }, [check]);

  const cfg = STATE_CONFIG[state];
  const label = state === 'synced' && syncedLabel ? syncedLabel : cfg.label;

  return (
    <button
      type="button"
      onClick={() => void check()}
      className="group inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.25em] transition-colors"
      style={{
        border: `1px solid ${cfg.color}`,
        color: cfg.color,
        background: `linear-gradient(90deg, ${cfg.color}14, transparent)`,
      }}
      title="Forzar verificación ahora"
      aria-label={`Estado de sincronización: ${label}. Pulsa para verificar de nuevo.`}
    >
      {/* Status dot */}
      <span
        className={`relative inline-block h-2 w-2 rounded-full ${cfg.dotAnim}`}
        style={{
          background: cfg.dot,
          boxShadow: state === 'offline' ? 'none' : `0 0 6px ${cfg.dot}`,
        }}
      />

      {/* Icon: spinner for synced/syncing, padlock for offline */}
      {state === 'offline' ? (
        <Lock className="h-3.5 w-3.5" style={{ color: cfg.color }} />
      ) : (
        <RefreshCw className={`h-3.5 w-3.5 ${cfg.spin}`} style={{ color: cfg.color }} />
      )}

      <span className="truncate">{label}</span>

      <style jsx>{`
        :global(.sync-spin-slow) {
          animation: sync-spin 2.4s linear infinite;
        }
        :global(.sync-spin-fast) {
          animation: sync-spin 0.75s linear infinite;
        }
        :global(.sync-dot-pulse) {
          animation: sync-pulse 1.6s ease-in-out infinite;
        }
        :global(.sync-dot-blink) {
          animation: sync-blink 0.5s ease-in-out infinite;
        }
        @keyframes sync-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes sync-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.4); opacity: 0.6; }
        }
        @keyframes sync-blink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }
      `}</style>
    </button>
  );
}
