'use client';

/**
 * ImportConnectionStatus
 * --------------------------------------------------------------------------
 * BlackBerry-style live status panel surfaced on top of the product import
 * tool (`/admin/productos/importar`). It shows four signal-bar indicators —
 * one per critical dependency the importer relies on:
 *
 *   1. Base de datos       (InsForge / Postgres)
 *   2. APIs de Google      (Google Ads / Gemini / Maps tokens)
 *   3. Pasarela de pagos   (Mercado Pago / Mercado Libre catalog)
 *   4. Buscador            (driven by the local importer state — idle,
 *                            buscando, ok, error)
 *
 * The signal-bars use the classic 5-segment BlackBerry pattern (each bar
 * taller than the previous one). A segmented "BlackBerry loading bar" is
 * rendered while the importer is resolving / persisting a URL so the admin
 * gets immediate feedback instead of a blank screen.
 *
 * The panel polls `/api/admin/health` every 20s. On manual click the user
 * can force a refresh. When the page is hidden the polling is paused to
 * save bandwidth.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Database, Globe, Wallet, RefreshCw, Search as SearchIcon } from 'lucide-react';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type SearchPhase = 'idle' | 'searching' | 'success' | 'error';

interface Props {
  /** Local search/import phase used to drive the "Buscador" indicator and the loading bar. */
  searchPhase: SearchPhase;
  /** Optional human-readable note rendered next to the search indicator (e.g. error message). */
  searchNote?: string | null;
}

// ---------------------------------------------------------------------------
// Types matching /api/admin/health
// ---------------------------------------------------------------------------

type ServiceStatus = 'online' | 'slow' | 'offline' | 'unconfigured';

interface ServiceResult {
  status: ServiceStatus;
  latency: number;
  note?: string;
}

interface HealthPayload {
  services?: Record<string, ServiceResult>;
  metrics?: { avgLatency?: number; uptime?: number };
}

// ---------------------------------------------------------------------------
// Helpers — derive a 0..4 signal-strength from a ServiceResult
// ---------------------------------------------------------------------------

function bars(result: ServiceResult | undefined | null): number {
  if (!result) return 0;
  if (result.status === 'unconfigured') return 0;
  if (result.status === 'offline') return 0;
  if (result.status === 'slow') return result.latency > 1500 ? 2 : 3;
  // online: scale with latency
  if (result.latency > 600) return 3;
  if (result.latency > 250) return 4;
  return 5;
}

function statusColor(status: ServiceStatus): string {
  switch (status) {
    case 'online':
      return '#22c55e'; // emerald-500
    case 'slow':
      return '#facc15'; // yellow-400
    case 'offline':
      return '#ef4444'; // red-500
    case 'unconfigured':
    default:
      return '#52525b'; // zinc-600
  }
}

function statusLabel(status: ServiceStatus, latency: number): string {
  if (status === 'online') return latency > 0 ? `Conectado · ${latency} ms` : 'Conectado';
  if (status === 'slow') return latency > 0 ? `Lento · ${latency} ms` : 'Lento';
  if (status === 'offline') return 'Sin conexión';
  return 'Sin credenciales';
}

// ---------------------------------------------------------------------------
// BlackBerrySignalBars — the iconic 5-bar reception widget
// ---------------------------------------------------------------------------

function BlackBerrySignalBars({
  level,
  color,
  size = 'md',
}: {
  level: number;
  color: string;
  size?: 'sm' | 'md';
}) {
  // 5 segments, each progressively taller. We light up `level` of them.
  const heights = size === 'sm' ? [4, 6, 8, 10, 12] : [5, 8, 11, 14, 17];
  const widthCls = size === 'sm' ? 'w-1' : 'w-1.5';
  return (
    <span
      className="inline-flex items-end gap-[2px]"
      role="img"
      aria-label={`Señal: ${level} de 5`}
    >
      {heights.map((h, i) => {
        const lit = i < level;
        return (
          <span
            key={i}
            className={`${widthCls} rounded-[1px] transition-all duration-300`}
            style={{
              height: `${h}px`,
              backgroundColor: lit ? color : 'rgba(63,63,70,0.55)',
              boxShadow: lit ? `0 0 6px ${color}66` : 'none',
            }}
          />
        );
      })}
    </span>
  );
}

// ---------------------------------------------------------------------------
// BlackBerryLoadingBar — segmented LED-row that animates while busy
// ---------------------------------------------------------------------------

function BlackBerryLoadingBar({
  active,
  color = '#facc15',
  segments = 18,
}: {
  active: boolean;
  color?: string;
  segments?: number;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => (t + 1) % segments), 90);
    return () => clearInterval(id);
  }, [active, segments]);

  // When inactive we render a flat line of dim segments to keep layout stable.
  return (
    <div
      className="flex h-2 items-stretch gap-[2px] rounded-sm bg-black/40 p-[2px] ring-1 ring-zinc-800"
      role="progressbar"
      aria-busy={active}
      aria-label={active ? 'Buscando…' : 'En reposo'}
    >
      {Array.from({ length: segments }).map((_, i) => {
        // Light up a moving "head" of 4 segments while active.
        const head = (tick + i) % segments;
        const lit = active && head < 4;
        const intensity = active ? 1 - head / 4 : 0;
        return (
          <span
            key={i}
            className="flex-1 rounded-[1px] transition-opacity duration-150"
            style={{
              backgroundColor: lit ? color : 'rgba(82,82,91,0.35)',
              opacity: lit ? Math.max(0.35, intensity) : 0.6,
              boxShadow: lit ? `0 0 4px ${color}aa` : 'none',
            }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Indicator row
// ---------------------------------------------------------------------------

interface IndicatorRowProps {
  icon: React.ReactNode;
  label: string;
  status: ServiceStatus;
  latency: number;
  note?: string | null;
}

function IndicatorRow({ icon, label, status, latency, note }: IndicatorRowProps) {
  const color = statusColor(status);
  const level = bars({ status, latency });
  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-800/80 bg-black/30 px-3 py-2">
      <span
        className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md ring-1"
        style={{ color, borderColor: `${color}55`, backgroundColor: `${color}14` }}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-300">
          {label}
        </p>
        <p className="truncate text-[10px] text-zinc-500">
          {note ?? statusLabel(status, latency)}
        </p>
      </div>
      <BlackBerrySignalBars level={level} color={color} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export default function ImportConnectionStatus({ searchPhase, searchNote }: Props) {
  const [services, setServices] = useState<Record<string, ServiceResult>>({});
  const [polling, setPolling] = useState(false);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const [pollError, setPollError] = useState(false);
  const inflight = useRef<AbortController | null>(null);
  const disposed = useRef(false);

  const refresh = useCallback(async () => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    setPolling(true);
    setPollError(false);
    try {
      const res = await fetch('/api/admin/health', {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as HealthPayload;
      if (disposed.current) return;
      setServices(json.services ?? {});
      setLastPoll(new Date());
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      if (!disposed.current) {
        setPollError(true);
      }
    } finally {
      if (inflight.current === controller) inflight.current = null;
      if (!disposed.current) setPolling(false);
    }
  }, []);

  useEffect(() => {
    disposed.current = false;
    void refresh();
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void refresh();
    }, 20_000);
    return () => {
      disposed.current = true;
      clearInterval(id);
      inflight.current?.abort();
    };
  }, [refresh]);

  // ---- Derive each indicator -------------------------------------------------

  const dbResult: ServiceResult = pollError
    ? { status: 'offline', latency: -1, note: 'Health endpoint inalcanzable' }
    : (services.insforge ?? { status: 'unconfigured', latency: 0 });

  const googleResult: ServiceResult = services.google ?? {
    status: 'unconfigured',
    latency: 0,
  };

  // For the "payments / catalog" row we prefer mercadolibre if reported,
  // otherwise fall back to mercadopago. Both feed the import flow.
  const paymentsResult: ServiceResult =
    services.mercadolibre ?? services.mercadopago ?? { status: 'unconfigured', latency: 0 };

  const search: { status: ServiceStatus; latency: number; note: string } = useMemo(() => {
    switch (searchPhase) {
      case 'searching':
        return { status: 'slow', latency: 0, note: searchNote || 'Resolviendo URL…' };
      case 'success':
        return { status: 'online', latency: 0, note: searchNote || 'Producto resuelto' };
      case 'error':
        return { status: 'offline', latency: -1, note: searchNote || 'Error al resolver' };
      case 'idle':
      default:
        return { status: 'unconfigured', latency: 0, note: 'En espera de un link' };
    }
  }, [searchPhase, searchNote]);

  const lastPollLabel = lastPoll
    ? lastPoll.toLocaleTimeString('es-CL', { hour12: false })
    : '—';

  return (
    <section
      aria-label="Estado de conexión del importador"
      className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-4 shadow-inner shadow-black/40"
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                pollError ? 'animate-ping bg-red-500' : 'animate-ping bg-yellow-400'
              }`}
            />
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                pollError ? 'bg-red-500' : 'bg-yellow-400'
              }`}
            />
          </span>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-300">
            Estado del importador
          </p>
          <span className="text-[10px] text-zinc-600">· última lectura {lastPollLabel}</span>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={polling}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-black/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 transition hover:border-yellow-400/40 hover:text-yellow-300 disabled:opacity-60"
          aria-label="Actualizar estado de conexión"
        >
          <RefreshCw className={`h-3 w-3 ${polling ? 'animate-spin' : ''}`} />
          {polling ? 'Verificando' : 'Refrescar'}
        </button>
      </header>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <IndicatorRow
          icon={<Database className="h-3.5 w-3.5" />}
          label="Base de datos"
          status={dbResult.status}
          latency={dbResult.latency}
          note={dbResult.note ?? null}
        />
        <IndicatorRow
          icon={<Globe className="h-3.5 w-3.5" />}
          label="APIs de Google"
          status={googleResult.status}
          latency={googleResult.latency}
          note={googleResult.note ?? null}
        />
        <IndicatorRow
          icon={<Wallet className="h-3.5 w-3.5" />}
          label="Mercado Pago / ML"
          status={paymentsResult.status}
          latency={paymentsResult.latency}
          note={paymentsResult.note ?? null}
        />
        <IndicatorRow
          icon={<SearchIcon className="h-3.5 w-3.5" />}
          label="Buscador de productos"
          status={search.status}
          latency={search.latency}
          note={search.note}
        />
      </div>

      <div className="mt-3">
        <BlackBerryLoadingBar active={searchPhase === 'searching'} />
        <p className="mt-1 flex items-center justify-between text-[10px] text-zinc-500">
          <span>
            {searchPhase === 'searching'
              ? 'Buscando producto en la red…'
              : searchPhase === 'success'
                ? '✓ Resolución completada'
                : searchPhase === 'error'
                  ? '⚠ Revisa la URL o las credenciales'
                  : 'Pega un link de Mercado Libre, Falabella, Amazon, AliExpress o cualquier tienda con metadatos.'}
          </span>
          {services && Object.keys(services).length > 0 && (
            <span className="hidden sm:inline">
              {Object.values(services).filter((s) => s.status === 'online').length}/
              {Object.values(services).length} servicios en línea
            </span>
          )}
        </p>
      </div>
    </section>
  );
}
