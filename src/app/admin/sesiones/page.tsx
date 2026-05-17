'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Clock, Database, Fingerprint, Laptop, MapPin, RefreshCw, Search, ShieldCheck, Smartphone, UserRound } from 'lucide-react';
import { AdminPage, AdminPageHeader } from '@/components/admin/ui';

type SessionRow = {
  email: string;
  ip: string;
  outcome: string;
  ts: string | null;
  user_agent: string;
  device: { os: string; browser: string; type: string; label: string };
};

type IpRow = { ip: string; total: number; lastSeen: string | null };
type DeviceRow = { label: string; type: string; os: string; browser: string; total: number; lastSeen: string | null };
type Summary = { total: number; success: number; failed: number; uniqueIps: number; uniqueDevices: number; lastLogin?: string | null; lastIp?: string | null; lastDevice?: string | null };
type SuperadminSummary = Summary & { email?: string; ips?: string[]; devices?: string[] };

type SessionsPayload = {
  ok: boolean;
  error?: string;
  currentIp: string;
  role?: string;
  activeFilter?: string | null;
  emails: string[];
  summary: Summary;
  superadminSummary?: SuperadminSummary;
  ips: IpRow[];
  devices: DeviceRow[];
  sessions: SessionRow[];
};

function fmt(value?: string | null) {
  if (!value) return 'Sin registro';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin registro';
  return date.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'medium' });
}

function isSuccess(outcome: string) {
  return /success|ok|login/i.test(outcome);
}

function DeviceIcon({ type }: { type: string }) {
  if (/móvil|movil|mobile/i.test(type)) return <Smartphone className="h-4 w-4" />;
  return <Laptop className="h-4 w-4" />;
}

export default function SesionesPage() {
  const [data, setData] = useState<SessionsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [search, setSearch] = useState('');

  async function load(selectedEmail = email) {
    setLoading(true);
    setError('');
    try {
      const qs = selectedEmail ? `?email=${encodeURIComponent(selectedEmail)}` : '';
      const res = await fetch(`/api/admin/sessions${qs}`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      setData(json);
    } catch {
      setError('Error de red cargando sesiones.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(''); }, []);

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = data?.sessions ?? [];
    if (!q) return rows;
    return rows.filter((row) =>
      row.email.toLowerCase().includes(q) ||
      row.ip.toLowerCase().includes(q) ||
      row.outcome.toLowerCase().includes(q) ||
      row.device.label.toLowerCase().includes(q) ||
      row.user_agent.toLowerCase().includes(q),
    );
  }, [data, search]);

  const superadmin = data?.superadminSummary;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Seguridad"
        icon={Fingerprint}
        title={<>Sesiones y <span className="text-yellow-300">dispositivos</span></>}
        description="Audita inicios de sesión, IPs, dispositivos móviles, navegadores y accesos recientes del panel admin."
        meta={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-300/30 bg-yellow-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-yellow-200">
            <ShieldCheck className="h-3 w-3" /> Auditoría admin
          </span>
        }
        actions={
          <button onClick={() => load()} disabled={loading} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-white/20 hover:bg-white/10 disabled:opacity-60">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </button>
        }
      />

      <div className="space-y-5">
        {error && (
          <section className="rounded-3xl border border-red-400/30 bg-red-400/10 p-5 text-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 h-5 w-5" />
              <div>
                <p className="font-black">No se pudo cargar la auditoría</p>
                <p className="mt-1 text-sm opacity-85">{error}</p>
              </div>
            </div>
          </section>
        )}

        {superadmin && (
          <section className="rounded-[2rem] border border-yellow-300/25 bg-yellow-300/[0.05] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-300">Resumen superadmin</p>
                <h2 className="mt-2 text-2xl font-black text-white">Tu actividad de acceso</h2>
                <p className="mt-1 text-sm text-zinc-500">{superadmin.email || 'superadmin'} · último acceso: <span className="text-zinc-300">{fmt(superadmin.lastLogin)}</span></p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3"><p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Ingresos</p><p className="mt-1 text-2xl font-black text-white">{superadmin.success}</p></div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3"><p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Fallidos</p><p className="mt-1 text-2xl font-black text-red-300">{superadmin.failed}</p></div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3"><p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">IPs</p><p className="mt-1 text-2xl font-black text-sky-300">{superadmin.uniqueIps}</p></div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3"><p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Dispositivos</p><p className="mt-1 text-2xl font-black text-yellow-300">{superadmin.uniqueDevices}</p></div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">Última IP</p>
                <p className="mt-2 font-mono text-sm text-zinc-200">{superadmin.lastIp ?? 'Sin registro'}</p>
                <div className="mt-3 flex flex-wrap gap-2">{(superadmin.ips ?? []).slice(0, 6).map((ip) => <span key={ip} className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs text-sky-200">{ip}</span>)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">Último dispositivo</p>
                <p className="mt-2 text-sm text-zinc-200">{superadmin.lastDevice ?? 'Sin registro'}</p>
                <div className="mt-3 flex flex-wrap gap-2">{(superadmin.devices ?? []).slice(0, 6).map((device) => <span key={device} className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1 text-xs text-yellow-200">{device}</span>)}</div>
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Inicios registrados', value: data?.summary.total ?? 0, icon: Activity, tone: 'text-white' },
            { label: 'Correctos', value: data?.summary.success ?? 0, icon: ShieldCheck, tone: 'text-emerald-300' },
            { label: 'Fallidos/Bloqueos', value: data?.summary.failed ?? 0, icon: AlertTriangle, tone: 'text-red-300' },
            { label: 'IPs únicas', value: data?.summary.uniqueIps ?? 0, icon: MapPin, tone: 'text-sky-300' },
            { label: 'Dispositivos', value: data?.summary.uniqueDevices ?? 0, icon: Smartphone, tone: 'text-yellow-300' },
          ].map(({ label, value, icon: Icon, tone }) => (
            <article key={label} className="rounded-3xl border border-white/10 bg-zinc-950/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{label}</p>
                <Icon className={`h-4 w-4 ${tone}`} />
              </div>
              <p className={`mt-3 text-3xl font-black ${tone}`}>{loading ? '…' : value}</p>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-yellow-300/20 bg-yellow-300/[0.04] p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">Filtrar por usuario</p>
              <select value={email} onChange={(event) => { const value = event.target.value; setEmail(value); void load(value); }} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-yellow-300/40">
                <option value="">Todos los usuarios</option>
                {(data?.emails ?? []).map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">Buscar en sesiones</p>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Email, IP, dispositivo, navegador…" className="w-full rounded-2xl border border-white/10 bg-black/40 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-yellow-300/40" />
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-zinc-400"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">Tu IP actual</p><p className="mt-1 font-mono text-zinc-200">{data?.currentIp ?? '—'}</p></div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5">
            <div className="mb-4 flex items-center gap-2"><MapPin className="h-5 w-5 text-sky-300" /><h2 className="text-xl font-black text-white">IPs detectadas</h2></div>
            <div className="grid gap-3">
              {(data?.ips ?? []).length === 0 ? <p className="text-sm text-zinc-500">Sin IPs registradas.</p> : data!.ips.map((ip) => (
                <article key={ip.ip} className="rounded-2xl border border-white/10 bg-black/30 p-4"><div className="flex items-center justify-between gap-3"><p className="font-mono text-sm font-bold text-white">{ip.ip}</p><span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1 text-xs text-sky-200">{ip.total} accesos</span></div><p className="mt-2 text-xs text-zinc-500">Último acceso: <span className="text-zinc-300">{fmt(ip.lastSeen)}</span></p></article>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5">
            <div className="mb-4 flex items-center gap-2"><Smartphone className="h-5 w-5 text-yellow-300" /><h2 className="text-xl font-black text-white">Dispositivos usados</h2></div>
            <div className="grid gap-3">
              {(data?.devices ?? []).length === 0 ? <p className="text-sm text-zinc-500">Sin dispositivos registrados.</p> : data!.devices.map((device) => (
                <article key={device.label} className="rounded-2xl border border-white/10 bg-black/30 p-4"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-yellow-300/10 text-yellow-300"><DeviceIcon type={device.type} /></span><div className="min-w-0"><p className="truncate font-bold text-white">{device.label}</p><p className="text-xs text-zinc-500">{device.os} · {device.browser}</p></div></div><span className="rounded-full border border-yellow-300/25 bg-yellow-300/10 px-3 py-1 text-xs text-yellow-200">{device.total}</span></div><p className="mt-2 text-xs text-zinc-500">Último uso: <span className="text-zinc-300">{fmt(device.lastSeen)}</span></p></article>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5">
          <div className="mb-4 flex items-center gap-2"><Database className="h-5 w-5 text-emerald-300" /><h2 className="text-xl font-black text-white">Listado detallado de inicios de sesión</h2></div>
          {loading ? <div className="flex items-center justify-center py-12 text-sm text-zinc-500"><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Cargando auditoría…</div> : filteredSessions.length === 0 ? <div className="py-12 text-center text-sm text-zinc-500">No hay registros para mostrar.</div> : (
            <div className="grid gap-3">
              {filteredSessions.map((row, index) => (
                <details key={`${row.ts}-${row.email}-${row.ip}-${index}`} className="group rounded-2xl border border-white/10 bg-black/30 p-4 open:border-yellow-300/25">
                  <summary className="flex cursor-pointer list-none flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-3"><span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${isSuccess(row.outcome) ? 'bg-emerald-400/10 text-emerald-300' : 'bg-red-400/10 text-red-300'}`}>{isSuccess(row.outcome) ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}</span><div className="min-w-0"><p className="truncate font-bold text-white">{row.email}</p><p className="text-xs text-zinc-500">{fmt(row.ts)} · {row.ip}</p></div></div>
                    <div className="flex flex-wrap gap-2"><span className={`rounded-full border px-3 py-1 text-xs ${isSuccess(row.outcome) ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200' : 'border-red-400/25 bg-red-400/10 text-red-200'}`}>{row.outcome}</span><span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-300"><DeviceIcon type={row.device.type} /> <span className="ml-1">{row.device.label}</span></span></div>
                  </summary>
                  <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 text-sm md:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-black/30 p-3"><p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-600">Dispositivo</p><p className="mt-1 text-zinc-300">{row.device.type} · {row.device.os} · {row.device.browser}</p></div><div className="rounded-2xl border border-white/10 bg-black/30 p-3"><p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-600">IP</p><p className="mt-1 font-mono text-zinc-300">{row.ip}</p></div><div className="rounded-2xl border border-white/10 bg-black/30 p-3 md:col-span-2"><p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-600">User Agent</p><p className="mt-1 break-all font-mono text-xs text-zinc-400">{row.user_agent || 'Sin user agent registrado'}</p></div></div>
                </details>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-xs text-zinc-500"><Clock className="mr-2 inline h-4 w-4 text-yellow-300" /> Esta pantalla lee la tabla <code className="rounded bg-black/40 px-1 py-0.5">admin_login_audit</code>. Si un login antiguo no registró IP o dispositivo, aparecerá como “sin registro”.</section>
      </div>
    </AdminPage>
  );
}
