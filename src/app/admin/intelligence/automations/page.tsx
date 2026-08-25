'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Bot, CheckCircle2, Clock3, Loader2, RefreshCw, ShieldCheck, TriangleAlert, Workflow } from 'lucide-react';
import { AdminEmptyState, AdminPage, AdminPageHeader, AdminStat, AdminStats, AdminSurface } from '@/components/admin/AdminPage';

type Automation = {
  id: string;
  name: string;
  description: string;
  schedule: string;
  status: 'active' | 'warning' | 'idle';
  lastRunAt?: string | null;
  lastResult?: string | null;
  detail?: string;
  href: string;
};

type Payload = {
  generatedAt: string;
  summary: { total: number; active: number; warning: number; monitoredProducts: number };
  automations: Automation[];
};

export default function IntelligenceAutomationsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/intelligence/automations', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar Automation Center.');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando automatizaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Fabrick Intelligence · Automation Center"
        title="Automatizaciones visibles, auditables y bajo control"
        description="Reúne tareas programadas del agente, sus últimas ejecuciones y señales de advertencia. Las acciones comerciales sensibles siguen requiriendo política, aprobación y auditoría."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/intelligence" className="rounded-xl border border-black/10 bg-white/65 px-4 py-2.5 text-xs font-black text-[#514b42] transition hover:border-[#c77a00]/35 hover:text-[#9b6a12]">
              Centro Intelligence
            </Link>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#171612] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#2b2924] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Actualizar
            </button>
          </div>
        )}
      />

      {data ? (
        <AdminStats>
          <AdminStat label="Automatizaciones" value={data.summary.total} note="Tareas visibles en este centro" icon={Workflow} />
          <AdminStat label="Activas" value={data.summary.active} note="Operando sin advertencia" icon={CheckCircle2} />
          <AdminStat label="Advertencias" value={data.summary.warning} note="Requieren revisión" icon={TriangleAlert} />
          <AdminStat label="Productos monitorizados" value={data.summary.monitoredProducts} note="Price Watch activo" icon={Bot} />
        </AdminStats>
      ) : null}

      {error ? (
        <div className="rounded-[16px] border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <TriangleAlert className="mr-2 inline h-4 w-4" />{error}
        </div>
      ) : null}

      <AdminSurface
        title="Centro de automatizaciones"
        description="Cada tarjeta muestra frecuencia, última ejecución, resultado y acceso al módulo que controla la automatización."
      >
        {loading ? (
          <div className="grid min-h-[360px] place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#c77a00]" />
          </div>
        ) : data?.automations.length ? (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {data.automations.map((item) => (
              <article key={item.id} className="flex min-h-full flex-col rounded-[18px] border border-black/10 bg-white/72 p-5 shadow-[0_12px_30px_rgba(70,55,25,.05)]">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-[#fff2d8] text-[#c77a00]">
                    <Bot className="h-5 w-5" />
                  </span>
                  <Status value={item.status} />
                </div>

                <h3 className="mt-5 text-xl font-black tracking-[-.03em] text-[#171612]">{item.name}</h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-[#716b60]">{item.description}</p>

                <div className="mt-5 space-y-3 rounded-[14px] border border-black/8 bg-[#f7f2e9] p-4 text-xs leading-5 text-[#716b60]">
                  <p className="flex items-center gap-2 font-bold text-[#514b42]">
                    <Clock3 className="h-4 w-4 text-[#c77a00]" />{item.schedule}
                  </p>
                  <p>Última ejecución: <b className="text-[#171612]">{item.lastRunAt ? new Date(item.lastRunAt).toLocaleString('es-CL') : 'Pendiente'}</b></p>
                  <p>Resultado: <b className="text-[#171612]">{item.lastResult || 'Sin datos'}</b></p>
                  {item.detail ? <p>{item.detail}</p> : null}
                </div>

                <Link
                  href={item.href}
                  className="mt-auto flex min-h-11 items-center justify-between gap-3 rounded-xl bg-[#171612] px-4 py-3 text-xs font-black text-white transition hover:bg-[#2b2924]"
                >
                  <span>Abrir módulo</span><ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            title="No hay automatizaciones visibles"
            description="Cuando Intelligence exponga tareas programadas o monitores, aparecerán aquí con su estado y último resultado."
            icon={Workflow}
          />
        )}
      </AdminSurface>

      <AdminSurface className="border-emerald-200 bg-emerald-50/70">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <div>
            <h3 className="font-black text-emerald-950">Modelo operativo seguro</h3>
            <p className="mt-1 text-sm leading-6 text-emerald-900/75">
              Monitorear, analizar y crear propuestas puede ser automático. Publicar productos, alterar precios o ejecutar cambios comerciales sigue pasando por Policy Engine, aprobación y auditoría.
            </p>
          </div>
        </div>
      </AdminSurface>

      {data ? <p className="border-t border-black/10 pt-4 text-xs text-[#817a6f]">Actualizado {new Date(data.generatedAt).toLocaleString('es-CL')}</p> : null}
    </AdminPage>
  );
}

function Status({ value }: { value: Automation['status'] }) {
  const cls = value === 'active'
    ? 'bg-emerald-50 text-emerald-800'
    : value === 'warning'
      ? 'bg-amber-50 text-amber-800'
      : 'bg-zinc-100 text-zinc-600';
  const Icon = value === 'warning' ? TriangleAlert : CheckCircle2;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[.12em] ${cls}`}>
      <Icon className="h-3.5 w-3.5" />{value}
    </span>
  );
}
