'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	AlertTriangle,
	ArrowDownRight,
	ArrowUpRight,
	BarChart3,
	CheckCircle2,
	ExternalLink,
	Flame,
	Loader2,
	Minus,
	Radar,
	RefreshCw,
	Save,
	Search,
	Sparkles,
	Telescope,
	TrendingUp,
} from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader } from '@/components/admin/ui';

type Tab = 'buscador' | 'tendencias' | 'historico' | 'seo';
type MarketSource = 'mercadolibre' | 'serper' | 'serpapi';

interface MarketRef {
	source: MarketSource;
	sourceId: string | null;
	title: string;
	price: number | null;
	currency: string | null;
	url: string;
	image: string | null;
	position: number;
}

interface MarketStats {
	count: number;
	min: number | null;
	max: number | null;
	avg: number | null;
	median: number | null;
	currency: string | null;
	bySource: Record<MarketSource, { count: number; avg: number | null }>;
}

interface MarketSnapshot {
	query: string;
	normalizedQuery: string;
	site: string;
	sources: MarketSource[];
	refs: MarketRef[];
	stats: MarketStats;
}

interface MarketDelta {
	previousAvg: number | null;
	currentAvg: number | null;
	deltaPct: number | null;
	trend: 'up' | 'down' | 'flat' | 'unknown';
	previousAt: string | null;
}

interface HistoryRow {
	id: string;
	query: string;
	stats: MarketStats;
	refs_count: number;
	created_at: string;
}

interface TrendRow {
	keyword: string;
	url?: string;
}

interface WinnerRow extends MarketRef {
	soldQuantity: number | null;
}

interface ProductoOption {
	id: string;
	nombre: string;
	precio: number | null;
}

interface SeoBundle {
	metaTitle: string;
	metaDescription: string;
	keywords: string[];
	jsonld: Record<string, unknown>;
	model: string;
	raw: string;
}

const SOURCE_LABEL: Record<MarketSource, string> = {
	mercadolibre: 'MercadoLibre',
	serper: 'Google · Serper',
	serpapi: 'Google · SerpAPI',
};

const SOURCE_DOT: Record<MarketSource, string> = {
	mercadolibre: 'bg-yellow-300',
	serper: 'bg-emerald-300',
	serpapi: 'bg-rose-300',
};

const PRESET_QUERIES = [
	'panel sip muros',
	'aislante térmico construcción',
	'taladro percutor profesional',
	'piso flotante ingeniería',
	'tornillos autoperforantes',
	'pintura látex exterior',
];

function formatCLP(n: number | null | undefined): string {
	if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
	return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

function trendIcon(trend: MarketDelta['trend']) {
	if (trend === 'up') return <ArrowUpRight className="h-4 w-4 text-rose-300" />;
	if (trend === 'down') return <ArrowDownRight className="h-4 w-4 text-emerald-300" />;
	if (trend === 'flat') return <Minus className="h-4 w-4 text-zinc-400" />;
	return <Radar className="h-4 w-4 text-zinc-500" />;
}

function trendColor(trend: MarketDelta['trend']): string {
	if (trend === 'up') return 'text-rose-300';
	if (trend === 'down') return 'text-emerald-300';
	if (trend === 'flat') return 'text-zinc-400';
	return 'text-zinc-500';
}

function Sparkline({ values, height = 48 }: { values: number[]; height?: number }) {
	if (values.length < 2) {
		return <div className="text-xs text-zinc-500">Aún no hay suficientes datos para graficar.</div>;
	}
	const min = Math.min(...values);
	const max = Math.max(...values);
	const range = max - min || 1;
	const w = 240;
	const points = values
		.map((v, i) => {
			const x = (i / (values.length - 1)) * w;
			const y = height - ((v - min) / range) * height;
			return `${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join(' ');
	return (
		<svg viewBox={`0 0 ${w} ${height}`} className="w-full">
			<polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-300" />
		</svg>
	);
}

function ActionButton({
	icon: Icon,
	label,
	description,
	onClick,
	disabled,
	loading,
	variant = 'primary',
}: {
	icon: typeof Search;
	label: string;
	description: string;
	onClick: () => void;
	disabled?: boolean;
	loading?: boolean;
	variant?: 'primary' | 'ghost' | 'danger';
}) {
	const styles =
		variant === 'primary'
			? 'border-yellow-300/40 bg-gradient-to-br from-yellow-300/10 to-amber-500/5 text-yellow-100 hover:border-yellow-300/70'
			: variant === 'danger'
			? 'border-rose-400/30 bg-rose-500/5 text-rose-200 hover:border-rose-400/60'
			: 'border-white/10 bg-black/30 text-zinc-200 hover:border-white/30';
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={`group relative flex w-full items-start gap-3 overflow-hidden rounded-xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
		>
			<span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/40">
				{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
			</span>
			<span className="min-w-0 flex-1">
				<span className="block text-sm font-semibold leading-tight">{label}</span>
				<span className="mt-0.5 block text-[11px] leading-snug text-zinc-400 group-hover:text-zinc-300">{description}</span>
			</span>
		</button>
	);
}

export default function InteligenciaMercadoPage() {
	const [tab, setTab] = useState<Tab>('buscador');

	const [query, setQuery] = useState('');
	const [sources, setSources] = useState<Record<MarketSource, boolean>>({ mercadolibre: true, serper: true, serpapi: false });
	const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
	const [delta, setDelta] = useState<MarketDelta | null>(null);
	const [searchLoading, setSearchLoading] = useState(false);
	const [searchError, setSearchError] = useState<string | null>(null);
	const [persisted, setPersisted] = useState<string | null>(null);
	const [realtime, setRealtime] = useState(false);

	const [trends, setTrends] = useState<TrendRow[]>([]);
	const [trendsCachedAt, setTrendsCachedAt] = useState<string | null>(null);
	const [trendsLoading, setTrendsLoading] = useState(false);
	const [winners, setWinners] = useState<WinnerRow[]>([]);
	const [winnersLoading, setWinnersLoading] = useState(false);
	const [winnersQuery, setWinnersQuery] = useState('');

	const [history, setHistory] = useState<HistoryRow[]>([]);
	const [historyLoading, setHistoryLoading] = useState(false);
	const [historyQuery, setHistoryQuery] = useState('');

	const [productos, setProductos] = useState<ProductoOption[]>([]);
	const [seoProductoId, setSeoProductoId] = useState<string>('');
	const [seoKeyword, setSeoKeyword] = useState('');
	const [seoTone, setSeoTone] = useState<'profesional' | 'cercano' | 'urgente'>('profesional');
	const [seoBundle, setSeoBundle] = useState<SeoBundle | null>(null);
	const [seoSuggestionId, setSeoSuggestionId] = useState<string | null>(null);
	const [seoLoading, setSeoLoading] = useState(false);
	const [seoApplying, setSeoApplying] = useState(false);
	const [seoError, setSeoError] = useState<string | null>(null);
	const [seoApplied, setSeoApplied] = useState(false);

	const runSearch = useCallback(
		async (opts: { persist?: boolean; useCache?: boolean } = {}) => {
			const q = query.trim();
			if (!q) {
				setSearchError('Escribe una palabra clave para buscar (ej. "panel SIP", "taladro percutor").');
				return;
			}
			setSearchLoading(true);
			setSearchError(null);
			setPersisted(null);
			try {
				const selected = (Object.entries(sources) as Array<[MarketSource, boolean]>).filter(([, v]) => v).map(([k]) => k);
				if (selected.length === 0) {
					setSearchError('Activa al menos una fuente de búsqueda.');
					return;
				}
				const res = await fetch('/api/admin/market-intel/search', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ q, sources: selected, persist: opts.persist === true, useCache: opts.useCache !== false }),
				});
				const json = (await res.json()) as { ok?: boolean; snapshot?: MarketSnapshot; delta?: MarketDelta; snapshotId?: string | null; error?: string };
				if (!res.ok || !json.ok || !json.snapshot) {
					setSearchError(json.error ?? 'Error en la búsqueda.');
					return;
				}
				setSnapshot(json.snapshot);
				setDelta(json.delta ?? null);
				if (json.snapshotId) setPersisted(json.snapshotId);
			} catch (err) {
				setSearchError(err instanceof Error ? err.message : 'Error de red.');
			} finally {
				setSearchLoading(false);
			}
		},
		[query, sources],
	);

	const loadTrends = useCallback(async (force = false) => {
		setTrendsLoading(true);
		try {
			const res = await fetch(`/api/admin/market-intel/trends?site=MLC${force ? '&force=1' : ''}`);
			const json = (await res.json()) as { ok?: boolean; trends?: TrendRow[]; capturedAt?: string };
			if (json.ok && Array.isArray(json.trends)) {
				setTrends(json.trends);
				setTrendsCachedAt(json.capturedAt ?? null);
			}
		} finally {
			setTrendsLoading(false);
		}
	}, []);

	const loadWinners = useCallback(async (q: string) => {
		const term = q.trim();
		if (!term) return;
		setWinnersLoading(true);
		try {
			const res = await fetch(`/api/admin/market-intel/winners?q=${encodeURIComponent(term)}&limit=20`);
			const json = (await res.json()) as { ok?: boolean; winners?: WinnerRow[] };
			if (json.ok && Array.isArray(json.winners)) setWinners(json.winners);
		} finally {
			setWinnersLoading(false);
		}
	}, []);

	const loadHistory = useCallback(async (q: string) => {
		const term = q.trim();
		if (!term) return;
		setHistoryLoading(true);
		try {
			const res = await fetch(`/api/admin/market-intel/history?q=${encodeURIComponent(term)}&limit=30`);
			const json = (await res.json()) as { ok?: boolean; snapshots?: HistoryRow[] };
			if (json.ok && Array.isArray(json.snapshots)) setHistory(json.snapshots);
		} finally {
			setHistoryLoading(false);
		}
	}, []);

	const loadProductos = useCallback(async () => {
		try {
			const res = await fetch('/api/productos?limit=200');
			const json = (await res.json()) as { ok?: boolean; productos?: ProductoOption[]; data?: ProductoOption[] };
			const list = (json.productos ?? json.data ?? []) as ProductoOption[];
			if (Array.isArray(list)) setProductos(list);
		} catch {
			/* ignore */
		}
	}, []);

	const generateSeo = useCallback(async () => {
		const kw = seoKeyword.trim();
		if (!kw) {
			setSeoError('Escribe una keyword principal (ej. "panel SIP estructural").');
			return;
		}
		setSeoLoading(true);
		setSeoError(null);
		setSeoApplied(false);
		try {
			const res = await fetch('/api/admin/market-intel/seo', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ target_keyword: kw, producto_id: seoProductoId || null, tone: seoTone }),
			});
			const json = (await res.json()) as { ok?: boolean; bundle?: SeoBundle; suggestionId?: string; error?: string };
			if (!res.ok || !json.ok || !json.bundle) {
				setSeoError(json.error ?? 'Error generando SEO. Verifica que OpenRouter esté configurado en /admin/integraciones.');
				return;
			}
			setSeoBundle(json.bundle);
			setSeoSuggestionId(json.suggestionId ?? null);
		} catch (err) {
			setSeoError(err instanceof Error ? err.message : 'Error de red.');
		} finally {
			setSeoLoading(false);
		}
	}, [seoKeyword, seoProductoId, seoTone]);

	const applySeo = useCallback(async () => {
		if (!seoSuggestionId || !seoProductoId) {
			setSeoError('Selecciona un producto y genera primero la sugerencia.');
			return;
		}
		setSeoApplying(true);
		setSeoError(null);
		try {
			const res = await fetch('/api/admin/market-intel/seo/apply', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ suggestion_id: seoSuggestionId, producto_id: seoProductoId }),
			});
			const json = (await res.json()) as { ok?: boolean; error?: string };
			if (!res.ok || !json.ok) {
				setSeoError(json.error ?? 'No se pudo aplicar.');
				return;
			}
			setSeoApplied(true);
		} catch (err) {
			setSeoError(err instanceof Error ? err.message : 'Error de red.');
		} finally {
			setSeoApplying(false);
		}
	}, [seoSuggestionId, seoProductoId]);

	useEffect(() => {
		if (tab === 'tendencias') {
			loadTrends(false);
		} else if (tab === 'seo' && productos.length === 0) {
			loadProductos();
		}
	}, [tab, loadTrends, loadProductos, productos.length]);

	useEffect(() => {
		if (!realtime || !query.trim()) return;
		const id = window.setInterval(() => {
			runSearch({ useCache: false });
		}, 30_000);
		return () => window.clearInterval(id);
	}, [realtime, query, runSearch]);

	const historySeries = useMemo(() => history.map((h) => h.stats?.avg ?? 0).filter((v) => Number.isFinite(v) && v > 0), [history]);

	return (
		<AdminPage>
			<AdminPageHeader
				eyebrow="Inteligencia de mercado"
				title="Observatorio de precios y tendencias"
				icon={Telescope}
				description="Combina MercadoLibre + Google (Serper) en tiempo real para detectar referentes, productos ganadores y mover tu SEO con IA. Las APIs gratuitas se configuran desde el centro de integraciones."
			/>

			<AdminCard className="!p-2">
				<div className="flex flex-wrap gap-1">
					{(
						[
							{ id: 'buscador', label: 'Buscador agregado', icon: Search },
							{ id: 'tendencias', label: 'Tendencias & ganadores', icon: Flame },
							{ id: 'historico', label: 'Históricos', icon: BarChart3 },
							{ id: 'seo', label: 'SEO con IA', icon: Sparkles },
						] as Array<{ id: Tab; label: string; icon: typeof Search }>
					).map(({ id, label, icon: Icon }) => (
						<button
							key={id}
							type="button"
							onClick={() => setTab(id)}
							className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
								tab === id ? 'bg-yellow-300/15 text-yellow-200' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
							}`}
						>
							<Icon className="h-4 w-4" />
							{label}
						</button>
					))}
				</div>
			</AdminCard>

			{tab === 'buscador' ? (
				<>
					<AdminCard>
						<div className="grid gap-4 lg:grid-cols-[1fr_360px]">
							<div className="space-y-3">
								<label className="block text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Palabra clave / SKU</label>
								<input
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') runSearch();
									}}
									placeholder='Ej.: "panel SIP 90mm", "taladro percutor", "pintura látex"'
									className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-yellow-300/50 focus:outline-none"
								/>
								<div className="flex flex-wrap gap-1.5">
									{PRESET_QUERIES.map((p) => (
										<button
											key={p}
											type="button"
											onClick={() => setQuery(p)}
											className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] text-zinc-300 hover:border-yellow-300/40 hover:text-yellow-100"
										>
											{p}
										</button>
									))}
								</div>
								<div>
									<p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Fuentes</p>
									<div className="flex flex-wrap gap-2">
										{(Object.keys(sources) as MarketSource[]).map((src) => (
											<label
												key={src}
												className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
													sources[src] ? 'border-yellow-300/40 bg-yellow-300/5 text-yellow-100' : 'border-white/10 bg-black/30 text-zinc-300'
												}`}
											>
												<input
													type="checkbox"
													className="sr-only"
													checked={sources[src]}
													onChange={(e) => setSources((s) => ({ ...s, [src]: e.target.checked }))}
												/>
												<span className={`h-2 w-2 rounded-full ${sources[src] ? SOURCE_DOT[src] : 'bg-zinc-600'}`} />
												{SOURCE_LABEL[src]}
												{src !== 'mercadolibre' ? (
													<span className="text-[9px] uppercase tracking-widest text-zinc-500">requiere API key</span>
												) : null}
											</label>
										))}
									</div>
								</div>
							</div>

							<div className="space-y-2">
								<ActionButton
									icon={Search}
									label="Buscar referentes"
									description="Consulta MercadoLibre + Google y agrega resultados con caché de 5 min."
									onClick={() => runSearch()}
									loading={searchLoading}
									disabled={searchLoading}
								/>
								<ActionButton
									icon={RefreshCw}
									label="Refrescar (sin caché)"
									description="Fuerza nueva consulta a las APIs ignorando el caché."
									onClick={() => runSearch({ useCache: false })}
									disabled={searchLoading}
									variant="ghost"
								/>
								<ActionButton
									icon={Save}
									label="Guardar snapshot"
									description="Persiste el resultado actual para alimentar el histórico de subidas/bajadas."
									onClick={() => runSearch({ persist: true, useCache: false })}
									disabled={searchLoading}
									variant="ghost"
								/>
								<label className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-zinc-300">
									<span className="flex flex-col">
										<span className="font-semibold text-zinc-100">Modo tiempo real</span>
										<span className="mt-0.5 text-[11px] text-zinc-500">Re-consulta automáticamente cada 30 s.</span>
									</span>
									<input type="checkbox" checked={realtime} onChange={(e) => setRealtime(e.target.checked)} className="h-4 w-4 accent-yellow-300" />
								</label>
							</div>
						</div>

						{searchError ? (
							<div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-400/30 bg-rose-500/5 p-3 text-xs text-rose-200">
								<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
								<span>{searchError}</span>
							</div>
						) : null}
						{persisted ? (
							<div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/5 p-3 text-xs text-emerald-200">
								<CheckCircle2 className="h-4 w-4" /> Snapshot guardado (id <code className="text-emerald-300">{persisted.slice(0, 8)}</code>) — disponible en pestaña Históricos.
							</div>
						) : null}
					</AdminCard>

					{snapshot ? (
						<>
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
								{[
									{ label: 'Resultados', value: snapshot.refs.length.toString(), hint: `${snapshot.sources.length} fuente(s)` },
									{ label: 'Precio mín.', value: formatCLP(snapshot.stats.min) },
									{ label: 'Precio máx.', value: formatCLP(snapshot.stats.max) },
									{ label: 'Promedio', value: formatCLP(snapshot.stats.avg) },
									{ label: 'Mediana', value: formatCLP(snapshot.stats.median) },
								].map((kpi) => (
									<AdminCard key={kpi.label} className="!p-4">
										<div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">{kpi.label}</div>
										<div className="mt-1 font-playfair text-xl font-black text-white">{kpi.value}</div>
										{kpi.hint ? <div className="text-[11px] text-zinc-500">{kpi.hint}</div> : null}
									</AdminCard>
								))}
							</div>

							{delta && delta.deltaPct != null ? (
								<AdminCard className="!p-4">
									<div className="flex items-center gap-3">
										{trendIcon(delta.trend)}
										<div className="text-sm">
											<span className="text-zinc-400">vs. snapshot anterior:</span>{' '}
											<span className={`font-semibold ${trendColor(delta.trend)}`}>
												{delta.deltaPct > 0 ? '+' : ''}
												{delta.deltaPct.toFixed(2)}%
											</span>
											{delta.previousAvg != null ? <span className="text-zinc-500"> · prom. anterior {formatCLP(delta.previousAvg)}</span> : null}
										</div>
									</div>
								</AdminCard>
							) : null}

							<AdminCard>
								<h3 className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-zinc-400">Referentes</h3>
								<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
									{snapshot.refs.slice(0, 30).map((r, i) => (
										<a
											key={`${r.source}-${r.sourceId ?? i}`}
											href={r.url}
											target="_blank"
											rel="noopener noreferrer"
											className="group flex gap-3 rounded-xl border border-white/10 bg-black/30 p-3 transition hover:border-yellow-300/40"
										>
											{r.image ? (
												<img src={r.image} alt="" loading="lazy" className="h-16 w-16 rounded-lg object-cover" />
											) : (
												<div className="flex h-16 w-16 items-center justify-center rounded-lg border border-white/10 bg-black/40 text-xs text-zinc-500">{r.source.slice(0, 2).toUpperCase()}</div>
											)}
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-1.5">
													<span className={`h-1.5 w-1.5 rounded-full ${SOURCE_DOT[r.source]}`} />
													<span className="text-[10px] uppercase tracking-widest text-zinc-500">{SOURCE_LABEL[r.source]}</span>
													<ExternalLink className="ml-auto h-3 w-3 text-zinc-500 group-hover:text-yellow-300" />
												</div>
												<div className="mt-1 line-clamp-2 text-xs text-zinc-100">{r.title}</div>
												<div className="mt-1 text-sm font-bold text-yellow-200">
													{r.price != null ? formatCLP(r.price) : <span className="text-zinc-500">sin precio</span>}
												</div>
											</div>
										</a>
									))}
								</div>
							</AdminCard>
						</>
					) : null}
				</>
			) : null}

			{tab === 'tendencias' ? (
				<>
					<AdminCard>
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<h3 className="text-sm font-bold uppercase tracking-[0.25em] text-zinc-400">Tendencias MercadoLibre · MLC</h3>
								<p className="mt-1 text-xs text-zinc-500">
									Top búsquedas reales del marketplace en este momento. {trendsCachedAt ? `Capturado: ${new Date(trendsCachedAt).toLocaleString('es-CL')}` : ''}
								</p>
							</div>
							<ActionButton
								icon={RefreshCw}
								label="Refrescar"
								description="Fuerza recarga desde la API pública (ignora caché 6h)."
								onClick={() => loadTrends(true)}
								loading={trendsLoading}
								variant="ghost"
							/>
						</div>
						<div className="mt-3 flex flex-wrap gap-2">
							{trends.length === 0 && !trendsLoading ? (
								<div className="text-xs text-zinc-500">Sin datos. Pulsa "Refrescar".</div>
							) : null}
							{trends.map((t) => (
								<button
									key={t.keyword}
									type="button"
									onClick={() => {
										setQuery(t.keyword);
										setTab('buscador');
										window.setTimeout(() => runSearch(), 50);
									}}
									className="group flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-yellow-300/40 hover:text-yellow-100"
								>
									<TrendingUp className="h-3 w-3 text-yellow-300" />
									{t.keyword}
								</button>
							))}
						</div>
					</AdminCard>

					<AdminCard>
						<div className="flex flex-wrap items-end gap-3">
							<div className="flex-1 min-w-[200px]">
								<label className="block text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Productos ganadores</label>
								<input
									value={winnersQuery}
									onChange={(e) => setWinnersQuery(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') loadWinners(winnersQuery);
									}}
									placeholder="Ej.: tornillos, taladro, ventana PVC"
									className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-yellow-300/50 focus:outline-none"
								/>
							</div>
							<ActionButton
								icon={Flame}
								label="Buscar ganadores"
								description="Lista los más vendidos en MercadoLibre Chile para esta keyword."
								onClick={() => loadWinners(winnersQuery)}
								loading={winnersLoading}
							/>
						</div>
						{winners.length > 0 ? (
							<div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
								{winners.map((w, i) => (
									<a
										key={`${w.sourceId ?? i}`}
										href={w.url}
										target="_blank"
										rel="noopener noreferrer"
										className="flex gap-3 rounded-xl border border-white/10 bg-black/30 p-3 hover:border-yellow-300/40"
									>
										{w.image ? <img src={w.image} alt="" loading="lazy" className="h-16 w-16 rounded-lg object-cover" /> : null}
										<div className="min-w-0">
											<div className="line-clamp-2 text-xs text-zinc-100">{w.title}</div>
											<div className="mt-1 text-sm font-bold text-yellow-200">{formatCLP(w.price)}</div>
											{w.soldQuantity != null ? (
												<div className="text-[10px] uppercase tracking-widest text-emerald-300">{w.soldQuantity.toLocaleString('es-CL')} vendidos</div>
											) : null}
										</div>
									</a>
								))}
							</div>
						) : null}
					</AdminCard>
				</>
			) : null}

			{tab === 'historico' ? (
				<AdminCard>
					<div className="flex flex-wrap items-end gap-3">
						<div className="flex-1 min-w-[200px]">
							<label className="block text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Histórico por keyword</label>
							<input
								value={historyQuery}
								onChange={(e) => setHistoryQuery(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') loadHistory(historyQuery);
								}}
								placeholder="La misma keyword usada al guardar snapshots"
								className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-yellow-300/50 focus:outline-none"
							/>
						</div>
						<ActionButton
							icon={BarChart3}
							label="Cargar histórico"
							description="Lista los snapshots guardados y dibuja la curva de precio promedio."
							onClick={() => loadHistory(historyQuery)}
							loading={historyLoading}
						/>
					</div>
					{historySeries.length >= 2 ? (
						<div className="mt-4">
							<Sparkline values={historySeries} />
							<div className="mt-1 flex justify-between text-[10px] text-zinc-500">
								<span>Antiguo</span>
								<span>Reciente</span>
							</div>
						</div>
					) : null}
					{history.length > 0 ? (
						<div className="mt-3 overflow-x-auto rounded-lg border border-white/10">
							<table className="min-w-full text-xs">
								<thead className="bg-white/5 text-left uppercase tracking-widest text-zinc-500">
									<tr>
										<th className="px-3 py-2 font-bold">Fecha</th>
										<th className="px-3 py-2 font-bold">Refs.</th>
										<th className="px-3 py-2 font-bold">Min</th>
										<th className="px-3 py-2 font-bold">Prom.</th>
										<th className="px-3 py-2 font-bold">Max</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-white/5">
									{history.map((h) => (
										<tr key={h.id} className="hover:bg-white/5">
											<td className="px-3 py-2 text-zinc-300">{new Date(h.created_at).toLocaleString('es-CL')}</td>
											<td className="px-3 py-2 text-zinc-300">{h.refs_count}</td>
											<td className="px-3 py-2 text-zinc-300">{formatCLP(h.stats?.min)}</td>
											<td className="px-3 py-2 font-semibold text-yellow-200">{formatCLP(h.stats?.avg)}</td>
											<td className="px-3 py-2 text-zinc-300">{formatCLP(h.stats?.max)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : null}
				</AdminCard>
			) : null}

			{tab === 'seo' ? (
				<>
					<AdminCard>
						<h3 className="text-sm font-bold uppercase tracking-[0.25em] text-zinc-400">SEO con IA</h3>
						<p className="mt-1 text-xs text-zinc-500">
							Genera meta-title, meta-description, keywords sugeridas y JSON-LD usando OpenRouter (modelo gratis por defecto). Aplica directamente al producto seleccionado para posicionar tu catálogo en Google.
						</p>
						<div className="mt-4 grid gap-3 lg:grid-cols-2">
							<div>
								<label className="block text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Producto (opcional)</label>
								<select
									value={seoProductoId}
									onChange={(e) => setSeoProductoId(e.target.value)}
									className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 focus:border-yellow-300/50 focus:outline-none"
								>
									<option value="">— Sin asociar (sólo generar) —</option>
									{productos.map((p) => (
										<option key={p.id} value={p.id}>
											{p.nombre}
										</option>
									))}
								</select>
								<p className="mt-1 text-[10px] text-zinc-500">{productos.length} productos cargados.</p>
							</div>
							<div>
								<label className="block text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Keyword principal</label>
								<input
									value={seoKeyword}
									onChange={(e) => setSeoKeyword(e.target.value)}
									placeholder="Ej.: panel SIP estructural Chile"
									className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-yellow-300/50 focus:outline-none"
								/>
							</div>
							<div>
								<label className="block text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Tono</label>
								<select
									value={seoTone}
									onChange={(e) => setSeoTone(e.target.value as 'profesional' | 'cercano' | 'urgente')}
									className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 focus:border-yellow-300/50 focus:outline-none"
								>
									<option value="profesional">Profesional</option>
									<option value="cercano">Cercano</option>
									<option value="urgente">Urgente</option>
								</select>
							</div>
						</div>
						<div className="mt-3 grid gap-2 lg:grid-cols-2">
							<ActionButton
								icon={Sparkles}
								label="Generar SEO con IA"
								description="Llama a OpenRouter (modelo gratis), parsea JSON y guarda como sugerencia."
								onClick={generateSeo}
								loading={seoLoading}
								disabled={seoLoading}
							/>
							<ActionButton
								icon={CheckCircle2}
								label="Aplicar al producto"
								description="Copia meta-title, meta-description, keywords y JSON-LD al producto seleccionado."
								onClick={applySeo}
								loading={seoApplying}
								disabled={!seoSuggestionId || !seoProductoId || seoApplying}
								variant="ghost"
							/>
						</div>
						{seoError ? (
							<div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-400/30 bg-rose-500/5 p-3 text-xs text-rose-200">
								<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
								<span>{seoError}</span>
							</div>
						) : null}
						{seoApplied ? (
							<div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/5 p-3 text-xs text-emerald-200">
								<CheckCircle2 className="h-4 w-4" /> Aplicado al producto seleccionado.
							</div>
						) : null}
					</AdminCard>

					{seoBundle ? (
						<AdminCard>
							<h4 className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">Sugerencia generada · {seoBundle.model}</h4>
							<dl className="mt-3 space-y-3 text-xs">
								<div>
									<dt className="font-bold uppercase tracking-widest text-zinc-500">
										Meta title <span className="text-zinc-600">({seoBundle.metaTitle.length}/60)</span>
									</dt>
									<dd className="mt-1 rounded-lg border border-white/10 bg-black/30 p-2 text-zinc-100">{seoBundle.metaTitle}</dd>
								</div>
								<div>
									<dt className="font-bold uppercase tracking-widest text-zinc-500">
										Meta description <span className="text-zinc-600">({seoBundle.metaDescription.length}/155)</span>
									</dt>
									<dd className="mt-1 rounded-lg border border-white/10 bg-black/30 p-2 text-zinc-100">{seoBundle.metaDescription}</dd>
								</div>
								<div>
									<dt className="font-bold uppercase tracking-widest text-zinc-500">Keywords</dt>
									<dd className="mt-1 flex flex-wrap gap-1.5">
										{seoBundle.keywords.map((k) => (
											<span key={k} className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[11px] text-zinc-200">
												{k}
											</span>
										))}
									</dd>
								</div>
								<div>
									<dt className="font-bold uppercase tracking-widest text-zinc-500">JSON-LD</dt>
									<dd className="mt-1">
										<pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 text-[11px] text-emerald-200">{JSON.stringify(seoBundle.jsonld, null, 2)}</pre>
									</dd>
								</div>
							</dl>
						</AdminCard>
					) : null}
				</>
			) : null}
		</AdminPage>
	);
}
