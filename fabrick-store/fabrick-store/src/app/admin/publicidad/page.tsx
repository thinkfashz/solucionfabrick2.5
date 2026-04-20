'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, RefreshCw, TrendingUp, MousePointer, DollarSign, AlertCircle } from 'lucide-react';

interface MetaAd {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  insights?: {
    data: Array<{
      spend: string;
      clicks: string;
      impressions: string;
      ctr: string;
    }>;
  };
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-500/20 text-green-400 border-green-500/30',
  PAUSED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  DISAPPROVED: 'bg-red-500/20 text-red-400 border-red-500/30',
  ARCHIVED: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  PENDING_REVIEW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

export default function PublicidadPage() {
  const [ads, setAds] = useState<MetaAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAds = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/meta/ads');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al cargar anuncios');
      setAds(json.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  const getInsight = (ad: MetaAd) => ad.insights?.data?.[0] ?? null;

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400 mb-2">
            Meta / Facebook Ads
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight md:text-5xl">Publicidad</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Gestiona tus campañas publicitarias en Meta desde aquí.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchAds(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 transition hover:border-white/30 hover:text-white disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <Link
            href="/admin/publicidad/nuevo"
            className="flex items-center gap-2 rounded-full bg-yellow-400 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-black transition hover:bg-white"
          >
            <Plus size={13} />
            Nuevo Anuncio
          </Link>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
            <p className="text-sm text-zinc-500 uppercase tracking-widest">Cargando anuncios…</p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 flex items-start gap-4">
          <AlertCircle size={20} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-red-400 text-sm">Error al cargar anuncios</p>
            <p className="text-zinc-400 text-sm mt-1">{error}</p>
            <p className="text-zinc-500 text-xs mt-2">
              Verifica que las variables de entorno META_ACCESS_TOKEN y META_AD_ACCOUNT_ID estén configuradas correctamente.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && ads.length === 0 && (
        <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-16 text-center">
          <p className="text-zinc-500 text-sm uppercase tracking-widest mb-6">
            No hay anuncios en esta cuenta
          </p>
          <Link
            href="/admin/publicidad/nuevo"
            className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-6 py-3 text-[11px] font-black uppercase tracking-widest text-black transition hover:bg-white"
          >
            <Plus size={13} />
            Crear primer anuncio
          </Link>
        </div>
      )}

      {!loading && !error && ads.length > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-4">
            {[
              {
                label: 'Anuncios totales',
                value: ads.length,
                icon: TrendingUp,
              },
              {
                label: 'Anuncios activos',
                value: ads.filter((a) => a.effective_status === 'ACTIVE').length,
                icon: TrendingUp,
                highlight: true,
              },
              {
                label: 'Gasto total (USD)',
                value: `$${ads
                  .reduce((acc, a) => acc + parseFloat(getInsight(a)?.spend ?? '0'), 0)
                  .toFixed(2)}`,
                icon: DollarSign,
              },
              {
                label: 'Clicks totales',
                value: ads
                  .reduce((acc, a) => acc + parseInt(getInsight(a)?.clicks ?? '0', 10), 0)
                  .toLocaleString('es-CL'),
                icon: MousePointer,
              },
            ].map(({ label, value, icon: Icon, highlight }) => (
              <div
                key={label}
                className={`rounded-2xl border p-5 ${
                  highlight
                    ? 'border-yellow-400/20 bg-yellow-400/5'
                    : 'border-white/5 bg-white/[0.02]'
                }`}
              >
                <Icon size={16} className={highlight ? 'text-yellow-400' : 'text-zinc-500'} />
                <p className="mt-3 text-2xl font-black">{value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Ads table */}
          <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Listado de Anuncios
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    <th className="px-6 py-3 text-left">Nombre</th>
                    <th className="px-6 py-3 text-left">Estado</th>
                    <th className="px-6 py-3 text-right">Gasto (USD)</th>
                    <th className="px-6 py-3 text-right">Clicks</th>
                    <th className="px-6 py-3 text-right">Impresiones</th>
                    <th className="px-6 py-3 text-right">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {ads.map((ad, idx) => {
                    const insight = getInsight(ad);
                    const statusClass =
                      STATUS_COLORS[ad.effective_status] ??
                      'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
                    return (
                      <tr
                        key={ad.id}
                        className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${
                          idx === ads.length - 1 ? 'border-b-0' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-white truncate max-w-xs">{ad.name}</p>
                            <p className="text-[10px] text-zinc-600 mt-0.5">{ad.id}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${statusClass}`}
                          >
                            {ad.effective_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-zinc-300">
                          ${parseFloat(insight?.spend ?? '0').toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-zinc-300">
                          {parseInt(insight?.clicks ?? '0', 10).toLocaleString('es-CL')}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-zinc-300">
                          {parseInt(insight?.impressions ?? '0', 10).toLocaleString('es-CL')}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-zinc-300">
                          {parseFloat(insight?.ctr ?? '0').toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
