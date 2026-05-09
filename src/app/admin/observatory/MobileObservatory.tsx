'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ObservatoryData, ServiceId } from './useObservatoryData';
import styles from './MobileObservatory.module.css';
import cityStyles from './MobileObservatoryCity.module.css';

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

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `hace ${Math.max(0, Math.round(diff))}s`;
  if (diff < 3600) return `hace ${Math.round(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.round(diff / 3600)}h`;
  return `hace ${Math.round(diff / 86400)}d`;
}

// Sparkline mini
function Sparkline({ samples, color, width = 80, height = 22 }: { samples: Array<{ ms: number }>; color: string; width?: number; height?: number }) {
  if (samples.length < 2) return <div style={{ width, height }} />;
  const max = Math.max(...samples.map((s) => s.ms), 1);
  const min = Math.min(...samples.map((s) => s.ms), 0);
  const range = Math.max(1, max - min);
  const step = width / (samples.length - 1);
  const pts = samples
    .map((s, i) => `${(i * step).toFixed(1)},${(height - ((s.ms - min) / range) * height).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

const KIND_ICON: Record<string, string> = {
  order: '📦',
  lead: '👤',
  error: '⚠',
  sync: '↻',
  info: '·',
};

// ── Isometric mini city ──────────────────────────────────────────────
interface Building {
  id: ServiceId | 'core' | 'edge';
  x: number;
  y: number;
  h: number;
  color: string;
  label: string;
}

const BUILDINGS: Building[] = [
  { id: 'core', x: 1.5, y: 1.5, h: 46, color: ACCENT, label: 'INS' },
  { id: 'vercel', x: 0, y: 0, h: 34, color: SERVICE_COLORS.vercel, label: 'VRC' },
  { id: 'insforge', x: 3, y: 0, h: 40, color: SERVICE_COLORS.insforge, label: 'DB' },
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
  const CELL = 48;
  const byId = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));

  return (
    <div className={styles.mainContainer}>
      <div className={styles.gridTransform}>
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

        {BUILDINGS.map((b) => (
          <div
            key={b.id}
            className={cityStyles.building}
            style={{
              left: b.x * CELL + 6,
              top: b.y * CELL + 6,
              width: CELL - 12,
              height: CELL - 12,
              background: `${b.color}33`,
              border: `1px solid ${b.color}`,
              transform: `translateZ(${b.h / 2}px)`,
              animationDelay: `${(b.h % 7) * 0.15}s`,
              ['--c' as string]: b.color,
            } as React.CSSProperties}
          >
            <div
              className={cityStyles.buildingTop}
              style={{
                background: `linear-gradient(135deg, ${b.color}66, ${b.color}22)`,
                transform: `translateZ(${b.h}px)`,
              }}
            />
            <span
              className={cityStyles.buildingLabel}
              style={{ transform: `translateZ(${b.h + 0.5}px) rotateZ(-45deg) rotateX(-60deg)` }}
            >
              {b.label}
            </span>
          </div>
        ))}

        {PACKET_ROUTES.map((r, i) => {
          const from = byId[r.from];
          const to = byId[r.to];
          if (!from || !to) return null;
          const startX = from.x * CELL + CELL / 2;
          const startY = from.y * CELL + CELL / 2;
          const endX = to.x * CELL + CELL / 2;
          const endY = to.y * CELL + CELL / 2;
          return (
            <div
              key={i}
              className={cityStyles.packet}
              style={{
                background: r.color,
                boxShadow: `0 0 8px ${r.color}`,
                left: 0,
                top: 0,
                ['--sx' as string]: `${startX}px`,
                ['--sy' as string]: `${startY}px`,
                ['--ex' as string]: `${endX}px`,
                ['--ey' as string]: `${endY}px`,
                transform: `translate3d(${startX}px, ${startY}px, 20px)`,
                animation: 'travel 3s linear infinite',
                animationDelay: `${r.delay}s`,
              } as React.CSSProperties}
            />
          );
        })}
      </div>
    </div>
  );
}

type Tab = 'resumen' | 'servicios' | 'eventos' | 'ciudad';

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'resumen', label: 'Resumen', icon: '◎' },
  { id: 'servicios', label: 'Servicios', icon: '◇' },
  { id: 'eventos', label: 'Eventos', icon: '⚡' },
  { id: 'ciudad', label: 'Ciudad 3D', icon: '◰' },
];

export default function MobileObservatory({ data }: { data: ObservatoryData }) {
  const now = useNow();
  const [tab, setTab] = useState<Tab>('resumen');
  const [expanded, setExpanded] = useState<ServiceId | null>(null);
  const [eventFilter, setEventFilter] = useState<ServiceId | 'all'>('all');

  const kpis: Array<{ label: string; value: number; color: string; prefix?: string }> = [
    { label: 'Productos', value: data.productosActivos, color: '#22c55e' },
    { label: 'Pedidos hoy', value: data.pedidosHoy, color: '#4f8ef7' },
    { label: 'Leads', value: data.leadsHoy, color: '#ec4899' },
    { label: 'Revenue', value: data.revenueWeek, color: '#f59e0b', prefix: '$' },
    { label: 'Errores 1h', value: data.errorsHour, color: '#ef4444' },
  ];

  const filteredEvents = useMemo(() => {
    if (eventFilter === 'all') return data.events;
    return data.events.filter((e) => e.service === eventFilter);
  }, [data.events, eventFilter]);

  const insforgeSync = data.lastUpdated
    ? Math.max(0, Math.round((Date.now() - data.lastUpdated.getTime()) / 1000))
    : null;

  return (
    <div
      className="h-full w-full overflow-y-auto"
      style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: '#e5e7eb' }}
    >
      <div className="flex flex-col gap-3 p-3 pb-24">
        {/* InsForge clock + status */}
        <div className={styles.panel}>
          <div className="flex items-center justify-between">
            <div className="animate-pulse" style={{ color: '#22c55e', fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase' }}>
              ● Observatory Live
            </div>
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
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
            <span style={{ color: ACCENT, fontSize: 26, fontWeight: 800, letterSpacing: '0.05em', lineHeight: 1 }}>
              {now ? now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
            </span>
            <span style={{ color: '#9ca3af', fontSize: 10 }}>
              {now ? now.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' }) : ''}
            </span>
          </div>
          {insforgeSync !== null && (
            <div style={{ color: data.syncing ? '#facc15' : '#22c55e', fontSize: 9, marginTop: 4, letterSpacing: '0.15em' }}>
              {data.syncing ? '⟳ SYNCING…' : `✓ NTP · sync hace ${insforgeSync}s`}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${TABS.length}, 1fr)`,
            gap: 4,
            background: 'rgba(6,10,18,0.88)',
            border: `1px solid ${ACCENT}22`,
            borderRadius: 10,
            padding: 4,
            position: 'sticky',
            top: 0,
            zIndex: 10,
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
                  border: active ? `1px solid ${ACCENT}66` : '1px solid transparent',
                  borderRadius: 8,
                  padding: '8px 4px',
                  fontSize: 9,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 14 }}>{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'resumen' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {kpis.map((k) => (
                <div
                  key={k.label}
                  className={styles.kpiPanel}
                  style={{ borderColor: `${k.color}55`, boxShadow: `0 0 16px ${k.color}14`, border: `1px solid ${k.color}55`, background: 'rgba(6,10,18,0.88)' }}
                >
                  <div className={styles.kpiValue} style={{ color: k.color }}>
                    {k.prefix ?? ''}
                    <AnimatedNumber value={k.value} />
                  </div>
                  <div className={styles.kpiLabel}>{k.label}</div>
                </div>
              ))}
            </div>

            <div className={styles.panel}>
              <div className={styles.panelTitle}>Últimas órdenes</div>
              {data.latestOrders.length === 0 ? (
                <div style={{ color: '#6b7280', fontSize: 11 }}>{data.loading ? 'Cargando…' : 'Sin órdenes recientes'}</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.latestOrders.slice(0, 5).map((o) => (
                    <div key={o.id} className={`flex items-center justify-between ${styles.orderRow}`}>
                      <div className="flex flex-col min-w-0">
                        <span className={`truncate ${styles.orderId}`}>#{o.id.slice(0, 8)}</span>
                        <span className={styles.orderMeta}>{timeAgo(o.created_at)} · {o.status}</span>
                      </div>
                      <span className={styles.orderTotal}>${formatCLP(o.total ?? 0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'servicios' && (
          <div className={styles.panel}>
            <div className={styles.panelTitle}>Servicios · Toca para detalles</div>
            <div className="flex flex-col gap-2">
              {SERVICE_ORDER.map((id) => {
                const s = data.servicioStatus[id];
                const color = SERVICE_COLORS[id];
                const isOpen = expanded === id;
                return (
                  <div key={id} style={{ border: `1px solid ${color}33`, borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : id)}
                      className="flex items-center justify-between w-full"
                      style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      <div className="flex items-center gap-2">
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.online ? color : '#ef4444', boxShadow: `0 0 8px ${s.online ? color : '#ef4444'}` }} />
                        <span style={{ color: '#e5e7eb', fontSize: 13, fontWeight: 600 }}>{SERVICE_LABELS[id]}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span style={{ color: s.online ? '#22c55e' : '#ef4444', fontSize: 9, letterSpacing: '0.2em', fontWeight: 700 }}>
                          {s.online ? 'ONLINE' : 'OFFLINE'}
                        </span>
                        <span style={{ color: '#9ca3af', fontSize: 11 }}>{s.latencyMs}ms</span>
                        <span style={{ color: '#94a3b8', fontSize: 12, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                      </div>
                    </button>
                    {isOpen && (
                      <div style={{ padding: '10px 12px', borderTop: `1px solid ${color}22`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div className="flex items-center justify-between">
                          <span style={{ color: '#94a3b8', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Latencia · 30 muestras</span>
                          <span style={{ color, fontSize: 11, fontWeight: 700 }}>{s.latencyMs}ms</span>
                        </div>
                        <Sparkline samples={s.history} color={color} width={280} height={36} />
                        <div className="flex items-center justify-between">
                          <span style={{ color: '#94a3b8', fontSize: 10 }}>Eventos recientes</span>
                          <span style={{ color: '#94a3b8', fontSize: 10 }}>
                            {data.events.filter((e) => e.service === id).length}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 140, overflowY: 'auto' }}>
                          {data.events.filter((e) => e.service === id).slice(0, 6).map((e) => (
                            <div key={e.id} style={{ fontSize: 10, color: e.color, borderLeft: `2px solid ${e.color}`, paddingLeft: 6, lineHeight: 1.3 }}>
                              {KIND_ICON[e.kind] ?? '·'} {e.message}
                            </div>
                          ))}
                          {data.events.filter((e) => e.service === id).length === 0 && (
                            <div style={{ color: '#6b7280', fontSize: 10 }}>Sin eventos.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'eventos' && (
          <>
            <div className={styles.panel}>
              <div className={styles.panelTitle}>Filtrar por servicio</div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setEventFilter('all')}
                  style={{
                    background: eventFilter === 'all' ? `${ACCENT}2c` : 'transparent',
                    border: eventFilter === 'all' ? `1px solid ${ACCENT}66` : '1px solid #27303f',
                    color: eventFilter === 'all' ? ACCENT : '#94a3b8',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 10,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Todos
                </button>
                {SERVICE_ORDER.map((id) => {
                  const sel = eventFilter === id;
                  const c = SERVICE_COLORS[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setEventFilter(id)}
                      style={{
                        background: sel ? `${c}2c` : 'transparent',
                        border: sel ? `1px solid ${c}66` : '1px solid #27303f',
                        color: sel ? c : '#94a3b8',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: 10,
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {SERVICE_LABELS[id]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`${styles.panel} ${styles.logsPanel}`}>
              <div className={styles.logsTitle}>Stream · Tiempo real</div>
              <div className="flex flex-col gap-1" style={{ maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
                {filteredEvents.length === 0 ? (
                  <div className={styles.logsEmpty}>&gt; Esperando eventos…</div>
                ) : (
                  filteredEvents.slice(0, 40).map((e) => (
                    <div
                      key={e.id}
                      style={{
                        color: e.color,
                        fontSize: 11,
                        lineHeight: 1.45,
                        borderLeft: `2px solid ${e.color}`,
                        paddingLeft: 8,
                        display: 'flex',
                        gap: 6,
                        alignItems: 'baseline',
                      }}
                    >
                      <span aria-hidden style={{ width: 14, textAlign: 'center' }}>{KIND_ICON[e.kind] ?? '·'}</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.message}</span>
                      <span style={{ color: '#6b7280', fontSize: 9, flexShrink: 0 }}>{timeAgo(e.ts)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {tab === 'ciudad' && (
          <>
            <div className={styles.panel}>
              <div className={styles.panelTitle}>Ciudad 3D · InsForge core</div>
              <MiniCityMap />
              <div style={{ color: '#9ca3af', fontSize: 10, marginTop: 8, lineHeight: 1.5 }}>
                Cada paquete representa una transferencia entre tus servicios. El edificio dorado central es <b style={{ color: ACCENT }}>InsForge</b>, el núcleo de datos.
              </div>
            </div>
            <div className={styles.panel}>
              <div className={styles.panelTitle}>Tráfico activo</div>
              <div className="flex flex-col gap-1.5">
                {SERVICE_ORDER.map((id) => {
                  const s = data.servicioStatus[id];
                  return (
                    <div key={id} className="flex items-center justify-between gap-2">
                      <span style={{ color: '#e5e7eb', fontSize: 11 }}>{SERVICE_LABELS[id]}</span>
                      <Sparkline samples={s.history} color={SERVICE_COLORS[id]} width={140} height={20} />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
