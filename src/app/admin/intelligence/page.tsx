'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  Boxes,
  Gauge,
  Loader2,
  PackageSearch,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Users,
  WandSparkles,
} from 'lucide-react';
import { AdminPage, AdminPageHeader, AdminStat, AdminStats, AdminSurface } from '@/components/admin/AdminPage';

type Severity = 'high' | 'medium' | 'low';
type Product = { id:string; name?:string|null; stock?:number|null; image_url?:string|null; margin?:number|null };
type Payload = {
  generatedAt:string;
  periodDays:number;
  summary:{pageViews:number;visitors:number;sessions:number;contacts:number;productViews:number;addToCart:number;checkoutStarts:number;orders:number;activeProducts:number;criticalStock:number;runtimeErrorsHour:number};
  pages:Array<{name:string;value:number}>;
  sources:Array<{name:string;value:number}>;
  products:{criticalStock:Product[];incomplete:Product[];lowMargin:Product[]};
  errors:Array<{id?:string;error_message?:string|null;endpoint?:string|null;status_code?:number|null;created_at?:string|null}>;
  recommendations:Array<{severity:Severity;title:string;detail:string;href?:string}>;
  permissions:{mode:string;readOnlyAnalytics:boolean;productChangesRequireExplicitApproval:boolean;secretsAccessible:boolean;paymentCredentialsAccessible:boolean};
};

const fmt = new Intl.NumberFormat('es-CL');
const severityTone: Record<Severity, string> = {
  high: 'border-red-200 bg-red-50 text-red-800',
  medium: 'border-amber-200 bg-amber-50 text-amber-800',
  low: 'border-emerald-200 bg-emerald-50 text-emerald-800',
};
const severityLabel: Record<Severity, string> = { high: 'Alta', medium: 'Media', low: 'Baja' };

const intelligenceRoutes = [
  { href: '/admin/intelligence/today', label: 'Qué mejorar hoy', description: 'Health Score y prioridades accionables.', icon: Gauge },
  { href: '/admin/intelligence/commerce', label: 'Commerce Agent', description: 'Catálogo, oportunidades y señales comerciales.', icon: Bot },
  { href: '/admin/intelligence/operations', label: 'Operaciones', description: 'Stock, margen y vigilancia de precios.', icon: Boxes },
  { href: '/admin/intelligence/proposals', label: 'Propuestas', description: 'Revisar antes de ejecutar cualquier cambio.', icon: WandSparkles },
  { href: '/admin/intelligence/automations', label: 'Automatizaciones', description: 'Tareas recurrentes y diagnósticos.', icon: Activity },
];

export default function FabrickIntelligencePage() {
  const [data, setData] = useState<Payload | null>(null);
  const [days, setDays] = useState('30');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/intelligence?days=${days}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar Fabrick Intelligence.');
      setData(json);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error cargando el panel.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  const healthScore = useMemo(() => {
    if (!data) return 0;
    const penalties = Math.min(70,
      data.summary.criticalStock * 5 +
      data.products.incomplete.length * 3 +
      data.products.lowMargin.length * 2 +
      data.summary.runtimeErrorsHour * 8,
    );
    return Math.max(30, 100 - penalties);
  }, [data]);

  return (
    <AdminPage className="pb-4">
      <AdminPageHeader
        eyebrow="Fabrick Intelligence"
        title="Centro inteligente"
        description="Una vista operativa del negocio para detectar prioridades, preparar propuestas y decidir qué ejecutar. La IA observa y recomienda; los cambios sensibles siguen requiriendo aprobación."
        actions={(
          <>
            <select value={days} onChange={(event) => setDays(event.target.value)} className="h-10 rounded-xl border border-black/10 bg-white/70 px-3 text-xs font-bold text-[#171612] outline-none">
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
            </select>
            <button type="button" onClick={() => void load()} aria-label="Actualizar Intelligence" className="grid h-10 w-10 place-items-center rounded-xl bg-[#171612] text-[#ffb000] transition hover:-translate-y-0.5">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </>
        )}
      />

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}

      {loading && !data ? (
        <div className="grid min-h-64 place-items-center rounded-[20px] border border-black/10 bg-white/45">
          <div className="flex items-center gap-3 text-sm font-semibold text-[#716b60]"><Loader2 className="h-5 w-5 animate-spin text-[#c77a00]" /> Analizando señales del negocio…</div>
        </div>
      ) : null}

      {data ? (
        <>
          <section className="grid gap-4 xl:grid-cols-[1.4fr_.6fr]">
            <div className="relative overflow-hidden rounded-[22px] border border-black/10 bg-[#171612] p-5 text-white shadow-[0_20px_60px_rgba(31,26,18,.12)] sm:p-6">
              <div className="pointer-events-none absolute right-[-5rem] top-[-7rem] h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/15 bg-amber-300/8 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.18em] text-amber-200"><Sparkles className="h-3.5 w-3.5" /> Copiloto operativo</span>
                    <span className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.16em] text-white/55">Modo {data.permissions.mode || 'seguro'}</span>
                  </div>
                  <h3 className="mt-4 text-2xl font-black tracking-[-.04em] sm:text-3xl">Prioriza lo importante sin perder el control.</h3>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">Intelligence combina actividad, catálogo, pedidos y errores para ordenar el trabajo. Las credenciales y acciones sensibles permanecen fuera del alcance automático.</p>
                </div>
                <div className="flex items-end gap-3">
                  <div className="text-right"><p className="text-[9px] font-black uppercase tracking-[.18em] text-white/35">Health Score</p><strong className="mt-1 block text-5xl font-black tracking-[-.08em] text-amber-300">{healthScore}</strong></div>
                  <div className="mb-1 h-16 w-2 overflow-hidden rounded-full bg-white/8"><div className="w-full rounded-full bg-gradient-to-t from-orange-500 to-amber-300 transition-all" style={{ height: `${healthScore}%`, marginTop: `${100 - healthScore}%` }} /></div>
                </div>
              </div>
            </div>

            <AdminSurface title="Guardas activas" description="Qué puede hacer el agente sin exponerte.">
              <div className="grid gap-2.5">
                <Guard label="Analítica" detail="Solo lectura" ok={data.permissions.readOnlyAnalytics} />
                <Guard label="Productos" detail="Propuesta + aprobación" ok={data.permissions.productChangesRequireExplicitApproval} />
                <Guard label="Secretos" detail="Bloqueados" ok={!data.permissions.secretsAccessible} />
                <Guard label="Pagos" detail="Credenciales bloqueadas" ok={!data.permissions.paymentCredentialsAccessible} />
              </div>
            </AdminSurface>
          </section>

          <AdminStats>
            <AdminStat label="Visitantes" value={fmt.format(data.summary.visitors)} note={`${fmt.format(data.summary.pageViews)} vistas`} icon={Users} />
            <AdminStat label="Contactos" value={fmt.format(data.summary.contacts)} note="Leads y eventos de contacto" icon={Activity} />
            <AdminStat label="Pedidos" value={fmt.format(data.summary.orders)} note={`${fmt.format(data.summary.checkoutStarts)} inicios de checkout`} icon={ShoppingCart} />
            <AdminStat label="Alertas técnicas" value={fmt.format(data.summary.runtimeErrorsHour)} note={`${data.summary.criticalStock} productos con stock crítico`} icon={AlertTriangle} />
          </AdminStats>

          <AdminSurface title="Rutas de Intelligence" description="Entra al agente específico según el tipo de decisión que quieres tomar.">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {intelligenceRoutes.map((route) => {
                const Icon = route.icon;
                return (
                  <Link key={route.href} href={route.href} className="group rounded-2xl border border-black/10 bg-white/50 p-4 transition hover:-translate-y-1 hover:border-[#c77a00]/25 hover:bg-white/80 hover:shadow-[0_14px_35px_rgba(46,36,18,.08)]">
                    <div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#171612] text-[#ffb000]"><Icon className="h-4 w-4" /></span><ArrowRight className="h-4 w-4 text-[#b7afa2] transition group-hover:translate-x-1 group-hover:text-[#c77a00]" /></div>
                    <h4 className="mt-4 text-sm font-black text-[#171612]">{route.label}</h4>
                    <p className="mt-1 text-[11px] leading-5 text-[#817a6f]">{route.description}</p>
                  </Link>
                );
              })}
            </div>
          </AdminSurface>

          <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
            <AdminSurface title="Qué revisar ahora" description="Prioridades ordenadas por impacto y riesgo.">
              <div className="space-y-2">
                {data.recommendations.length ? data.recommendations.slice(0, 8).map((item, index) => (
                  <div key={`${item.title}-${index}`} className="flex items-start gap-3 rounded-2xl border border-black/[.07] bg-white/45 p-3.5">
                    <span className={`mt-0.5 rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[.12em] ${severityTone[item.severity]}`}>{severityLabel[item.severity]}</span>
                    <div className="min-w-0 flex-1"><b className="text-sm text-[#171612]">{item.title}</b><p className="mt-1 text-xs leading-5 text-[#716b60]">{item.detail}</p></div>
                    {item.href ? <Link href={item.href} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-black/[.045] text-[#9b6a12]"><ArrowRight className="h-4 w-4" /></Link> : null}
                  </div>
                )) : <p className="py-8 text-center text-sm text-emerald-800">No hay prioridades críticas en este momento.</p>}
              </div>
            </AdminSurface>

            <AdminSurface title="Salud del catálogo" description={`${fmt.format(data.summary.activeProducts)} productos activos`}>
              <Health label="Stock crítico" value={data.products.criticalStock.length} />
              <Health label="Fichas incompletas" value={data.products.incomplete.length} />
              <Health label="Margen bajo 25%" value={data.products.lowMargin.length} />
              <Link href="/admin/intelligence/operations" className="mt-4 flex items-center justify-between border-t border-black/10 pt-4 text-xs font-bold text-[#8b5a08]">Abrir operaciones <ArrowRight className="h-4 w-4" /></Link>
            </AdminSurface>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Rank title="Páginas más vistas" items={data.pages} />
            <Rank title="Principales orígenes" items={data.sources} />
            <Products title="Stock crítico" products={data.products.criticalStock} />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Products title="Productos con margen bajo" products={data.products.lowMargin} />
            <AdminSurface title="Errores recientes" description="Eventos registrados durante la última hora.">
              {data.errors.length ? (
                <div className="divide-y divide-black/10">{data.errors.slice(0, 7).map((item, index) => <div key={item.id || index} className="py-3 first:pt-0 last:pb-0"><div className="flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-[#9b6a12]"><span>{item.status_code || 'ERR'}</span><span>•</span><span>{item.endpoint || 'runtime'}</span></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#716b60]">{item.error_message || 'Error sin detalle'}</p></div>)}</div>
              ) : <p className="py-7 text-sm text-emerald-800">Sin errores registrados durante la última hora.</p>}
            </AdminSurface>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-4 text-[11px] text-[#8f887c]"><span>Actualizado {new Date(data.generatedAt).toLocaleString('es-CL')}</span><span>Ventana de análisis: {data.periodDays} días</span></div>
        </>
      ) : null}
    </AdminPage>
  );
}

function Guard({ label, detail, ok }: { label: string; detail: string; ok: boolean }) {
  return <div className="flex items-center gap-3 rounded-xl bg-black/[.035] px-3 py-2.5"><span className={`grid h-8 w-8 place-items-center rounded-lg ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}><ShieldCheck className="h-4 w-4" /></span><span className="min-w-0 flex-1"><b className="block text-xs text-[#171612]">{label}</b><span className="text-[10px] text-[#817a6f]">{detail}</span></span></div>;
}

function Rank({ title, items }: { title: string; items: Array<{name:string;value:number}> }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return <AdminSurface title={title}>{items.slice(0, 7).map((item) => <div key={item.name} className="mb-3 last:mb-0"><div className="flex justify-between gap-3 text-xs"><span className="truncate text-[#716b60]">{item.name}</span><b className="text-[#171612]">{fmt.format(item.value)}</b></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/5"><span className="block h-full rounded-full bg-gradient-to-r from-[#a96808] to-[#e2a327]" style={{ width: `${Math.max(5, item.value / max * 100)}%` }} /></div></div>)}</AdminSurface>;
}

function Health({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between border-b border-black/10 py-3 last:border-0"><span className="text-sm text-[#716b60]">{label}</span><b className={value ? 'text-amber-800' : 'text-emerald-800'}>{value}</b></div>;
}

function Products({ title, products }: { title: string; products: Product[] }) {
  return <AdminSurface title={title}>{products.length ? <div className="divide-y divide-black/10">{products.slice(0, 7).map((product) => <Link key={product.id} href={`/admin/productos/${product.id}/editar`} className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0">{product.image_url ? <img src={product.image_url} alt="" className="h-10 w-10 rounded-xl bg-white object-contain p-1" /> : <span className="grid h-10 w-10 place-items-center rounded-xl bg-black/5"><PackageSearch className="h-4 w-4" /></span>}<span className="min-w-0 flex-1"><b className="block truncate text-sm text-[#171612]">{product.name || 'Producto'}</b><span className="text-[11px] text-[#817a6f]">Stock: {product.stock ?? 0}{typeof product.margin === 'number' ? ` · Margen: ${product.margin}%` : ''}</span></span><ArrowRight className="h-4 w-4 text-[#c77a00] transition group-hover:translate-x-1" /></Link>)}</div> : <p className="py-6 text-sm text-emerald-800">Sin alertas en esta categoría.</p>}</AdminSurface>;
}
