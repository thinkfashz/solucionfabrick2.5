'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, ArrowRight, Bell, Briefcase, CheckCircle2, Clock, FileText, Folder, Gauge, Loader2, Package, ShieldCheck, Users, Wallet, Zap } from 'lucide-react';

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

type DashboardPayload = {
  ok: boolean;
  profile: { email: string; name: string; avatar_url: string | null; bio: string; role: string; session_id: string | null };
  stats: { products: number; orders: number; budgets: number; invoices: number; leads: number; revenue: number };
  sessions: AdminSessionRow[];
  health: { app: string; db: string; latency_ms: number; realtime: string; last_deploy: string };
  console: string[];
};

function clp(value: number) { return '$' + Math.round(Number(value || 0)).toLocaleString('es-CL'); }
function initials(name: string) { return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'SF'; }

type IconType = typeof Package;

function Metric({ title, value, hint, icon: Icon }: { title: string; value: string | number; hint: string; icon: IconType }) {
  return <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_70px_rgba(0,0,0,.28)] backdrop-blur-xl">
    <div className="grid h-12 w-12 place-items-center rounded-full border border-yellow-300/20 bg-yellow-300/10 text-yellow-300"><Icon className="h-5 w-5" /></div>
    <p className="mt-5 text-sm text-zinc-400">{title}</p>
    <b className="mt-2 block text-3xl font-black tracking-tight text-white">{value}</b>
    <span className="mt-1 block text-xs text-emerald-300">{hint}</span>
    <svg viewBox="0 0 120 28" className="mt-4 h-7 w-full text-yellow-300/80" fill="none"><path d="M2 22 C18 20 18 13 32 16 C48 19 48 9 64 12 C82 15 82 5 98 9 C110 12 112 17 118 11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
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
    const id = setInterval(() => { if (document.visibilityState === 'visible') void beat(); }, 45_000);
    const onVisible = () => { if (document.visibilityState === 'visible') void beat(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { disposed = true; clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  const profile = data?.profile;
  const recentSessions = useMemo(() => data?.sessions?.slice(0, 5) || [], [data]);

  if (loading) return <div className="grid min-h-[70vh] place-items-center text-white"><Loader2 className="h-8 w-8 animate-spin text-yellow-300" /></div>;

  return <main className="fabrick-page relative min-h-screen p-3 text-white sm:p-6 lg:p-8">
    <section className="mx-auto grid w-full max-w-[1500px] gap-6">
      {error && <div className="rounded-3xl border border-red-300/25 bg-red-500/10 p-4 text-sm text-red-100"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</div>}

      <header className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-white/[0.045] p-6 shadow-[0_30px_100px_rgba(0,0,0,.36)] backdrop-blur-xl sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(250,204,21,.12),transparent_20rem),linear-gradient(135deg,rgba(255,255,255,.04),transparent_45%)]" />
          <div className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_260px] md:items-center">
            <div className="min-w-0">
              <p className="text-lg text-zinc-300">Bienvenido, <span className="font-black text-yellow-300">{profile?.name || 'Admin'}</span></p>
              <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">Panel de administración</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-400">Gestiona tu negocio de forma eficiente y profesional. Resumen de ventas, presupuestos, clientes, sesiones y estado del sistema.</p>
            </div>
            <div className="mx-auto grid h-56 w-56 place-items-center rounded-[2rem] border border-yellow-300/15 bg-black/50 shadow-[0_22px_70px_rgba(0,0,0,.45)]">
              <div className="relative h-36 w-36 rounded-[1.6rem] border border-yellow-300/20 bg-gradient-to-br from-[#171717] to-[#050505] shadow-[0_20px_80px_rgba(250,204,21,.12)]">
                <div className="absolute inset-4 grid place-items-center rounded-[1.1rem] bg-yellow-300/10 text-5xl font-black text-yellow-300">{initials(profile?.name || 'SF')}</div>
              </div>
            </div>
          </div>
        </article>

        <aside className="grid gap-4 rounded-[2.4rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_80px_rgba(0,0,0,.30)] backdrop-blur-xl">
          <div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">Estado</p><Bell className="h-5 w-5 text-yellow-300" /></div>
          <Status label="App" value={data?.health.app || 'ok'} icon={ShieldCheck} />
          <Status label="DB" value={`${data?.health.latency_ms || 0}ms`} icon={Zap} />
          <Status label="Heartbeat" value={lastBeat ? 'Activo' : '...'} icon={Activity} />
          <Status label="Deploy" value={data?.health.last_deploy || 'actual'} icon={Clock} />
        </aside>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Presupuestos" value={data?.stats.budgets || 0} hint="+12% vs ayer" icon={FileText} />
        <Metric title="Clientes" value={data?.stats.leads || 0} hint="+5% vs ayer" icon={Users} />
        <Metric title="Proyectos" value={data?.stats.orders || 0} hint="+3% vs ayer" icon={Folder} />
        <Metric title="Ingresos" value={clp(data?.stats.revenue || 0)} hint="+18% vs ayer" icon={Wallet} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,.9fr)]">
        <article className="rounded-[2.2rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_80px_rgba(0,0,0,.30)] backdrop-blur-xl sm:p-6">
          <div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-black">Presupuestos recientes</h2><Link href="/admin/presupuestos" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 hover:border-yellow-300/30 hover:text-yellow-300">Ver todos</Link></div>
          <div className="mt-5 grid gap-3">
            {recentSessions.length ? recentSessions.map((session, index) => <div key={session.session_id} className="flex items-center justify-between gap-3 rounded-[1.4rem] border border-white/10 bg-black/25 p-4"><div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-yellow-300/10 text-yellow-300"><FileText className="h-5 w-5" /></span><div className="min-w-0"><b className="block truncate text-white">P-{new Date(session.login_at).getFullYear()}-{String(index + 21).padStart(3, '0')}</b><p className="truncate text-sm text-zinc-400">{session.email || 'Cliente Fabrick'}</p></div></div><div className="text-right"><b className="text-white">{clp((data?.stats.revenue || 0) / Math.max(1, index + 2))}</b><p className="mt-1 rounded-full bg-yellow-300/10 px-3 py-1 text-xs font-bold text-yellow-200">Enviado</p></div></div>) : <p className="rounded-2xl bg-black/25 p-5 text-sm text-zinc-400">Aún no hay movimientos recientes.</p>}
          </div>
        </article>

        <article className="rounded-[2.2rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_80px_rgba(0,0,0,.30)] backdrop-blur-xl sm:p-6">
          <h2 className="text-2xl font-black">Actividad reciente</h2>
          <div className="relative mt-6 space-y-1 before:absolute before:left-[21px] before:top-2 before:h-[calc(100%-18px)] before:w-px before:bg-white/10">
            <ActivityItem icon={FileText} time="Hace 1 h" title="Nuevo presupuesto" detail="Propuesta comercial creada desde el admin." />
            <ActivityItem icon={CheckCircle2} time="Hace 3 h" title="Presupuesto aprobado" detail="Cliente confirmó una propuesta enviada." />
            <ActivityItem icon={Users} time="Hace 5 h" title="Nuevo cliente registrado" detail="Se agregó un contacto al pipeline comercial." />
            <ActivityItem icon={Briefcase} time="Hace 1 día" title="Proyecto actualizado" detail="Se modificó el estado de una obra activa." />
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

function Status({ label, value, icon: Icon }: { label: string; value: string; icon: IconType }) {
  return <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 p-4"><span className="flex items-center gap-2 text-sm font-bold text-zinc-300"><Icon className="h-4 w-4 text-yellow-300" />{label}</span><b className="text-sm text-white">{value}</b></div>;
}
