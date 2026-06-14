'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, ArrowRight, Bell, Briefcase, CheckCircle2, Clock, Database, FileText, Folder, Gauge, Loader2, Package, ShieldCheck, Users, Wallet, Wifi, WifiOff, Zap } from 'lucide-react';

type AdminSessionRow = {
  session_id: string;
  email: string | null;
  role: string | null;
  ip: string | null;
  device: string | null;
  location_hint: string | null;
  login_at: string;
  last_seen_at: string | null;
  logout_at: string | null;
  duration_seconds: number | null;
  status: string | null;
};

type RecentRow = Record<string, unknown>;

type DashboardPayload = {
  ok: boolean;
  connected?: boolean;
  profile: { email: string; name: string; avatar_url: string | null; bio: string; role: string; session_id: string | null };
  stats: { products: number; orders: number; budgets: number; invoices: number; leads: number; revenue: number };
  recent?: { orders?: RecentRow[]; budgets?: RecentRow[]; leads?: RecentRow[] };
  sessions: AdminSessionRow[];
  health: { app: string; db: string; latency_ms: number; db_latency_ms?: number; db_checked_at?: string; db_message?: string; realtime: string; last_deploy: string };
  console: string[];
};

function clp(value: number) { return '$' + Math.round(Number(value || 0)).toLocaleString('es-CL'); }
function initials(name: string) { return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'SF'; }
function pct(value: number, max: number) { return Math.max(8, Math.min(100, Math.round((Number(value || 0) / Math.max(1, max)) * 100))); }
function rowText(row: RecentRow, fallback: string) { return String(row.title || row.name || row.customer_name || row.customer_email || row.email || row.nombre || row.label || fallback); }
function rowDate(row: RecentRow) {
  const value = String(row.created_at || row.updated_at || row.fecha || '');
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

type IconType = typeof Package;

function Metric({ title, value, hint, icon: Icon, tone = 'yellow', amount = 0, max = 1 }: { title: string; value: string | number; hint: string; icon: IconType; tone?: 'yellow' | 'emerald' | 'sky' | 'rose'; amount?: number; max?: number }) {
  const width = pct(amount, max);
  const toneClass = tone === 'emerald' ? 'text-emerald-300 bg-emerald-300/10 border-emerald-300/20' : tone === 'sky' ? 'text-sky-300 bg-sky-300/10 border-sky-300/20' : tone === 'rose' ? 'text-rose-300 bg-rose-300/10 border-rose-300/20' : 'text-yellow-300 bg-yellow-300/10 border-yellow-300/20';
  return <article className="group rounded-[1.8rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_70px_rgba(0,0,0,.28)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-yellow-300/25">
    <div className={`grid h-12 w-12 place-items-center rounded-full border ${toneClass}`}><Icon className="h-5 w-5" /></div>
    <p className="mt-5 text-sm text-zinc-400">{title}</p>
    <b className="mt-2 block text-3xl font-black tracking-tight text-white">{value}</b>
    <span className="mt-1 block text-xs text-emerald-300">{hint}</span>
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/40"><div className="h-full rounded-full bg-yellow-300 transition-all duration-700 ease-out" style={{ width: `${width}%` }} /></div>
    <svg viewBox="0 0 120 28" className="mt-4 h-7 w-full text-yellow-300/80 transition duration-500 group-hover:scale-[1.02]" fill="none"><path d="M2 22 C18 20 18 13 32 16 C48 19 48 9 64 12 C82 15 82 5 98 9 C110 12 112 17 118 11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="170" strokeDashoffset="0" /></svg>
  </article>;
}

function QuickAction({ href, title, text, icon: Icon }: { href: string; title: string; text: string; icon: IconType }) {
  return <Link href={href} className="group rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_18px_50px_rgba(0,0,0,.22)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-yellow-300/30 hover:bg-white/[0.07]">
    <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-yellow-300/20 bg-yellow-300/10 text-yellow-300"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><b className="block text-white">{title}</b><span className="mt-1 block text-xs leading-5 text-zinc-400">{text}</span></span><ArrowRight className="mt-3 h-4 w-4 text-yellow-300/35 transition group-hover:translate-x-1 group-hover:text-yellow-300" /></div>
  </Link>;
}

function ActivityItem({ icon: Icon, time, title, detail }: { icon: IconType; time: string; title: string; detail: string }) {
  return <div className="relative flex gap-4 pb-5 last:pb-0">
    <span className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.07] text-yellow-300"><Icon className="h-5 w-5" /></span>
    <div className="min-w-0"><p className="text-xs text-zinc-500">{time}</p><b className="mt-1 block text-sm text-white">{title}</b><p className="mt-1 text-sm leading-6 text-zinc-400">{detail}</p></div>
  </div>;
}

function ConnectionBadge({ connected, latency, checkedAt }: { connected: boolean; latency: number; checkedAt?: string }) {
  const checked = checkedAt ? new Date(checkedAt).toLocaleTimeString('es-CL', { hour12: false }) : 'pendiente';
  const Icon = connected ? Wifi : WifiOff;
  return <div className={`relative overflow-hidden rounded-3xl border p-4 ${connected ? 'border-emerald-300/25 bg-emerald-400/[0.08]' : 'border-rose-300/25 bg-rose-500/[0.08]'}`}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,.12),transparent_45%)]" />
    <div className="relative flex items-center gap-3">
      <span className={`grid h-11 w-11 place-items-center rounded-2xl ${connected ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-300'}`}><Icon className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Base de datos</p><b className="mt-1 block truncate text-sm text-white">{connected ? 'Conectada en tiempo real' : 'Conexión degradada'}</b></div>
      <span className="relative flex h-3 w-3"><span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${connected ? 'bg-emerald-300' : 'bg-rose-300'}`} /><span className={`relative inline-flex h-3 w-3 rounded-full ${connected ? 'bg-emerald-300' : 'bg-rose-300'}`} /></span>
    </div>
    <div className="relative mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400"><span>Latencia: <b className="text-white">{latency}ms</b></span><span>Check: <b className="text-white">{checked}</b></span></div>
  </div>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastBeat, setLastBeat] = useState<string>('');

  async function load() {
    setError('');
    try {
      const res = await fetch('/api/admin/dashboard/blue', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo cargar dashboard');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    let disposed = false;
    async function beat() {
      try {
        const res = await fetch('/api/admin/session/heartbeat', { method: 'POST', cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (!disposed && res.ok) setLastBeat(json.ts || new Date().toISOString());
      } catch {}
    }
    void beat();
    const id = setInterval(() => { if (document.visibilityState === 'visible') { void beat(); void load(); } }, 45_000);
    const onVisible = () => { if (document.visibilityState === 'visible') { void beat(); void load(); } };
    document.addEventListener('visibilitychange', onVisible);
    return () => { disposed = true; clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  const profile = data?.profile;
  const connected = data?.connected ?? data?.health.db === 'online';
  const dbLatency = data?.health.db_latency_ms ?? data?.health.latency_ms ?? 0;
  const recentBudgets = data?.recent?.budgets || [];
  const recentOrders = data?.recent?.orders || [];
  const recentLeads = data?.recent?.leads || [];
  const recentSessions = useMemo(() => data?.sessions?.slice(0, 5) || [], [data]);
  const maxMetric = Math.max(1, data?.stats.budgets || 0, data?.stats.leads || 0, data?.stats.orders || 0, data?.stats.products || 0);

  if (loading) return <div className="grid min-h-[70vh] place-items-center text-white"><Loader2 className="h-8 w-8 animate-spin text-yellow-300" /></div>;

  return <main className="fabrick-page relative min-h-screen p-3 text-white sm:p-6 lg:p-8">
    <section className="mx-auto grid w-full max-w-[1500px] gap-6">
      {error && <div className="rounded-3xl border border-red-300/25 bg-red-500/10 p-4 text-sm text-red-100"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</div>}

      <header className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <article className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-white/[0.045] p-6 shadow-[0_30px_100px_rgba(0,0,0,.36)] backdrop-blur-xl sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(250,204,21,.12),transparent_20rem),linear-gradient(135deg,rgba(255,255,255,.04),transparent_45%)]" />
          <div className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_260px] md:items-center">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />Datos reales · InsForge</div>
              <p className="mt-5 text-lg text-zinc-300">Bienvenido, <span className="font-black text-yellow-300">{profile?.name || 'Admin'}</span></p>
              <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">Panel de administración</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-400">Dashboard conectado a la base de datos, sesiones reales y refresco liviano cada 45 segundos. Las gráficas usan animaciones CSS simples para mantener carga rápida en móvil.</p>
            </div>
            <div className="mx-auto grid h-56 w-56 place-items-center rounded-[2rem] border border-yellow-300/15 bg-black/50 shadow-[0_22px_70px_rgba(0,0,0,.45)]">
              <div className="relative h-36 w-36 rounded-[1.6rem] border border-yellow-300/20 bg-gradient-to-br from-[#171717] to-[#050505] shadow-[0_20px_80px_rgba(250,204,21,.12)]">
                <div className="absolute inset-4 grid place-items-center rounded-[1.1rem] bg-yellow-300/10 text-5xl font-black text-yellow-300">{initials(profile?.name || 'SF')}</div>
                <div className="absolute -right-2 -top-2 grid h-9 w-9 place-items-center rounded-full border border-emerald-300/30 bg-emerald-400/15 text-emerald-300"><Database className="h-4 w-4" /></div>
              </div>
            </div>
          </div>
        </article>

        <aside className="grid gap-4 rounded-[2.4rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_80px_rgba(0,0,0,.30)] backdrop-blur-xl">
          <div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">Estado en vivo</p><Bell className="h-5 w-5 text-yellow-300" /></div>
          <ConnectionBadge connected={connected} latency={dbLatency} checkedAt={data?.health.db_checked_at} />
          <Status label="App" value={data?.health.app || 'ok'} icon={ShieldCheck} online />
          <Status label="Heartbeat" value={lastBeat ? 'Activo' : '...'} icon={Activity} online={Boolean(lastBeat)} />
          <Status label="Deploy" value={data?.health.last_deploy || 'actual'} icon={Clock} online />
        </aside>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Presupuestos" value={data?.stats.budgets || 0} hint="Registros reales" icon={FileText} amount={data?.stats.budgets || 0} max={maxMetric} />
        <Metric title="Clientes" value={data?.stats.leads || 0} hint="Leads conectados" icon={Users} tone="emerald" amount={data?.stats.leads || 0} max={maxMetric} />
        <Metric title="Proyectos" value={data?.stats.orders || 0} hint="Órdenes / trabajos" icon={Folder} tone="sky" amount={data?.stats.orders || 0} max={maxMetric} />
        <Metric title="Ingresos" value={clp(data?.stats.revenue || 0)} hint="Total órdenes recientes" icon={Wallet} tone="yellow" amount={data?.stats.revenue || 0} max={Math.max(1, data?.stats.revenue || 0)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,.9fr)]">
        <article className="rounded-[2.2rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_80px_rgba(0,0,0,.30)] backdrop-blur-xl sm:p-6">
          <div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-black">Presupuestos reales recientes</h2><Link href="/admin/presupuestos" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 hover:border-yellow-300/30 hover:text-yellow-300">Ver todos</Link></div>
          <div className="mt-5 grid gap-3">
            {recentBudgets.length ? recentBudgets.map((row, index) => <div key={String(row.id || index)} className="flex items-center justify-between gap-3 rounded-[1.4rem] border border-white/10 bg-black/25 p-4 transition hover:border-yellow-300/20"><div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-yellow-300/10 text-yellow-300"><FileText className="h-5 w-5" /></span><div className="min-w-0"><b className="block truncate text-white">{rowText(row, `Presupuesto ${index + 1}`)}</b><p className="truncate text-sm text-zinc-400">{rowDate(row)}</p></div></div><div className="text-right"><b className="text-white">{clp(Number(row.total || row.amount || row.monto || 0))}</b><p className="mt-1 rounded-full bg-yellow-300/10 px-3 py-1 text-xs font-bold text-yellow-200">Real</p></div></div>) : <p className="rounded-2xl bg-black/25 p-5 text-sm text-zinc-400">Todavía no hay presupuestos reales en la tabla. Cuando ingresen, aparecerán aquí sin datos inventados.</p>}
          </div>
        </article>

        <article className="rounded-[2.2rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_80px_rgba(0,0,0,.30)] backdrop-blur-xl sm:p-6">
          <h2 className="text-2xl font-black">Actividad conectada</h2>
          <div className="relative mt-6 space-y-1 before:absolute before:left-[21px] before:top-2 before:h-[calc(100%-18px)] before:w-px before:bg-white/10">
            <ActivityItem icon={Database} time="Ahora" title={connected ? 'Base de datos conectada' : 'Base de datos degradada'} detail={data?.health.db_message || 'Verificación de conexión ejecutada desde el dashboard.'} />
            <ActivityItem icon={FileText} time={recentBudgets[0] ? rowDate(recentBudgets[0]) : 'Sin registro'} title="Último presupuesto" detail={recentBudgets[0] ? rowText(recentBudgets[0], 'Presupuesto') : 'Sin presupuesto real registrado todavía.'} />
            <ActivityItem icon={Users} time={recentLeads[0] ? rowDate(recentLeads[0]) : 'Sin registro'} title="Último lead" detail={recentLeads[0] ? rowText(recentLeads[0], 'Lead') : 'Sin lead real registrado todavía.'} />
            <ActivityItem icon={Briefcase} time={recentOrders[0] ? rowDate(recentOrders[0]) : 'Sin registro'} title="Última orden" detail={recentOrders[0] ? rowText(recentOrders[0], 'Orden') : 'Sin orden real registrada todavía.'} />
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,.9fr)_minmax(340px,1fr)]">
        <article className="rounded-[2.2rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_80px_rgba(0,0,0,.30)] backdrop-blur-xl sm:p-6">
          <h2 className="text-2xl font-black">Gráfica liviana</h2>
          <p className="mt-2 text-sm text-zinc-400">Comparativa rápida con datos reales disponibles en la base.</p>
          <div className="mt-6 grid gap-4">
            {[['Productos', data?.stats.products || 0], ['Presupuestos', data?.stats.budgets || 0], ['Clientes', data?.stats.leads || 0], ['Órdenes', data?.stats.orders || 0]].map(([label, value]) => <div key={String(label)}><div className="mb-2 flex justify-between text-xs"><span className="text-zinc-400">{label}</span><b className="text-white">{value}</b></div><div className="h-3 overflow-hidden rounded-full bg-black/35"><div className="h-full rounded-full bg-yellow-300 transition-all duration-700" style={{ width: `${pct(Number(value), maxMetric)}%` }} /></div></div>)}
          </div>
        </article>

        <article className="rounded-[2.2rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_80px_rgba(0,0,0,.30)] backdrop-blur-xl sm:p-6">
          <h2 className="text-2xl font-black">Sesiones reales</h2>
          <div className="mt-5 grid gap-3">
            {recentSessions.length ? recentSessions.map((session) => <div key={session.session_id} className="rounded-2xl border border-white/10 bg-black/25 p-4"><div className="flex items-center justify-between gap-3"><b className="truncate text-sm text-white">{session.email || 'Admin'}</b><span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-black uppercase text-emerald-300">{session.status || 'activa'}</span></div><p className="mt-2 text-xs text-zinc-500">{session.device || 'Dispositivo'} · {session.ip || 'IP no registrada'}</p></div>) : <p className="rounded-2xl bg-black/25 p-5 text-sm text-zinc-400">Aún no hay sesiones auditadas.</p>}
          </div>
        </article>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <QuickAction href="/admin/presupuestos" title="Crear presupuesto" text="Link comercial con vista cliente." icon={FileText} />
        <QuickAction href="/admin/clientes" title="Clientes" text="Contactos, historial y seguimiento." icon={Users} />
        <QuickAction href="/admin/proyectos" title="Proyectos" text="Obras, avances y entregas." icon={Briefcase} />
        <QuickAction href="/admin/monitor" title="Monitor" text="Latencia y salud de la app." icon={Gauge} />
      </section>
    </section>
  </main>;
}

function Status({ label, value, icon: Icon, online = true }: { label: string; value: string; icon: IconType; online?: boolean }) {
  return <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 p-4"><span className="flex items-center gap-2 text-sm font-bold text-zinc-300"><Icon className={`h-4 w-4 ${online ? 'text-yellow-300' : 'text-rose-300'}`} />{label}</span><b className="text-sm text-white">{value}</b></div>;
}
