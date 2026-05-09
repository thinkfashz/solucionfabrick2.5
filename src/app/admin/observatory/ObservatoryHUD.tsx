'use client';

import { useState, useEffect, useMemo } from 'react';
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
  insforge: '#facc15',
  github: '#a855f7',
  mercadopago: '#22c55e',
  cloudflare: '#06b6d4',
};

const SERVICE_ORDER: ServiceId[] = [
  'insforge',
  'vercel',
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

// Mini sparkline for latency history
function Sparkline({ samples, color }: { samples: Array<{ ms: number }>; color: string }) {
  if (samples.length < 2) return <div style={{ width: 64, height: 18 }} />;
  const max = Math.max(...samples.map((s) => s.ms), 1);
  const min = Math.min(...samples.map((s) => s.ms), 0);
  const range = Math.max(1, max - min);
  const w = 64; const h = 18;
  const step = w / (samples.length - 1);
  const pts = samples
    .map((s, i) => `${(i * step).toFixed(1)},${(h - ((s.ms - min) / range) * h).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
    </svg>
  );
}

// Iconos por kind
const KIND_ICON: Record<string, string> = {
  order: '📦',
  lead: '👤',
  error: '⚠',
  sync: '↻',
  info: '·',
};

export default function ObservatoryHUD({
  data,
  vehicleCount = 0,
  logs = [],
  paused,
  onPausedChange,
  speed,
  onSpeedChange,
  selectedService,
  onSelectService,
  logFilter,
  onLogFilterChange,
}: {
  data: ObservatoryData;
  vehicleCount?: number;
  logs?: Array<{ msg: string; color: string; service?: ServiceId }>;
  paused: boolean;
  onPausedChange: (v: boolean) => void;
  speed: number;
  onSpeedChange: (v: number) => void;
  selectedService: ServiceId | null;
  onSelectService: (id: ServiceId | null) => void;
  logFilter: ServiceId | 'all';
  onLogFilterChange: (v: ServiceId | 'all') => void;
}) {
  const now = useNow();
  const [hudVisible, setHudVisible] = useState(true);
  const [bottomTab, setBottomTab] = useState<'logs' | 'events' | 'orders'>('events');

  const kpis: Array<{ label: string; value: number; color: string; prefix?: string }> = [
    { label: 'Productos activos', value: data.productosActivos, color: '#22c55e' },
    { label: 'Pedidos hoy', value: data.pedidosHoy, color: '#4f8ef7' },
    { label: 'Leads nuevos', value: data.leadsHoy, color: '#ec4899' },
    { label: 'Revenue semana', value: data.revenueWeek, color: '#f59e0b', prefix: '$' },
    { label: 'Errores 1h', value: data.errorsHour, color: '#ef4444' },
  ];

  const filteredEvents = useMemo(() => {
    if (logFilter === 'all') return data.events;
    return data.events.filter((e) => e.service === logFilter);
  }, [data.events, logFilter]);

  const filteredLogs = useMemo(() => {
    if (logFilter === 'all') return logs;
    return logs.filter((l) => l.service === logFilter);
  }, [logs, logFilter]);

  const selectedDetails = selectedService ? data.servicioStatus[selectedService] : null;

  const insforgeSync = data.lastUpdated
    ? Math.max(0, Math.round((Date.now() - data.lastUpdated.getTime()) / 1000))
    : null;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
    >
      {/* HEADER */}
      <div className="hidden md:flex absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto items-center gap-2">
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
          {hudVisible ? '◀ HUD ▶' : '▶ HUD ◀'}
        </button>

        {/* Controles play/pause/speed */}
        <div
          style={{
            ...panelStyle,
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => onPausedChange(!paused)}
            title={paused ? 'Reanudar' : 'Pausar'}
            style={{
              background: paused ? '#ef4444' : `${ACCENT}2c`,
              border: `1px solid ${paused ? '#ef4444' : ACCENT + '66'}`,
              color: paused ? '#fff' : ACCENT,
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              minWidth: 60,
            }}
          >
            {paused ? '▶ PLAY' : '❚❚ PAUSE'}
          </button>
          <span style={{ color: '#94a3b8', fontSize: 9, letterSpacing: '0.2em' }}>SPEED</span>
          {[0.5, 1, 2, 4].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSpeedChange(s)}
              style={{
                background: speed === s ? `${ACCENT}2c` : 'transparent',
                border: speed === s ? `1px solid ${ACCENT}66` : '1px solid #27303f',
                color: speed === s ? ACCENT : '#94a3b8',
                borderRadius: 6,
                padding: '3px 8px',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* PANEL IZQUIERDO */}
      <div
        className="hidden md:flex absolute top-20 left-4 w-64 flex-col gap-3 pointer-events-auto"
        style={{
          transform: hudVisible ? 'translateX(0)' : 'translateX(-110%)',
          transition: 'transform 0.35s ease',
          zIndex: 10,
        }}
      >
        {/* InsForge clock */}
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
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
            <span
              style={{
                color: '#facc15',
                fontSize: 8,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                fontWeight: 800,
                background: '#facc1522',
                padding: '2px 6px',
                borderRadius: 4,
                border: '1px solid #facc1555',
              }}
            >
              InsForge
            </span>
            <span style={{ color: '#94a3b8', fontSize: 8, letterSpacing: '0.2em' }}>NTP · UTC</span>
          </div>
          <div style={{ color: ACCENT, fontSize: 22, marginTop: 4, fontWeight: 800, letterSpacing: '0.05em' }}>
            {now
              ? now.toLocaleTimeString('es-CL', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : '—'}
          </div>
          <div style={{ color: '#9ca3af', fontSize: 10, marginTop: 2 }}>
            {now
              ? now.toLocaleDateString('es-CL', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '—'}
          </div>
          {insforgeSync !== null && (
            <div
              style={{
                color: data.syncing ? '#facc15' : '#22c55e',
                fontSize: 9,
                marginTop: 6,
                letterSpacing: '0.15em',
              }}
            >
              {data.syncing ? '⟳ SYNCING…' : `✓ SYNC · hace ${insforgeSync}s`}
            </div>
          )}
          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: `1px solid ${ACCENT}22`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <p style={{ color: '#6b7280', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
              Data Vehicles
            </p>
            <p style={{ color: ACCENT, fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>
              {vehicleCount}
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div style={panelStyle}>
          <p style={panelTitleStyle}>Métricas en vivo</p>
          <div className="flex flex-col gap-3">
            {kpis.map((k) => (
              <div key={k.label} className="min-w-0">
                <p
                  className="truncate"
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
                  className="truncate"
                  style={{ color: k.color, fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}
                >
                  {k.prefix ?? ''}
                  <AnimatedNumber value={k.value} />
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Detalle de planeta seleccionado */}
        {selectedDetails && selectedService && (
          <div style={{ ...panelStyle, borderColor: `${SERVICE_COLORS[selectedService]}66` }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <p style={{ ...panelTitleStyle, color: SERVICE_COLORS[selectedService], margin: 0 }}>
                ▸ {SERVICE_LABELS[selectedService]}
              </p>
              <button
                type="button"
                onClick={() => onSelectService(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}
              >
                ✕
              </button>
            </div>
            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
              <span style={{ color: '#94a3b8', fontSize: 10 }}>Estado</span>
              <span style={{ color: selectedDetails.online ? '#22c55e' : '#ef4444', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em' }}>
                {selectedDetails.online ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
              <span style={{ color: '#94a3b8', fontSize: 10 }}>Latencia</span>
              <span style={{ color: SERVICE_COLORS[selectedService], fontSize: 14, fontWeight: 800 }}>
                {selectedDetails.latencyMs}ms
              </span>
            </div>
            <div style={{ marginTop: 4 }}>
              <Sparkline samples={selectedDetails.history} color={SERVICE_COLORS[selectedService]} />
            </div>
            <button
              type="button"
              onClick={() => onLogFilterChange(selectedService)}
              style={{
                marginTop: 8,
                width: '100%',
                background: `${SERVICE_COLORS[selectedService]}22`,
                border: `1px solid ${SERVICE_COLORS[selectedService]}55`,
                color: SERVICE_COLORS[selectedService],
                borderRadius: 6,
                padding: '5px 8px',
                fontSize: 9,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Filtrar logs por {SERVICE_LABELS[selectedService]}
            </button>
          </div>
        )}
      </div>

      {/* PANEL DERECHO */}
      <div
        className="hidden md:flex absolute top-20 right-4 w-72 flex-col gap-3 pointer-events-auto"
        style={{
          transform: hudVisible ? 'translateX(0)' : 'translateX(110%)',
          transition: 'transform 0.35s ease',
          zIndex: 20,
          maxHeight: 'calc(100vh - 140px)',
          overflowY: 'auto',
        }}
      >
        {/* Servicios */}
        <div style={panelStyle}>
          <p style={panelTitleStyle}>Servicios</p>
          <div className="flex flex-col gap-2">
            {SERVICE_ORDER.map((id) => {
              const s = data.servicioStatus[id];
              const color = SERVICE_COLORS[id];
              const isSelected = selectedService === id;
              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => onSelectService(isSelected ? null : id)}
                  className="flex items-center justify-between gap-2"
                  style={{
                    width: '100%',
                    background: isSelected ? `${color}1c` : 'transparent',
                    border: isSelected ? `1px solid ${color}66` : '1px solid transparent',
                    borderRadius: 6,
                    padding: '4px 6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
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
                    <span className="truncate" style={{ color: '#e5e7eb', fontSize: 11, fontWeight: 600 }}>
                      {SERVICE_LABELS[id]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkline samples={s.history} color={color} />
                    <span style={{ color: '#94a3b8', fontSize: 10, minWidth: 36, textAlign: 'right' }}>
                      {s.latencyMs}ms
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabs eventos / logs / orders */}
        <div style={panelStyle}>
          <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
            <div className="flex" style={{ gap: 4 }}>
              {(['events', 'logs', 'orders'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBottomTab(t)}
                  style={{
                    background: bottomTab === t ? `${ACCENT}2c` : 'transparent',
                    color: bottomTab === t ? ACCENT : '#94a3b8',
                    border: bottomTab === t ? `1px solid ${ACCENT}66` : '1px solid transparent',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: 9,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {t === 'events' ? 'Eventos' : t === 'logs' ? 'Tráfico' : 'Órdenes'}
                </button>
              ))}
            </div>
          </div>

          {/* Filtros por servicio */}
          {bottomTab !== 'orders' && (
            <div className="flex flex-wrap gap-1" style={{ marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => onLogFilterChange('all')}
                style={{
                  background: logFilter === 'all' ? `${ACCENT}2c` : 'transparent',
                  border: logFilter === 'all' ? `1px solid ${ACCENT}66` : '1px solid #27303f',
                  color: logFilter === 'all' ? ACCENT : '#94a3b8',
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontSize: 8,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Todos
              </button>
              {SERVICE_ORDER.map((id) => {
                const sel = logFilter === id;
                const c = SERVICE_COLORS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onLogFilterChange(id)}
                    style={{
                      background: sel ? `${c}2c` : 'transparent',
                      border: sel ? `1px solid ${c}66` : '1px solid #27303f',
                      color: sel ? c : '#94a3b8',
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: 8,
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {SERVICE_LABELS[id].slice(0, 3)}
                  </button>
                );
              })}
            </div>
          )}

          {bottomTab === 'events' && (
            filteredEvents.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: 11 }}>Sin eventos.</p>
            ) : (
              <div className="flex flex-col gap-1" style={{ maxHeight: 240, overflowY: 'auto' }}>
                {filteredEvents.slice(0, 30).map((e) => (
                  <div
                    key={e.id}
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 6,
                      borderLeft: `2px solid ${e.color}`,
                      paddingLeft: 6,
                      fontSize: 10,
                      color: e.color,
                      lineHeight: 1.35,
                    }}
                  >
                    <span aria-hidden style={{ width: 12, textAlign: 'center' }}>{KIND_ICON[e.kind] ?? '·'}</span>
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {e.message}
                    </span>
                    <span style={{ color: '#6b7280', fontSize: 9, flexShrink: 0 }}>{timeAgo(e.ts)}</span>
                  </div>
                ))}
              </div>
            )
          )}

          {bottomTab === 'logs' && (
            filteredLogs.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: 11 }}>Esperando tráfico…</p>
            ) : (
              <div className="flex flex-col gap-1" style={{ maxHeight: 240, overflowY: 'auto' }}>
                {filteredLogs.slice(0, 40).map((l, i) => (
                  <p
                    key={i}
                    style={{
                      color: l.color,
                      fontSize: 10,
                      lineHeight: 1.4,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    &gt; {l.msg}
                  </p>
                ))}
              </div>
            )
          )}

          {bottomTab === 'orders' && (
            data.latestOrders.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: 11 }}>{data.loading ? 'Sincronizando…' : 'Sin órdenes recientes.'}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {data.latestOrders.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between gap-2"
                    style={{ borderBottom: `1px solid ${ACCENT}14`, paddingBottom: 6 }}
                  >
                    <div className="min-w-0">
                      <p style={{ color: '#e5e7eb', fontSize: 11, fontWeight: 600 }} className="truncate">
                        #{o.id.slice(0, 8)}
                      </p>
                      <p style={{ color: '#6b7280', fontSize: 9 }}>
                        {timeAgo(o.created_at)} · {o.status}
                      </p>
                    </div>
                    <p style={{ color: '#22c55e', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                      ${formatCLP(o.total ?? 0)}
                    </p>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Indicador de carga */}
      {data.loading && (
        <div
          className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-none"
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
          ⟳ Sincronizando con InsForge…
        </div>
      )}
    </div>
  );
}
