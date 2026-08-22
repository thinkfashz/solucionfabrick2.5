'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Bot, Clock3, Globe2, Loader2, Monitor, MousePointer2, RefreshCw, Search, ShieldCheck, Smartphone, Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AdminPage, AdminPageHeader, AdminStat, AdminStats, AdminSurface } from '@/components/admin/AdminPage';

type Item = { name: string; value: number };
type Visit = { date: string; visitor: string; session?: string | null; page: string; title?: string | null; source: string; medium?: string | null; campaign?: string | null; browser: string; device: string; type: string; country?: string | null; region?: string | null; city?: string | null; ipHash?: string | null; language?: string | null; screen?: string | null };
type Payload = {
  summary: { pageViews: number; visitors: number; sessions: number; avgDuration: number; bounceEstimate: number };
  daily: Array<{ date: string; label: string; views: number; visitors: number }>;
  sources: Item[]; pages: Item[]; browsers: Item[]; devices: Item[]; visitorTypes: Item[]; countries: Item[]; visits: Visit[]; privacy: string;
};

function duration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [days, setDays] = useState('30');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/analytics?days=${days}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar la analítica.');
      setData(json);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error cargando analítica.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  const visits = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (data?.visits || []).filter((visit) => !normalized || `${visit.page} ${visit.source} ${visit.browser} ${visit.device} ${visit.country || ''} ${visit.city || ''} ${visit.ipHash || ''}`.toLowerCase().includes(normalized));
  }, [data, query]);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Analítica web"
        title="Rendimiento y comportamiento del sitio"
        description="Visitas, sesiones, fuentes, páginas, dispositivos y navegación en una vista operativa sin mezclar estas métricas con la analítica contable."
        actions={(
          <>
            <select value={days} onChange={(event) => setDays(event.target.value)} className="min-h-10 rounded-xl border border-black/10 bg-white/70 px-3 text-sm font-bold text-[#171612] outline-none">
              <option value="7">7 días</option>
              <option value="30">30 días</option>
              <option value="90">90 días</option>
            </select>
            <button onClick={() => void load()} className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-[#171612] text-[#FFB000]" aria-label="Actualizar analítica">
              <RefreshCw className="h-4 w-4" />
            </button>
          </>
        )}
      />

      {loading ? <div className="grid min-h-[42vh] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-[#c77a00]" /></div> : null}
      {message ? <div className="rounded-xl border border-red-900/10 bg-red-50/70 px-4 py-3 text-sm text-red-800">{message}</div> : null}

      {data && !loading ? (
        <>
          <AdminStats className="xl:grid-cols-5">
            <AdminStat label="Vistas" value={data.summary.pageViews.toLocaleString('es-CL')} note="Páginas cargadas" icon={MousePointer2} />
            <AdminStat label="Visitantes" value={data.summary.visitors.toLocaleString('es-CL')} note="Identificadores anónimos" icon={Users} />
            <AdminStat label="Sesiones" value={data.summary.sessions.toLocaleString('es-CL')} note="Navegaciones agrupadas" icon={Activity} />
            <AdminStat label="Tiempo medio" value={duration(data.summary.avgDuration)} note="Duración registrada" icon={Clock3} />
            <AdminStat label="Rebote estimado" value={`${data.summary.bounceEstimate}%`} note="Sesiones con una sola vista" icon={Globe2} />
          </AdminStats>

          <div className="grid gap-4 xl:grid-cols-[1.45fr_.55fr]">
            <AdminSurface title="Visitas por día" description="Evolución de vistas y visitantes únicos en el período seleccionado.">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.daily}>
                    <defs>
                      <linearGradient id="views" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F5871F" stopOpacity={.28} />
                        <stop offset="95%" stopColor="#F5871F" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeOpacity={.08} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="views" name="Vistas" stroke="#F5871F" strokeWidth={3} fill="url(#views)" />
                    <Area type="monotone" dataKey="visitors" name="Visitantes" stroke="#171612" strokeWidth={2} fill="transparent" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </AdminSurface>
            <RankPanel title="Principales orígenes" items={data.sources} icon={Globe2} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <RankPanel title="Páginas más vistas" items={data.pages} icon={MousePointer2} />
            <RankPanel title="Navegadores" items={data.browsers} icon={Monitor} />
            <RankPanel title="Dispositivos" items={data.devices} icon={Smartphone} />
            <RankPanel title="Humano o bot" items={data.visitorTypes} icon={Bot} />
          </div>

          <AdminSurface
            title="Registro detallado"
            description="La IP se conserva únicamente como huella anonimizada."
            actions={(
              <label className="flex min-w-[240px] items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3 py-2.5">
                <Search className="h-4 w-4 text-[#c77a00]" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar página, origen…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
              </label>
            )}
          >
            <div className="overflow-x-auto">
              <table className="min-w-[1080px] w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-black/10 text-[9px] uppercase tracking-[.14em] text-[#8f887c]">
                    <th className="py-3 pr-4">Fecha</th><th className="py-3 pr-4">Página</th><th className="py-3 pr-4">Origen</th><th className="py-3 pr-4">Navegador</th><th className="py-3 pr-4">Dispositivo</th><th className="py-3 pr-4">Tipo</th><th className="py-3 pr-4">Ubicación</th><th className="py-3">IP anonimizada</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((visit, index) => (
                    <tr key={`${visit.date}-${index}`} className="border-b border-black/[.055] last:border-0">
                      <td className="py-3 pr-4 whitespace-nowrap">{new Date(visit.date).toLocaleString('es-CL')}</td>
                      <td className="py-3 pr-4 max-w-[280px] truncate font-bold">{visit.page}</td>
                      <td className="py-3 pr-4">{visit.source}</td>
                      <td className="py-3 pr-4">{visit.browser}</td>
                      <td className="py-3 pr-4">{visit.device}</td>
                      <td className="py-3 pr-4">{visit.type}</td>
                      <td className="py-3 pr-4">{[visit.city, visit.region, visit.country].filter(Boolean).join(', ') || '—'}</td>
                      <td className="py-3 font-mono text-[10px]">{visit.ipHash || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminSurface>

          <div className="flex items-start gap-2 border-t border-black/10 pt-4 text-xs leading-6 text-[#817a6f]">
            <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[#c77a00]" />
            <p>{data.privacy} El género no se deduce porque no puede determinarse de forma fiable mediante IP, navegador o dispositivo.</p>
          </div>
        </>
      ) : null}
    </AdminPage>
  );
}

function RankPanel({ title, items, icon: Icon }: { title: string; items: Item[]; icon: typeof Globe2 }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <AdminSurface title={title}>
      <div className="mb-4 flex items-center gap-2 text-[#c77a00]"><Icon className="h-4 w-4" /></div>
      <div className="space-y-4">
        {items.slice(0, 8).map((item) => (
          <div key={item.name}>
            <div className="flex justify-between gap-3 text-xs"><span className="truncate text-[#817a6f]">{item.name}</span><b>{item.value}</b></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[.06]"><span className="block h-full rounded-full bg-[#F5871F]" style={{ width: `${Math.max(5, (item.value / max) * 100)}%` }} /></div>
          </div>
        ))}
      </div>
    </AdminSurface>
  );
}
