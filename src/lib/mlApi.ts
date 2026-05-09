import 'server-only';
import { getMercadoLibreCredentials } from './mercadoLibreCredentials';

/**
 * MercadoLibre REST API client (server-only)
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin, typed wrapper around the public ML API v1.
 * All requests are authenticated with the access token from
 * `MERCADOLIBRE_ACCESS_TOKEN` (set in .env / InsForge env vars).
 *
 * Site: MLC (Chile) by default. Pass `siteId` to override.
 *
 * Rate-limit: ML allows ~60 req/min for free-tier apps. All calls here
 * carry a 10s timeout so slow responses don't block the admin UI.
 */

export const ML_SITE_ID = 'MLC';
export const ML_API_BASE = 'https://api.mercadolibre.com';

// ─── Shared types ────────────────────────────────────────────────────────────

export interface MLPicture {
	id?: string;
	url?: string;
	secure_url?: string;
}

export interface MLItem {
	id: string;
	title: string;
	price: number;
	original_price: number | null;
	currency_id: string;
	available_quantity: number;
	sold_quantity: number;
	status: 'active' | 'paused' | 'closed' | 'under_review' | string;
	condition: 'new' | 'used' | string;
	permalink: string;
	thumbnail: string;
	thumbnail_id?: string;
	pictures: MLPicture[];
	shipping: { free_shipping?: boolean; mode?: string };
	category_id?: string;
	listing_type_id?: string;
	health?: number | null;
	seller_id?: number;
	date_created?: string;
	last_updated?: string;
}

export interface MLSearchResult {
	site_id: string;
	query: string;
	paging: { total: number; offset: number; limit: number };
	results: MLItem[];
}

export interface MLOrderItem {
	item: { id: string; title: string; thumbnail?: string };
	quantity: number;
	unit_price: number;
	currency_id: string;
}

export interface MLBuyer {
	id: number;
	nickname: string;
	email?: string;
	first_name?: string;
	last_name?: string;
}

export interface MLOrder {
	id: number;
	status: string;
	status_detail: string | null;
	date_created: string;
	date_closed: string | null;
	last_updated: string;
	order_items: MLOrderItem[];
	total_amount: number;
	currency_id: string;
	buyer: MLBuyer;
	payments: Array<{ status: string; payment_type: string; transaction_amount: number }>;
	shipping?: { id?: number; status?: string; receiver_address?: { full?: string } };
}

export interface MLQuestion {
	id: number;
	item_id: string;
	seller_id: number;
	status: 'UNANSWERED' | 'ANSWERED' | 'DELETED' | 'BANNED' | string;
	date_created: string;
	text: string;
	answer: { text: string; status: string; date_created: string } | null;
	from: { id: number; answered_questions?: number };
}

export interface MLUser {
	id: number;
	nickname: string;
	email: string;
	site_id: string;
	first_name?: string;
	last_name?: string;
	seller_reputation?: {
		level_id?: string;
		power_seller_status?: string | null;
		transactions?: { completed: number; canceled: number; total: number };
	};
}

// ─── Internal helpers ────────────────────────────────────────────────────────

async function getToken(): Promise<string> {
	const creds = await getMercadoLibreCredentials();
	if (!creds.accessToken) throw new Error('MERCADOLIBRE_ACCESS_TOKEN no está configurado.');
	return creds.accessToken;
}

async function buildHeaders(): Promise<Record<string, string>> {
	return {
		Authorization: `Bearer ${await getToken()}`,
		Accept: 'application/json',
		'Content-Type': 'application/json',
		'User-Agent': 'FabrickAdmin/1.0',
	};
}

async function mlFetch<T>(
	path: string,
	options: RequestInit = {},
): Promise<T> {
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), 10_000);
	try {
		const res = await fetch(`${ML_API_BASE}${path}`, {
			...options,
			headers: {
				...(await buildHeaders()),
				...(options.headers as Record<string, string> | undefined ?? {}),
			},
			signal: ctrl.signal,
			cache: 'no-store',
		});
		const body = await res.json().catch(() => ({})) as unknown;
		if (!res.ok) {
			const msg = (body as { message?: string; error?: string })?.message
				?? (body as { message?: string; error?: string })?.error
				?? `HTTP ${res.status}`;
			throw new Error(`ML API error ${res.status}: ${msg}`);
		}
		return body as T;
	} finally {
		clearTimeout(timer);
	}
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get authenticated user info (id, nickname, reputation).
 */
export async function mlGetMe(): Promise<MLUser> {
	return mlFetch<MLUser>('/users/me');
}

/**
 * Search the ML catalog (public, buyer-side search).
 * Used by the "Buscador" admin panel.
 */
export async function mlSearch(
	query: string,
	opts: { limit?: number; offset?: number; siteId?: string } = {},
): Promise<MLSearchResult> {
	const { limit = 20, offset = 0, siteId = ML_SITE_ID } = opts;
	const params = new URLSearchParams({
		q: query,
		limit: String(limit),
		offset: String(offset),
	});
	return mlFetch<MLSearchResult>(`/sites/${siteId}/search?${params}`);
}

/**
 * Get a single item by id.
 */
export async function mlGetItem(itemId: string): Promise<MLItem> {
	return mlFetch<MLItem>(`/items/${encodeURIComponent(itemId)}`);
}

/**
 * Get item description.
 */
export async function mlGetItemDescription(itemId: string): Promise<{ text: string; plain_text: string }> {
	return mlFetch<{ text: string; plain_text: string }>(
		`/items/${encodeURIComponent(itemId)}/description`,
	);
}

/**
 * List all active/paused items owned by `userId`.
 * If `userId` is omitted, it auto-resolves via `/users/me`.
 */
export async function mlListMyItems(opts: {
	userId?: number | string;
	limit?: number;
	offset?: number;
} = {}): Promise<{ items: MLItem[]; total: number }> {
	const me = opts.userId
		? { id: Number(opts.userId) }
		: await mlGetMe();

	const limit = opts.limit ?? 50;
	const offset = opts.offset ?? 0;

	// Step 1: get the item IDs belonging to this seller.
	const searchData = await mlFetch<{
		results: string[];
		paging: { total: number; offset: number; limit: number };
	}>(
		`/users/${me.id}/items/search?limit=${limit}&offset=${offset}`,
	);

	const ids = searchData.results;
	if (!ids.length) return { items: [], total: searchData.paging.total };

	// Step 2: batch-fetch item details (ML supports up to 20 per request).
	const batches: MLItem[] = [];
	const batchSize = 20;
	for (let i = 0; i < ids.length; i += batchSize) {
		const chunk = ids.slice(i, i + batchSize);
		const data = await mlFetch<Array<{ code: number; body: MLItem }>>(
			`/items?ids=${chunk.map(encodeURIComponent).join(',')}`,
		);
		for (const entry of data) {
			if (entry.code === 200) batches.push(entry.body);
		}
	}

	return { items: batches, total: searchData.paging.total };
}

/**
 * Update an item (price, available_quantity, status).
 */
export async function mlUpdateItem(
	itemId: string,
	patch: Partial<Pick<MLItem, 'price' | 'available_quantity' | 'status'>>,
): Promise<MLItem> {
	return mlFetch<MLItem>(`/items/${encodeURIComponent(itemId)}`, {
		method: 'PUT',
		body: JSON.stringify(patch),
	});
}

/**
 * Pause a listing.
 */
export async function mlPauseItem(itemId: string): Promise<MLItem> {
	return mlUpdateItem(itemId, { status: 'paused' });
}

/**
 * Reactivate a paused listing.
 */
export async function mlActivateItem(itemId: string): Promise<MLItem> {
	return mlUpdateItem(itemId, { status: 'active' });
}

/**
 * Get orders (sales) for the authenticated user.
 */
export async function mlGetOrders(opts: {
	status?: string;
	limit?: number;
	offset?: number;
} = {}): Promise<{ results: MLOrder[]; paging: { total: number } }> {
	const params = new URLSearchParams({
		limit: String(opts.limit ?? 50),
		offset: String(opts.offset ?? 0),
	});
	if (opts.status) params.set('order.status', opts.status);
	return mlFetch<{ results: MLOrder[]; paging: { total: number } }>(
		`/orders/search?seller=me&sort=date_desc&${params}`,
	);
}

/**
 * Get unanswered questions for all my items (or a specific item).
 */
export async function mlGetQuestions(opts: {
	itemId?: string;
	status?: string;
	limit?: number;
	offset?: number;
} = {}): Promise<{ total: number; limit: number; questions: MLQuestion[] }> {
	const params = new URLSearchParams({
		api_version: '4',
		limit: String(opts.limit ?? 50),
		offset: String(opts.offset ?? 0),
	});
	if (opts.itemId) params.set('item_id', opts.itemId);
	if (opts.status) params.set('status', opts.status);
	return mlFetch<{ total: number; limit: number; questions: MLQuestion[] }>(
		`/my/received_questions/search?${params}`,
	);
}

/**
 * Answer a question.
 */
export async function mlAnswerQuestion(
	questionId: number,
	text: string,
): Promise<{ id: number; status: string }> {
	return mlFetch<{ id: number; status: string }>('/answers', {
		method: 'POST',
		body: JSON.stringify({ question_id: questionId, text }),
	});
}

/**
 * Get the cheapest competitors for a given item id (price monitoring).
 * Searches by the item's title in the same category.
 */
export async function mlGetCompetitors(
	itemId: string,
	opts: { limit?: number } = {},
): Promise<{ item: MLItem; competitors: MLItem[] }> {
	const item = await mlGetItem(itemId);
	const params = new URLSearchParams({
		q: item.title,
		limit: String(opts.limit ?? 10),
		...(item.category_id ? { category: item.category_id } : {}),
	});
	const search = await mlFetch<MLSearchResult>(`/sites/${ML_SITE_ID}/search?${params}`);
	const competitors = search.results.filter((r) => r.id !== itemId);
	return { item, competitors };
}
