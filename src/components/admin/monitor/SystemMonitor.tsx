'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, CheckCircle, Clock, Database, RefreshCw, Server, ShieldAlert, WifiOff } from 'lucide-react';
import { AdminBaseButton, AdminBaseCard, AdminBaseGrid, AdminBaseMetric, AdminBasePage } from '@/components/admin/baseui-kit';

type HealthStatus = 'online' | 'slow' | 'offline' | 'unconfigured';

type HealthService = {
  status: HealthStatus;
  latency: number;
  note?: string;
};

type HealthPayload = {
  services?: Record<string, HealthService>;
  metrics?: {
    avgLatency?: number;
    uptime?: number;
    offlineServices?: number;
    unconfiguredServices?: number;
  };
  timestamp?: string;
};

const SERVICE_LABELS: Record<string, string> = {
  vercel: 'Vercel / Hosting',
  insforge: 'InsForge / Base de datos',
  cloudflare: 'Cloudflare',
  github: 'GitHub',
  mercadopago: 'MercadoPago',
  meta: 'Meta APIs',
  google: 'Google APIs',
  tiktok: 'TikTok APIs',
  usuarios: 'Usuarios / Browser',
};

function statusText(status: HealthStatus) {
  if (status === 'online') return 'Operacional';
  if (status === 'slow') return 'Lento';
  if (status === 'offline') return 'Offline';
  return 'Sin configurar';
}

function statusClass(status: HealthStatus) {
  if (status === 'online') return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200';
  if (status === 'slow') return 'border-yellow-300/25 bg-yellow-300/10 text-yellow-200';
  if (status === 'offline') return 'border-red-400/25 bg-red-400/10 text-red-200';
  return 'border-zinc-400/20 bg-white/5 text-zinc-300';
}

function statusIcon(status: HealthStatus) {
  if (status === 'online') return <CheckCircle className="h-4 w-4" />;
  if (status === 'slow') return <AlertTriangle className="h-4 w-4" />;
  if (status === 'offline') return <WifiOff className="h-4 w-4" />;
  return <ShieldAlert className="h-4 w-4" />;
}

function fmtTime(value?: string) {
  if (!value) return 'Sin registro';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin registro';
  return date.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'medium' });
}

export default function SystemMonitor() {
  const [data, setData] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/health', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el monitor real.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(id);
  }, [autoRefresh]);

  const services = useMemo(() => Object.entries(data?.services ?? {}), [data]);
  const online = services.filter(([, service]) => service.status === 'online').length;
  const slow = services.filter(([, service]) => service.status === 'slow').length;
  const offline = services.filter(([, service]) => service.status === 'offline').length;
  const unconfigured = services.filter(([, service]) => service.status === 'unconfigured').length;

  return (
    <AdminBasePage
      eyebrow="Sistema real"
      title="Monitor en tiempo real"
      description="Estado real de hosting, InsForge, APIs externas y servicios conectados. Sin datos demo ni latencias simuladas."
      actions={
        <>
          <button onClick={() => setAutoRefresh((value) => !value)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-200 hover:border-yellow-300/40">
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl bg-yellow-300 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-black disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </button>
        </>
      }
    >
      {error ? (
        <div className="rounded-3xl border border-red-400/30 bg-red-400/10 p-5 text-red-200">
          <AlertTriangle className="mr-2 inline h-5 w-5" /> {error}
        </div>
      ) : null}

      <AdminBaseGrid cols="4">
        <AdminBaseMetric label="Servicios" value={services.length} hint="detectados por health" />
        <AdminBaseMetric label="Uptime" value={`${data?.metrics?.uptime ?? 0}%`} hint="servicios configurados" />
        <AdminBaseMetric label="Latencia media" value={`${data?.metrics?.avgLatency ?? 0}ms`} hint="checks reales" />
        <AdminBaseMetric label="Offline" value={data?.metrics?.offlineServices ?? offline} hint={`${unconfigured} sin configurar`} />
      </AdminBaseGrid>

      <div className="rounded-[2rem] border border-white/10 bg-black/30 p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-yellow-300">Pulso real</p>
            <h2 className="mt-1 text-xl font-black text-white">Servicios conectados</h2>
            <p className="mt-1 text-sm text-zinc-500">Última lectura: {fmtTime(data?.timestamp)}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-emerald-200">{online} online</span>
            <span className="rounded-full border border-yellow-300/25 bg-yellow-300/10 px-3 py-1 text-yellow-200">{slow} lentos</span>
            <span className="rounded-full border border-red-400/25 bg-red-400/10 px-3 py-1 text-red-200">{offline} offline</span>
          </div>
        </div>

        {loading && services.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-zinc-500">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Cargando monitor real…
          </div>
        ) : services.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center text-sm text-zinc-500">Sin servicios reportados por /api/admin/health.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {services.map(([id, service], index) => {
              const label = SERVICE_LABELS[id] ?? id;
              const pct = service.status === 'online' ? 100 : service.status === 'slow' ? 68 : service.status === 'unconfigured' ? 38 : 12;
              return (
                <motion.article
                  key={id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="rounded-3xl border border-white/10 bg-zinc-950/70 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.35)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-yellow-300">
                        {id === 'insforge' ? <Database className="h-5 w-5" /> : <Server className="h-5 w-5" />}
                      </span>
                      <div>
                        <h3 className="font-black text-white">{label}</h3>
                        <p className="mt-1 text-xs text-zinc-500">{id}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${statusClass(service.status)}`}>
                      {statusIcon(service.status)} {statusText(service.status)}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">Latencia</p>
                      <p className="mt-1 text-xl font-black text-white">{service.latency > 0 ? `${service.latency}ms` : '—'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">Salud</p>
                      <p className="mt-1 text-xl font-black text-yellow-300">{pct}%</p>
                    </div>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full rounded-full ${service.status === 'online' ? 'bg-emerald-300' : service.status === 'slow' ? 'bg-yellow-300' : service.status === 'offline' ? 'bg-red-400' : 'bg-zinc-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                  {service.note ? <p className="mt-3 text-xs text-zinc-500">{service.note}</p> : null}
                </motion.article>
              );
            })}
          </div>
        )}
      </div>

      <AdminBaseGrid cols="3">
        <AdminBaseCard title="Health API" description="Fuente real del monitor actual." icon={Activity} tone="emerald" badge="real" href="/api/admin/health" />
        <AdminBaseCard title="Estado del sistema" description="Diagnóstico profundo por grupos y sugerencias." icon={ShieldAlert} tone="gold" badge="diagnóstico" href="/admin/estado" />
        <AdminBaseCard title="Observatory" description="Vista 3D y red en tiempo real del sistema." icon={Server} tone="blue" badge="live" href="/admin/observatory" />
      </AdminBaseGrid>

      <p className="text-xs text-zinc-600">
        <Clock className="mr-1 inline h-3.5 w-3.5" /> Este monitor reemplaza el antiguo simulador de latencia. Los datos vienen de `/api/admin/health`.
      </p>
    </AdminBasePage>
  );
}
