'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';

type Check = {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
  critical?: boolean;
};

type Health = {
  ok: boolean;
  readyForPilot: boolean;
  readyForPublicLaunch: boolean;
  checks: Check[];
  summary: string;
};

export default function OnboardingStatusPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/superadmin/saas/onboarding-health', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'No se pudo leer el estado.');
      setHealth(json as Health);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error leyendo estado.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return <main className="min-h-screen bg-[#050505] px-4 py-6 text-white md:px-6">
    <section className="mx-auto max-w-6xl space-y-5">
      <header className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6">
        <Link href="/admin/superadmin/saas" className="text-sm font-bold text-emerald-200">← Volver</Link>
        <h1 className="mt-5 text-4xl font-black tracking-[-.06em]">Estado del onboarding SaaS</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">Verifica si el flujo de registro, tenant, admin dueño, paleta, módulos y correo está listo para pilotos.</p>
      </header>

      <div className="flex items-center justify-between rounded-[2rem] border border-white/10 bg-white/[0.045] p-5">
        <div>
          <p className="text-sm text-zinc-400">Estado general</p>
          <h2 className="mt-1 text-2xl font-black">{health?.summary || 'Pendiente de revisión'}</h2>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black"><RefreshCw className="h-4 w-4" />Actualizar</button>
      </div>

      {loading && <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 text-zinc-300"><Loader2 className="mr-2 inline h-5 w-5 animate-spin" /> Revisando...</div>}
      {error && <div className="rounded-[2rem] border border-red-300/25 bg-red-500/10 p-5 text-red-100">{error}</div>}

      {health && <>
        <section className="grid gap-4 md:grid-cols-2">
          <article className={`rounded-[2rem] border p-5 ${health.readyForPilot ? 'border-emerald-300/25 bg-emerald-400/10' : 'border-red-300/25 bg-red-500/10'}`}>
            <h2 className="text-2xl font-black">Pilotos controlados</h2>
            <p className="mt-2 text-sm text-zinc-300">{health.readyForPilot ? 'Listo para probar con clientes piloto.' : 'Aún faltan piezas críticas.'}</p>
          </article>
          <article className={`rounded-[2rem] border p-5 ${health.readyForPublicLaunch ? 'border-emerald-300/25 bg-emerald-400/10' : 'border-amber-300/25 bg-amber-400/10'}`}>
            <h2 className="text-2xl font-black">Lanzamiento público</h2>
            <p className="mt-2 text-sm text-zinc-300">{health.readyForPublicLaunch ? 'Listo para probar público.' : 'Aún requiere completar opcionales.'}</p>
          </article>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {health.checks.map((item) => <article key={item.key} className={`rounded-2xl border p-4 ${item.ok ? 'border-emerald-300/20 bg-emerald-400/10' : item.critical === false ? 'border-amber-300/20 bg-amber-400/10' : 'border-red-300/20 bg-red-500/10'}`}>
            <div className="flex gap-3">
              {item.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-200" /> : <XCircle className="mt-0.5 h-5 w-5 text-red-200" />}
              <div>
                <p className="text-sm font-black">{item.label}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">{item.detail}</p>
                {item.critical === false && <p className="mt-2 text-[10px] font-black uppercase tracking-[.18em] text-amber-200">Recomendado</p>}
              </div>
            </div>
          </article>)}
        </section>

        <section className="flex flex-wrap gap-3 rounded-[2rem] border border-white/10 bg-white/[0.045] p-5">
          <Link href="/registro" className="rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-black text-black">Probar registro</Link>
          <Link href="/admin/superadmin/saas/demo" className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm font-black text-white">Ver demo</Link>
        </section>
      </>}
    </section>
  </main>;
}
