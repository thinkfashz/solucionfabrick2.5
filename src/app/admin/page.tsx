'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, ArrowRight, BarChart3, Bell, Clock, FileText, Gauge, Link2, Loader2, Package, Receipt, ShieldCheck, ShoppingCart, Sparkles, Terminal, UserPlus, Users, Zap } from 'lucide-react';

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

function clp(value: number) {
  return '$' + Math.round(Number(value || 0)).toLocaleString('es-CL');
}

function secondsToText(seconds?: number | null) {
  const s = Math.max(0, Number(seconds || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'SF';
}

function Metric({ title, value, hint, icon: Icon, tone = 'blue' }: { title: string; value: string | number; hint: string; icon: typeof Package; tone?: 'blue' | 'yellow' | 'green' | 'pink' }) {
  const color = tone === 'yellow' ? 'from-yellow-300/25 to-yellow-100/5 text-yellow-200' : tone === 'green' ? 'from-emerald-300/25 to-emerald-100/5 text-emerald-200' : tone === 'pink' ? 'from-fuchsia-300/25 to-fuchsia-100/5 text-fuchsia-200' : 'from-sky-300/25 to-blue-100/5 text-sky-100';
  return <div className={`rounded-[2rem] border border-white/10 bg-gradient-to-br ${color} p-5 shadow-[0_24px_65px_rgba(0,0,0,.22)]`}><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/50">{title}</p><b className="mt-2 block text-3xl font-black tracking-tight text-white">{value}</b><span className="mt-1 block text-xs text-white/55">{hint}</span></div><div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 backdrop-blur"><Icon className="h-5 w-5" /></div></div></div>;
}

function QuickAction({ href, title, text, icon: Icon }: { href: string; title: string; text: string; icon: typeof Package }) {
  return <Link href={href} className="group rounded-[1.8rem] border border-white/10 bg-white/[0.075] p-4 shadow-[0_18px_50px_rgba(0,0,0,.18)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/12"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/12 text-sky-100"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><b className="block text-white">{title}</b><span className="mt-1 block text-xs leading-5 text-white/55">{text}</span></span><ArrowRight className="mt-3 h-4 w-4 text-white/30 transition group-hover:translate-x-1 group-hover:text-white" /></div></Link>;
}

export default function AdminBlueDashboardPage() {
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
  const healthLines = useMemo(() => data?.console || [], [data]);

  if (loading) return <div className="grid min-h-[70vh] place-items-center text-white"><Loader2 className="h-8 w-8 animate-spin text-sky-200" /></div>;

  return <main className="relative min-h-screen overflow-hidden bg-[#08243d] p-3 text-white sm:p-6 lg:p-8">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(124,190,255,.28),transparent_32rem),radial-gradient(circle_at_90%_20%,rgba(255,255,255,.13),transparent_26rem),linear-gradient(180deg,#08243d,#07192c_55%,#06111f)]" />
    <div className="relative mx-auto grid max-w-7xl gap-5">
      {error && <div className="rounded-3xl border border-red-300/25 bg-red-500/10 p-4 text-sm text-red-100"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</div>}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <article className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.075] p-5 shadow-[0_30px_90px_rgba(0,0,0,.25)] backdrop-blur-2xl sm:p-7">
          <div className="absolute right-6 top-6 grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-white/10"><Bell className="h-5 w-5 text-white/80" /></div>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[1.7rem] border border-white/20 bg-white/10 shadow-2xl">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt={profile.name} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center bg-gradient-to-br from-sky-200 to-blue-900 text-xl font-black">{initials(profile?.name || 'SF')}</div>}
            </div>
            <div>
              <p className="text-sm text-white/55">Bienvenido de vuelta</p>
              <h1 className="mt-1 text-4xl font-black tracking-tight sm:text-6xl">{profile?.name || 'Administrador'}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">{profile?.bio || 'Admin y dueño de Soluciones Fabrick'} · <span className="font-bold text-sky-100">{profile?.role || 'admin'}</span></p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Metric title="Ventas recientes" value={clp(data?.stats.revenue || 0)} hint="últimos pedidos cargados" icon={BarChart3} tone="blue" />
            <Metric title="Productos" value={data?.stats.products || 0} hint="activos o registrados" icon={Package} tone="green" />
            <Metric title="Presupuestos" value={data?.stats.budgets || 0} hint="propuestas generadas" icon={FileText} tone="yellow" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <QuickAction href="/admin/presupuestos" title="Crear presupuesto" text="Link comercial con vista cliente" icon={FileText} />
            <QuickAction href="/admin/invitaciones" title="Invitar demo" text="Crear acceso temporal o usuario prueba" icon={UserPlus} />
            <QuickAction href="/admin/facturas" title="Facturas DTE" text="Boletas, facturas y SII" icon={Receipt} />
            <QuickAction href="/admin/monitor" title="Monitor" text="Latencia y estado app" icon={Gauge} />
          </div>
        </article>

        <aside className="grid gap-5">
          <article className="rounded-[2.5rem] border border-white/10 bg-white/[0.085] p-5 shadow-[0_25px_70px_rgba(0,0,0,.22)] backdrop-blur-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/45">Estado del sistema</p>
            <div className="mt-5 grid gap-3">
              <div className="flex items-center justify-between rounded-2xl bg-white/10 p-4"><span className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4 text-emerald-300" />App</span><b>{data?.health.app}</b></div>
              <div className="flex items-center justify-between rounded-2xl bg-white/10 p-4"><span className="flex items-center gap-2 text-sm font-bold"><Zap className="h-4 w-4 text-yellow-200" />Latencia DB</span><b>{data?.health.latency_ms}ms</b></div>
              <div className="flex items-center justify-between rounded-2xl bg-white/10 p-4"><span className="flex items-center gap-2 text-sm font-bold"><Activity className="h-4 w-4 text-sky-200" />Heartbeat</span><b>{lastBeat ? 'Activo' : '...'}</b></div>
              <div className="flex items-center justify-between rounded-2xl bg-white/10 p-4"><span className="flex items-center gap-2 text-sm font-bold"><Clock className="h-4 w-4 text-fuchsia-200" />Commit</span><b>{data?.health.last_deploy}</b></div>
            </div>
          </article>
          <article className="rounded-[2.5rem] border border-white/10 bg-[#d9ecff] p-5 text-[#0a2540] shadow-[0_25px_70px_rgba(0,0,0,.25)]">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#41637f]">Activación</p>
            <h2 className="mt-3 text-3xl font-black">{data?.stats.orders || 0} pedidos</h2>
            <p className="mt-2 text-sm text-[#41637f]">{data?.stats.invoices || 0} DTE · {data?.stats.leads || 0} leads · realtime bajo demanda.</p>
            <Link href="/admin/analytics" className="mt-5 inline-flex rounded-full bg-[#f4bf38] px-5 py-3 text-sm font-black text-[#0a2540]">Ver analytics</Link>
          </article>
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]">
        <article className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#d9ecff] p-5 text-[#0a2540] shadow-[0_25px_80px_rgba(0,0,0,.22)] sm:p-6">
          <div className="flex items-center justify-between"><h2 className="text-2xl font-black">Sesiones y dispositivos</h2><Users className="h-5 w-5" /></div>
          <div className="mt-5 grid gap-3">
            {(data?.sessions || []).slice(0, 8).map((session) => <div key={session.session_id} className="grid gap-3 rounded-[1.5rem] bg-white/65 p-4 shadow-sm sm:grid-cols-[1fr_auto] sm:items-center"><div><b className="block">{session.email || 'usuario'}</b><p className="mt-1 text-xs text-[#496b86]">{session.device || 'dispositivo'} · {session.ip || 'sin IP'}</p><p className="mt-1 text-xs text-[#6e8aa1]">{session.location_hint || 'sin ubicación'} · {new Date(session.login_at).toLocaleString('es-CL')}</p></div><div className="text-left sm:text-right"><span className={`rounded-full px-3 py-1 text-xs font-black ${session.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{session.status}</span><p className="mt-2 text-xs text-[#496b86]">{secondsToText(session.duration_seconds)}</p></div></div>)}
            {!data?.sessions?.length && <p className="rounded-2xl bg-white/60 p-4 text-sm text-[#496b86]">Aún no hay sesiones registradas. El próximo login quedará guardado.</p>}
          </div>
        </article>

        <article className="rounded-[2.5rem] border border-white/10 bg-[#06111f] p-5 shadow-[0_25px_80px_rgba(0,0,0,.35)] sm:p-6">
          <div className="flex items-center justify-between"><h2 className="text-2xl font-black text-white">Consola liviana</h2><Terminal className="h-5 w-5 text-sky-200" /></div>
          <div className="mt-5 rounded-[1.5rem] border border-sky-200/10 bg-black/45 p-4 font-mono text-xs leading-6 text-sky-100">
            {healthLines.map((line) => <p key={line}>{line}</p>)}
            <p>[HEARTBEAT] {lastBeat ? new Date(lastBeat).toLocaleTimeString('es-CL') : 'esperando...'}</p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><QuickAction href="/admin/vercel-logs" title="Logs Vercel" text="Build y runtime" icon={Terminal} /><QuickAction href="/admin/sesiones" title="Auditoría" text="Ver registros completos" icon={ShieldCheck} /></div>
        </article>
      </section>
    </div>
  </main>;
}
