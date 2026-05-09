/**
 * Pure helper for the Resend API-key rotation flow (Mejora 4).
 *
 *   1) GET  https://api.resend.com/api-keys                → resolve old key id
 *   2) POST https://api.resend.com/api-keys                → create new key
 *   3) GET  https://api.resend.com/domains  (probe new)    → abort on 401/etc.
 *   4) DELETE /api-keys/<old_id>           (best-effort)   → swallow errors
 *
 * No DB or filesystem access — the API route handler is the one that
 * upserts the new key into `integrations` and writes the audit row. Keeping
 * this helper pure makes every branch (happy path, probe failed, delete
 * failed, 401 on create) trivially unit-testable with `fetch` mocked.
 */

export interface RotateResendKeyArgs {
	currentKey: string;
	/** Friendly name for the new key (default: `fabrick-rotated-<ISO>`). */
	newKeyName?: string;
	/**
	 * Resend permission for the freshly-created key. We default to
	 * `full_access` so the new key can rotate itself in the future;
	 * `sending_access` would break the cycle on the next rotation
	 * (the API only allows `full_access` keys to manage other keys).
	 */
	permission?: 'full_access' | 'sending_access';
	/** Override fetch (used by tests). Defaults to `globalThis.fetch`. */
	fetchFn?: typeof fetch;
}

export interface RotateResendKeySuccess {
	success: true;
	newKey: string;
	newKeyId: string | null;
	oldKeyId: string | null;
	/** Set when DELETE on the old key fails after a successful rotation. */
	deleteWarning: string | null;
}

export interface RotateResendKeyFailure {
	success: false;
	/** What stage failed: list/create/probe/persist. The caller can map this to a status code. */
	stage: 'list' | 'create' | 'probe' | 'unknown';
	error: string;
	/** When `stage='probe'`, this carries the would-be new key id so the caller can audit the discarded key. */
	newKeyId?: string | null;
}

export type RotateResendKeyResult = RotateResendKeySuccess | RotateResendKeyFailure;

const API_BASE = 'https://api.resend.com';

interface ResendApiKey {
	id: string;
	name?: string;
	created_at?: string;
}

interface ResendApiKeyList {
	data?: ResendApiKey[];
}

interface ResendCreatedKey {
	id?: string;
	token?: string;
}

interface ResendError {
	name?: string;
	message?: string;
	statusCode?: number;
}

function defaultName(): string {
	return `fabrick-rotated-${new Date().toISOString()}`;
}

async function readJson<T>(res: Response): Promise<T> {
	try {
		return (await res.json()) as T;
	} catch {
		return {} as T;
	}
}

function errorMessage(json: ResendError, status: number): string {
	if (json.message) return json.message;
	if (json.name) return json.name;
	return `HTTP ${status}`;
}

/**
 * Tries to find the id of the *current* API key by listing all keys. The
 * Resend list endpoint does NOT echo the actual key value (it shows only
 * id/name/created_at), so we cannot match by token. Instead we return
 * `null` and let the caller log a warning — we still create the new key
 * and probe it; the only consequence is the old key is not auto-deleted.
 *
 * Callers that want a deterministic match should persist the key id at
 * connection time (in `integrations.credentials.api_key_id`) and pass
 * that hint via the audit row.
 */
async function listApiKeys(
	currentKey: string,
	fetcher: typeof fetch,
): Promise<{ keys: ResendApiKey[]; error: string | null }> {
	const res = await fetcher(`${API_BASE}/api-keys`, {
		headers: { Authorization: `Bearer ${currentKey}`, Accept: 'application/json' },
		cache: 'no-store',
	});
	const json = await readJson<ResendApiKeyList & ResendError>(res);
	if (!res.ok) {
		return { keys: [], error: errorMessage(json, res.status) };
	}
	return { keys: Array.isArray(json.data) ? json.data : [], error: null };
}

async function createApiKey(
	currentKey: string,
	name: string,
	permission: 'full_access' | 'sending_access',
	fetcher: typeof fetch,
): Promise<{ id: string | null; key: string | null; error: string | null }> {
	const res = await fetcher(`${API_BASE}/api-keys`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${currentKey}`,
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: JSON.stringify({ name, permission }),
		cache: 'no-store',
	});
	const json = await readJson<ResendCreatedKey & ResendError>(res);
	if (!res.ok || !json.token) {
		return { id: null, key: null, error: errorMessage(json, res.status) };
	}
	return { id: json.id ?? null, key: json.token, error: null };
}

async function probeNewKey(
	newKey: string,
	fetcher: typeof fetch,
): Promise<{ ok: boolean; error: string | null }> {
	const res = await fetcher(`${API_BASE}/domains`, {
		headers: { Authorization: `Bearer ${newKey}`, Accept: 'application/json' },
		cache: 'no-store',
	});
	const json = await readJson<ResendError>(res);
	if (!res.ok) {
		return { ok: false, error: errorMessage(json, res.status) };
	}
	return { ok: true, error: null };
}

async function deleteOldKey(
	newKey: string,
	oldKeyId: string,
	fetcher: typeof fetch,
): Promise<{ ok: boolean; error: string | null }> {
	const res = await fetcher(`${API_BASE}/api-keys/${encodeURIComponent(oldKeyId)}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${newKey}`, Accept: 'application/json' },
		cache: 'no-store',
	});
	if (!res.ok) {
		const json = await readJson<ResendError>(res);
		return { ok: false, error: errorMessage(json, res.status) };
	}
	return { ok: true, error: null };
}

/**
 * Rotates the Resend API key currently configured on the merchant's
 * integration row. The caller is expected to:
 *   - Resolve `currentKey` via `getResendCredentials()` BEFORE calling this.
 *   - On `success === true`, persist `newKey` to `integrations.credentials`
 *     (re-encrypted) and write an `integration_audit` row with the
 *     `oldKeyId` / `newKeyId`.
 *   - On `success === false`, surface `error` to the operator and DO NOT
 *     touch the persisted credentials — the old key is still alive.
 */
export async function rotateResendKey(
	args: RotateResendKeyArgs,
): Promise<RotateResendKeyResult> {
	const fetcher = args.fetchFn ?? globalThis.fetch.bind(globalThis);
	const permission = args.permission ?? 'full_access';
	const name = args.newKeyName ?? defaultName();

	// 1) list (best-effort: we only need this for the DELETE step). If it
	// fails because the current key has `sending_access` permission, we
	// keep going — we just won't be able to auto-delete the old key.
	const listed = await listApiKeys(args.currentKey, fetcher);
	let oldKeyId: string | null = null;
	if (listed.error) {
		// 401/403 here usually means the key cannot manage other keys.
		// Treat as a hard failure on rotation (we can't possibly create a
		// new key either) and bail.
		if (/401|403|invalid|unauthor/i.test(listed.error)) {
			return { success: false, stage: 'list', error: listed.error };
		}
		// otherwise carry on without `oldKeyId`
	} else if (listed.keys.length > 0) {
		// Pick the most recently created key — best heuristic when we
		// cannot match by token. The merchant can pass an explicit hint
		// in a future iteration via `integrations.credentials.api_key_id`.
		const sorted = [...listed.keys].sort((a, b) =>
			(b.created_at ?? '').localeCompare(a.created_at ?? ''),
		);
		oldKeyId = sorted[0]?.id ?? null;
	}

	// 2) create
	const created = await createApiKey(args.currentKey, name, permission, fetcher);
	if (created.error || !created.key) {
		return {
			success: false,
			stage: 'create',
			error: created.error ?? 'Resend no devolvió la nueva API key.',
		};
	}

	// 3) probe — if it fails, abort WITHOUT deleting the old key.
	const probe = await probeNewKey(created.key, fetcher);
	if (!probe.ok) {
		return {
			success: false,
			stage: 'probe',
			error: probe.error ?? 'La nueva API key no pudo validarse contra /domains.',
			newKeyId: created.id,
		};
	}

	// 4) delete old (best-effort): we already have a working new key, so
	// failures here are warnings — they leave a stale key behind but do
	// not invalidate the rotation. The merchant can prune it manually.
	let deleteWarning: string | null = null;
	if (oldKeyId) {
		const deleted = await deleteOldKey(created.key, oldKeyId, fetcher);
		if (!deleted.ok) {
			deleteWarning = deleted.error ?? 'No se pudo borrar la key anterior.';
		}
	}

	return {
		success: true,
		newKey: created.key,
		newKeyId: created.id,
		oldKeyId,
		deleteWarning,
	};
}
