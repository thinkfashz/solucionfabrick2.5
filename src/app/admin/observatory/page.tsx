'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { insforge } from '@/lib/insforge';
import IsometricMap, { type IsoNodeId, type IsoNodeStatus } from '@/components/Observatory/IsometricMap';

// ─── types ────────────────────────────────────────────────────────────────────

type NodeStatus = 'online' | 'slow' | 'offline' | 'unknown' | 'unconfigured';

type NodeId =
  | 'insforge'
  | 'vercel'
  | 'github'
  | 'cloudflare'
  | 'meta'
  | 'mercadopago'
  | 'tiktok'
  | 'google'
  | 'usuarios';

interface LiveEvent {
  id: string;
  ts: string;
  text: string;
  status: NodeStatus;
}

interface Metrics {
  rpm: number;
  latency: number;
  uptime: number;
  errors: number;
}

interface HealthApiResponse {
  services: Record<string, { status: NodeStatus; latency: number; note?: string }>;
  metrics: { avgLatency: number; uptime: number; offlineServices: number; unconfiguredServices?: number };
}

// ─── graph config ─────────────────────────────────────────────────────────────

interface NodeDef {
  id: NodeId;
  label: string;
  isCenter?: boolean;
  angle?: number;
}

const NODES: NodeDef[] = [
  { id: 'insforge',    label: 'INSFORGE',        isCenter: true },
  { id: 'vercel',      label: 'VERCEL',           angle: -90  },
  { id: 'github',      label: 'GITHUB',           angle: -45  },
  { id: 'cloudflare',  label: 'CLOUDFLARE',       angle: 0    },
  { id: 'meta',        label: 'META ADS',         angle: 45   },
  { id: 'mercadopago', label: 'MERCADOPAGO',      angle: 90   },
  { id: 'tiktok',      label: 'TIKTOK ADS',       angle: 135  },
  { id: 'google',      label: 'GOOGLE ADS',       angle: 180  },
  { id: 'usuarios',    label: 'USUARIOS ACTIVOS', angle: -135 },
];

const EDGES: [NodeId, NodeId][] = [
  ['insforge', 'vercel'],
  ['insforge', 'mercadopago'],
  ['insforge', 'usuarios'],
  ['vercel', 'cloudflare'],
  ['vercel', 'github'],
  ['vercel', 'meta'],
  ['vercel', 'tiktok'],
  ['vercel', 'google'],
  ['cloudflare', 'usuarios'],
];

const DEFAULT_STATUSES = Object.fromEntries(
  NODES.map((n) => [n.id, 'unknown' as NodeStatus]),
) as Record<NodeId, NodeStatus>;

// ─── color helpers ────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<NodeStatus, string> = {
  online:       '#00ff88',
  slow:         '#f5c800',
  offline:      '#ff3344',
  unknown:      '#4a5568',
  unconfigured: '#525252',
};

const STATUS_LABEL: Record<NodeStatus, string> = {
  online:       'ONLINE',
  slow:         'LENTO',
  offline:      'OFFLINE',
  unknown:      '···',
  unconfigured: 'NO CONFIG.',
};

function hex2rgba(hex: string, alpha: number): string {
  const v = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${alpha})`;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function ObservatoryPage() {
  const router = useRouter();
  // Instance-local event id counter (avoids shared state across hot-reloads / instances)
  const evtId = useRef(0);

  // (Legacy canvas refs removed: IsometricMap now renders itself.)

  // Status ref (used by canvas without triggering re-render)
  const statusRef = useRef<Record<NodeId, NodeStatus>>({ ...DEFAULT_STATUSES });

  // RPM tracking
  const rpmCount = useRef(0);
  const rpmStart = useRef(Date.now());

  // Feed scroll
  const feedRef = useRef<HTMLDivElement>(null);

  // React state (UI)
  const [statuses,    setStatuses]    = useState<Record<NodeId, NodeStatus>>({ ...DEFAULT_STATUSES });
  const [latencies,   setLatencies]   = useState<Record<NodeId, number>>({} as Record<NodeId, number>);
  const [notes,       setNotes]       = useState<Record<NodeId, string>>({} as Record<NodeId, string>);
  const [events,      setEvents]      = useState<LiveEvent[]>([]);
  const [metrics,     setMetrics]     = useState<Metrics>({ rpm: 0, latency: 0, uptime: 100, errors: 0 });
  const [blink,       setBlink]       = useState(true);
  const [fullscreen,  setFullscreen]  = useState(false);
  // 60-second activity timeline (BlackBerry-style bar). Each element is a
  // bucket of 1 second and tracks whichever event is the most severe for that
  // second so a single `error` dominates a bucket full of `ok` pings.
  type ActivityLevel = 'idle' | 'ok' | 'slow' | 'error';
  const [activity, setActivity] = useState<ActivityLevel[]>(() =>
    Array.from({ length: 60 }, () => 'idle' as ActivityLevel),
  );

  // ── add event to feed ────────────────────────────────────────────────────────
  const addEvent = useCallback((text: string, status: NodeStatus) => {
    setEvents((prev) => [
      ...prev.slice(-49),
      {
        id:     String(++evtId.current),
        ts:     new Date().toLocaleTimeString('es-CL', { hour12: false }),
        text,
        status,
      },
    ]);
    // Feed the 60s activity timeline. The newest bucket (index 59 = "now")
    // accumulates the most severe level seen in the last second so a single
    // error dominates even when surrounded by healthy pings.
    const level: ActivityLevel =
      status === 'online'  ? 'ok'
      : status === 'slow'  ? 'slow'
      : status === 'offline' ? 'error'
      : 'idle';
    setActivity((prev) => {
      const next = prev.slice();
      const current = next[next.length - 1];
      const severity = { idle: 0, ok: 1, slow: 2, error: 3 } as const;
      if (severity[level] >= severity[current]) {
        next[next.length - 1] = level;
      }
      return next;
    });
  }, []);

  // Shift the activity buffer one bucket to the left every second (scrolling
  // right-to-left like the BlackBerry signal history).
  useEffect(() => {
    const id = setInterval(() => {
      setActivity((prev) => [...prev.slice(1), 'idle']);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ── health check (runs immediately + every 30 s) ─────────────────────────────
  const runHealthCheck = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/health', { cache: 'no-store' });
      if (!res.ok) {
        addEvent('Health check HTTP error', 'offline');
        return;
      }
      const data: HealthApiResponse = await res.json();

      const next: Record<NodeId, NodeStatus> = { ...statusRef.current };
      const nextLat: Record<NodeId, number> = {} as Record<NodeId, number>;
      const nextNote: Record<NodeId, string> = {} as Record<NodeId, string>;
      for (const [id, svc] of Object.entries(data.services)) {
        if (id in next) {
          next[id as NodeId] = svc.status;
          nextLat[id as NodeId] = svc.latency;
          if (svc.note) nextNote[id as NodeId] = svc.note;
          const latStr =
            svc.status === 'unconfigured'
              ? (svc.note ?? 'sin credenciales')
              : svc.latency > 0
                ? `${svc.latency}ms`
                : 'timeout';
          addEvent(`Ping ${id.toUpperCase()} · ${latStr}`, svc.status);
        }
      }

      statusRef.current = next;
      setStatuses({ ...next });
      setLatencies((prev) => ({ ...prev, ...nextLat }));
      setNotes((prev) => ({ ...prev, ...nextNote }));
      setMetrics((prev) => ({
        rpm:     prev.rpm,
        latency: data.metrics.avgLatency,
        uptime:  data.metrics.uptime,
        errors:  data.metrics.offlineServices,
      }));
    } catch {
      addEvent('Health check failed', 'offline');
    }
  }, [addEvent]);

  // ── InsForge Realtime subscription ──────────────────────────────────────────
  useEffect(() => {
    let disposed = false;

    (async () => {
      try {
        await insforge.realtime.connect();
        if (disposed) return;

        await Promise.all([
          insforge.realtime.subscribe('products'),
          insforge.realtime.subscribe('orders'),
          insforge.realtime.subscribe('deliveries'),
          // Streams every ping the health endpoint writes so multiple admin
          // tabs share the same live feed without each one polling /api/admin/health.
          insforge.realtime.subscribe('observatory_logs').catch(() => {}),
        ]);

        const mkHandler = (table: string, action: string) => () => {
          if (disposed) return;
          rpmCount.current++;
          const mins = Math.max(1 / 60, (Date.now() - rpmStart.current) / 60_000);
          setMetrics((prev) => ({ ...prev, rpm: Math.round(rpmCount.current / mins) }));
          addEvent(`${action} · ${table}`, 'online');
        };

        insforge.realtime.on('INSERT_product',   mkHandler('products',   'INSERT'));
        insforge.realtime.on('UPDATE_product',   mkHandler('products',   'UPDATE'));
        insforge.realtime.on('DELETE_product',   mkHandler('products',   'DELETE'));
        insforge.realtime.on('INSERT_order',     mkHandler('orders',     'INSERT'));
        insforge.realtime.on('UPDATE_order',     mkHandler('orders',     'UPDATE'));
        insforge.realtime.on('INSERT_delivery',  mkHandler('deliveries', 'INSERT'));
        insforge.realtime.on('UPDATE_delivery',  mkHandler('deliveries', 'UPDATE'));

        // Stream health pings written by /api/admin/health (observatory_logs).
        // Use type assertion — the SDK types don't know about this custom table.
        const rt = insforge.realtime as unknown as { on: (evt: string, cb: (p: unknown) => void) => void };
        rt.on('INSERT_observatory_log', (payload: unknown) => {
          if (disposed) return;
          const row = (payload && typeof payload === 'object' && 'record' in payload
            ? (payload as { record?: { servicio?: string; mensaje?: string; status?: string } }).record
            : undefined) ?? (payload as { servicio?: string; mensaje?: string; status?: string });
          const svc = row?.servicio ?? '?';
          const msg = row?.mensaje ?? 'ping';
          const status: NodeStatus =
            row?.status === 'ok'  ? 'online'
            : row?.status === 'slow' ? 'slow'
            : row?.status === 'error' ? 'offline'
            : 'unknown';
          addEvent(`${svc.toUpperCase()} · ${msg}`, status);
        });
      } catch (err) {
        console.error('[Observatory] realtime connect error:', err);
      }
    })();

    return () => {
      disposed = true;
      try {
        insforge.realtime.unsubscribe('products');
        insforge.realtime.unsubscribe('orders');
        insforge.realtime.unsubscribe('deliveries');
        try { insforge.realtime.unsubscribe('observatory_logs'); } catch { /* ignore */ }
        insforge.realtime.disconnect();
      } catch (err) {
        console.error('[Observatory] realtime cleanup error:', err);
      }
    };
  }, [addEvent]);

  // ── health check schedule ────────────────────────────────────────────────────
  useEffect(() => {
    void runHealthCheck();
    const id = setInterval(() => void runHealthCheck(), 30_000);
    return () => clearInterval(id);
  }, [runHealthCheck]);

  // (Legacy canvas animation loop removed: IsometricMap owns its own rAF loop.)

  // ── title blink ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setBlink((b) => !b), 800);
    return () => clearInterval(id);
  }, []);

  // ── fullscreen API ───────────────────────────────────────────────────────────
  const toggleFS = useCallback(() => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.key === 'f' || e.key === 'F') &&
        !e.ctrlKey && !e.metaKey && !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        toggleFS();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleFS]);

  // ── auto-scroll feed ─────────────────────────────────────────────────────────
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events]);

  // ── render ────────────────────────────────────────────────────────────────────
  const metricCards = [
    { label: 'REQ/MIN',  val: metrics.rpm,              warn: false },
    { label: 'LATENCIA', val: `${metrics.latency}ms`,    warn: metrics.latency > 500 },
    { label: 'UPTIME',   val: `${metrics.uptime}%`,      warn: metrics.uptime < 99 },
    { label: 'ERRORES',  val: metrics.errors,            warn: metrics.errors > 0 },
  ] as const;

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col overflow-hidden"
      style={{ background: '#000000', fontFamily: "'Courier New', Courier, monospace" }}
    >
      {/* ── top bar ─────────────────────────────────────────────────────────── */}
      <div
        className="relative z-10 flex shrink-0 items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5"
        style={{ borderBottom: '1px solid rgba(250,204,21,0.12)', background: 'rgba(0,0,0,0.96)' }}
      >
        {/* Close */}
        <button
          onClick={() => router.push('/admin')}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/5"
          style={{ border: '1px solid rgba(250,204,21,0.3)', color: '#facc15' }}
          title="Volver al admin"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Logo + Title */}
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-yellow-400 p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-soluciones-fabrick-monocromo-claro.svg"
              alt="Fabrick"
              className="h-auto w-full"
            />
          </span>
          <div className="min-w-0 leading-tight">
            <p
              className="truncate text-[11px] font-bold uppercase tracking-[0.25em] transition-opacity duration-300 sm:text-sm sm:tracking-[0.3em]"
              style={{ color: '#facc15', opacity: blink ? 1 : 0.4 }}
            >
              FABRICK NET
            </p>
            <p
              className="hidden text-[8px] uppercase tracking-[0.3em] sm:block"
              style={{ color: 'rgba(250,204,21,0.55)' }}
            >
              Network Observatory
            </p>
          </div>
        </div>

        <div className="flex-1" />

        {/* Metric cards */}
        <div className="flex items-center gap-2">
          {metricCards.map(({ label, val, warn }) => (
            <div
              key={label}
              className="hidden sm:block rounded px-3 py-1 text-center"
              style={{ border: '1px solid rgba(250,204,21,0.18)', background: 'rgba(250,204,21,0.04)' }}
            >
              <p className="text-[8px] uppercase tracking-[0.2em]" style={{ color: '#eab308' }}>
                {label}
              </p>
              <p
                className="text-sm font-bold leading-tight"
                style={{ color: warn ? '#ff3333' : '#facc15' }}
              >
                {val}
              </p>
            </div>
          ))}
        </div>

        {/* Fullscreen toggle */}
        <button
          onClick={toggleFS}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/5"
          style={{ border: '1px solid rgba(250,204,21,0.3)', color: '#facc15' }}
          title="Pantalla completa (F)"
        >
          {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* ── main body ───────────────────────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col overflow-hidden md:flex-row">

        {/* ── Isometric network map (desktop + mobile) ── */}
        <div className="flex flex-1 flex-col overflow-y-auto p-3 md:p-4">
          <IsometricMap
            statuses={
              Object.fromEntries(
                Object.entries(statuses).filter(([id]) => id !== 'usuarios'),
              ) as Partial<Record<IsoNodeId, IsoNodeStatus>>
            }
          />

          {/* Per-service status legend (mobile only; desktop has the sidebar) */}
          <div className="mt-4 grid grid-cols-2 gap-1.5 md:hidden">
            {NODES.filter((n) => !n.isCenter && n.id !== 'usuarios').map((n) => {
              const status = statuses[n.id];
              const note = notes[n.id];
              const lat = latencies[n.id] ?? 0;
              const color = STATUS_COLOR[status];
              const subtitle =
                status === 'unconfigured'
                  ? (note ?? 'No config.')
                  : status === 'offline'
                    ? (note ?? 'Sin conexión')
                    : lat > 0
                      ? `${lat} ms`
                      : status === 'unknown' ? '···' : 'OK';
              return (
                <div
                  key={n.id}
                  className="flex items-center justify-between rounded-md px-2 py-1.5"
                  style={{
                    border: `1px solid ${hex2rgba(color, 0.25)}`,
                    background: `linear-gradient(90deg, ${hex2rgba(color, 0.05)}, rgba(0,0,0,0.4))`,
                  }}
                >
                  <span
                    className="truncate text-[9px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: '#facc15' }}
                  >
                    {n.label}
                  </span>
                  <span
                    className="ml-2 shrink-0 text-[8px] font-bold uppercase tracking-[0.15em]"
                    style={{ color }}
                    title={subtitle}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Live events — compact on mobile */}
          <div className="mt-4 rounded-xl border border-yellow-400/15 bg-black/60 p-3 md:hidden">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.3em]" style={{ color: '#eab308' }}>
              ◈ Live events
            </p>
            <div
              className="max-h-52 overflow-y-auto space-y-1"
              style={{ scrollbarWidth: 'none' }}
            >
              {events.length === 0 ? (
                <p className="text-[11px]" style={{ color: 'rgba(250,204,21,0.3)' }}>
                  Conectando al sistema…
                </p>
              ) : (
                events.slice(-20).map((ev) => (
                  <div key={ev.id} className="flex items-start gap-2" style={{ fontSize: 10, lineHeight: '1.7' }}>
                    <span className="mt-px shrink-0" style={{ color: STATUS_COLOR[ev.status] }}>●</span>
                    <span className="shrink-0" style={{ color: 'rgba(250,204,21,0.45)' }}>{ev.ts}</span>
                    <span style={{ color: '#eab308', wordBreak: 'break-word' }}>{ev.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Live events panel (desktop) */}
        <div
          className="relative z-10 hidden w-72 shrink-0 flex-col overflow-hidden md:flex"
          style={{
            borderLeft: '1px solid rgba(250,204,21,0.12)',
            background: 'rgba(0,0,0,0.94)',
          }}
        >
          {/* Panel header */}
          <div
            className="shrink-0 px-4 py-2.5"
            style={{ borderBottom: '1px solid rgba(250,204,21,0.12)' }}
          >
            <p
              className="text-[9px] font-bold uppercase tracking-[0.3em]"
              style={{ color: '#eab308' }}
            >
              ◈ LIVE EVENTS
            </p>
          </div>

          {/* Event feed */}
          <div
            ref={feedRef}
            className="flex-1 overflow-y-auto p-3 space-y-1"
            style={{ scrollbarWidth: 'none' }}
          >
            {events.length === 0 ? (
              <p className="text-xs" style={{ color: 'rgba(250,204,21,0.3)' }}>
                Conectando al sistema…
              </p>
            ) : (
              events.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-start gap-2"
                  style={{ fontSize: 10, lineHeight: '1.7' }}
                >
                  <span
                    className="mt-px shrink-0"
                    style={{ color: STATUS_COLOR[ev.status] }}
                  >
                    ●
                  </span>
                  <span className="shrink-0" style={{ color: 'rgba(250,204,21,0.45)' }}>
                    {ev.ts}
                  </span>
                  <span style={{ color: '#eab308', wordBreak: 'break-word' }}>{ev.text}</span>
                </div>
              ))
            )}
          </div>

          {/* Services status legend */}
          <div
            className="shrink-0 px-4 py-3 space-y-1.5"
            style={{ borderTop: '1px solid rgba(250,204,21,0.12)' }}
          >
            <p
              className="mb-2 text-[8px] uppercase tracking-[0.3em]"
              style={{ color: 'rgba(250,204,21,0.4)' }}
            >
              SERVICIOS
            </p>
            {NODES.filter((n) => !n.isCenter).map((n) => (
              <div key={n.id} className="flex items-center justify-between" style={{ fontSize: 10 }}>
                <span style={{ color: '#eab308' }}>{n.label}</span>
                <span
                  className="font-bold"
                  style={{ color: STATUS_COLOR[statuses[n.id]] }}
                >
                  {STATUS_LABEL[statuses[n.id]]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BlackBerry-style activity bar (móvil) ───────────────────────────── */}
      {/*
        60-segment timeline of the last minute of activity. Each segment is a
        single second; segment height encodes severity (error > slow > ok).
        Auto-scrolls right-to-left: the rightmost bar is "now".
      */}
      <div
        className="flex shrink-0 items-center gap-2 border-t px-3 py-2 md:hidden"
        style={{ borderColor: 'rgba(250,204,21,0.12)', background: 'rgba(0,0,0,0.96)' }}
        aria-label="Actividad de los últimos 60 segundos"
      >
        <span className="shrink-0 text-[8px] font-bold uppercase tracking-[0.3em]" style={{ color: '#eab308' }}>
          60s
        </span>
        <div className="flex flex-1 items-end gap-[2px]" style={{ height: 28 }}>
          {activity.map((lvl, idx) => {
            const color =
              lvl === 'error' ? '#ff3333'
              : lvl === 'slow' ? '#facc15'
              : lvl === 'ok'   ? '#00ff88'
              : 'rgba(250,204,21,0.12)';
            const height =
              lvl === 'error' ? 26
              : lvl === 'slow' ? 18
              : lvl === 'ok'   ? 12
              : 4;
            return (
              <div
                key={idx}
                className="flex-1 rounded-sm transition-all"
                style={{ height, background: color, minWidth: 2, opacity: lvl === 'idle' ? 0.4 : 1 }}
                title={`${60 - idx}s · ${lvl}`}
              />
            );
          })}
        </div>
        <span className="shrink-0 text-[8px] font-bold uppercase tracking-[0.3em]" style={{ color: '#facc15' }}>
          NOW
        </span>
      </div>
    </div>
  );
}
