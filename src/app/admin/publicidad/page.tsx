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
  BarChart3,
  Target,
  Zap,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  ExternalLink,
  Bot,
  ShoppingCart,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

/* ─── Tipos ─── */
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

/* ─── Constantes ─── */
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  PAUSED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  DISAPPROVED: 'bg-red-500/20 text-red-400 border-red-500/30',
  ARCHIVED: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  PENDING_REVIEW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

type Platform = 'meta' | 'tiktok' | 'google';

/* ─── Tooltip personalizado para gráficas ─── */
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-bold uppercase tracking-widest text-zinc-400">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-mono">
          {p.name}: {p.name === 'Gasto' ? `$${p.value.toFixed(2)}` : p.value.toLocaleString('es-CL')}
        </p>
      ))}
    </div>
  );
}

/* ─── Tarjeta de plataforma (TikTok / Google) ─── */
function PlatformPlaceholder({
  platform,
  connected,
  onConnect,
}: {
  platform: 'tiktok' | 'google';
  connected: boolean;
  onConnect: () => void;
}) {
  const isTikTok = platform === 'tiktok';
  const config = isTikTok
    ? {
        name: 'TikTok Ads',
        color: 'from-pink-500 to-cyan-400',
        accent: 'text-pink-400',
        border: 'border-pink-500/20',
        bg: 'bg-pink-500/5',
        icon: '🎵',
        features: [
          'Campañas In-Feed, TopView y Spark Ads',
          'Segmentación por intereses y lookalike',
          'Analytics de video: vistas, engagement, shares',
          'Gestión de presupuesto y puja automática',
          'Biblioteca de creativos y A/B testing',
        ],
      }
    : {
        name: 'Google Ads',
        color: 'from-blue-500 to-green-400',
        accent: 'text-blue-400',
        border: 'border-blue-500/20',
        bg: 'bg-blue-500/5',
        icon: '🔍',
        features: [
          'Campañas de Búsqueda, Display y Shopping',
          'Performance Max con IA de Google',
          'Keywords y grupos de anuncios',
          'Seguimiento de conversiones y ROAS',
          'Smart bidding: CPA objetivo y ROAS objetivo',
        ],
      };

  if (connected) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-sm text-zinc-500">Integración activa — próximamente gestión completa</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-12">
      <div className={`rounded-[2rem] border ${config.border} ${config.bg} p-10 text-center`}>
        <div className="mb-6 text-6xl">{config.icon}</div>
        <h2 className="mb-2 text-2xl font-black uppercase tracking-tight text-white">{config.name}</h2>
        <p className="mb-8 text-sm text-zinc-400">
          Conecta tu cuenta de {config.name} para gestionar campañas, ver métricas y optimizar tus ventas directamente desde este panel.
        </p>
        <ul className="mb-10 space-y-2 text-left">
          {config.features.map((f) => (
            <li key={f} className="flex items-center gap-3 text-sm text-zinc-300">
              <CheckCircle2 size={14} className={config.accent} />
              {f}
            </li>
          ))}
        </ul>
        <button
          onClick={onConnect}
          className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-8 py-4 text-[11px] font-black uppercase tracking-widest text-black transition hover:bg-white"
        >
          <Zap size={13} />
          Conectar {config.name}
        </button>
      </div>
    </div>
  );
}

/* ─── Componente principal ─── */
export default function PublicidadPage() {
  const [activePlatform, setActivePlatform] = useState<Platform>('meta');

  /* Meta state */
  const [ads, setAds] = useState<MetaAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  /* Trend scraper */
  const [trendQuery, setTrendQuery] = useState('cerraduras inteligentes chile');
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendItems, setTrendItems] = useState<TrendItem[]>([]);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [showTrends, setShowTrends] = useState(false);

  /* Platform connection state (stubbed — real state comes from integrations) */
  const [tiktokConnected] = useState(false);
  const [googleConnected] = useState(false);

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
    () => ['ALL', ...Array.from(new Set(ads.map((a) => a.effective_status).filter(Boolean)))],
    [ads],
  );

  /* KPIs globales */
  const totalSpend = useMemo(
    () => filteredAds.reduce((acc, a) => acc + parseFloat(getInsight(a)?.spend ?? '0'), 0),
    [filteredAds],
  );
  const totalClicks = useMemo(
    () => filteredAds.reduce((acc, a) => acc + parseInt(getInsight(a)?.clicks ?? '0', 10), 0),
    [filteredAds],
  );
  const totalImpressions = useMemo(
    () => filteredAds.reduce((acc, a) => acc + parseInt(getInsight(a)?.impressions ?? '0', 10), 0),
    [filteredAds],
  );
  const avgCTR = useMemo(
    () => (totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0),
    [totalClicks, totalImpressions],
  );
  const avgCPC = useMemo(
    () => (totalClicks > 0 ? totalSpend / totalClicks : 0),
    [totalSpend, totalClicks],
  );
  const cpm = useMemo(
    () => (totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0),
    [totalSpend, totalImpressions],
  );

  /* Datos para gráficas: top 8 anuncios por gasto */
  const chartData = useMemo(() => {
    return [...filteredAds]
      .sort((a, b) => parseFloat(getInsight(b)?.spend ?? '0') - parseFloat(getInsight(a)?.spend ?? '0'))
      .slice(0, 8)
      .map((ad) => {
        const ins = getInsight(ad);
        return {
          name: ad.name.length > 18 ? ad.name.slice(0, 18) + '…' : ad.name,
          Gasto: parseFloat(ins?.spend ?? '0'),
          Clicks: parseInt(ins?.clicks ?? '0', 10),
          CTR: parseFloat(ins?.ctr ?? '0'),
        };
      });
  }, [filteredAds]);

  /* Selección bulk */
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const selectVisible = () => setSelectedIds(filteredAds.map((a) => a.id));
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
      setBulkMessage(`${json.okCount}/${json.total} anuncios actualizados${json.failCount ? `, ${json.failCount} con error` : ''}.`);
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
      setShowTrends(true);
    } catch (err) {
      setTrendError(err instanceof Error ? err.message : 'Error scrapeando tendencias.');
    } finally {
      setTrendLoading(false);
    }
  };

  const handlePlatformConnect = (platform: 'tiktok' | 'google') => {
    const path = platform === 'tiktok'
      ? '/api/admin/tiktok/oauth/start'
      : '/api/admin/google/oauth/start';
    window.location.href = path;
  };

  /* ─── Render ─── */
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">
            Centro de Publicidad
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight md:text-5xl">Publicidad</h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            Gestiona Meta, TikTok y Google Ads desde un solo panel. Genera ventas sin salir de aquí.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/publicidad/coach"
            className="flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-400/8 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-fuchsia-300 transition hover:bg-fuchsia-400/15"
          >
            <Bot size={13} />
            Coach IA
          </Link>
          <Link
            href="/admin/publicidad/nuevo"
            className="flex items-center gap-2 rounded-full bg-yellow-400 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-black transition hover:bg-white"
          >
            <Plus size={13} />
            Nueva campaña
          </Link>
        </div>
      </div>

      {/* Tabs de plataforma */}
      <div className="flex gap-1 rounded-2xl border border-white/8 bg-white/[0.02] p-1">
        {(
          [
            { id: 'meta', label: 'Meta Ads', icon: '📘', sub: 'Facebook · Instagram', connected: true },
            { id: 'tiktok', label: 'TikTok Ads', icon: '🎵', sub: 'TikTok for Business', connected: tiktokConnected },
            { id: 'google', label: 'Google Ads', icon: '🔍', sub: 'Search · Display · Shopping', connected: googleConnected },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActivePlatform(tab.id)}
            className={`flex flex-1 items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
              activePlatform === tab.id
                ? 'bg-white/8 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-widest">{tab.label}</p>
              <p className="text-[9px] uppercase tracking-widest text-zinc-600">{tab.sub}</p>
            </div>
            {tab.connected ? (
              <span className="ml-auto shrink-0 h-2 w-2 rounded-full bg-emerald-400" title="Conectado" />
            ) : (
              <span className="ml-auto shrink-0 rounded-full border border-zinc-600 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-zinc-600">
                Conectar
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── PLATFORM: TIKTOK ─── */}
      {activePlatform === 'tiktok' && (
        <PlatformPlaceholder
          platform="tiktok"
          connected={tiktokConnected}
          onConnect={() => handlePlatformConnect('tiktok')}
        />
      )}

      {/* ─── PLATFORM: GOOGLE ─── */}
      {activePlatform === 'google' && (
        <PlatformPlaceholder
          platform="google"
          connected={googleConnected}
          onConnect={() => handlePlatformConnect('google')}
        />
      )}

      {/* ─── PLATFORM: META ─── */}
      {activePlatform === 'meta' && (
        <>
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
                <p className="text-sm uppercase tracking-widest text-zinc-500">Cargando campañas de Meta…</p>
              </div>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex items-start gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-400">Error al cargar Meta Ads</p>
                <p className="mt-1 text-sm text-zinc-400">{error}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  Verifica META_ACCESS_TOKEN y META_AD_ACCOUNT_ID en{' '}
                  <Link href="/admin/integraciones" className="text-yellow-400 underline">
                    Integraciones
                  </Link>
                  .
                </p>
              </div>
              <button
                onClick={() => void fetchAds()}
                className="shrink-0 rounded-full border border-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 transition hover:text-white"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Estado vacío */}
          {!loading && !error && ads.length === 0 && (
            <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-16 text-center">
              <ShoppingCart size={40} className="mx-auto mb-4 text-zinc-600" />
              <p className="mb-2 text-base font-bold text-zinc-400">No hay anuncios en esta cuenta</p>
              <p className="mb-8 text-sm text-zinc-600">Crea tu primera campaña y empieza a generar ventas</p>
              <Link
                href="/admin/publicidad/nuevo"
                className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-6 py-3 text-[11px] font-black uppercase tracking-widest text-black transition hover:bg-white"
              >
                <Plus size={13} />
                Crear primera campaña
              </Link>
            </div>
          )}

          {!loading && !error && ads.length > 0 && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                {[
                  {
                    label: 'Campañas activas',
                    value: filteredAds.filter((a) => a.effective_status === 'ACTIVE').length,
                    sub: `de ${filteredAds.length} total`,
                    icon: Activity,
                    highlight: true,
                    color: 'text-yellow-400',
                    border: 'border-yellow-400/20',
                    bg: 'bg-yellow-400/5',
                  },
                  {
                    label: 'Gasto total',
                    value: `$${totalSpend.toFixed(2)}`,
                    sub: 'USD acumulado',
                    icon: DollarSign,
                    color: 'text-emerald-400',
                    border: 'border-emerald-500/15',
                    bg: '',
                  },
                  {
                    label: 'Clicks totales',
                    value: totalClicks.toLocaleString('es-CL'),
                    sub: 'en período',
                    icon: MousePointer,
                    color: 'text-sky-400',
                    border: 'border-white/5',
                    bg: '',
                  },
                  {
                    label: 'Impresiones',
                    value: totalImpressions >= 1000
                      ? `${(totalImpressions / 1000).toFixed(1)}K`
                      : totalImpressions.toLocaleString('es-CL'),
                    sub: 'alcance total',
                    icon: Eye,
                    color: 'text-violet-400',
                    border: 'border-white/5',
                    bg: '',
                  },
                  {
                    label: 'CTR promedio',
                    value: `${avgCTR.toFixed(2)}%`,
                    sub: avgCTR > 2 ? '✓ Buen CTR' : avgCTR > 1 ? 'CTR promedio' : 'CTR bajo',
                    icon: TrendingUp,
                    color: avgCTR > 2 ? 'text-emerald-400' : avgCTR > 1 ? 'text-yellow-400' : 'text-red-400',
                    border: 'border-white/5',
                    bg: '',
                  },
                  {
                    label: 'CPC',
                    value: `$${avgCPC.toFixed(3)}`,
                    sub: `CPM $${cpm.toFixed(2)}`,
                    icon: Target,
                    color: 'text-orange-400',
                    border: 'border-white/5',
                    bg: '',
                  },
                ].map(({ label, value, sub, icon: Icon, color, border, bg }) => (
                  <div key={label} className={`rounded-2xl border ${border} ${bg ?? 'bg-white/[0.02]'} p-4`}>
                    <Icon size={15} className={color} />
                    <p className="mt-2 text-xl font-black text-white">{value}</p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
                    <p className="mt-1 text-[9px] text-zinc-600">{sub}</p>
                  </div>
                ))}
              </div>

              {/* Gráficas */}
              {chartData.length > 0 && (
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Gasto por campaña */}
                  <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.02] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Gasto por campaña</p>
                        <p className="text-sm font-black text-white">Top campañas (USD)</p>
                      </div>
                      <BarChart3 size={16} className="text-zinc-600" />
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#52525b' }} />
                        <YAxis tick={{ fontSize: 9, fill: '#52525b' }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="Gasto" fill="#facc15" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Clicks y CTR */}
                  <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.02] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Performance</p>
                        <p className="text-sm font-black text-white">Clicks y CTR por campaña</p>
                      </div>
                      <TrendingUp size={16} className="text-zinc-600" />
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#52525b' }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#52525b' }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#52525b' }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '9px', color: '#71717a' }} />
                        <Line yAxisId="left" type="monotone" dataKey="Clicks" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3, fill: '#38bdf8' }} />
                        <Line yAxisId="right" type="monotone" dataKey="CTR" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3, fill: '#a78bfa' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Barra de filtros + acciones masivas */}
              <section className="rounded-[1.5rem] border border-white/8 bg-white/[0.02] p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar por nombre, ID o estado…"
                      className="w-full rounded-xl border border-white/8 bg-black/40 py-3 pl-10 pr-3 text-sm text-white outline-none transition focus:border-yellow-400/40"
                    />
                  </div>
                  <select
                    aria-label="Filtrar por estado"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-xl border border-white/8 bg-black/40 px-3 py-3 text-sm text-white outline-none transition focus:border-yellow-400/40"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s === 'ALL' ? 'Todos los estados' : s}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => void fetchAds(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 rounded-xl border border-white/8 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 transition hover:text-white disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                    Sync
                  </button>
                  <Link
                    href="/admin/integraciones"
                    className="flex items-center gap-2 rounded-xl border border-white/8 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 transition hover:text-white"
                  >
                    <Settings size={12} />
                    Config
                  </Link>
                </div>

                {/* Acciones masivas */}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
                  <button onClick={selectVisible} className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 transition hover:text-white">
                    Sel. visibles
                  </button>
                  <button onClick={clearSelection} className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 transition hover:text-white">
                    Limpiar
                  </button>
                  <span className="rounded-full border border-yellow-400/20 bg-yellow-400/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-yellow-400">
                    {selectedIds.length} sel.
                  </span>
                  <button
                    disabled={!selectedIds.length || bulkLoading}
                    onClick={() => void runBulkAction('ACTIVATE')}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-400 transition hover:bg-emerald-500/15 disabled:opacity-40"
                  >
                    <PlayCircle size={11} /> Activar
                  </button>
                  <button
                    disabled={!selectedIds.length || bulkLoading}
                    onClick={() => void runBulkAction('PAUSE')}
                    className="inline-flex items-center gap-1 rounded-full border border-yellow-400/20 bg-yellow-400/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-yellow-400 transition hover:bg-yellow-400/15 disabled:opacity-40"
                  >
                    <PauseCircle size={11} /> Pausar
                  </button>
                  <button
                    disabled={!selectedIds.length || bulkLoading}
                    onClick={() => void runBulkAction('ARCHIVE')}
                    className="inline-flex items-center gap-1 rounded-full border border-zinc-500/20 bg-zinc-500/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition hover:bg-zinc-500/15 disabled:opacity-40"
                  >
                    <Archive size={11} /> Archivar
                  </button>
                  {bulkMessage && (
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                      <CheckCircle2 size={12} className="text-emerald-400" />
                      {bulkMessage}
                    </span>
                  )}
                </div>
              </section>

              {/* Tabla de campañas */}
              {filteredAds.length > 0 ? (
                <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-white/[0.02]">
                  <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">
                      Campañas · {filteredAds.length} resultado{filteredAds.length !== 1 ? 's' : ''}
                    </h2>
                    <a
                      href="https://adsmanager.facebook.com"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600 transition hover:text-yellow-400"
                    >
                      Meta Ads Manager <ExternalLink size={10} />
                    </a>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/5 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                          <th className="px-5 py-3 text-left">Sel</th>
                          <th className="px-5 py-3 text-left">Campaña</th>
                          <th className="px-5 py-3 text-left">Estado</th>
                          <th className="px-5 py-3 text-right">Gasto USD</th>
                          <th className="px-5 py-3 text-right">Clicks</th>
                          <th className="px-5 py-3 text-right">Impresiones</th>
                          <th className="px-5 py-3 text-right">CTR</th>
                          <th className="px-5 py-3 text-right">CPC</th>
                          <th className="px-5 py-3 text-center">Rendimiento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAds.map((ad, idx) => {
                          const ins = getInsight(ad);
                          const spend = parseFloat(ins?.spend ?? '0');
                          const clicks = parseInt(ins?.clicks ?? '0', 10);
                          const impressions = parseInt(ins?.impressions ?? '0', 10);
                          const ctr = parseFloat(ins?.ctr ?? '0');
                          const cpc = clicks > 0 ? spend / clicks : 0;
                          const statusClass = STATUS_COLORS[ad.effective_status] ?? 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
                          const isLast = idx === filteredAds.length - 1;
                          const perf = ctr > 2 ? { label: 'Alto', color: 'text-emerald-400', Icon: ArrowUpRight } : ctr > 0.5 ? { label: 'Medio', color: 'text-yellow-400', Icon: ArrowUpRight } : { label: 'Bajo', color: 'text-red-400', Icon: ArrowDownRight };

                          return (
                            <tr
                              key={ad.id}
                              className={`border-b border-white/5 transition-colors hover:bg-white/[0.015] ${isLast ? 'border-b-0' : ''}`}
                            >
                              <td className="px-5 py-4">
                                <input
                                  type="checkbox"
                                  aria-label="Seleccionar campaña"
                                  checked={selectedIds.includes(ad.id)}
                                  onChange={() => toggleSelect(ad.id)}
                                  className="h-4 w-4 rounded border-white/20 bg-transparent accent-yellow-400"
                                />
                              </td>
                              <td className="px-5 py-4">
                                <p className="max-w-[220px] truncate font-semibold text-white">{ad.name}</p>
                                <p className="mt-0.5 font-mono text-[9px] text-zinc-600">{ad.id}</p>
                              </td>
                              <td className="px-5 py-4">
                                <span className={`inline-block rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest ${statusClass}`}>
                                  {ad.effective_status}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right font-mono text-zinc-300">${spend.toFixed(2)}</td>
                              <td className="px-5 py-4 text-right font-mono text-zinc-300">{clicks.toLocaleString('es-CL')}</td>
                              <td className="px-5 py-4 text-right font-mono text-zinc-300">
                                {impressions >= 1000 ? `${(impressions / 1000).toFixed(1)}K` : impressions.toLocaleString('es-CL')}
                              </td>
                              <td className="px-5 py-4 text-right font-mono text-zinc-300">{ctr.toFixed(2)}%</td>
                              <td className="px-5 py-4 text-right font-mono text-zinc-300">${cpc.toFixed(3)}</td>
                              <td className="px-5 py-4 text-center">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${perf.color}`}>
                                  <perf.Icon size={11} />
                                  {perf.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-12 text-center">
                  <p className="text-sm text-zinc-500">Sin resultados con los filtros actuales</p>
                </div>
              )}

              {/* Panel inferior: Acciones rápidas + Scraper */}
              <div className="grid gap-4 lg:grid-cols-3">
                {/* Acciones rápidas */}
                <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.02] p-5">
                  <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Acciones rápidas</p>
                  <div className="space-y-2">
                    {[
                      { href: '/admin/publicidad/nuevo', label: 'Nueva campaña Meta', icon: Plus, color: 'text-yellow-400' },
                      { href: '/admin/publicidad/coach', label: 'Analizar con IA Coach', icon: Bot, color: 'text-fuchsia-400' },
                      { href: '/admin/integraciones', label: 'Configurar integraciones', icon: Settings, color: 'text-sky-400' },
                    ].map(({ href, label, icon: Icon, color }) => (
                      <Link
                        key={href}
                        href={href}
                        className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm font-medium text-zinc-300 transition hover:border-white/10 hover:text-white"
                      >
                        <Icon size={14} className={color} />
                        {label}
                        <ArrowUpRight size={12} className="ml-auto text-zinc-600" />
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Scraper de tendencias */}
                <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.02] p-5 lg:col-span-2">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Inteligencia competitiva</p>
                      <p className="text-sm font-black text-white">Scraper de tendencias</p>
                    </div>
                    <Sparkles size={15} className="text-yellow-400" />
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={trendQuery}
                      onChange={(e) => setTrendQuery(e.target.value)}
                      className="flex-1 rounded-xl border border-white/8 bg-black/40 px-3 py-2.5 text-sm text-white outline-none transition focus:border-yellow-400/40"
                      placeholder="Ej: cerraduras inteligentes chile"
                    />
                    <button
                      onClick={() => void fetchTrends()}
                      disabled={trendLoading}
                      className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-black transition hover:bg-white disabled:opacity-50"
                    >
                      <Sparkles size={11} className={trendLoading ? 'animate-pulse' : ''} />
                      Buscar
                    </button>
                  </div>

                  {trendError && <p className="mt-3 text-xs text-red-400">{trendError}</p>}

                  {showTrends && !trendError && trendItems.length > 0 && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {trendItems.map((item) => (
                        <a
                          key={`${item.url}-${item.title}`}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-white/8 bg-black/30 p-3 transition hover:border-yellow-400/25"
                        >
                          <p className="line-clamp-2 text-xs font-semibold text-white">{item.title}</p>
                          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600">{item.domain}</p>
                        </a>
                      ))}
                    </div>
                  )}

                  {showTrends && !trendError && trendItems.length === 0 && !trendLoading && (
                    <p className="mt-3 text-xs text-zinc-600">Sin resultados. Prueba otro término.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
