'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  Calculator,
  ClipboardCheck,
  Clock3,
  Globe2,
  Loader2,
  MessageCircle,
  Monitor,
  MousePointer2,
  PackagePlus,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Users,
  Wrench,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AdminPage, AdminPageHeader, AdminStat, AdminStats, AdminSurface } from '@/components/admin/AdminPage';

type Item = { name: string; value: number };
type Visit = { date: string; visitor: string; session?: string | null; page: string; title?: string | null; source: string; medium?: string | null; campaign?: string | null; browser: string; device: string; type: string; country?: string | null; region?: string | null; city?: string | null; ipHash?: string | null; language?: string | null; screen?: string | null };
type BudgetInteraction = {
  date?: string;
  event: string;
  visitor: string;
  session?: string | null;
  category?: string | null;
  service?: string | null;
  product?: string | null;
  channel?: string | null;
  quoteId?: string | null;
  totalLow?: number;
  totalHigh?: number;
  unit?: string | null;
  entryMode?: string | null;
  priceMode?: string | null;
  quantity?: number;
};
type BudgetAnalytics = {
  interactions: number;
  serviceSelections: number;
  servicesAdded: number;
  productsAdded: number;
  receiptViews: number;
  submissions: number;
  whatsappOpens: number;
  conversionRate: number;
  topServices: Item[];
  topAreas: Item[];
  topProducts: Item[];
  recent: BudgetInteraction[];
};
type Payload = {
  summary: { pageViews: number; visitors: number; sessions: number; avgDuration: number; bounceEstimate: number };
  daily: Array<{ date: string; label: string; views: number; visitors: number }>;
  sources: Item[];
  pages: Item[];
  browsers: Item[];
  devices: Item[];
  visitorTypes: Item[];
  countries: Item[];
  visits: Visit[];
  budget?: BudgetAnalytics;
  privacy: string;
};

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function duration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
}

function rangeText(low = 0, high = 0) {
  if (!low && !high) return '—';
  return Math.round(low) === Math.round(high) ? CLP.format(low) : `${CLP.format(low)} – ${CLP.format(high)}`;
}

function eventLabel(event: string) {
  const labels: Record<string, string> = {
    budget_category_selected: 'Área seleccionada',
    budget_service_selected: 'Servicio visto',
    budget_service_added: 'Servicio agregado',
    budget_product_added: 'Producto agregado',
    budget_receipt_viewed: 'Boleta revisada',
    budget_submitted: 'Presupuesto confirmado',
    budget_whatsapp_opened: 'Continuó por WhatsApp',
  };
  return labels[event] || event;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [days, setDays] = useState('30');
  const [query, setQuery] = useState('');
  const [budgetQuery, setBudgetQuery] = useState('');
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

  const budgetInteractions = useMemo(() => {
    const normalized = budgetQuery.trim().toLowerCase();
    return (data?.budget?.recent || []).filter((item) => !normalized || `${item.event} ${item.category || ''} ${item.service || ''} ${item.product || ''} ${item.channel || ''} ${item.quoteId || ''}`.toLowerCase().includes(normalized));
  }, [budgetQuery, data]);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Analítica web"
        title="Rendimiento y comportamiento del sitio"
        description="Visitas, sesiones, fuentes y ahora también el recorrido de presupuesto: áreas exploradas, servicios, productos, boletas y confirmaciones."
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
                    <defs><linearGradient id="views" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F5871F" stopOpacity={.28} /><stop offset="95%" stopColor="#F5871F" stopOpacity={0} /></linearGradient></defs>
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

          {data.budget ? (
            <>
              <AdminSurface title="Interacciones de presupuesto" description="Embudo específico de /presupuesto. No guarda nombre ni correo en analítica; esos datos quedan asociados únicamente a la cotización confirmada.">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                  <BudgetMetric label="Interacciones" value={data.budget.interactions} icon={Activity} />
                  <BudgetMetric label="Servicios vistos" value={data.budget.serviceSelections} icon={Wrench} />
                  <BudgetMetric label="Servicios agregados" value={data.budget.servicesAdded} icon={Calculator} />
                  <BudgetMetric label="Productos agregados" value={data.budget.productsAdded} icon={PackagePlus} />
                  <BudgetMetric label="Boletas vistas" value={data.budget.receiptViews} icon={ClipboardCheck} />
                  <BudgetMetric label="Confirmados" value={data.budget.submissions} icon={ClipboardCheck} />
                  <BudgetMetric label="Conversión" value={`${data.budget.conversionRate}%`} icon={MessageCircle} />
                </div>
              </AdminSurface>

              <div className="grid gap-4 md:grid-cols-3">
                <RankPanel title="Servicios con más interés" items={data.budget.topServices} icon={Calculator} />
                <RankPanel title="Áreas exploradas" items={data.budget.topAreas} icon={Wrench} />
                <RankPanel title="Productos agregados" items={data.budget.topProducts} icon={PackagePlus} />
              </div>

              <AdminSurface
                title="Actividad reciente del cotizador"
                description="Permite ver qué parte del presupuesto interesó al visitante y hasta dónde avanzó en el flujo."
                actions={(
                  <label className="flex min-w-[240px] items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3 py-2.5">
                    <Search className="h-4 w-4 text-[#c77a00]" />
                    <input value={budgetQuery} onChange={(event) => setBudgetQuery(event.target.value)} placeholder="Buscar servicio, área, folio…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                  </label>
                )}
              >
                <div className="overflow-x-auto">
                  <table className="min-w-[1120px] w-full text-left text-xs">
                    <thead><tr className="border-b border-black/10 text-[9px] uppercase tracking-[.14em] text-[#8f887c]"><th className="py-3 pr-4">Fecha</th><th className="py-3 pr-4">Acción</th><th className="py-3 pr-4">Área</th><th className="py-3 pr-4">Servicio / producto</th><th className="py-3 pr-4">Medición</th><th className="py-3 pr-4">Canal</th><th className="py-3 pr-4">Total</th><th className="py-3">Folio</th></tr></thead>
                    <tbody>
                      {budgetInteractions.map((item, index) => (
                        <tr key={`${item.date}-${item.event}-${index}`} className="border-b border-black/[.055] last:border-0">
                          <td className="py-3 pr-4 whitespace-nowrap">{item.date ? new Date(item.date).toLocaleString('es-CL') : '—'}</td>
                          <td className="py-3 pr-4 font-bold">{eventLabel(item.event)}</td>
                          <td className="py-3 pr-4">{item.category || '—'}</td>
                          <td className="py-3 pr-4 max-w-[280px] truncate">{item.service || item.product || '—'}</td>
                          <td className="py-3 pr-4">{item.quantity ? `${item.quantity} ${item.unit || ''}` : item.entryMode === 'direct' ? 'Total directo' : '—'}</td>
                          <td className="py-3 pr-4">{item.channel === 'whatsapp' ? 'WhatsApp' : item.channel === 'email' ? 'Correo' : '—'}</td>
                          <td className="py-3 pr-4 font-bold">{rangeText(item.totalLow, item.totalHigh)}</td>
                          <td className="py-3 font-mono text-[10px]">{item.quoteId ? item.quoteId.slice(0, 8).toUpperCase() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AdminSurface>
            </>
          ) : null}

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
                <thead><tr className="border-b border-black/10 text-[9px] uppercase tracking-[.14em] text-[#8f887c]"><th className="py-3 pr-4">Fecha</th><th className="py-3 pr-4">Página</th><th className="py-3 pr-4">Origen</th><th className="py-3 pr-4">Navegador</th><th className="py-3 pr-4">Dispositivo</th><th className="py-3 pr-4">Tipo</th><th className="py-3 pr-4">Ubicación</th><th className="py-3">IP anonimizada</th></tr></thead>
                <tbody>
                  {visits.map((visit, index) => (
                    <tr key={`${visit.date}-${index}`} className="border-b border-black/[.055] last:border-0"><td className="py-3 pr-4 whitespace-nowrap">{new Date(visit.date).toLocaleString('es-CL')}</td><td className="py-3 pr-4 max-w-[280px] truncate font-bold">{visit.page}</td><td className="py-3 pr-4">{visit.source}</td><td className="py-3 pr-4">{visit.browser}</td><td className="py-3 pr-4">{visit.device}</td><td className="py-3 pr-4">{visit.type}</td><td className="py-3 pr-4">{[visit.city, visit.region, visit.country].filter(Boolean).join(', ') || '—'}</td><td className="py-3 font-mono text-[10px]">{visit.ipHash || '—'}</td></tr>
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

function BudgetMetric({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Activity }) {
  return <div className="rounded-[1.1rem] border border-black/[.07] bg-white/60 p-4"><Icon className="h-4 w-4 text-[#c77a00]"/><b className="mt-3 block text-2xl tracking-[-.04em] text-[#171612]">{typeof value === 'number' ? value.toLocaleString('es-CL') : value}</b><span className="mt-1 block text-[9px] font-black uppercase tracking-[.1em] text-[#8f887c]">{label}</span></div>;
}

function RankPanel({ title, items, icon: Icon }: { title: string; items: Item[]; icon: typeof Globe2 }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <AdminSurface title={title}>
      <div className="mb-4 flex items-center gap-2 text-[#c77a00]"><Icon className="h-4 w-4" /></div>
      <div className="space-y-4">
        {items.length ? items.slice(0, 8).map((item) => (
          <div key={item.name}><div className="flex justify-between gap-3 text-xs"><span className="truncate text-[#817a6f]">{item.name}</span><b>{item.value}</b></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[.06]"><span className="block h-full rounded-full bg-[#F5871F]" style={{ width: `${Math.max(5, (item.value / max) * 100)}%` }} /></div></div>
        )) : <p className="text-xs text-[#8f887c]">Sin datos todavía.</p>}
      </div>
    </AdminSurface>
  );
}
