'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Bot, CheckCircle2, CircleDollarSign, Gauge, Loader2, PackageSearch, RefreshCw, ShoppingCart, Sparkles, TriangleAlert } from 'lucide-react';
import { AdminPage, AdminPageHeader, AdminStat, AdminStats, AdminSurface } from '@/components/admin/AdminPage';

type Action = { id: string; priority: 'critical' | 'high' | 'medium' | 'low'; area: string; title: string; detail: string; href: string; score: number };
type Brief = {
  generatedAt: string;
  periodDays: number;
  healthScore: number;
  headline: string;
  metrics: { visits: number; productViews: number; addToCart: number; checkout: number; orders: number; paidOrders: number; contacts: number; revenue: number; criticalStock: number; lowMargin: number; incompleteProducts: number };
  actions: Action[];
};

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('es-CL');

export default function IntelligenceTodayPage() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/intelligence/today', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo generar el brief de hoy.');
      setBrief(json.brief);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando Fabrick Intelligence.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function regenerate() {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/intelligence/today', { method: 'POST' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo regenerar el brief.');
      setBrief(json.brief);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo regenerar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Fabrick Intelligence · Daily Operating Brief"
        title={brief?.headline || 'Qué debes mejorar hoy'}
        description="Prioriza decisiones usando conversión, stock, margen, catálogo y ventas. Fabrick propone; las acciones sensibles siguen pasando por aprobación."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/intelligence" className="rounded-xl border border-black/10 bg-white/65 px-4 py-2.5 text-xs font-black text-[#514b42] transition hover:border-[#c77a00]/35 hover:text-[#9b6a12]">
              Centro Intelligence
            </Link>
            <button
              type="button"
              onClick={() => void regenerate()}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#171612] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#2b2924] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Regenerar brief
            </button>
          </div>
        )}
      />

      {error ? (
        <div className="rounded-[16px] border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <TriangleAlert className="mr-2 inline h-4 w-4" />{error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid min-h-[45vh] place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#c77a00]" />
        </div>
      ) : null}

      {brief && !loading ? (
        <>
          <div className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
            <AdminSurface title="Health score" description={`Lectura consolidada de las alertas comerciales y operativas de los últimos ${brief.periodDays} días.`}>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-1">
                    <strong className="text-6xl font-black tracking-[-.07em] text-[#171612]">{brief.healthScore}</strong>
                    <span className="text-lg font-black text-[#8f887c]">/100</span>
                  </div>
                  <p className="mt-2 text-xs text-[#817a6f]">Mientras más alto, menos alertas prioritarias requieren intervención.</p>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-[#fff2d8] text-[#c77a00]">
                  <Gauge className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/8">
                <div className="h-full rounded-full bg-[#c77a00]" style={{ width: `${brief.healthScore}%` }} />
              </div>
            </AdminSurface>

            <AdminStats className="xl:grid-cols-4">
              <AdminStat label="Visitas" value={number.format(brief.metrics.visits)} note="Tráfico observado" icon={Sparkles} />
              <AdminStat label="Pedidos" value={number.format(brief.metrics.orders)} note={`${brief.metrics.paidOrders} pagados`} icon={ShoppingCart} />
              <AdminStat label="Ingresos" value={money.format(brief.metrics.revenue)} note="Periodo analizado" icon={CircleDollarSign} />
              <AdminStat label="Stock crítico" value={number.format(brief.metrics.criticalStock)} note="Productos a revisar" icon={PackageSearch} />
            </AdminStats>
          </div>

          <AdminSurface
            title="Las 5 prioridades de mayor impacto"
            description="Ordenadas para llevarte directamente al módulo donde puedes resolver cada señal."
            actions={<Sparkles className="h-5 w-5 text-[#c77a00]" />}
          >
            <div className="space-y-3">
              {brief.actions.map((action, index) => (
                <article key={action.id} className="rounded-[18px] border border-black/10 bg-white/72 p-4 shadow-[0_12px_30px_rgba(70,55,25,.05)] sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#171612] text-sm font-black text-white">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Priority value={action.priority} />
                        <span className="text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">{action.area}</span>
                        <span className="text-[10px] font-black uppercase tracking-[.12em] text-[#c77a00]">Impacto {action.score}</span>
                      </div>
                      <h3 className="mt-2 text-lg font-black tracking-[-.025em] text-[#171612]">{action.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-[#716b60]">{action.detail}</p>
                    </div>
                    <Link
                      href={action.href}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#c77a00] px-4 text-xs font-black text-white transition hover:bg-[#a96500]"
                    >
                      Resolver <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </AdminSurface>

          <AdminSurface title="Conversión y calidad operativa" description="Indicadores rápidos para entender dónde se pierde intención o dónde falta corregir catálogo.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Mini label="Producto → carrito" value={`${rate(brief.metrics.addToCart, brief.metrics.productViews)}%`} />
              <Mini label="Carrito → checkout" value={`${rate(brief.metrics.checkout, brief.metrics.addToCart)}%`} />
              <Mini label="Checkout → pedido" value={`${rate(brief.metrics.orders, brief.metrics.checkout)}%`} />
              <Mini label="Margen en riesgo" value={String(brief.metrics.lowMargin)} />
              <Mini label="Fichas incompletas" value={String(brief.metrics.incompleteProducts)} />
            </div>
          </AdminSurface>

          <div className="flex flex-col gap-2 border-t border-black/10 pt-4 text-xs text-[#817a6f] sm:flex-row sm:items-center sm:justify-between">
            <span>Generado {new Date(brief.generatedAt).toLocaleString('es-CL')}</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-700" /> Automatización segura · sin cambios destructivos</span>
          </div>
        </>
      ) : null}
    </AdminPage>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[14px] border border-black/8 bg-[#f7f2e9] p-4">
      <p className="text-[10px] font-black uppercase tracking-[.13em] text-[#8f887c]">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-[-.04em] text-[#171612]">{value}</p>
    </article>
  );
}

function Priority({ value }: { value: Action['priority'] }) {
  const cls = value === 'critical'
    ? 'bg-red-50 text-red-800'
    : value === 'high'
      ? 'bg-amber-50 text-amber-800'
      : value === 'medium'
        ? 'bg-sky-50 text-sky-800'
        : 'bg-emerald-50 text-emerald-800';
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[.12em] ${cls}`}>{value}</span>;
}

function rate(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
}
