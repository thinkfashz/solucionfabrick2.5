'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Bot, Clock3, Globe2, Loader2, Monitor, MousePointer2, RefreshCw, Search, ShieldCheck, Smartphone, Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Item = { name: string; value: number };
type Visit = { date: string; visitor: string; session?: string | null; page: string; title?: string | null; source: string; medium?: string | null; campaign?: string | null; browser: string; device: string; type: string; country?: string | null; region?: string | null; city?: string | null; ipHash?: string | null; language?: string | null; screen?: string | null };
type Payload = {
  summary: { pageViews: number; visitors: number; sessions: number; avgDuration: number; bounceEstimate: number };
  daily: Array<{ date: string; label: string; views: number; visitors: number }>;
  sources: Item[]; pages: Item[]; browsers: Item[]; devices: Item[]; visitorTypes: Item[]; countries: Item[]; visits: Visit[]; privacy: string;
};

function duration(seconds: number) {
  const minutes = Math.floor(seconds / 60); const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
}

function Metric({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof Users }) {
  return <article className="rounded-[1.7rem] bg-white p-5 shadow-[0_18px_55px_rgba(23,24,32,.08)]"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#08090A] text-[#FFB000]"><Icon className="h-5 w-5" /></span><p className="mt-5 text-[9px] font-black uppercase tracking-[.18em] text-[#BFB8AC]">{label}</p><b className="mt-1 block text-3xl tracking-[-.05em]">{value}</b><p className="mt-2 text-xs leading-5 text-[#BFB8AC]">{note}</p></article>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [days, setDays] = useState('30');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/analytics?days=${days}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar la analítica.');
      setData(json);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Error cargando analítica.'); }
    finally { setLoading(false); }
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  const visits = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (data?.visits || []).filter((visit) => !normalized || `${visit.page} ${visit.source} ${visit.browser} ${visit.device} ${visit.country || ''} ${visit.city || ''} ${visit.ipHash || ''}`.toLowerCase().includes(normalized));
  }, [data, query]);

  return (
    <main className="min-h-screen bg-[#FFF9EE] pb-24 text-[#08090A] lg:pb-8">
      <section className="rounded-[2.3rem] bg-[#08090A] p-6 text-[#FFF9EE] shadow-[0_28px_90px_rgba(23,24,32,.24)] sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><span className="inline-flex items-center gap-2 rounded-full bg-[#F5871F]/18 px-3 py-2 text-[9px] font-black uppercase tracking-[.2em] text-[#F2DFBB]"><Activity className="h-3.5 w-3.5" /> Analítica del sitio</span><h1 className="mt-4 text-4xl font-black tracking-[-.06em] sm:text-6xl">Quién llega, desde dónde y qué consulta.</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-white/55">Vistas, sesiones, origen, páginas, navegador, dispositivo, duración y ubicación aproximada en un único panel.</p></div><div className="flex gap-2"><select value={days} onChange={(event) => setDays(event.target.value)} className="min-h-12 rounded-2xl bg-white/8 px-4 text-sm font-black text-white outline-none [&>option]:bg-[#08090A]"><option value="7">7 días</option><option value="30">30 días</option><option value="90">90 días</option></select><button onClick={() => void load()} className="grid h-12 w-12 place-items-center rounded-2xl bg-[#F5871F] text-[#08090A]"><RefreshCw className="h-4 w-4" /></button></div></div>
      </section>

      {loading ? <div className="grid min-h-[45vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-[#F5871F]" /></div> : null}
      {message ? <p className="mt-5 rounded-2xl bg-[#F2DFBB] p-4 text-sm text-[#BFB8AC]">{message}</p> : null}

      {data && !loading ? <div className="mt-6 space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Vistas" value={data.summary.pageViews.toLocaleString('es-CL')} note="Páginas cargadas" icon={MousePointer2} /><Metric label="Visitantes" value={data.summary.visitors.toLocaleString('es-CL')} note="Identificadores anónimos" icon={Users} /><Metric label="Sesiones" value={data.summary.sessions.toLocaleString('es-CL')} note="Navegaciones agrupadas" icon={Activity} /><Metric label="Tiempo medio" value={duration(data.summary.avgDuration)} note="Duración registrada" icon={Clock3} /><Metric label="Rebote estimado" value={`${data.summary.bounceEstimate}%`} note="Sesiones con una sola vista" icon={Globe2} /></section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]"><article className="rounded-[2rem] bg-white p-5 shadow-[0_20px_65px_rgba(23,24,32,.08)]"><h2 className="text-2xl font-black">Visitas por día</h2><div className="mt-5 h-[340px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.daily}><defs><linearGradient id="views" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F5871F" stopOpacity={.35}/><stop offset="95%" stopColor="#F5871F" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} strokeOpacity={.08}/><XAxis dataKey="label" tickLine={false} axisLine={false}/><YAxis tickLine={false} axisLine={false}/><Tooltip/><Area type="monotone" dataKey="views" name="Vistas" stroke="#F5871F" strokeWidth={3} fill="url(#views)"/><Area type="monotone" dataKey="visitors" name="Visitantes" stroke="#08090A" strokeWidth={2} fill="transparent"/></AreaChart></ResponsiveContainer></div></article><RankCard title="Principales orígenes" items={data.sources} icon={Globe2} /></section>

        <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4"><RankCard title="Páginas más vistas" items={data.pages} icon={MousePointer2} /><RankCard title="Navegadores" items={data.browsers} icon={Monitor} /><RankCard title="Dispositivos" items={data.devices} icon={Smartphone} /><RankCard title="Humano o bot" items={data.visitorTypes} icon={Bot} /></section>

        <section className="rounded-[2rem] bg-white p-5 shadow-[0_20px_65px_rgba(23,24,32,.08)] sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-2xl font-black">Registro detallado de visitas</h2><p className="mt-2 text-sm text-[#BFB8AC]">La IP se muestra como huella anonimizada; no se almacena ni revela la IP completa.</p></div><label className="flex min-w-[280px] items-center gap-2 rounded-2xl bg-[#FFF9EE] px-4 py-3"><Search className="h-4 w-4 text-[#F5871F]"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar página, origen, navegador…" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></label></div><div className="mt-5 overflow-x-auto"><table className="min-w-[1100px] w-full text-left text-xs"><thead><tr className="text-[9px] uppercase tracking-[.14em] text-[#BFB8AC]"><th className="pb-3">Fecha</th><th className="pb-3">Página</th><th className="pb-3">Origen</th><th className="pb-3">Navegador</th><th className="pb-3">Dispositivo</th><th className="pb-3">Tipo</th><th className="pb-3">Ubicación</th><th className="pb-3">IP anonimizada</th></tr></thead><tbody>{visits.map((visit, index) => <tr key={`${visit.date}-${index}`} className="border-t border-[#08090A]/7"><td className="py-3 pr-4 whitespace-nowrap">{new Date(visit.date).toLocaleString('es-CL')}</td><td className="py-3 pr-4 max-w-[280px] truncate font-bold">{visit.page}</td><td className="py-3 pr-4">{visit.source}</td><td className="py-3 pr-4">{visit.browser}</td><td className="py-3 pr-4">{visit.device}</td><td className="py-3 pr-4">{visit.type}</td><td className="py-3 pr-4">{[visit.city, visit.region, visit.country].filter(Boolean).join(', ') || '—'}</td><td className="py-3 font-mono text-[10px]">{visit.ipHash || '—'}</td></tr>)}</tbody></table></div></section>

        <p className="flex items-start gap-2 rounded-2xl bg-[#F2DFBB] p-4 text-xs leading-6 text-[#BFB8AC]"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[#F5871F]" />{data.privacy} El género no se deduce porque no puede determinarse de forma fiable mediante IP, navegador o dispositivo.</p>
      </div> : null}
    </main>
  );
}

function RankCard({ title, items, icon: Icon }: { title: string; items: Item[]; icon: typeof Globe2 }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return <article className="rounded-[2rem] bg-white p-5 shadow-[0_20px_65px_rgba(23,24,32,.08)]"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#08090A] text-[#FFB000]"><Icon className="h-4 w-4"/></span><h3 className="text-lg font-black">{title}</h3></div><div className="mt-5 space-y-4">{items.slice(0, 8).map((item) => <div key={item.name}><div className="flex justify-between gap-3 text-xs"><span className="truncate text-[#BFB8AC]">{item.name}</span><b>{item.value}</b></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#F1E5D8]"><span className="block h-full rounded-full bg-[#F5871F]" style={{ width: `${Math.max(5, (item.value / max) * 100)}%` }}/></div></div>)}</div></article>;
}
