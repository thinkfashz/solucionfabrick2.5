'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { AdminPage, AdminPageHeader } from '@/components/admin/ui';

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

function CheckRows({ title, rows }: { title: string; rows: Check[] }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="mb-4 text-xl font-black text-white">{title}</h2>
      <div className="grid gap-3">
        {rows.map((row) => (
          <div key={row.name} className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-bold text-white">{row.name}</p>
                <p className="mt-1 text-sm text-zinc-500">{row.message}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${row.ok ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : row.severity === 'critical' ? 'border-red-400/30 bg-red-400/10 text-red-200' : 'border-yellow-300/30 bg-yellow-300/10 text-yellow-200'}`}>
                {row.ok ? 'OK' : row.severity === 'critical' ? 'Falta' : 'Aviso'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
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

  return (
    <AdminPage>
      <AdminPageHeader
        title="Diagnóstico de APIs"
        description="Prueba rápida para saber qué configuración o tabla falta antes de tocar producción."
      />

      <section className="rounded-3xl border border-yellow-300/20 bg-yellow-300/[0.04] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white">Estado técnico</h2>
            <p className="mt-1 text-sm text-zinc-500">Ejecuta una revisión de variables y tablas requeridas.</p>
          </div>
          <button onClick={run} disabled={loading} className="rounded-full bg-yellow-300 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-black disabled:opacity-50">
            <RefreshCw className={`mr-1 inline h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Probar APIs
          </button>
        </div>
        {error && <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}
        {data && (
          <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${data.ok ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-red-400/30 bg-red-400/10 text-red-200'}`}>
            {data.ok ? 'Todo lo crítico está OK.' : `Falta revisar: ${data.missingCritical.join(', ')}`}
            <p className="mt-1 text-xs opacity-80">Base: {data.insforgeBaseUrl}</p>
          </div>
        )}
      </section>

      {data && (
        <>
          <CheckRows title="Configuración" rows={data.env} />
          <CheckRows title="Tablas" rows={data.tables} />
        </>
      )}
    </AdminPage>
  );
}
