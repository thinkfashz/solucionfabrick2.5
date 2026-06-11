'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, ArrowRight, BarChart3, Bell, Clock, FileText, Gauge, Loader2, Package, Receipt, ShieldCheck, Terminal, UserPlus, Users, Zap } from 'lucide-react';

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
function secondsToText(seconds?: number | null) { const s = Math.max(0, Number(seconds || 0)); if (s < 60) return `${s}s`; const m = Math.floor(s / 60); if (m < 60) return `${m}m ${s % 60}s`; const h = Math.floor(m / 60); return `${h}h ${m % 60}m`; }
function initials(name: string) { return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'SF'; }

function Metric({ title, value, hint, icon: Icon, tone = 'gold' }: { title: string; value: string | number; hint: string; icon: typeof Package; tone?: 'gold' | 'orange' | 'green' | 'cream' }) {
  const color = tone === 'orange' ? 'from-orange-500/25 via-amber-300/10 to-black/30 text-orange-100' : tone === 'green' ? 'from-emerald-400/20 via-yellow-300/8 to-black/30 text-emerald-100' : tone === 'cream' ? 'from-[#fff1d6]/18 via-yellow-300/8 to-black/30 text-[#fff1d6]' : 'from-yellow-300/24 via-orange-500/10 to-black/30 text-yellow-100';
  return <div className={`rounded-[2rem] border border-yellow-300/15 bg-gradient-to-br ${color} p-5 shadow-[0_24px_65px_rgba(0,0,0,.36)]`}><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#c9aa6a]">{title}</p><b className="mt-2 block text-3xl font-black tracking-tight text-white">{value}</b><span className="mt-1 block text-xs text-[#a99372]">{hint}</span></div><div className="grid h-11 w-11 place-items-center rounded-2xl border border-yellow-300/15 bg-black/35 backdrop-blur"><Icon className="h-5 w-5 text-yellow-300" /></div></div></div>;
}

function QuickAction({ href, title, text, icon: Icon }: { href: string; title: string; text: string; icon: typeof Package }) {
  return <Link href={href} className="group rounded-[1.8rem] border border-yellow-300/12 bg-[#120d08]/75 p-4 shadow-[0_18px_50px_rgba(0,0,0,.28)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-yellow-300/30 hover:bg-[#1d140b]"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-yellow-300/15 bg-gradient-to-br from-yellow-300/18 to-orange-500/10 text-yellow-200"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><b className="block text-white">{title}</b><span className="mt-1 block text-xs leading-5 text-[#9f8d74]">{text}</span></span><ArrowRight className="mt-3 h-4 w-4 text-yellow-300/35 transition group-hover:translate-x-1 group-hover:text-yellow-300" /></div></Link>;
}

export default function AdminLavaDashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastBeat, setLastBeat] = useState<string>('');

  async function load() { setError(''); try { const res = await fetch('/api/admin/dashboard/blue', { cache: 'no-store' }); const json = await res.json(); if (!res.ok) throw new Error(json.error || 'No se pudo cargar dashboard'); setData(json); } catch (err) { setError(err instanceof Error ? err.message : 'Error cargando dashboard'); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  useEffect(() => { let disposed = false; async function beat() { try { const res = await fetch('/api/admin/session/heartbeat', { method: 'POST', cache: 'no-store' }); const json = await res.json().catch(() => ({})); if (!disposed && res.ok) setLastBeat(json.ts || new Date().toISOString()); } catch {} } void beat(); const id = setInterval(() => { if (document.visibilityState === 'visible') void beat(); }, 45_000); const onVisible = () => { if (document.visibilityState === 'visible') void beat(); }; document.addEventListener('visibilitychange', onVisible); return () => { disposed = true; clearInterval(id); document.removeEventListener('visibilitychange', onVisible); }; }, []);

  const profile = data?.profile;
  const healthLines = useMemo(() => data?.console || [], [data]);

  if (loading) return <div className="grid min-h-[70vh] place-items-center bg-[#070503] text-white"><Loader2 className="h-8 w-8 animate-spin text-yellow-300" /></div>;

  return <main className="relative min-h-screen overflow-hidden bg-[#070503] p-3 text-white sm:p-6 lg:p-8">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(255,200,80,.24),transparent_30rem),radial-gradient(circle_at_92%_18%,rgba(255,96,24,.20),transparent_28rem),radial-gradient(circle_at_50%_100%,rgba(255,214,120,.08),transparent_26rem),linear-gradient(180deg,#160d05_0%,#080604_52%,#030201_100%)]" />
    <div className="pointer-events-none absolute inset-0 opacity-[.18] [background-image:linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:48px_48px]" />
    <div className="relative mx-auto grid max-w-7xl gap-5">
      {error && <div className="rounded-3xl border border-red-300/25 bg-red-500/10 p-4 text-sm text-red-100"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</div>}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <article className="relative overflow-hidden rounded-[2.5rem] border border-yellow-300/15 bg-[#0d0906]/82 p-5 shadow-[0_30px_90px_rgba(0,0,0,.38)] backdrop-blur-2xl sm:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,203,64,.16),transparent_22rem),radial-gradient(circle_at_100%_0%,rgba(255,110,24,.12),transparent_20rem)]" />
          <div className="relative absolute right-6 top-6 grid h-12 w-12 place-items-center rounded-full border border-yellow-300/15 bg-black/25"><Bell className="h-5 w-5 text-yellow-200" /></div>
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[1.7rem] border border-yellow-300/25 bg-black/45 shadow-2xl">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt={profile.name} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center bg-gradient-to-br from-yellow-300 via-orange-500 to-black text-xl font-black text-black">{initials(profile?.name || 'SF')}</div>}
            </div>
            <div><p className="text-sm text-[#bca989]">Bienvenido de vuelta</p><h1 className="mt-1 text-4xl font-black tracking-tight sm:text-6xl">{profile?.name || 'Administrador'}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#a99372]">{profile?.bio || 'Admin y dueño de Soluciones Fabrick'} · <span className="font-bold text-yellow-300">{profile?.role || 'admin'}</span></p></div>
          </div>

          <div className="relative mt-8 grid gap-3 sm:grid-cols-3"><Metric title="Ventas recientes" value={clp(data?.stats.revenue || 0)} hint="últimos pedidos cargados" icon={BarChart3} tone="gold" /><Metric title="Productos" value={data?.stats.products || 0} hint="activos o registrados" icon={Package} tone="green" /><Metric title="Presupuestos" value={data?.stats.budgets || 0} hint="propuestas generadas" icon={FileText} tone="orange" /></div>
          <div className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><QuickAction href="/admin/presupuestos" title="Crear presupuesto" text="Link comercial con vista cliente" icon={FileText} /><QuickAction href="/admin/invitaciones" title="Invitar demo" text="Crear acceso temporal o usuario prueba" icon={UserPlus} /><QuickAction href="/admin/facturas" title="Facturas DTE" text="Boletas, facturas y SII" icon={Receipt} /><QuickAction href="/admin/monitor" title="Monitor" text="Latencia y estado app" icon={Gauge} /></div>
        </article>

        <aside className="grid gap-5">
          <article className="rounded-[2.5rem] border border-yellow-300/15 bg-[#0d0906]/82 p-5 shadow-[0_25px_70px_rgba(0,0,0,.34)] backdrop-blur-2xl"><p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c9aa6a]">Estado del sistema</p><div className="mt-5 grid gap-3"><div className="flex items-center justify-between rounded-2xl border border-yellow-300/10 bg-black/25 p-4"><span className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4 text-emerald-300" />App</span><b>{data?.health.app}</b></div><div className="flex items-center justify-between rounded-2xl border border-yellow-300/10 bg-black/25 p-4"><span className="flex items-center gap-2 text-sm font-bold"><Zap className="h-4 w-4 text-yellow-300" />Latencia DB</span><b>{data?.health.latency_ms}ms</b></div><div className="flex items-center justify-between rounded-2xl border border-yellow-300/10 bg-black/25 p-4"><span className="flex items-center gap-2 text-sm font-bold"><Activity className="h-4 w-4 text-orange-300" />Heartbeat</span><b>{lastBeat ? 'Activo' : '...'}</b></div><div className="flex items-center justify-between rounded-2xl border border-yellow-300/10 bg-black/25 p-4"><span className="flex items-center gap-2 text-sm font-bold"><Clock className="h-4 w-4 text-[#fff1d6]" />Commit</span><b>{data?.health.last_deploy}</b></div></div></article>
          <article className="rounded-[2.5rem] border border-yellow-300/25 bg-gradient-to-br from-[#fff1d6] via-[#ffd166] to-[#ff8a1f] p-5 text-[#140b05] shadow-[0_25px_70px_rgba(0,0,0,.35)]"><p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#7b3b06]">Activación</p><h2 className="mt-3 text-3xl font-black">{data?.stats.orders || 0} pedidos</h2><p className="mt-2 text-sm text-[#63320a]">{data?.stats.invoices || 0} DTE · {data?.stats.leads || 0} leads · realtime bajo demanda.</p><Link href="/admin/analytics" className="mt-5 inline-flex rounded-full bg-black px-5 py-3 text-sm font-black text-yellow-200">Ver analytics</Link></article>
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]">
        <article className="overflow-hidden rounded-[2.5rem] border border-yellow-300/20 bg-gradient-to-br from-[#fff1d6] via-[#ffd166] to-[#ff8a1f] p-5 text-[#140b05] shadow-[0_25px_80px_rgba(0,0,0,.34)] sm:p-6"><div className="flex items-center justify-between"><h2 className="text-2xl font-black">Sesiones y dispositivos</h2><Users className="h-5 w-5" /></div><div className="mt-5 grid gap-3">{(data?.sessions || []).slice(0, 8).map((session) => <div key={session.session_id} className="grid gap-3 rounded-[1.5rem] bg-black/10 p-4 shadow-sm sm:grid-cols-[1fr_auto] sm:items-center"><div><b className="block">{session.email || 'usuario'}</b><p className="mt-1 text-xs text-[#63320a]">{session.device || 'dispositivo'} · {session.ip || 'sin IP'}</p><p className="mt-1 text-xs text-[#7b3b06]">{session.location_hint || 'sin ubicación'} · {new Date(session.login_at).toLocaleString('es-CL')}</p></div><div className="text-left sm:text-right"><span className={`rounded-full px-3 py-1 text-xs font-black ${session.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-black/15 text-[#63320a]'}`}>{session.status}</span><p className="mt-2 text-xs text-[#63320a]">{secondsToText(session.duration_seconds)}</p></div></div>)}{!data?.sessions?.length && <p className="rounded-2xl bg-black/10 p-4 text-sm text-[#63320a]">Aún no hay sesiones registradas. El próximo login quedará guardado.</p>}</div></article>
        <article className="rounded-[2.5rem] border border-yellow-300/15 bg-[#080604] p-5 shadow-[0_25px_80px_rgba(0,0,0,.45)] sm:p-6"><div className="flex items-center justify-between"><h2 className="text-2xl font-black text-white">Consola liviana</h2><Terminal className="h-5 w-5 text-yellow-300" /></div><div className="mt-5 rounded-[1.5rem] border border-yellow-300/10 bg-black/55 p-4 font-mono text-xs leading-6 text-yellow-100">{healthLines.map((line) => <p key={line}>{line}</p>)}<p>[HEARTBEAT] {lastBeat ? new Date(lastBeat).toLocaleTimeString('es-CL') : 'esperando...'}</p></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><QuickAction href="/admin/vercel-logs" title="Logs Vercel" text="Build y runtime" icon={Terminal} /><QuickAction href="/admin/sesiones" title="Auditoría" text="Ver registros completos" icon={ShieldCheck} /></div></article>
      </section>
    </div>
  </main>;
}
