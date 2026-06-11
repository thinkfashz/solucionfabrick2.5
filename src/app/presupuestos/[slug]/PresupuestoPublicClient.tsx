'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PresupuestoPublicView from '@/components/presupuestos/PresupuestoPublicView';
import { baseBudgetExample, loadBudgets, normalizeBudget, type PresupuestoPro } from '@/lib/presupuestosBuilder';

export default function PresupuestoPublicClient({ slug: initialSlug }: { slug: string }) {
  const [slug, setSlug] = useState(initialSlug);
  const [budget, setBudget] = useState<PresupuestoPro | null>(null);
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);

  const applyModelPreview = useCallback((current: PresupuestoPro | null) => {
    if (!current || typeof window === 'undefined') return current;
    const url = new URL(window.location.href);
    const modelUrl = url.searchParams.get('model');
    const modelName = url.searchParams.get('modelName') || url.searchParams.get('name') || 'Modelo 3D del proyecto';
    if (!modelUrl) return current;
    return normalizeBudget({
      ...current,
      archivos: [
        ...(current.archivos || []),
        {
          id: 'query-model-preview',
          nombre: modelName,
          url: modelUrl,
          descripcion: 'Modelo 3D cargado para previsualización del cliente.',
          tipo: 'modelo_3d',
          formato: modelUrl.split('?')[0].split('.').pop()?.toLowerCase() || 'glb',
          mostrar_cliente: true,
          orden: 1,
        },
      ],
    });
  }, []);

  const loadCurrentBudget = useCallback(async (nextSlug: string) => {
    setExpired(false);
    try {
      const res = await fetch(`/api/presupuestos/${encodeURIComponent(nextSlug)}`, { cache: 'no-store' });
      if (res.status === 410) {
        setBudget(null);
        setExpired(true);
        return;
      }
      if (res.ok) {
        const json = (await res.json()) as { presupuesto?: PresupuestoPro };
        if (json.presupuesto) {
          setBudget(applyModelPreview(normalizeBudget(json.presupuesto)));
          return;
        }
      }
    } catch {
      // Local fallback below keeps the page usable before migration.
    }

    const found = loadBudgets().find((item) => item.slug === nextSlug);
    const current = found || (nextSlug === baseBudgetExample.slug ? baseBudgetExample : null);
    setBudget(applyModelPreview(current));
  }, [applyModelPreview]);

  useEffect(() => {
    setSlug(initialSlug);
    void loadCurrentBudget(initialSlug).finally(() => setReady(true));
  }, [initialSlug, loadCurrentBudget]);

  useEffect(() => {
    if (!slug || typeof window === 'undefined') return;
    const sync = () => void loadCurrentBudget(slug);
    window.addEventListener('storage', sync);
    window.addEventListener('presupuestos:updated', sync as EventListener);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('presupuestos:updated', sync as EventListener);
    };
  }, [slug, loadCurrentBudget]);

  const publicLink = useMemo(() => (typeof window !== 'undefined' ? window.location.href : `/presupuestos/${slug}`), [slug]);

  if (!ready) {
    return <main className="min-h-screen bg-[#111111] px-4 py-10 text-white"><div className="mx-auto max-w-4xl rounded-3xl border border-yellow-400/20 bg-zinc-950 p-8 text-center">Cargando presupuesto...</div></main>;
  }

  if (expired) {
    return (
      <main className="min-h-screen bg-[#111111] px-4 py-10 text-white">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-orange-400/25 bg-zinc-950 p-8 text-center shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">Presupuesto expirado</p>
          <h1 className="mt-4 text-3xl font-black">Este link ya se autodestruyó</h1>
          <p className="mt-3 text-zinc-400">Solicita una nueva versión para ver precios, disponibilidad y condiciones actualizadas.</p>
          <Link href="/contacto" className="mt-6 inline-flex rounded-full bg-yellow-400 px-5 py-2 text-sm font-black text-black">Solicitar actualización</Link>
        </div>
      </main>
    );
  }

  if (!budget) {
    return <main className="min-h-screen bg-[#111111] px-4 py-10 text-white"><div className="mx-auto max-w-3xl rounded-[2rem] border border-yellow-400/20 bg-zinc-950 p-8 text-center shadow-2xl"><p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-300">Presupuesto no encontrado</p><h1 className="mt-4 text-3xl font-black">No pudimos abrir este link</h1><p className="mt-3 text-zinc-400">Migra el presupuesto desde el admin o revisa que el slug exista en la base de datos.</p><Link href="/" className="mt-6 inline-flex rounded-full bg-yellow-400 px-5 py-2 text-sm font-black text-black">Volver al sitio</Link></div></main>;
  }

  return (
    <main className="min-h-screen bg-[#111111] px-0 py-0 sm:px-4 sm:py-6 lg:px-8 lg:py-10">
      <PresupuestoPublicView presupuesto={budget} publicLink={publicLink} />
    </main>
  );
}
