'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Database, RefreshCw, Settings2, ShieldCheck } from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

type Check = {
  name: string;
  ok: boolean;
  severity: 'critical' | 'warning' | 'info';
  message: string;
};

type Result = {
  ok: boolean;
  checkedAt: string;
  insforgeBaseUrl: string;
  missingCritical: string[];
  env: Check[];
  tables: Check[];
};

function CheckRows({ title, description, rows }: { title: string; description: string; rows: Check[] }) {
  return (
    <AdminCard>
      <div className="mb-4 flex items-end justify-between gap-3 border-b border-black/8 pb-4">
        <div>
          <h2 className="text-lg font-black tracking-[-.025em] text-[#171612]">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-[#817a6f]">{description}</p>
        </div>
        <span className="text-xs font-bold text-[#8f887c]">{rows.filter((row) => row.ok).length}/{rows.length}</span>
      </div>
      <div className="divide-y divide-black/8">
        {rows.map((row) => {
          const tone = row.ok
            ? 'bg-emerald-500/10 text-emerald-800'
            : row.severity === 'critical'
              ? 'bg-rose-500/10 text-rose-800'
              : 'bg-amber-500/10 text-amber-800';
          return (
            <div key={row.name} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-bold text-[#27241f]">{row.name}</p>
                <p className="mt-1 text-sm leading-5 text-[#716b60]">{row.message}</p>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[10px] font-black ${tone}`}>
                {row.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                {row.ok ? 'OK' : row.severity === 'critical' ? 'Falta' : 'Aviso'}
              </span>
            </div>
          );
        })}
      </div>
    </AdminCard>
  );
}

export default function DiagnosticoPage() {
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function run() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/diagnostics', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'No se pudo ejecutar el diagnóstico.');
        return;
      }
      setData(json);
    } catch {
      setError('Error de red ejecutando diagnóstico.');
    } finally {
      setLoading(false);
    }
  }

  const summary = useMemo(() => {
    const checks = [...(data?.env ?? []), ...(data?.tables ?? [])];
    return {
      total: checks.length,
      ok: checks.filter((check) => check.ok).length,
      critical: checks.filter((check) => !check.ok && check.severity === 'critical').length,
      warnings: checks.filter((check) => !check.ok && check.severity !== 'critical').length,
    };
  }, [data]);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Sistema · Diagnóstico"
        title="Diagnóstico de plataforma"
        description="Revisa configuración, variables y tablas críticas antes de intervenir producción."
        icon={ShieldCheck}
        actions={
          <button
            type="button"
            onClick={() => void run()}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white transition hover:bg-[#2a2823] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Revisando…' : 'Ejecutar diagnóstico'}
          </button>
        }
      />

      {data ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStat label="Chequeos" value={summary.total} icon={ShieldCheck} />
          <AdminStat label="Correctos" value={summary.ok} icon={CheckCircle2} accent="emerald" />
          <AdminStat label="Críticos" value={summary.critical} icon={AlertTriangle} accent="rose" />
          <AdminStat label="Avisos" value={summary.warnings} icon={Settings2} />
        </section>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-600/15 bg-rose-500/8 px-4 py-3 text-sm font-medium text-rose-800">{error}</div>
      ) : null}

      <AdminCard className="p-0 sm:p-0">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Estado técnico</p>
            <h2 className="mt-1 text-xl font-black tracking-[-.025em] text-[#171612]">
              {data ? (data.ok ? 'Configuración crítica correcta' : 'Hay elementos que requieren atención') : 'Listo para revisar'}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#716b60]">
              {data ? `Última revisión: ${new Date(data.checkedAt).toLocaleString('es-CL')}` : 'Ejecuta el diagnóstico para validar el entorno actual.'}
            </p>
          </div>
          {data ? (
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${data.ok ? 'bg-emerald-500/10 text-emerald-800' : 'bg-rose-500/10 text-rose-800'}`}>
              {data.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {data.ok ? 'Operativo' : `${data.missingCritical.length} crítico(s)`}
            </span>
          ) : null}
        </div>
        {data ? (
          <div className="border-t border-black/8 px-4 py-3 text-xs text-[#817a6f] sm:px-5">
            <strong className="text-[#514b42]">InsForge:</strong> {data.insforgeBaseUrl || 'No informado'}
          </div>
        ) : null}
      </AdminCard>

      {data ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <CheckRows title="Configuración" description="Variables y credenciales requeridas por el servidor." rows={data.env} />
          <CheckRows title="Base de datos" description="Tablas necesarias para operar el administrador y sus módulos." rows={data.tables} />
        </div>
      ) : (
        <div className="grid min-h-52 place-items-center border-y border-black/8 text-center">
          <div className="max-w-md px-4 py-10">
            <Database className="mx-auto h-6 w-6 text-[#c77a00]" />
            <h3 className="mt-3 text-lg font-black text-[#171612]">Sin diagnóstico ejecutado</h3>
            <p className="mt-2 text-sm leading-6 text-[#817a6f]">No se realizan cambios; esta pantalla solo consulta el estado actual del entorno.</p>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
