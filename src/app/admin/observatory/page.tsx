'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { insforge } from '@/lib/insforge';

// ─── types ────────────────────────────────────────────────────────────────────

type NodeStatus = 'online' | 'slow' | 'offline' | 'unknown';

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
  services: Record<string, { status: NodeStatus; latency: number }>;
  metrics: { avgLatency: number; uptime: number; offlineServices: number };
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
  online:  '#00ff41',
  slow:    '#ffcc00',
  offline: '#ff3333',
  unknown: '#4a5568',
};

function hex2rgba(hex: string, alpha: number): string {
  const v = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${alpha})`;
}

// ─── matrix rain constants ────────────────────────────────────────────────────

const RAIN_CHARS =
  'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ01ABCDEFG';

// ─── compute node screen positions ───────────────────────────────────────────

function computePositions(W: number, H: number): Record<NodeId, { x: number; y: number }> {
  const cx = W * 0.5;
  const cy = H * 0.5;
  const radius = Math.min(W, H) * 0.36;
  const out: Partial<Record<NodeId, { x: number; y: number }>> = {
    insforge: { x: cx, y: cy },
  };
  for (const n of NODES) {
    if (n.isCenter || n.angle == null) continue;
    const rad = (n.angle * Math.PI) / 180;
    out[n.id] = { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }
  return out as Record<NodeId, { x: number; y: number }>;
}

// ─── canvas drawing ───────────────────────────────────────────────────────────

function drawNetworkFrame(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  statuses: Record<NodeId, NodeStatus>,
) {
  const pos = computePositions(W, H);

  // Edges
  EDGES.forEach(([a, b], i) => {
    const as = statuses[a];
    const bs = statuses[b];
    const color =
      as === 'offline' || bs === 'offline' ? '#ff3333' :
      as === 'slow'    || bs === 'slow'    ? '#ffcc00' :
      '#00ff41';

    const from = pos[a];
    const to   = pos[b];
    const dx   = to.x - from.x;
    const dy   = to.y - from.y;

    // Line
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = hex2rgba(color, 0.15);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Two traveling dots per edge
    for (let d = 0; d < 2; d++) {
      const phase = ((t * 0.00022 + i * 0.17 + d * 0.5) % 1 + 1) % 1;
      ctx.beginPath();
      ctx.arc(from.x + dx * phase, from.y + dy * phase, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  });

  // Nodes
  NODES.forEach((n, idx) => {
    const p      = pos[n.id];
    const status = statuses[n.id];
    const color  = STATUS_COLOR[status];
    const base   = n.isCenter ? 22 : 15;
    const pulse  = Math.sin(t / 900 + idx * 0.8) * 0.12 + 0.88;
    const r      = base * pulse;

    // Glow halo
    const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3.5);
    grd.addColorStop(0, hex2rgba(color, status === 'unknown' ? 0.04 : 0.2));
    grd.addColorStop(1, hex2rgba(color, 0));
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 3.5, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Node ring (blinks when offline)
    const visible = status !== 'offline' || Math.floor(t / 400) % 2 === 0;
    if (visible) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = n.isCenter ? 2.5 : 2;
      ctx.stroke();

      // Inner pulsing core
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = pulse;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Label below node
    ctx.fillStyle = '#00cc33';
    ctx.font = `${n.isCenter ? 10 : 8}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(n.label, p.x, p.y + r + 6);
  });
}

// ─── event id counter (module-level, safe) ────────────────────────────────────

let evtId = 0;

// ─── component ────────────────────────────────────────────────────────────────

export default function ObservatoryPage() {
  const router = useRouter();

  // Canvas refs
  const graphRef  = useRef<HTMLCanvasElement>(null);
  const rainRef   = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const rainCols  = useRef<number[]>([]);

  // Status ref (used by canvas without triggering re-render)
  const statusRef = useRef<Record<NodeId, NodeStatus>>({ ...DEFAULT_STATUSES });

  // RPM tracking
  const rpmCount = useRef(0);
  const rpmStart = useRef(Date.now());

  // Feed scroll
  const feedRef = useRef<HTMLDivElement>(null);

  // React state (UI)
  const [statuses,    setStatuses]    = useState<Record<NodeId, NodeStatus>>({ ...DEFAULT_STATUSES });
  const [events,      setEvents]      = useState<LiveEvent[]>([]);
  const [metrics,     setMetrics]     = useState<Metrics>({ rpm: 0, latency: 0, uptime: 100, errors: 0 });
  const [blink,       setBlink]       = useState(true);
  const [fullscreen,  setFullscreen]  = useState(false);

  // ── add event to feed ────────────────────────────────────────────────────────
  const addEvent = useCallback((text: string, status: NodeStatus) => {
    setEvents((prev) => [
      ...prev.slice(-49),
      {
        id:     String(++evtId),
        ts:     new Date().toLocaleTimeString('es-CL', { hour12: false }),
        text,
        status,
      },
    ]);
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
      for (const [id, svc] of Object.entries(data.services)) {
        if (id in next) {
          next[id as NodeId] = svc.status;
          const latStr = svc.latency > 0 ? `${svc.latency}ms` : 'timeout';
          addEvent(`Ping ${id.toUpperCase()} · ${latStr}`, svc.status);
        }
      }

      statusRef.current = next;
      setStatuses({ ...next });
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
      } catch { /* silent — realtime is best-effort */ }
    })();

    return () => {
      disposed = true;
      try {
        insforge.realtime.unsubscribe('products');
        insforge.realtime.unsubscribe('orders');
        insforge.realtime.unsubscribe('deliveries');
        insforge.realtime.disconnect();
      } catch { /* ignore cleanup errors */ }
    };
  }, [addEvent]);

  // ── health check schedule ────────────────────────────────────────────────────
  useEffect(() => {
    void runHealthCheck();
    const id = setInterval(() => void runHealthCheck(), 30_000);
    return () => clearInterval(id);
  }, [runHealthCheck]);

  // ── canvas animation loop ────────────────────────────────────────────────────
  useEffect(() => {
    const graph = graphRef.current;
    const rain  = rainRef.current;
    if (!graph || !rain) return;

    const gCtx = graph.getContext('2d');
    const rCtx = rain.getContext('2d');
    if (!gCtx || !rCtx) return;

    const CS = 14; // rain character size (px)

    function resize() {
      if (!graph || !rain) return;
      graph.width  = graph.offsetWidth;
      graph.height = graph.offsetHeight;
      rain.width   = rain.offsetWidth;
      rain.height  = rain.offsetHeight;
      rainCols.current = Array.from(
        { length: Math.floor(rain.width / CS) },
        () => Math.floor(Math.random() * (rain.height / CS)),
      );
      rCtx!.fillStyle = '#000';
      rCtx!.fillRect(0, 0, rain.width, rain.height);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(graph);
    resize();

    let lastRain = 0;

    function frame(t: number) {
      if (!graph || !rain) return;

      // Rain canvas — throttled to ~30 fps
      if (t - lastRain > 33) {
        lastRain = t;
        rCtx!.fillStyle = 'rgba(0,0,0,0.06)';
        rCtx!.fillRect(0, 0, rain.width, rain.height);
        rCtx!.fillStyle = '#00ff41';
        rCtx!.font = `${CS}px monospace`;
        const cols = rainCols.current;
        for (let i = 0; i < cols.length; i++) {
          rCtx!.fillText(
            RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)],
            i * CS,
            cols[i] * CS,
          );
          if (cols[i] * CS > rain.height && Math.random() > 0.975) cols[i] = 0;
          else cols[i]++;
        }
      }

      // Graph canvas — 60 fps
      gCtx!.clearRect(0, 0, graph.width, graph.height);
      drawNetworkFrame(gCtx!, graph.width, graph.height, t, statusRef.current);

      animRef.current = requestAnimationFrame(frame);
    }

    animRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, []);

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
        className="relative z-10 flex shrink-0 items-center gap-3 px-4 py-2.5"
        style={{ borderBottom: '1px solid rgba(0,255,65,0.12)', background: 'rgba(0,0,0,0.96)' }}
      >
        {/* Close */}
        <button
          onClick={() => router.push('/admin')}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/5"
          style={{ border: '1px solid rgba(0,255,65,0.3)', color: '#00ff41' }}
          title="Volver al admin"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Title */}
        <span
          className="text-sm font-bold uppercase tracking-[0.3em] transition-opacity duration-300"
          style={{ color: '#00ff41', opacity: blink ? 1 : 0.4 }}
        >
          ◈ FABRICK LIVE NETWORK
        </span>

        <div className="flex-1" />

        {/* Metric cards */}
        <div className="flex items-center gap-2">
          {metricCards.map(({ label, val, warn }) => (
            <div
              key={label}
              className="hidden sm:block rounded px-3 py-1 text-center"
              style={{ border: '1px solid rgba(0,255,65,0.18)', background: 'rgba(0,255,65,0.04)' }}
            >
              <p className="text-[8px] uppercase tracking-[0.2em]" style={{ color: '#00cc33' }}>
                {label}
              </p>
              <p
                className="text-sm font-bold leading-tight"
                style={{ color: warn ? '#ff3333' : '#00ff41' }}
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
          style={{ border: '1px solid rgba(0,255,65,0.3)', color: '#00ff41' }}
          title="Pantalla completa (F)"
        >
          {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* ── main body ───────────────────────────────────────────────────────── */}
      <div className="relative flex flex-1 overflow-hidden">

        {/* Graph canvas area */}
        <div className="relative flex-1 overflow-hidden">
          {/* Matrix rain background */}
          <canvas
            ref={rainRef}
            className="absolute inset-0 h-full w-full"
            style={{ opacity: 0.18 }}
          />
          {/* Network graph foreground */}
          <canvas
            ref={graphRef}
            className="absolute inset-0 h-full w-full"
          />
        </div>

        {/* Live events panel */}
        <div
          className="relative z-10 flex w-72 shrink-0 flex-col overflow-hidden"
          style={{
            borderLeft: '1px solid rgba(0,255,65,0.12)',
            background: 'rgba(0,4,0,0.94)',
          }}
        >
          {/* Panel header */}
          <div
            className="shrink-0 px-4 py-2.5"
            style={{ borderBottom: '1px solid rgba(0,255,65,0.12)' }}
          >
            <p
              className="text-[9px] font-bold uppercase tracking-[0.3em]"
              style={{ color: '#00cc33' }}
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
              <p className="text-xs" style={{ color: 'rgba(0,255,65,0.3)' }}>
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
                  <span className="shrink-0" style={{ color: 'rgba(0,255,65,0.45)' }}>
                    {ev.ts}
                  </span>
                  <span style={{ color: '#00cc33', wordBreak: 'break-word' }}>{ev.text}</span>
                </div>
              ))
            )}
          </div>

          {/* Services status legend */}
          <div
            className="shrink-0 px-4 py-3 space-y-1.5"
            style={{ borderTop: '1px solid rgba(0,255,65,0.12)' }}
          >
            <p
              className="mb-2 text-[8px] uppercase tracking-[0.3em]"
              style={{ color: 'rgba(0,255,65,0.4)' }}
            >
              SERVICIOS
            </p>
            {NODES.filter((n) => !n.isCenter).map((n) => (
              <div key={n.id} className="flex items-center justify-between" style={{ fontSize: 10 }}>
                <span style={{ color: '#00cc33' }}>{n.label}</span>
                <span
                  className="font-bold"
                  style={{ color: STATUS_COLOR[statuses[n.id]] }}
                >
                  {statuses[n.id] === 'unknown' ? '···' : statuses[n.id].toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
