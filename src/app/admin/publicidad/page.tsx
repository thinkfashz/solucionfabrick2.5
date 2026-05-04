'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  RefreshCw,
  TrendingUp,
  MousePointer,
  DollarSign,
  AlertCircle,
  Search,
  Sparkles,
  PauseCircle,
  PlayCircle,
  Archive,
  CheckCircle2,
} from 'lucide-react';

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

interface TrendItem {
  title: string;
  url: string;
  domain: string;
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

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  const [trendQuery, setTrendQuery] = useState('cerraduras inteligentes chile');
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendItems, setTrendItems] = useState<TrendItem[]>([]);
  const [trendError, setTrendError] = useState<string | null>(null);

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
    void fetchAds();
  }, []);

  const getInsight = (ad: MetaAd) => ad.insights?.data?.[0] ?? null;

  const filteredAds = useMemo(() => {
    return ads.filter((ad) => {
      if (statusFilter !== 'ALL' && ad.effective_status !== statusFilter) return false;
      if (!search.trim()) return true;
      const hay = `${ad.name} ${ad.id} ${ad.status} ${ad.effective_status}`.toLowerCase();
      return hay.includes(search.toLowerCase());
    });
  }, [ads, search, statusFilter]);

  const statuses = useMemo(
    () => ['ALL', ...Array.from(new Set(ads.map((ad) => ad.effective_status).filter(Boolean)))],
    [ads],
  );

  const selectedCount = selectedIds.length;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectVisible = () => {
    const ids = filteredAds.map((ad) => ad.id);
    setSelectedIds(ids);
  };

  const clearSelection = () => setSelectedIds([]);

  const runBulkAction = async (action: 'ACTIVATE' | 'PAUSE' | 'ARCHIVE') => {
    if (!selectedIds.length) return;
    setBulkLoading(true);
    setBulkMessage(null);
    try {
      const res = await fetch('/api/meta/ads/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'No se pudo ejecutar acción masiva.');
      setBulkMessage(
        `Acción aplicada: ${json.okCount}/${json.total} anuncios actualizados${json.failCount ? `, ${json.failCount} con error` : ''}.`,
      );
      setSelectedIds([]);
      await fetchAds(true);
    } catch (err) {
      setBulkMessage(err instanceof Error ? err.message : 'Error en acción masiva.');
    } finally {
      setBulkLoading(false);
    }
  };

  const fetchTrends = async () => {
    setTrendLoading(true);
    setTrendError(null);
    try {
      const res = await fetch('/api/meta/ads/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trendQuery }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'No se pudo scrapear tendencias.');
      setTrendItems(json.items ?? []);
    } catch (err) {
      setTrendError(err instanceof Error ? err.message : 'Error scrapeando tendencias.');
    } finally {
      setTrendLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="mb-2 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">
            Meta / Facebook Ads
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight md:text-5xl">Publicidad</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Gestiona campañas, masifica cambios de estado y analiza tendencias desde un solo panel.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => void fetchAds(true)}
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
            Nuevo anuncio
          </Link>
        </div>
      </div>

      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-4 md:p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
              Buscar anuncios
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre, ID o estado..."
                className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-10 pr-3 text-sm text-white outline-none transition focus:border-yellow-400/40"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
              Estado
            </label>
            <select
              aria-label="Filtrar por estado"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none transition focus:border-yellow-400/40"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status === 'ALL' ? 'Todos' : status}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
              Selección
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectVisible}
                className="rounded-full border border-white/15 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition hover:border-yellow-400/40 hover:text-yellow-300"
              >
                Seleccionar visibles
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-full border border-white/15 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition hover:border-white/40 hover:text-white"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/5 pt-4">
          <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300">
            {selectedCount} seleccionados
          </span>
          <button
            type="button"
            disabled={selectedCount === 0 || bulkLoading}
            onClick={() => void runBulkAction('ACTIVATE')}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
          >
            <PlayCircle size={12} /> Activar
          </button>
          <button
            type="button"
            disabled={selectedCount === 0 || bulkLoading}
            onClick={() => void runBulkAction('PAUSE')}
            className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-yellow-300 transition hover:bg-yellow-400/20 disabled:opacity-50"
          >
            <PauseCircle size={12} /> Pausar
          </button>
          <button
            type="button"
            disabled={selectedCount === 0 || bulkLoading}
            onClick={() => void runBulkAction('ARCHIVE')}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-400/30 bg-zinc-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-zinc-500/20 disabled:opacity-50"
          >
            <Archive size={12} /> Archivar
          </button>
          {bulkMessage && (
            <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
              <CheckCircle2 size={13} className="text-emerald-400" /> {bulkMessage}
            </span>
          )}
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Scraper de tendencias</p>
            <h2 className="mt-1 text-lg font-black uppercase tracking-tight text-white">Inspiración para copies y ángulos</h2>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <input
              value={trendQuery}
              onChange={(e) => setTrendQuery(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none transition focus:border-yellow-400/40"
              placeholder="Ej: puertas de seguridad premium chile"
            />
            <button
              type="button"
              onClick={() => void fetchTrends()}
              disabled={trendLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-black transition hover:bg-white disabled:opacity-50"
            >
              <Sparkles size={13} className={trendLoading ? 'animate-pulse' : ''} />
              Scrapear
            </button>
          </div>
        </div>
        {trendError && <p className="text-sm text-red-300">{trendError}</p>}
        {!trendError && trendItems.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {trendItems.map((item) => (
              <a
                key={`${item.url}-${item.title}`}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-white/10 bg-black/40 p-3 transition hover:border-yellow-400/30"
              >
                <p className="line-clamp-2 text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">{item.domain}</p>
              </a>
            ))}
          </div>
        )}
      </section>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
            <p className="text-sm uppercase tracking-widest text-zinc-500">Cargando anuncios...</p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-start gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-8">
          <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-bold text-red-400">Error al cargar anuncios</p>
            <p className="mt-1 text-sm text-zinc-400">{error}</p>
            <p className="mt-2 text-xs text-zinc-500">
              Verifica META_ACCESS_TOKEN y META_AD_ACCOUNT_ID o la integración Meta en el panel de configuración.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && ads.length === 0 && (
        <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-16 text-center">
          <p className="mb-6 text-sm uppercase tracking-widest text-zinc-500">No hay anuncios activos en esta cuenta</p>
          <Link
            href="/admin/publicidad/nuevo"
            className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-6 py-3 text-[11px] font-black uppercase tracking-widest text-black transition hover:bg-white"
          >
            <Plus size={13} />
            Crear primer anuncio
          </Link>
        </div>
      )}

      {!loading && !error && filteredAds.length > 0 && (
        <>
          <div className="mb-2 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              {
                label: 'Anuncios filtrados',
                value: filteredAds.length,
                icon: TrendingUp,
              },
              {
                label: 'Anuncios activos',
                value: filteredAds.filter((a) => a.effective_status === 'ACTIVE').length,
                icon: TrendingUp,
                highlight: true,
              },
              {
                label: 'Gasto total (USD)',
                value: `$${filteredAds
                  .reduce((acc, a) => acc + parseFloat(getInsight(a)?.spend ?? '0'), 0)
                  .toFixed(2)}`,
                icon: DollarSign,
              },
              {
                label: 'Clicks totales',
                value: filteredAds
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
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-white/[0.02]">
            <div className="border-b border-white/5 px-6 py-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Listado de anuncios</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    <th className="px-6 py-3 text-left">Sel</th>
                    <th className="px-6 py-3 text-left">Nombre</th>
                    <th className="px-6 py-3 text-left">Estado</th>
                    <th className="px-6 py-3 text-right">Gasto (USD)</th>
                    <th className="px-6 py-3 text-right">Clicks</th>
                    <th className="px-6 py-3 text-right">Impresiones</th>
                    <th className="px-6 py-3 text-right">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAds.map((ad, idx) => {
                    const insight = getInsight(ad);
                    const statusClass =
                      STATUS_COLORS[ad.effective_status] ??
                      'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
                    return (
                      <tr
                        key={ad.id}
                        className={`border-b border-white/5 transition-colors hover:bg-white/[0.02] ${
                          idx === filteredAds.length - 1 ? 'border-b-0' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(ad.id)}
										aria-label="Seleccionar anuncio"
                            onChange={() => toggleSelect(ad.id)}
                            className="h-4 w-4 rounded border-white/20 bg-transparent text-yellow-400"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="max-w-xs truncate font-medium text-white">{ad.name}</p>
                            <p className="mt-0.5 text-[10px] text-zinc-600">{ad.id}</p>
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

      {!loading && !error && ads.length > 0 && filteredAds.length === 0 && (
        <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-12 text-center">
          <p className="text-sm uppercase tracking-widest text-zinc-500">No hay anuncios con esos filtros</p>
        </div>
      )}
    </div>
  );
}
