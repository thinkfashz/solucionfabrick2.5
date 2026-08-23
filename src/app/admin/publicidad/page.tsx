'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  Archive,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  Eye,
  MousePointer,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

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

interface IntegrationFieldStatus {
  set: boolean;
  preview: string;
  source?: 'db' | 'env';
}

interface IntegrationProviderStatus {
  credentials?: Record<string, IntegrationFieldStatus>;
}

type Platform = 'meta' | 'tiktok' | 'google';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-800',
  PAUSED: 'bg-amber-500/10 text-amber-800',
  DISAPPROVED: 'bg-rose-500/10 text-rose-800',
  ARCHIVED: 'bg-zinc-500/10 text-zinc-700',
  PENDING_REVIEW: 'bg-sky-500/10 text-sky-800',
};

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-black/10 bg-[#171612] px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-bold text-[#c9c1b4]">{label}</p>
      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color }} className="font-mono">
          {item.name}: {item.name === 'Gasto' ? `$${item.value.toFixed(2)}` : item.value.toLocaleString('es-CL')}
        </p>
      ))}
    </div>
  );
}

function PlatformPlaceholder({ platform, connected, onConnect }: { platform: 'tiktok' | 'google'; connected: boolean; onConnect: () => void }) {
  const config = platform === 'tiktok'
    ? {
        name: 'TikTok Ads',
        icon: '🎵',
        features: ['Campañas In-Feed, TopView y Spark Ads', 'Audiencias y lookalikes', 'Analytics de video', 'Gestión de presupuesto y puja', 'Creativos y A/B testing'],
      }
    : {
        name: 'Google Ads',
        icon: '🔎',
        features: ['Búsqueda, Display y Shopping', 'Performance Max', 'Keywords y grupos de anuncios', 'Conversiones y ROAS', 'Smart bidding'],
      };

  return (
    <AdminCard className="mx-auto max-w-3xl">
      <div className="grid gap-6 py-4 sm:grid-cols-[90px_1fr] sm:items-start">
        <div className="grid h-20 w-20 place-items-center rounded-2xl bg-[#ffb000]/10 text-4xl">{config.icon}</div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-black tracking-[-.035em] text-[#171612]">{config.name}</h2>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${connected ? 'bg-emerald-500/10 text-emerald-800' : 'bg-zinc-500/10 text-zinc-700'}`}>
              {connected ? 'Conectado' : 'Sin conectar'}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#716b60]">
            {connected
              ? `La conexión con ${config.name} está activa. La gestión completa de campañas se integrará aquí usando esta misma credencial.`
              : `Conecta ${config.name} para administrar campañas desde el mismo centro de publicidad.`}
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {config.features.map((feature) => (
              <li key={feature} className="flex gap-2 text-xs leading-5 text-[#5f584d]"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#a56600]" />{feature}</li>
            ))}
          </ul>
          {!connected ? (
            <button type="button" onClick={onConnect} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white transition hover:bg-[#2a2823]">
              <Zap className="h-4 w-4" /> Conectar {config.name}
            </button>
          ) : (
            <Link href="/admin/integraciones" className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/65 px-4 text-xs font-bold text-[#5f584d] hover:bg-white">
              <Settings className="h-4 w-4" /> Revisar integración
            </Link>
          )}
        </div>
      </div>
    </AdminCard>
  );
}

export default function PublicidadPage() {
  const [activePlatform, setActivePlatform] = useState<Platform>('meta');
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
  const [showTrends, setShowTrends] = useState(false);
  const [providers, setProviders] = useState<Record<string, IntegrationProviderStatus>>({});

  const fetchAds = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/meta/ads', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Error al cargar anuncios');
      setAds(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchIntegrationStatus = async () => {
    try {
      const res = await fetch('/api/admin/integrations', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.providers && typeof json.providers === 'object') setProviders(json.providers);
    } catch {
      // Publicidad sigue operativa aunque el centro de integraciones no responda.
    }
  };

  useEffect(() => {
    void Promise.all([fetchAds(), fetchIntegrationStatus()]);
  }, []);

  const providerConnected = (provider: string) => Object.values(providers[provider]?.credentials ?? {}).some((field) => Boolean(field?.set));
  const metaConnected = providerConnected('meta');
  const tiktokConnected = providerConnected('tiktok');
  const googleConnected = providerConnected('google_ads') || providerConnected('google');

  const getInsight = (ad: MetaAd) => ad.insights?.data?.[0] ?? null;

  const filteredAds = useMemo(() => ads.filter((ad) => {
    if (statusFilter !== 'ALL' && ad.effective_status !== statusFilter) return false;
    if (!search.trim()) return true;
    return `${ad.name} ${ad.id} ${ad.status} ${ad.effective_status}`.toLowerCase().includes(search.toLowerCase());
  }), [ads, search, statusFilter]);

  const statuses = useMemo(() => ['ALL', ...Array.from(new Set(ads.map((ad) => ad.effective_status).filter(Boolean)))], [ads]);
  const totalSpend = useMemo(() => filteredAds.reduce((acc, ad) => acc + parseFloat(getInsight(ad)?.spend ?? '0'), 0), [filteredAds]);
  const totalClicks = useMemo(() => filteredAds.reduce((acc, ad) => acc + parseInt(getInsight(ad)?.clicks ?? '0', 10), 0), [filteredAds]);
  const totalImpressions = useMemo(() => filteredAds.reduce((acc, ad) => acc + parseInt(getInsight(ad)?.impressions ?? '0', 10), 0), [filteredAds]);
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

  const chartData = useMemo(() => [...filteredAds]
    .sort((a, b) => parseFloat(getInsight(b)?.spend ?? '0') - parseFloat(getInsight(a)?.spend ?? '0'))
    .slice(0, 8)
    .map((ad) => {
      const insight = getInsight(ad);
      return {
        name: ad.name.length > 18 ? `${ad.name.slice(0, 18)}…` : ad.name,
        Gasto: parseFloat(insight?.spend ?? '0'),
        Clicks: parseInt(insight?.clicks ?? '0', 10),
        CTR: parseFloat(insight?.ctr ?? '0'),
      };
    }), [filteredAds]);

  const toggleSelect = (id: string) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]);
  const selectVisible = () => setSelectedIds(filteredAds.map((ad) => ad.id));
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
      const json = await res.json().catch(() => ({}));
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
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'No se pudo consultar tendencias.');
      setTrendItems(Array.isArray(json.items) ? json.items : []);
      setShowTrends(true);
    } catch (err) {
      setTrendError(err instanceof Error ? err.message : 'Error consultando tendencias.');
    } finally {
      setTrendLoading(false);
    }
  };

  const handlePlatformConnect = (platform: 'tiktok' | 'google') => {
    window.location.href = platform === 'tiktok' ? '/api/admin/tiktok/oauth/start' : '/api/admin/google/oauth/start';
  };

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Marketing · Canales"
        title="Publicidad"
        description="Gestiona campañas, rendimiento y conexiones publicitarias desde un único workspace coherente con el resto del administrador."
        icon={BarChart3}
        meta={
          <div className="flex flex-wrap gap-2">
            <ConnectionBadge label="Meta" connected={metaConnected} />
            <ConnectionBadge label="TikTok" connected={tiktokConnected} />
            <ConnectionBadge label="Google" connected={googleConnected} />
          </div>
        }
        actions={
          <>
            <Link href="/admin/publicidad/coach" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-4 text-xs font-bold text-[#5f584d] hover:bg-white"><Bot className="h-4 w-4" />Coach IA</Link>
            <Link href="/admin/publicidad/nuevo" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white hover:bg-[#2a2823]"><Plus className="h-4 w-4" />Nueva campaña</Link>
          </>
        }
      />

      <AdminCard className="p-1 sm:p-1">
        <div className="grid gap-1 sm:grid-cols-3">
          {([
            { id: 'meta', label: 'Meta Ads', sub: 'Facebook · Instagram', connected: metaConnected },
            { id: 'tiktok', label: 'TikTok Ads', sub: 'TikTok for Business', connected: tiktokConnected },
            { id: 'google', label: 'Google Ads', sub: 'Search · Display · Shopping', connected: googleConnected },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActivePlatform(tab.id)}
              className={`flex items-center gap-3 rounded-[14px] px-4 py-3 text-left transition ${activePlatform === tab.id ? 'bg-[#171612] text-white' : 'text-[#716b60] hover:bg-white/75 hover:text-[#171612]'}`}
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tab.connected ? 'bg-emerald-500' : 'bg-[#b8b0a4]'}`} />
              <span className="min-w-0"><strong className="block text-xs">{tab.label}</strong><span className={`block truncate text-[10px] ${activePlatform === tab.id ? 'text-white/50' : 'text-[#9a9286]'}`}>{tab.sub}</span></span>
            </button>
          ))}
        </div>
      </AdminCard>

      {activePlatform === 'tiktok' ? <PlatformPlaceholder platform="tiktok" connected={tiktokConnected} onConnect={() => handlePlatformConnect('tiktok')} /> : null}
      {activePlatform === 'google' ? <PlatformPlaceholder platform="google" connected={googleConnected} onConnect={() => handlePlatformConnect('google')} /> : null}

      {activePlatform === 'meta' ? (
        <div className="space-y-5">
          {loading ? <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-[#817a6f]"><RefreshCw className="h-5 w-5 animate-spin text-[#a56600]" />Cargando campañas de Meta…</div> : null}

          {!loading && error ? (
            <AdminCard>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-700" />
                <div className="flex-1"><p className="font-bold text-rose-800">No se pudieron cargar las campañas</p><p className="mt-1 text-sm leading-6 text-[#716b60]">{error}</p><p className="mt-2 text-xs text-[#8f887c]">Revisa la configuración de Meta en Integraciones.</p></div>
                <button type="button" onClick={() => void fetchAds()} className="rounded-xl border border-black/10 bg-white/65 px-4 py-2 text-xs font-bold text-[#5f584d] hover:bg-white">Reintentar</button>
              </div>
            </AdminCard>
          ) : null}

          {!loading && !error && ads.length === 0 ? (
            <AdminCard>
              <div className="grid min-h-64 place-items-center text-center">
                <div className="max-w-md"><ShoppingCart className="mx-auto h-7 w-7 text-[#a56600]" /><h2 className="mt-3 text-lg font-black text-[#171612]">No hay campañas en esta cuenta</h2><p className="mt-2 text-sm leading-6 text-[#817a6f]">Crea la primera campaña o revisa la conexión de Meta.</p><Link href="/admin/publicidad/nuevo" className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white"><Plus className="h-4 w-4" />Crear campaña</Link></div>
              </div>
            </AdminCard>
          ) : null}

          {!loading && !error && ads.length > 0 ? (
            <>
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <AdminStat label="Activas" value={filteredAds.filter((ad) => ad.effective_status === 'ACTIVE').length} icon={Activity} accent="emerald" hint={`${filteredAds.length} visibles`} />
                <AdminStat label="Gasto" value={`$${totalSpend.toFixed(2)}`} icon={DollarSign} accent="yellow" hint="USD acumulado" />
                <AdminStat label="Clicks" value={totalClicks.toLocaleString('es-CL')} icon={MousePointer} accent="cyan" hint="En el período" />
                <AdminStat label="Impresiones" value={totalImpressions >= 1000 ? `${(totalImpressions / 1000).toFixed(1)}K` : totalImpressions.toLocaleString('es-CL')} icon={Eye} accent="yellow" hint="Alcance total" />
                <AdminStat label="CTR" value={`${avgCTR.toFixed(2)}%`} icon={TrendingUp} accent={avgCTR > 1 ? 'emerald' : 'rose'} hint={avgCTR > 2 ? 'Buen CTR' : avgCTR > 1 ? 'CTR promedio' : 'CTR bajo'} />
                <AdminStat label="CPC" value={`$${avgCPC.toFixed(3)}`} icon={Target} accent="yellow" hint={`CPM $${cpm.toFixed(2)}`} />
              </section>

              {chartData.length ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  <AdminCard>
                    <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]">Inversión</p><h2 className="mt-1 text-lg font-black text-[#171612]">Gasto por campaña</h2></div><BarChart3 className="h-4 w-4 text-[#a56600]" /></div>
                    <ResponsiveContainer width="100%" height={240}><BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(23,22,18,.08)" /><XAxis dataKey="name" tick={{ fontSize: 9, fill: '#817a6f' }} /><YAxis tick={{ fontSize: 9, fill: '#817a6f' }} /><Tooltip content={<ChartTooltip />} /><Bar dataKey="Gasto" fill="#c77a00" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
                  </AdminCard>
                  <AdminCard>
                    <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]">Performance</p><h2 className="mt-1 text-lg font-black text-[#171612]">Clicks y CTR</h2></div><TrendingUp className="h-4 w-4 text-[#a56600]" /></div>
                    <ResponsiveContainer width="100%" height={240}><LineChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(23,22,18,.08)" /><XAxis dataKey="name" tick={{ fontSize: 9, fill: '#817a6f' }} /><YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#817a6f' }} /><YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#817a6f' }} /><Tooltip content={<ChartTooltip />} /><Legend wrapperStyle={{ fontSize: '10px', color: '#716b60' }} /><Line yAxisId="left" type="monotone" dataKey="Clicks" stroke="#0e7490" strokeWidth={2} dot={{ r: 2 }} /><Line yAxisId="right" type="monotone" dataKey="CTR" stroke="#a56600" strokeWidth={2} dot={{ r: 2 }} /></LineChart></ResponsiveContainer>
                  </AdminCard>
                </div>
              ) : null}

              <AdminCard className="p-0 sm:p-0">
                <div className="grid gap-3 border-b border-black/8 p-4 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
                  <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9286]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar campaña…" className="w-full rounded-xl border border-black/10 bg-white/75 py-3 pl-10 pr-3 text-sm text-[#171612] outline-none focus:border-[#c77a00]/35" /></label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-black/10 bg-white/75 px-3 py-3 text-sm text-[#171612] outline-none"><option value="ALL">Todos los estados</option>{statuses.filter((value) => value !== 'ALL').map((value) => <option key={value}>{value}</option>)}</select>
                  <button type="button" onClick={() => void fetchAds(true)} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/65 px-4 text-xs font-bold text-[#5f584d] hover:bg-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Sincronizar</button>
                  <Link href="/admin/integraciones" className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/65 px-4 text-xs font-bold text-[#5f584d] hover:bg-white"><Settings className="h-4 w-4" />Configurar</Link>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-b border-black/8 px-4 py-3">
                  <button type="button" onClick={selectVisible} className="rounded-full border border-black/10 bg-white/55 px-3 py-1.5 text-[10px] font-bold text-[#716b60] hover:bg-white">Seleccionar visibles</button>
                  <button type="button" onClick={clearSelection} className="rounded-full border border-black/10 bg-white/55 px-3 py-1.5 text-[10px] font-bold text-[#716b60] hover:bg-white">Limpiar</button>
                  <span className="rounded-full bg-[#ffb000]/10 px-3 py-1.5 text-[10px] font-black text-[#77500a]">{selectedIds.length} seleccionadas</span>
                  <BulkButton label="Activar" disabled={!selectedIds.length || bulkLoading} onClick={() => void runBulkAction('ACTIVATE')} icon={PlayCircle} />
                  <BulkButton label="Pausar" disabled={!selectedIds.length || bulkLoading} onClick={() => void runBulkAction('PAUSE')} icon={PauseCircle} />
                  <BulkButton label="Archivar" disabled={!selectedIds.length || bulkLoading} onClick={() => void runBulkAction('ARCHIVE')} icon={Archive} />
                  {bulkMessage ? <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-[#716b60]"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />{bulkMessage}</span> : null}
                </div>

                {filteredAds.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-sm">
                      <thead><tr className="border-b border-black/8 text-[10px] font-black uppercase tracking-[.12em] text-[#8f887c]"><th className="px-4 py-3 text-left">Sel.</th><th className="px-4 py-3 text-left">Campaña</th><th className="px-4 py-3 text-left">Estado</th><th className="px-4 py-3 text-right">Gasto</th><th className="px-4 py-3 text-right">Clicks</th><th className="px-4 py-3 text-right">Impresiones</th><th className="px-4 py-3 text-right">CTR</th><th className="px-4 py-3 text-right">CPC</th><th className="px-4 py-3 text-center">Rendimiento</th></tr></thead>
                      <tbody className="divide-y divide-black/8">
                        {filteredAds.map((ad) => {
                          const insight = getInsight(ad);
                          const spend = parseFloat(insight?.spend ?? '0');
                          const clicks = parseInt(insight?.clicks ?? '0', 10);
                          const impressions = parseInt(insight?.impressions ?? '0', 10);
                          const ctr = parseFloat(insight?.ctr ?? '0');
                          const cpc = clicks > 0 ? spend / clicks : 0;
                          const performance = ctr > 2 ? { label: 'Alto', className: 'text-emerald-700', Icon: ArrowUpRight } : ctr > 0.5 ? { label: 'Medio', className: 'text-[#9b6a12]', Icon: ArrowUpRight } : { label: 'Bajo', className: 'text-rose-700', Icon: ArrowDownRight };
                          return (
                            <tr key={ad.id} className="transition hover:bg-white/45">
                              <td className="px-4 py-4"><input type="checkbox" checked={selectedIds.includes(ad.id)} onChange={() => toggleSelect(ad.id)} className="h-4 w-4 accent-[#c77a00]" /></td>
                              <td className="px-4 py-4"><p className="max-w-[260px] truncate font-bold text-[#171612]">{ad.name}</p><p className="mt-1 font-mono text-[10px] text-[#9a9286]">{ad.id}</p></td>
                              <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_STYLES[ad.effective_status] ?? 'bg-zinc-500/10 text-zinc-700'}`}>{ad.effective_status}</span></td>
                              <td className="px-4 py-4 text-right font-mono text-[#514b42]">${spend.toFixed(2)}</td>
                              <td className="px-4 py-4 text-right font-mono text-[#514b42]">{clicks.toLocaleString('es-CL')}</td>
                              <td className="px-4 py-4 text-right font-mono text-[#514b42]">{impressions >= 1000 ? `${(impressions / 1000).toFixed(1)}K` : impressions.toLocaleString('es-CL')}</td>
                              <td className="px-4 py-4 text-right font-mono text-[#514b42]">{ctr.toFixed(2)}%</td>
                              <td className="px-4 py-4 text-right font-mono text-[#514b42]">${cpc.toFixed(3)}</td>
                              <td className="px-4 py-4 text-center"><span className={`inline-flex items-center gap-1 text-xs font-bold ${performance.className}`}><performance.Icon className="h-3.5 w-3.5" />{performance.label}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : <div className="p-10 text-center text-sm text-[#817a6f]">Sin resultados con los filtros actuales.</div>}
              </AdminCard>

              <div className="grid gap-4 lg:grid-cols-3">
                <AdminCard>
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]">Acciones rápidas</p>
                  <div className="mt-3 divide-y divide-black/8">
                    {[
                      { href: '/admin/publicidad/nuevo', label: 'Nueva campaña Meta', icon: Plus },
                      { href: '/admin/publicidad/coach', label: 'Analizar con IA Coach', icon: Bot },
                      { href: '/admin/integraciones', label: 'Configurar integraciones', icon: Settings },
                    ].map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex items-center gap-3 py-3 text-sm font-bold text-[#514b42] hover:text-[#171612]"><Icon className="h-4 w-4 text-[#a56600]" />{label}<ArrowUpRight className="ml-auto h-3.5 w-3.5 text-[#9a9286]" /></Link>)}
                  </div>
                </AdminCard>

                <AdminCard className="lg:col-span-2">
                  <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]">Inteligencia competitiva</p><h2 className="mt-1 text-lg font-black text-[#171612]">Tendencias del mercado</h2></div><Sparkles className="h-4 w-4 text-[#a56600]" /></div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={trendQuery} onChange={(e) => setTrendQuery(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white/75 px-3 py-2.5 text-sm text-[#171612] outline-none focus:border-[#c77a00]/35" placeholder="Ej: cerraduras inteligentes chile" /><button type="button" onClick={() => void fetchTrends()} disabled={trendLoading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white disabled:opacity-50"><Sparkles className={`h-3.5 w-3.5 ${trendLoading ? 'animate-pulse' : ''}`} />Buscar</button></div>
                  {trendError ? <p className="mt-3 text-xs font-medium text-rose-700">{trendError}</p> : null}
                  {showTrends && !trendError && trendItems.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{trendItems.map((item) => <a key={`${item.url}-${item.title}`} href={item.url} target="_blank" rel="noreferrer" className="border-t border-black/8 py-3 text-sm text-[#514b42] hover:text-[#171612]"><p className="line-clamp-2 font-bold">{item.title}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[.12em] text-[#9a9286]">{item.domain}</p></a>)}</div> : null}
                  {showTrends && !trendError && !trendItems.length && !trendLoading ? <p className="mt-3 text-xs text-[#8f887c]">Sin resultados. Prueba otro término.</p> : null}
                </AdminCard>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </AdminPage>
  );
}

function ConnectionBadge({ label, connected }: { label: string; connected: boolean }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${connected ? 'bg-emerald-500/10 text-emerald-800' : 'bg-zinc-500/10 text-zinc-700'}`}><span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-zinc-400'}`} />{label}</span>;
}

function BulkButton({ label, disabled, onClick, icon: Icon }: { label: string; disabled: boolean; onClick: () => void; icon: typeof PlayCircle }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/55 px-3 py-1.5 text-[10px] font-bold text-[#5f584d] transition hover:bg-white disabled:opacity-40"><Icon className="h-3.5 w-3.5" />{label}</button>;
}
