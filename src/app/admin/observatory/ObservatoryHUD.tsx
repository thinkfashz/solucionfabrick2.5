'use client';

import { useState, useEffect } from 'react';
import type { ObservatoryData, ServiceId } from './useObservatoryData';

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

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `hace ${Math.max(0, Math.round(diff))}s`;
  if (diff < 3600) return `hace ${Math.round(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.round(diff / 3600)}h`;
  return `hace ${Math.round(diff / 86400)}d`;
}

function formatCLP(n: number) {
  return n.toLocaleString('es-CL');
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
    const step = Math.max(1, Math.ceil(Math.abs(diff) / 30));
    const sign = diff >= 0 ? 1 : -1;
    const timer = setInterval(() => {
      current += step * sign;
      if ((sign === 1 && current >= value) || (sign === -1 && current <= value)) {
        current = value;
        clearInterval(timer);
      }
      setDisplay(current);
    }, 30);
    return () => clearInterval(timer);
    // We intentionally only re-run when `value` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{formatCLP(display)}</>;
}

const ACCENT = '#facc15';

const panelStyle: React.CSSProperties = {
  background: 'rgba(6,10,18,0.88)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(250,204,21,0.22)',
  borderRadius: 12,
  padding: '16px',
};

const panelTitleStyle: React.CSSProperties = {
  color: ACCENT,
  fontSize: 9,
  letterSpacing: '0.3em',
  textTransform: 'uppercase',
  marginBottom: 10,
  fontWeight: 700,
};

type TabId = 'produccion' | 'seguridad' | 'datos' | 'overview';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'produccion', label: 'Producción' },
  { id: 'seguridad', label: 'Seguridad' },
  { id: 'datos', label: 'Datos' },
  { id: 'overview', label: 'Overview' },
];

export default function ObservatoryHUD({
  data,
  vehicleCount = 0,
  logs = [],
}: {
  data: ObservatoryData;
  vehicleCount?: number;
  logs?: Array<{ msg: string; color: string }>;
}) {
  const now = useNow();
  const [tab, setTab] = useState<TabId>('produccion');
  const [hudVisible, setHudVisible] = useState(true);

  const kpis: Array<{
    label: string;
    value: number;
    color: string;
    prefix?: string;
  }> = [
    { label: 'Productos activos', value: data.productosActivos, color: '#22c55e' },
    { label: 'Pedidos hoy', value: data.pedidosHoy, color: '#4f8ef7' },
    { label: 'Leads nuevos', value: data.leadsHoy, color: '#ec4899' },
    {
      label: 'Revenue semana',
      value: data.revenueWeek,
      color: '#f59e0b',
      prefix: '$',
    },
  ];

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
    >
      {/* ── HEADER / TOGGLE ───────────────────────────────────────────── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
        <button
          type="button"
          onClick={() => setHudVisible((v) => !v)}
          style={{
            background: 'rgba(6,10,18,0.88)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${ACCENT}55`,
            borderRadius: 8,
            padding: '6px 14px',
            color: ACCENT,
            fontSize: 10,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {hudVisible ? '◀ Toggle HUD ▶' : '▶ Toggle HUD ◀'}
        </button>
      </div>

      {/* ── PANEL IZQUIERDO ───────────────────────────────────────────── */}
      <div
        className="absolute top-20 left-4 w-64 flex flex-col gap-3 pointer-events-auto"
        style={{
          transform: hudVisible ? 'translateX(0)' : 'translateX(-110%)',
          transition: 'transform 0.35s ease',
        }}
      >
        <div style={panelStyle}>
          <div
            style={{
              color: '#22c55e',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
            }}
            className="animate-pulse"
          >
            ● OBSERVATORY · LIVE
          </div>
          <div style={{ color: ACCENT, fontSize: 11, marginTop: 6 }}>
            {now
              ? now.toLocaleDateString('es-CL', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                })
              : '—'}{' '}
            <span style={{ color: ACCENT }}>
              {now
                ? now.toLocaleTimeString('es-CL', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : '—'}
            </span>
          </div>
          {data.lastUpdated && (
            <div style={{ color: '#6b7280', fontSize: 9, marginTop: 4 }}>
              Último sync: {timeAgo(data.lastUpdated.toISOString())}
            </div>
          )}
          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: `1px solid ${ACCENT}22`,
            }}
          >
            <p
              style={{
                color: '#6b7280',
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
              }}
            >
              Data Vehicles Active
            </p>
            <p
              style={{
                color: ACCENT,
                fontSize: 22,
                fontWeight: 900,
                lineHeight: 1.1,
              }}
            >
              {vehicleCount}
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div style={panelStyle}>
          <p style={panelTitleStyle}>Métricas en vivo</p>
          <div className="flex flex-col gap-3">
            {kpis.map((k) => (
              <div key={k.label}>
                <p
                  style={{
                    color: '#6b7280',
                    fontSize: 9,
                    textTransform: 'uppercase',
                    letterSpacing: '0.2em',
                  }}
                >
                  {k.label}
                </p>
                <p
                  style={{
                    color: k.color,
                    fontSize: 22,
                    fontWeight: 900,
                    lineHeight: 1.1,
                  }}
                >
                  {k.prefix ?? ''}
                  <AnimatedNumber value={k.value} />
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PANEL DERECHO ─────────────────────────────────────────────── */}
      <div
        className="absolute top-20 right-4 w-72 flex flex-col gap-3 pointer-events-auto"
        style={{
          transform: hudVisible ? 'translateX(0)' : 'translateX(110%)',
          transition: 'transform 0.35s ease',
        }}
      >
        {/* Servicios */}
        <div style={panelStyle}>
          <p style={panelTitleStyle}>Servicios</p>
          <div className="flex flex-col gap-2">
            {SERVICE_ORDER.map((id) => {
              const s = data.servicioStatus[id];
              const color = SERVICE_COLORS[id];
              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: s.online ? color : '#ef4444',
                        boxShadow: s.online ? `0 0 6px ${color}` : 'none',
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        color: '#e5e7eb',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {SERVICE_LABELS[id]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        color: s.online ? '#22c55e' : '#ef4444',
                        fontSize: 9,
                        letterSpacing: '0.2em',
                      }}
                    >
                      {s.online ? 'ONLINE' : 'OFFLINE'}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: 10 }}>
                      {s.latencyMs}ms
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Terminal: recent logs */}
        <div style={panelStyle}>
          <p style={panelTitleStyle}>Terminal · Data Flow</p>
          {logs.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: 11 }}>
              Esperando eventos…
            </p>
          ) : (
            <div
              className="flex flex-col gap-1"
              style={{ maxHeight: 260, overflowY: 'auto' }}
            >
              {logs.slice(0, 30).map((l, i) => (
                <p
                  key={i}
                  style={{
                    color: l.color,
                    fontSize: 10,
                    lineHeight: 1.4,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  &gt; {l.msg}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Últimas órdenes */}
        <div style={panelStyle}>
          <p style={panelTitleStyle}>Últimas órdenes</p>
          {data.latestOrders.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: 11 }}>
              {data.loading ? 'Sincronizando…' : 'Sin órdenes recientes.'}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.latestOrders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between gap-2"
                  style={{
                    borderBottom: `1px solid ${ACCENT}14`,
                    paddingBottom: 6,
                  }}
                >
                  <div className="min-w-0">
                    <p
                      style={{
                        color: '#e5e7eb',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                      className="truncate"
                    >
                      #{o.id.slice(0, 8)}
                    </p>
                    <p style={{ color: '#6b7280', fontSize: 9 }}>
                      {timeAgo(o.created_at)} · {o.status}
                    </p>
                  </div>
                  <p
                    style={{
                      color: '#22c55e',
                      fontSize: 12,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ${formatCLP(o.total ?? 0)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── BARRA INFERIOR (tabs) ─────────────────────────────────────── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div
          style={{
            ...panelStyle,
            padding: '6px',
            display: 'flex',
            gap: 4,
          }}
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                style={{
                  background: active ? `${ACCENT}2c` : 'transparent',
                  color: active ? ACCENT : '#94a3b8',
                  border: active
                    ? `1px solid ${ACCENT}66`
                    : '1px solid transparent',
                  borderRadius: 8,
                  padding: '6px 14px',
                  fontSize: 10,
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Indicador de carga ────────────────────────────────────────── */}
      {data.loading && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            ...panelStyle,
            padding: '6px 14px',
            color: '#facc15',
            fontSize: 10,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          ⟳ Sincronizando telemetría…
        </div>
      )}
    </div>
  );
}
