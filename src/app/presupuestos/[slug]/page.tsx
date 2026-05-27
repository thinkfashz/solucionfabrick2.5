'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PresupuestoPublicView from '@/components/presupuestos/PresupuestoPublicView';
import PresupuestoMixedAlbum from '@/components/presupuestos/PresupuestoMixedAlbum';
import { baseBudgetExample, loadBudgets, normalizeBudget, type PresupuestoPro } from '@/lib/presupuestosBuilder';

export default function PresupuestoPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [budget, setBudget] = useState<PresupuestoPro | null>(null);
  const [ready, setReady] = useState(false);

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
    try {
      const res = await fetch(`/api/presupuestos/${encodeURIComponent(nextSlug)}`, { cache: 'no-store' });
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
    params.then(async (p) => {
      setSlug(p.slug);
      await loadCurrentBudget(p.slug);
      setReady(true);
    }).catch(() => setReady(true));
  }, [params, loadCurrentBudget]);

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
    return <main className="min-h-screen bg-black px-4 py-10 text-white"><div className="mx-auto max-w-4xl rounded-3xl border border-yellow-400/20 bg-zinc-950 p-8 text-center">Cargando presupuesto...</div></main>;
  }

  if (!budget) {
    return <main className="min-h-screen bg-black px-4 py-10 text-white"><div className="mx-auto max-w-3xl rounded-[2rem] border border-yellow-400/20 bg-zinc-950 p-8 text-center shadow-2xl"><p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-300">Presupuesto no encontrado</p><h1 className="mt-4 text-3xl font-black">No pudimos abrir este link</h1><p className="mt-3 text-zinc-400">Migra el presupuesto desde el admin o revisa que el slug exista en la base de datos.</p><Link href="/" className="mt-6 inline-flex rounded-full bg-yellow-400 px-5 py-2 text-sm font-black text-black">Volver al sitio</Link></div></main>;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.12),transparent_34%),#050505] px-3 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto grid max-w-7xl gap-6">
        <PresupuestoPublicView presupuesto={budget} publicLink={publicLink} />
        <PresupuestoMixedAlbum presupuesto={budget} />
      </div>
    </main>
  );
}
