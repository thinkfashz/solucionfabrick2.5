'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  Database,
  Fingerprint,
  Laptop,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  UserRound,
} from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

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
      const response = await fetch(`/api/admin/sessions${qs}`, { cache: 'no-store' });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? `HTTP ${response.status}`);
      setData(json as SessionsPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red cargando sesiones.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = data?.sessions ?? [];
    if (!query) return rows;
    return rows.filter((row) => [
      row.email,
      row.ip,
      row.outcome,
      row.device.label,
      row.device.os,
      row.device.browser,
      row.user_agent,
    ].join(' ').toLowerCase().includes(query));
  }, [data, search]);

  const superadmin = data?.superadminSummary;
  const summary = data?.summary ?? { total: 0, success: 0, failed: 0, uniqueIps: 0, uniqueDevices: 0 };

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Acceso · Auditoría"
        icon={Fingerprint}
        title="Sesiones y dispositivos"
        description="Audita inicios de sesión, IPs, dispositivos, navegadores y accesos recientes del administrador desde una sola vista."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white transition hover:bg-[#2a2823] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStat label="Registros" value={loading ? '…' : summary.total} icon={Activity} />
        <AdminStat label="Correctos" value={loading ? '…' : summary.success} icon={ShieldCheck} accent="emerald" />
        <AdminStat label="Fallidos" value={loading ? '…' : summary.failed} icon={AlertTriangle} accent="rose" />
        <AdminStat label="IPs únicas" value={loading ? '…' : summary.uniqueIps} icon={MapPin} accent="cyan" />
        <AdminStat label="Dispositivos" value={loading ? '…' : summary.uniqueDevices} icon={Smartphone} />
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-600/15 bg-rose-500/8 p-4 text-sm text-rose-900">
          <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><strong className="font-black">No se pudo cargar la auditoría.</strong><p className="mt-1">{error}</p></div></div>
        </div>
      ) : null}

      {superadmin ? (
        <AdminCard className="p-0 sm:p-0">
          <div className="flex flex-col gap-4 border-b border-black/8 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Actividad Root</p>
              <h2 className="mt-1 text-lg font-black tracking-[-.025em] text-[#171612]">Resumen superadmin</h2>
              <p className="mt-1 text-xs leading-5 text-[#817a6f]">{superadmin.email || 'superadmin'} · último acceso {fmt(superadmin.lastLogin)}</p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-800">Auditoría activa</span>
          </div>
          <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
            <MiniMetric label="Ingresos" value={superadmin.success} />
            <MiniMetric label="Fallidos" value={superadmin.failed} tone="rose" />
            <MiniMetric label="IPs" value={superadmin.uniqueIps} />
            <MiniMetric label="Dispositivos" value={superadmin.uniqueDevices} />
          </div>
          <div className="grid border-t border-black/8 lg:grid-cols-2">
            <div className="p-4 sm:p-5 lg:border-r lg:border-black/8">
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]">Última IP</p>
              <p className="mt-2 font-mono text-sm font-bold text-[#27241f]">{superadmin.lastIp ?? 'Sin registro'}</p>
              <div className="mt-3 flex flex-wrap gap-2">{(superadmin.ips ?? []).slice(0, 6).map((ip) => <span key={ip} className="rounded-full bg-sky-500/10 px-2.5 py-1 font-mono text-[10px] font-bold text-sky-800">{ip}</span>)}</div>
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]">Último dispositivo</p>
              <p className="mt-2 text-sm font-bold text-[#27241f]">{superadmin.lastDevice ?? 'Sin registro'}</p>
              <div className="mt-3 flex flex-wrap gap-2">{(superadmin.devices ?? []).slice(0, 6).map((device) => <span key={device} className="rounded-full bg-[#ffb000]/10 px-2.5 py-1 text-[10px] font-bold text-[#77500a]">{device}</span>)}</div>
            </div>
          </div>
        </AdminCard>
      ) : null}

      <AdminCard>
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_220px] lg:items-end">
          <label className="block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]">Filtrar por usuario</span>
            <select
              value={email}
              onChange={(event) => { const value = event.target.value; setEmail(value); void load(value); }}
              className="w-full rounded-xl border border-black/10 bg-white/75 px-3.5 py-3 text-sm font-semibold text-[#171612] outline-none focus:border-[#c77a00]/40"
            >
              <option value="">Todos los usuarios</option>
              {(data?.emails ?? []).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]">Buscar en sesiones</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9286]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Email, IP, dispositivo, navegador…"
                className="w-full rounded-xl border border-black/10 bg-white/75 py-3 pl-10 pr-3 text-sm font-semibold text-[#171612] outline-none focus:border-[#c77a00]/40"
              />
            </div>
          </label>
          <div className="rounded-xl border border-black/8 bg-white/45 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">IP actual</p>
            <p className="mt-1 truncate font-mono text-xs font-bold text-[#27241f]">{data?.currentIp ?? '—'}</p>
          </div>
        </div>
      </AdminCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminCard className="p-0 sm:p-0">
          <SectionTitle icon={MapPin} title="IPs detectadas" subtitle="Direcciones observadas en los registros de acceso." />
          <div className="divide-y divide-black/8 px-4 sm:px-5">
            {(data?.ips ?? []).length === 0 ? <EmptyRow text="Sin IPs registradas." /> : data!.ips.map((ip) => (
              <div key={ip.ip} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0"><p className="truncate font-mono text-xs font-bold text-[#27241f]">{ip.ip}</p><p className="mt-1 text-[11px] text-[#817a6f]">Último acceso {fmt(ip.lastSeen)}</p></div>
                <span className="shrink-0 rounded-full bg-sky-500/10 px-2.5 py-1 text-[10px] font-black text-sky-800">{ip.total} accesos</span>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard className="p-0 sm:p-0">
          <SectionTitle icon={Smartphone} title="Dispositivos usados" subtitle="Sistemas y navegadores detectados en la auditoría." />
          <div className="divide-y divide-black/8 px-4 sm:px-5">
            {(data?.devices ?? []).length === 0 ? <EmptyRow text="Sin dispositivos registrados." /> : data!.devices.map((device) => (
              <div key={device.label} className="flex items-center gap-3 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#ffb000]/10 text-[#a56600]"><DeviceIcon type={device.type} /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-[#27241f]">{device.label}</p><p className="mt-1 text-[11px] text-[#817a6f]">{device.os} · {device.browser} · {fmt(device.lastSeen)}</p></div>
                <span className="shrink-0 rounded-full bg-[#ffb000]/10 px-2.5 py-1 text-[10px] font-black text-[#77500a]">{device.total}</span>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>

      <AdminCard className="p-0 sm:p-0">
        <SectionTitle icon={Database} title="Inicios de sesión" subtitle={`${filteredSessions.length} registro(s) visibles con los filtros actuales.`} />
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#817a6f]"><RefreshCw className="h-4 w-4 animate-spin" /> Cargando auditoría…</div>
        ) : filteredSessions.length === 0 ? (
          <EmptyRow text="No hay registros para mostrar." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-black/8 bg-white/35 text-[10px] font-black uppercase tracking-[.12em] text-[#8f887c]">
                <tr>
                  <th className="px-4 py-3 sm:px-5">Estado</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Dispositivo</th>
                  <th className="px-4 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/8">
                {filteredSessions.map((row, index) => {
                  const success = isSuccess(row.outcome);
                  return (
                    <tr key={`${row.email}-${row.ip}-${row.ts}-${index}`} className="align-top">
                      <td className="px-4 py-3 sm:px-5"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black ${success ? 'bg-emerald-500/10 text-emerald-800' : 'bg-rose-500/10 text-rose-800'}`}>{success ? <ShieldCheck className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}{row.outcome}</span></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-[#a56600]" /><span className="max-w-[220px] truncate font-bold text-[#27241f]">{row.email}</span></div></td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#625b50]">{row.ip}</td>
                      <td className="px-4 py-3"><p className="max-w-[260px] truncate font-bold text-[#514b42]">{row.device.label}</p><p className="mt-1 text-[10px] text-[#8f887c]">{row.device.os} · {row.device.browser}</p></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2 text-[#625b50]"><Clock className="h-3.5 w-3.5 text-[#9a9286]" />{fmt(row.ts)}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </AdminPage>
  );
}

function MiniMetric({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'rose' }) {
  return (
    <div className="border-b border-black/8 p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:p-5">
      <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">{label}</p>
      <p className={`mt-2 text-2xl font-black ${tone === 'rose' ? 'text-rose-700' : 'text-[#171612]'}`}>{value}</p>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: typeof MapPin; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-black/8 p-4 sm:p-5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#ffb000]/10 text-[#a56600]"><Icon className="h-4 w-4" /></span>
      <div><h2 className="text-sm font-black text-[#171612]">{title}</h2><p className="mt-1 text-[11px] leading-5 text-[#817a6f]">{subtitle}</p></div>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <div className="px-5 py-12 text-center text-sm text-[#817a6f]">{text}</div>;
}
