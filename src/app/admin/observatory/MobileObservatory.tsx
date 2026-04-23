'use client';

import { useEffect, useState } from 'react';
import type { ObservatoryData, ServiceId } from './useObservatoryData';

const ACCENT = '#facc15';

const SERVICE_LABELS: Record<ServiceId, string> = {
  vercel: 'Vercel',
  insforge: 'InsForge',
  github: 'GitHub',
  mercadopago: 'MercadoPago',
  cloudflare: 'Cloudflare',
};

const SERVICE_COLORS: Record<ServiceId, string> = {
  vercel: '#4f8ef7',
  insforge: '#22c55e',
  github: '#a855f7',
  mercadopago: '#f59e0b',
  cloudflare: '#06b6d4',
};

const SERVICE_ORDER: ServiceId[] = [
  'vercel',
  'insforge',
  'github',
  'mercadopago',
  'cloudflare',
];

function formatCLP(n: number) {
  return n.toLocaleString('es-CL');
}

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }
    let current = display;
    const diff = value - current;
    const step = Math.max(1, Math.ceil(Math.abs(diff) / 24));
    const sign = diff >= 0 ? 1 : -1;
    const timer = setInterval(() => {
      current += step * sign;
      if ((sign === 1 && current >= value) || (sign === -1 && current <= value)) {
        current = value;
        clearInterval(timer);
      }
      setDisplay(current);
    }, 35);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{formatCLP(display)}</>;
}

// ── Isometric mini city ──────────────────────────────────────────────
interface Building {
  id: ServiceId | 'core' | 'edge';
  x: number; // grid col 0..3
  y: number; // grid row 0..3
  h: number; // height in px (top face offset)
  color: string;
  label: string;
}

const BUILDINGS: Building[] = [
  { id: 'core', x: 1.5, y: 1.5, h: 46, color: ACCENT, label: 'CORE' },
  { id: 'vercel', x: 0, y: 0, h: 34, color: SERVICE_COLORS.vercel, label: 'VRC' },
  { id: 'insforge', x: 3, y: 0, h: 40, color: SERVICE_COLORS.insforge, label: 'INS' },
  { id: 'github', x: 0, y: 3, h: 30, color: SERVICE_COLORS.github, label: 'GIT' },
  { id: 'mercadopago', x: 3, y: 3, h: 36, color: SERVICE_COLORS.mercadopago, label: 'MP' },
  { id: 'cloudflare', x: 1.5, y: 0, h: 24, color: SERVICE_COLORS.cloudflare, label: 'CF' },
  { id: 'edge', x: 1.5, y: 3, h: 28, color: '#ec4899', label: 'EDG' },
];

const PACKET_ROUTES: Array<{ from: string; to: string; color: string; delay: number }> = [
  { from: 'vercel', to: 'core', color: SERVICE_COLORS.vercel, delay: 0 },
  { from: 'core', to: 'insforge', color: SERVICE_COLORS.insforge, delay: 0.7 },
  { from: 'insforge', to: 'core', color: SERVICE_COLORS.insforge, delay: 1.4 },
  { from: 'core', to: 'github', color: SERVICE_COLORS.github, delay: 2.1 },
  { from: 'mercadopago', to: 'core', color: SERVICE_COLORS.mercadopago, delay: 1.0 },
  { from: 'core', to: 'cloudflare', color: SERVICE_COLORS.cloudflare, delay: 0.3 },
];

function MiniCityMap() {
  // Project (gx, gy) in a 4x4 grid onto 2D using iso transforms.
  // Container uses CSS transform so we can just place boxes in a rotated plane.
  const CELL = 48; // px per grid unit
  const base = (b: Building) => ({
    left: b.x * CELL,
    top: b.y * CELL,
  });

  const byId = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));

  return (
    <div
      style={{
        position: 'relative',
        height: 220,
        width: '100%',
        perspective: 800,
        overflow: 'hidden',
        borderRadius: 12,
        background:
          'radial-gradient(ellipse at center, rgba(250,204,21,0.06) 0%, rgba(6,10,18,0.0) 70%), #05080f',
        border: '1px solid rgba(250,204,21,0.18)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 4 * CELL,
          height: 4 * CELL,
          marginLeft: -2 * CELL,
          marginTop: -2 * CELL,
          transform: 'rotateX(60deg) rotateZ(45deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Ground grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(250,204,21,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(250,204,21,0.18) 1px, transparent 1px)',
            backgroundSize: `${CELL}px ${CELL}px`,
            boxShadow: 'inset 0 0 40px rgba(250,204,21,0.12)',
          }}
        />

        {/* Buildings */}
        {BUILDINGS.map((b) => {
          const pos = base(b);
          return (
            <div
              key={b.id}
              style={{
                position: 'absolute',
                left: pos.left + 6,
                top: pos.top + 6,
                width: CELL - 12,
                height: CELL - 12,
                background: `${b.color}33`,
                border: `1px solid ${b.color}`,
                transform: `translateZ(${b.h / 2}px)`,
                transformStyle: 'preserve-3d',
                ['--c' as string]: b.color,
                animation: 'pulse-building 2s ease-in-out infinite alternate',
                animationDelay: `${(b.h % 7) * 0.15}s`,
              }}
            >
              {/* Top face glow */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(135deg, ${b.color}66, ${b.color}22)`,
                  transform: `translateZ(${b.h}px)`,
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  transform: `translateZ(${b.h + 0.5}px) rotateZ(-45deg) rotateX(-60deg)`,
                }}
              >
                {b.label}
              </span>
            </div>
          );
        })}

        {/* Data packets */}
        {PACKET_ROUTES.map((r, i) => {
          const from = byId[r.from];
          const to = byId[r.to];
          if (!from || !to) return null;
          const startX = from.x * CELL + CELL / 2;
          const startY = from.y * CELL + CELL / 2;
          const endX = to.x * CELL + CELL / 2;
          const endY = to.y * CELL + CELL / 2;
          const styleVars = {
            position: 'absolute',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: r.color,
            boxShadow: `0 0 8px ${r.color}`,
            left: 0,
            top: 0,
            ['--sx']: `${startX}px`,
            ['--sy']: `${startY}px`,
            ['--ex']: `${endX}px`,
            ['--ey']: `${endY}px`,
            transform: `translate3d(${startX}px, ${startY}px, 20px)`,
            animation: 'travel 3s linear infinite',
            animationDelay: `${r.delay}s`,
          } as React.CSSProperties;
          return <div key={i} style={styleVars} />;
        })}
      </div>
    </div>
  );
}

// ── Panels ───────────────────────────────────────────────────────────
const panelStyle: React.CSSProperties = {
  background: 'rgba(6,10,18,0.88)',
  border: '1px solid rgba(250,204,21,0.22)',
  borderRadius: 12,
  padding: 14,
};

const panelTitleStyle: React.CSSProperties = {
  color: ACCENT,
  fontSize: 9,
  letterSpacing: '0.3em',
  textTransform: 'uppercase',
  marginBottom: 10,
  fontWeight: 700,
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `hace ${Math.max(0, Math.round(diff))}s`;
  if (diff < 3600) return `hace ${Math.round(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.round(diff / 3600)}h`;
  return `hace ${Math.round(diff / 86400)}d`;
}

export default function MobileObservatory({
  data,
  logs = [],
}: {
  data: ObservatoryData;
  logs?: Array<{ msg: string; color: string }>;
}) {
  const now = useNow();

  const kpis: Array<{ label: string; value: number; color: string; prefix?: string }> = [
    { label: 'Productos', value: data.productosActivos, color: '#22c55e' },
    { label: 'Pedidos hoy', value: data.pedidosHoy, color: '#4f8ef7' },
    { label: 'Leads', value: data.leadsHoy, color: '#ec4899' },
    { label: 'Revenue', value: data.revenueWeek, color: '#f59e0b', prefix: '$' },
  ];

  return (
    <div
      className="h-full w-full overflow-y-auto"
      style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        color: '#e5e7eb',
      }}
    >
      <div className="flex flex-col gap-3 p-3 pb-10">
        {/* Header */}
        <div style={panelStyle}>
          <div className="flex items-center justify-between">
            <div
              className="animate-pulse"
              style={{
                color: '#22c55e',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
              }}
            >
              ● Observatory Live
            </div>
            <div style={{ color: ACCENT, fontSize: 12, fontWeight: 700 }}>
              {now
                ? now.toLocaleTimeString('es-CL', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : '—'}
            </div>
          </div>
          <div style={{ color: '#9ca3af', fontSize: 10, marginTop: 6 }}>
            Soluciones Fabrick · Sistema en vivo
          </div>
        </div>

        {/* KPI grid 2x2 */}
        <div className="grid grid-cols-2 gap-3">
          {kpis.map((k) => (
            <div
              key={k.label}
              style={{
                ...panelStyle,
                borderColor: `${k.color}55`,
                boxShadow: `0 0 16px ${k.color}14`,
                padding: 12,
              }}
            >
              <div
                style={{
                  color: k.color,
                  fontSize: 22,
                  fontWeight: 800,
                  lineHeight: 1.1,
                  letterSpacing: '-0.01em',
                }}
              >
                {k.prefix ?? ''}
                <AnimatedNumber value={k.value} />
              </div>
              <div
                style={{
                  color: '#9ca3af',
                  fontSize: 9,
                  marginTop: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em',
                }}
              >
                {k.label}
              </div>
            </div>
          ))}
        </div>

        {/* Services list */}
        <div style={panelStyle}>
          <div style={panelTitleStyle}>Servicios</div>
          <div className="flex flex-col gap-2">
            {SERVICE_ORDER.map((id) => {
              const s = data.servicioStatus[id];
              const color = SERVICE_COLORS[id];
              return (
                <div
                  key={id}
                  className="flex items-center justify-between"
                  style={{
                    padding: '8px 10px',
                    background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${color}33`,
                    borderRadius: 8,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: s.online ? color : '#ef4444',
                        boxShadow: `0 0 8px ${s.online ? color : '#ef4444'}`,
                      }}
                    />
                    <span style={{ color: '#e5e7eb', fontSize: 12, fontWeight: 600 }}>
                      {SERVICE_LABELS[id]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      style={{
                        color: s.online ? '#22c55e' : '#ef4444',
                        fontSize: 9,
                        letterSpacing: '0.2em',
                        fontWeight: 700,
                      }}
                    >
                      {s.online ? 'ONLINE' : 'OFFLINE'}
                    </span>
                    <span style={{ color: '#9ca3af', fontSize: 10 }}>{s.latencyMs}ms</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mini city */}
        <div style={panelStyle}>
          <div style={panelTitleStyle}>Ciudad 3D</div>
          <MiniCityMap />
        </div>

        {/* Latest orders */}
        <div style={panelStyle}>
          <div style={panelTitleStyle}>Últimas órdenes</div>
          {data.latestOrders.length === 0 ? (
            <div style={{ color: '#6b7280', fontSize: 11 }}>
              {data.loading ? 'Cargando…' : 'Sin órdenes recientes'}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {data.latestOrders.slice(0, 5).map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between"
                  style={{
                    padding: '8px 10px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(250,204,21,0.12)',
                    borderRadius: 8,
                  }}
                >
                  <div className="flex flex-col min-w-0">
                    <span
                      style={{
                        color: '#e5e7eb',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                      className="truncate"
                    >
                      #{o.id.slice(0, 8)}
                    </span>
                    <span style={{ color: '#9ca3af', fontSize: 9 }}>
                      {timeAgo(o.created_at)} · {o.status}
                    </span>
                  </div>
                  <span style={{ color: ACCENT, fontSize: 12, fontWeight: 700 }}>
                    ${formatCLP(o.total ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Terminal logs */}
        <div
          style={{
            ...panelStyle,
            background: '#000',
            borderColor: 'rgba(34,197,94,0.35)',
          }}
        >
          <div
            style={{
              ...panelTitleStyle,
              color: '#22c55e',
              marginBottom: 8,
            }}
          >
            Terminal · Logs
          </div>
          <div
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              color: '#22c55e',
              fontSize: 10.5,
              lineHeight: 1.55,
              minHeight: 90,
            }}
          >
            {logs.length === 0 ? (
              <div style={{ opacity: 0.5 }}>&gt; Esperando eventos…</div>
            ) : (
              logs.slice(0, 5).map((l, i) => (
                <div key={i} style={{ color: l.color || '#22c55e' }}>
                  &gt; {l.msg}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
