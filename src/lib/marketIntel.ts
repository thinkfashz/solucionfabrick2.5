import 'server-only';
import { insforgeAdmin } from './insforge';
import { decryptCredentials } from './integrationsCrypto';

/**
 * Inteligencia de Mercado — agregador de búsquedas de productos
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Combina múltiples fuentes (gratuitas y de pago) para devolver un único
 * snapshot con referentes de precios y estadísticas:
 *
 *  · MercadoLibre Chile (público, sin auth):
 *      https://api.mercadolibre.com/sites/MLC/search?q=…
 *      https://api.mercadolibre.com/trends/MLC
 *      https://api.mercadolibre.com/highlights/MLC/category/…
 *
 *  · Serper.dev (Google SERP, ~2.500 búsquedas free one-time):
 *      POST https://google.serper.dev/search   (X-API-KEY)
 *
 *  · SerpAPI (alternativo, plan pago futuro):
 *      GET  https://serpapi.com/search.json?engine=google&api_key=…
 *
 * Todos los timeouts son ≤ 8s. Se aplica un caché interno de 5 min por
 * `(query, sources)` para soportar el modo "tiempo real" de la UI sin
 * agotar la cuota de las APIs gratuitas.
 */

export const ML_PUBLIC_BASE = 'https://api.mercadolibre.com';
export const SERPER_BASE = 'https://google.serper.dev';
export const SERPAPI_BASE = 'https://serpapi.com';
export const DEFAULT_SITE = 'MLC';

const DEFAULT_TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 5 * 60 * 1000;

export type MarketSource = 'mercadolibre' | 'serper' | 'serpapi';

export interface MarketRef {
	source: MarketSource;
	sourceId: string | null;
	title: string;
	price: number | null;
	currency: string | null;
	url: string;
	image: string | null;
	position: number;
	raw: Record<string, unknown>;
}

export interface MarketStats {
	count: number;
	min: number | null;
	max: number | null;
	avg: number | null;
	median: number | null;
	currency: string | null;
	bySource: Record<MarketSource, { count: number; avg: number | null }>;
}

export interface MarketSnapshot {
	query: string;
	normalizedQuery: string;
	site: string;
	sources: MarketSource[];
	refs: MarketRef[];
	stats: MarketStats;
	cachedAt: number;
}

export interface MarketDelta {
	previousAvg: number | null;
	currentAvg: number | null;
	deltaPct: number | null;
	trend: 'up' | 'down' | 'flat' | 'unknown';
	previousAt: string | null;
}

// ─── Utilidades ──────────────────────────────────────────────────────────

export function normalizeQuery(q: string): string {
	return q
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();
}

export function median(values: number[]): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

export function average(values: number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((acc, v) => acc + v, 0) / values.length;
}

export function computeStats(refs: MarketRef[]): MarketStats {
	const prices = refs.map((r) => r.price).filter((p): p is number => typeof p === 'number' && p > 0);
	const currencies = refs.map((r) => r.currency).filter((c): c is string => Boolean(c));
	const sources: MarketSource[] = ['mercadolibre', 'serper', 'serpapi'];
	const bySource = sources.reduce((acc, src) => {
		const sub = refs.filter((r) => r.source === src);
		const subPrices = sub.map((r) => r.price).filter((p): p is number => typeof p === 'number' && p > 0);
		acc[src] = { count: sub.length, avg: average(subPrices) };
		return acc;
	}, {} as Record<MarketSource, { count: number; avg: number | null }>);
	return {
		count: refs.length,
		min: prices.length ? Math.min(...prices) : null,
		max: prices.length ? Math.max(...prices) : null,
		avg: average(prices),
		median: median(prices),
		currency: currencies[0] ?? null,
		bySource,
	};
}

async function fetchWithTimeout(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
	const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, { ...rest, signal: controller.signal, cache: 'no-store' });
	} finally {
		clearTimeout(timer);
	}
}

// ─── Credenciales ────────────────────────────────────────────────────────

async function readIntegration(provider: 'serper' | 'serpapi'): Promise<{ api_key?: string } | null> {
	try {
		const { data } = await insforgeAdmin.database
			.from('integrations')
			.select('credentials')
			.eq('provider', provider)
			.limit(1)
			.maybeSingle();
		if (!data) return null;
		const decrypted = decryptCredentials(
			(data as { credentials?: Record<string, unknown> }).credentials ?? null,
		);
		return decrypted as { api_key?: string };
	} catch {
		return null;
	}
}

export async function getSerperApiKey(): Promise<string | null> {
	const env = process.env.SERPER_API_KEY ?? process.env.SERPER_KEY;
	if (env && env.trim()) return env.trim();
	const row = await readIntegration('serper');
	return row?.api_key?.trim() ? row.api_key.trim() : null;
}

export async function getSerpApiKey(): Promise<string | null> {
	const env = process.env.SERPAPI_KEY ?? process.env.SERPAPI_API_KEY;
	if (env && env.trim()) return env.trim();
	const row = await readIntegration('serpapi');
	return row?.api_key?.trim() ? row.api_key.trim() : null;
}

// ─── Adaptadores por fuente ──────────────────────────────────────────────

interface MLPublicResult {
	id: string;
	title: string;
	price: number;
	currency_id: string;
	permalink: string;
	thumbnail: string;
	condition: string;
	available_quantity?: number;
	sold_quantity?: number;
	shipping?: { free_shipping?: boolean };
}

export async function searchMercadoLibrePublic(query: string, opts: { limit?: number; site?: string } = {}): Promise<MarketRef[]> {
	const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
	const site = opts.site ?? DEFAULT_SITE;
	const url = `${ML_PUBLIC_BASE}/sites/${encodeURIComponent(site)}/search?q=${encodeURIComponent(query)}&limit=${limit}`;
	const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } });
	if (!res.ok) throw new Error(`MercadoLibre devolvió HTTP ${res.status}`);
	const json = (await res.json()) as { results?: MLPublicResult[] };
	const results = Array.isArray(json.results) ? json.results : [];
	return results.map((r, i) => ({
		source: 'mercadolibre' as const,
		sourceId: r.id ?? null,
		title: r.title ?? '',
		price: typeof r.price === 'number' ? r.price : null,
		currency: r.currency_id ?? null,
		url: r.permalink ?? '',
		image: r.thumbnail ?? null,
		position: i + 1,
		raw: r as unknown as Record<string, unknown>,
	}));
}

interface SerperShoppingResult {
	title?: string;
	price?: string;
	priceRaw?: number | string;
	link?: string;
	imageUrl?: string;
	source?: string;
	productId?: string;
	position?: number;
}

interface SerperOrganicResult {
	title?: string;
	link?: string;
	snippet?: string;
	position?: number;
}

/**
 * Parsea un precio de string ("$129.990", "CLP 50.000", "12.34 USD") y
 * extrae el monto numérico. Soporta separador de miles europeo y americano.
 */
export function parsePriceString(input: string | number | undefined | null): { amount: number | null; currency: string | null } {
	if (typeof input === 'number' && Number.isFinite(input)) return { amount: input, currency: null };
	if (typeof input !== 'string') return { amount: null, currency: null };
	const s = input.trim();
	if (!s) return { amount: null, currency: null };
	const currencyMatch = s.match(/(USD|CLP|EUR|ARS|MXN|COP|PEN|BRL|GBP)/i);
	const currency = currencyMatch ? currencyMatch[1]!.toUpperCase() : s.includes('$') ? null : null;
	// Quitar símbolos no numéricos excepto separadores y signo decimal.
	const numeric = s.replace(/[^\d,.\-]/g, '');
	if (!numeric) return { amount: null, currency };
	let normalized = numeric;
	const lastDot = numeric.lastIndexOf('.');
	const lastComma = numeric.lastIndexOf(',');
	if (lastDot >= 0 && lastComma >= 0) {
		// El último símbolo es el separador decimal.
		const decimalSep = lastDot > lastComma ? '.' : ',';
		const thousandSep = decimalSep === '.' ? ',' : '.';
		normalized = numeric.split(thousandSep).join('').replace(decimalSep, '.');
	} else if (lastComma >= 0 && lastDot < 0) {
		// Si hay solo coma, es decimal si hay 1-2 dígitos después; si no, separador de miles.
		const after = numeric.length - 1 - lastComma;
		normalized = after > 0 && after <= 2 ? numeric.replace(',', '.') : numeric.replace(/,/g, '');
	} else if (lastDot >= 0 && lastComma < 0) {
		const after = numeric.length - 1 - lastDot;
		// Si después del punto hay 3 dígitos exactos, es separador de miles (típico CLP).
		normalized = after === 3 ? numeric.replace(/\./g, '') : numeric;
	}
	const value = Number(normalized);
	if (!Number.isFinite(value)) return { amount: null, currency };
	return { amount: value, currency };
}

export async function searchSerper(query: string, opts: { limit?: number; gl?: string; hl?: string } = {}): Promise<MarketRef[]> {
	const apiKey = await getSerperApiKey();
	if (!apiKey) return [];
	const num = Math.min(Math.max(opts.limit ?? 20, 1), 30);
	const body = {
		q: query,
		gl: opts.gl ?? 'cl',
		hl: opts.hl ?? 'es',
		num,
	};
	// Preferimos shopping (precios estructurados) y caemos a organic si vacío.
	const shopRes = await fetchWithTimeout(`${SERPER_BASE}/shopping`, {
		method: 'POST',
		headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	}).catch(() => null);
	const refs: MarketRef[] = [];
	if (shopRes && shopRes.ok) {
		const json = (await shopRes.json()) as { shopping?: SerperShoppingResult[] };
		const shopping = Array.isArray(json.shopping) ? json.shopping : [];
		for (const [i, item] of shopping.entries()) {
			const parsed = parsePriceString(item.price ?? item.priceRaw);
			refs.push({
				source: 'serper',
				sourceId: item.productId ?? null,
				title: item.title ?? '',
				price: parsed.amount,
				currency: parsed.currency,
				url: item.link ?? '',
				image: item.imageUrl ?? null,
				position: typeof item.position === 'number' ? item.position : i + 1,
				raw: item as unknown as Record<string, unknown>,
			});
		}
	}
	if (refs.length === 0) {
		// Fallback: organic search (sin precios pero útil para SEO).
		const orgRes = await fetchWithTimeout(`${SERPER_BASE}/search`, {
			method: 'POST',
			headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		}).catch(() => null);
		if (orgRes && orgRes.ok) {
			const json = (await orgRes.json()) as { organic?: SerperOrganicResult[] };
			const organic = Array.isArray(json.organic) ? json.organic : [];
			for (const [i, item] of organic.entries()) {
				refs.push({
					source: 'serper',
					sourceId: null,
					title: item.title ?? '',
					price: null,
					currency: null,
					url: item.link ?? '',
					image: null,
					position: typeof item.position === 'number' ? item.position : i + 1,
					raw: item as unknown as Record<string, unknown>,
				});
			}
		}
	}
	return refs;
}

export async function searchSerpApi(query: string, opts: { limit?: number; gl?: string; hl?: string } = {}): Promise<MarketRef[]> {
	const apiKey = await getSerpApiKey();
	if (!apiKey) return [];
	const num = Math.min(Math.max(opts.limit ?? 20, 1), 30);
	const params = new URLSearchParams({
		engine: 'google_shopping',
		q: query,
		gl: opts.gl ?? 'cl',
		hl: opts.hl ?? 'es',
		num: String(num),
		api_key: apiKey,
	});
	const res = await fetchWithTimeout(`${SERPAPI_BASE}/search.json?${params.toString()}`).catch(() => null);
	if (!res || !res.ok) return [];
	const json = (await res.json()) as { shopping_results?: Array<Record<string, unknown>> };
	const items = Array.isArray(json.shopping_results) ? json.shopping_results : [];
	return items.map((it, i) => {
		const parsed = parsePriceString((it.price as string | number | undefined) ?? (it.extracted_price as number | undefined));
		return {
			source: 'serpapi' as const,
			sourceId: typeof it.product_id === 'string' ? it.product_id : null,
			title: typeof it.title === 'string' ? it.title : '',
			price: parsed.amount,
			currency: parsed.currency,
			url: typeof it.link === 'string' ? it.link : (typeof it.product_link === 'string' ? it.product_link : ''),
			image: typeof it.thumbnail === 'string' ? it.thumbnail : null,
			position: typeof it.position === 'number' ? it.position : i + 1,
			raw: it,
		};
	});
}

// ─── Caché simple en memoria por proceso ─────────────────────────────────

interface CacheEntry {
	data: MarketSnapshot;
	expiresAt: number;
}
const _cache = new Map<string, CacheEntry>();

function cacheKey(query: string, sources: MarketSource[], site: string): string {
	return `${site}::${[...sources].sort().join(',')}::${normalizeQuery(query)}`;
}

// ─── Agregador principal ─────────────────────────────────────────────────

export interface AggregateOptions {
	sources?: MarketSource[];
	site?: string;
	limitPerSource?: number;
	useCache?: boolean;
}

export async function aggregateProductRefs(query: string, opts: AggregateOptions = {}): Promise<MarketSnapshot> {
	const sources = (opts.sources && opts.sources.length > 0 ? opts.sources : (['mercadolibre', 'serper'] as MarketSource[]))
		.filter((s, i, a) => a.indexOf(s) === i);
	const site = opts.site ?? DEFAULT_SITE;
	const useCache = opts.useCache ?? true;
	const limit = opts.limitPerSource ?? 20;
	const key = cacheKey(query, sources, site);
	if (useCache) {
		const cached = _cache.get(key);
		if (cached && cached.expiresAt > Date.now()) return cached.data;
	}
	const tasks: Array<Promise<MarketRef[]>> = [];
	if (sources.includes('mercadolibre')) tasks.push(searchMercadoLibrePublic(query, { limit, site }).catch(() => []));
	if (sources.includes('serper')) tasks.push(searchSerper(query, { limit }).catch(() => []));
	if (sources.includes('serpapi')) tasks.push(searchSerpApi(query, { limit }).catch(() => []));
	const all = (await Promise.all(tasks)).flat();
	const snapshot: MarketSnapshot = {
		query,
		normalizedQuery: normalizeQuery(query),
		site,
		sources,
		refs: all,
		stats: computeStats(all),
		cachedAt: Date.now(),
	};
	_cache.set(key, { data: snapshot, expiresAt: Date.now() + CACHE_TTL_MS });
	return snapshot;
}

export function clearMarketIntelCache(): void {
	_cache.clear();
}

// ─── Comparativa con snapshots previos ───────────────────────────────────

export async function compareWithPrevious(normalizedQuery: string, currentAvg: number | null): Promise<MarketDelta> {
	if (currentAvg == null) {
		return { previousAvg: null, currentAvg, deltaPct: null, trend: 'unknown', previousAt: null };
	}
	try {
		const { data } = await insforgeAdmin.database
			.from('market_intel_snapshots')
			.select('stats, created_at')
			.eq('normalized_query', normalizedQuery)
			.order('created_at', { ascending: false })
			.limit(2);
		const rows = Array.isArray(data) ? data : [];
		// El primero podría ser el actual recién insertado; usamos el segundo como "anterior".
		const previousRow = rows[1] ?? rows[0];
		if (!previousRow) {
			return { previousAvg: null, currentAvg, deltaPct: null, trend: 'unknown', previousAt: null };
		}
		const previousAvg = ((previousRow as { stats?: { avg?: number | null } }).stats?.avg) ?? null;
		const previousAt = ((previousRow as { created_at?: string }).created_at) ?? null;
		if (typeof previousAvg !== 'number' || previousAvg <= 0) {
			return { previousAvg: null, currentAvg, deltaPct: null, trend: 'unknown', previousAt };
		}
		const deltaPct = ((currentAvg - previousAvg) / previousAvg) * 100;
		const trend = Math.abs(deltaPct) < 0.5 ? 'flat' : deltaPct > 0 ? 'up' : 'down';
		return { previousAvg, currentAvg, deltaPct, trend, previousAt };
	} catch {
		return { previousAvg: null, currentAvg, deltaPct: null, trend: 'unknown', previousAt: null };
	}
}

export async function persistSnapshot(snapshot: MarketSnapshot): Promise<string | null> {
	try {
		const { data: snapRow, error } = await insforgeAdmin.database
			.from('market_intel_snapshots')
			.insert([
				{
					query: snapshot.query,
					normalized_query: snapshot.normalizedQuery,
					site: snapshot.site,
					sources_count: snapshot.sources.length,
					refs_count: snapshot.refs.length,
					stats: snapshot.stats,
				},
			])
			.select('id')
			.single();
		if (error || !snapRow) return null;
		const snapshotId = (snapRow as { id: string }).id;
		if (snapshot.refs.length > 0) {
			await insforgeAdmin.database.from('market_intel_refs').insert(
				snapshot.refs.slice(0, 60).map((r) => ({
					snapshot_id: snapshotId,
					source: r.source,
					source_id: r.sourceId,
					title: r.title.slice(0, 500),
					price: r.price,
					currency: r.currency,
					url: r.url.slice(0, 1000),
					image: r.image?.slice(0, 1000) ?? null,
					position: r.position,
				})),
			);
		}
		return snapshotId;
	} catch {
		return null;
	}
}

// ─── Tendencias y best-sellers ───────────────────────────────────────────

export interface MLTrend {
	keyword: string;
	url?: string;
}

export async function getMercadoLibreTrends(site: string = DEFAULT_SITE): Promise<MLTrend[]> {
	const url = `${ML_PUBLIC_BASE}/trends/${encodeURIComponent(site)}`;
	const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } });
	if (!res.ok) return [];
	const json = (await res.json()) as Array<{ keyword?: string; url?: string }>;
	if (!Array.isArray(json)) return [];
	return json
		.filter((it) => typeof it.keyword === 'string' && it.keyword.length > 0)
		.map((it) => ({ keyword: it.keyword!, url: it.url }));
}

export interface MLBestSeller extends MarketRef {
	soldQuantity: number | null;
}

export async function getMercadoLibreBestSellers(query: string, opts: { limit?: number; site?: string } = {}): Promise<MLBestSeller[]> {
	const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
	const site = opts.site ?? DEFAULT_SITE;
	const url = `${ML_PUBLIC_BASE}/sites/${encodeURIComponent(site)}/search?q=${encodeURIComponent(query)}&limit=${limit}&sort=sold_quantity_desc`;
	const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } });
	if (!res.ok) return [];
	const json = (await res.json()) as { results?: Array<MLPublicResult & { sold_quantity?: number }> };
	const results = Array.isArray(json.results) ? json.results : [];
	return results.map((r, i) => ({
		source: 'mercadolibre' as const,
		sourceId: r.id ?? null,
		title: r.title ?? '',
		price: typeof r.price === 'number' ? r.price : null,
		currency: r.currency_id ?? null,
		url: r.permalink ?? '',
		image: r.thumbnail ?? null,
		position: i + 1,
		raw: r as unknown as Record<string, unknown>,
		soldQuantity: typeof r.sold_quantity === 'number' ? r.sold_quantity : null,
	}));
}
