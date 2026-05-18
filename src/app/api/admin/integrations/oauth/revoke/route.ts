import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@insforge/sdk';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { decryptCredentials } from '@/lib/integrationsCrypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const OAUTH_PROVIDERS = new Set(['mercadolibre', 'google', 'meta', 'tiktok']);

const GOOGLE_REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';
const META_GRAPH_BASE = 'https://graph.facebook.com/v21.0';

function getClient() {
	const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL ?? process.env.INSFORGE_URL ?? '';
	const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ?? process.env.INSFORGE_ANON_KEY ?? '';
	if (!baseUrl || !anonKey) return null;
	return createClient({ baseUrl, anonKey });
}

async function requireAdmin(request: NextRequest) {
	const cookie = request.cookies.get(ADMIN_COOKIE_NAME);
	if (!cookie?.value) return null;
	return decodeSession(cookie.value);
}

/**
 * Revokes a Google OAuth token at the provider level.
 * Uses the refresh_token (long-lived) when available, falls back to access_token.
 */
async function revokeGoogleToken(creds: Record<string, string>): Promise<{ ok: boolean; detail?: string }> {
	const token = creds.refresh_token || creds.access_token;
	if (!token) return { ok: false, detail: 'No hay token para revocar.' };
	try {
		const res = await fetch(`${GOOGLE_REVOKE_ENDPOINT}?token=${encodeURIComponent(token)}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			cache: 'no-store',
			signal: AbortSignal.timeout(8000),
		});
		if (res.ok || res.status === 400) {
			// 400 means the token was already revoked/expired — acceptable.
			return { ok: true };
		}
		const body = (await res.text().catch(() => '')).slice(0, 200);
		return { ok: false, detail: `Google devolvió HTTP ${res.status}: ${body}` };
	} catch (err) {
		return { ok: false, detail: err instanceof Error ? err.message : 'Error de red con Google.' };
	}
}

/**
 * Revokes Meta app permissions for the authenticated user.
 * DELETE /{user-id}/permissions revokes all permissions; falls back to best-effort.
 */
async function revokeMetaToken(creds: Record<string, string>): Promise<{ ok: boolean; detail?: string }> {
	const accessToken = creds.access_token;
	if (!accessToken) return { ok: false, detail: 'No hay access_token de Meta para revocar.' };
	try {
		// First, get the user_id from /me
		const meRes = await fetch(
			`${META_GRAPH_BASE}/me?fields=id&access_token=${encodeURIComponent(accessToken)}`,
			{ cache: 'no-store', signal: AbortSignal.timeout(8000) },
		);
		if (!meRes.ok) {
			// Token already expired / invalid — treat as already-revoked.
			return { ok: true, detail: 'Token de Meta ya inválido; se eliminaron credenciales.' };
		}
		const meJson = (await meRes.json().catch(() => ({}))) as { id?: string };
		const userId = meJson.id;
		if (!userId) return { ok: false, detail: 'No se pudo obtener el user_id de Meta.' };

		const revokeRes = await fetch(
			`${META_GRAPH_BASE}/${userId}/permissions?access_token=${encodeURIComponent(accessToken)}`,
			{ method: 'DELETE', cache: 'no-store', signal: AbortSignal.timeout(8000) },
		);
		if (revokeRes.ok) return { ok: true };
		const body = (await revokeRes.text().catch(() => '')).slice(0, 200);
		return { ok: false, detail: `Meta devolvió HTTP ${revokeRes.status}: ${body}` };
	} catch (err) {
		return { ok: false, detail: err instanceof Error ? err.message : 'Error de red con Meta.' };
	}
}

/**
 * POST /api/admin/integrations/oauth/revoke
 *
 * Body: { provider: 'mercadolibre' | 'google' | 'meta' | 'tiktok' }
 *
 * Attempts to revoke the token at the provider level (where the provider
 * supports it), then deletes the row from the `integrations` table regardless
 * of whether the provider-side revoke succeeded.
 *
 * Response: { ok: true, revokedAtProvider: boolean, providerDetail?: string }
 *   or      { error: string }
 *
 * Provider revoke support:
 *   - Google  → POST https://oauth2.googleapis.com/revoke (standard RFC 7009)
 *   - Meta    → DELETE /me/permissions (revokes all app permissions)
 *   - ML      → no public revoke endpoint; DB delete only
 *   - TikTok  → no public revoke endpoint; DB delete only
 */
export async function POST(request: NextRequest) {
	const session = await requireAdmin(request);
	if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

	let provider: string;
	try {
		const body = (await request.json()) as { provider?: unknown };
		provider = typeof body.provider === 'string' ? body.provider.trim() : '';
	} catch {
		return NextResponse.json({ error: 'Body JSON inválido.' }, { status: 400 });
	}

	if (!OAUTH_PROVIDERS.has(provider)) {
		return NextResponse.json({ error: 'Proveedor no soportado para revocación OAuth.' }, { status: 400 });
	}

	const client = getClient();
	if (!client) {
		return NextResponse.json({ error: 'InsForge no configurado en el servidor.' }, { status: 503 });
	}

	// Fetch the current credentials so we can revoke the token at the provider.
	const { data, error: fetchError } = await client.database
		.from('integrations')
		.select('credentials')
		.eq('provider', provider)
		.maybeSingle();

	if (fetchError) {
		return NextResponse.json({ error: fetchError.message ?? 'Error leyendo credenciales.' }, { status: 500 });
	}

	// Attempt provider-level revocation (best-effort — we always delete from DB).
	let revokedAtProvider = false;
	let providerDetail: string | undefined;

	if (data?.credentials) {
		const creds = decryptCredentials(data.credentials as Record<string, unknown>) as Record<string, string>;

		if (provider === 'google') {
			const result = await revokeGoogleToken(creds);
			revokedAtProvider = result.ok;
			providerDetail = result.detail;
		} else if (provider === 'meta') {
			const result = await revokeMetaToken(creds);
			revokedAtProvider = result.ok;
			providerDetail = result.detail;
		} else {
			// ML and TikTok: no standard revoke endpoint.
			revokedAtProvider = false;
			providerDetail = 'Este proveedor no expone un endpoint de revocación estándar.';
		}
	}

	// Always delete from DB regardless of provider-side result.
	const { error: deleteError } = await client.database
		.from('integrations')
		.delete()
		.eq('provider', provider);

	if (deleteError) {
		return NextResponse.json({
			error: deleteError.message ?? 'No se pudo eliminar la integración de la base de datos.',
		}, { status: 500 });
	}

	// Best-effort audit log.
	try {
		const ip =
			request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
			request.headers.get('x-real-ip') ??
			null;
		await client.database.from('integration_audit').insert([{
			provider,
			action: 'delete',
			actor: (session as { email?: string; sub?: string }).email ?? (session as { sub?: string }).sub ?? null,
			ip,
			user_agent: request.headers.get('user-agent') ?? null,
			details: { via: 'oauth_revoke', revokedAtProvider, providerDetail },
		}]);
	} catch {
		/* swallow — audit table may not exist */
	}

	return NextResponse.json({ ok: true, revokedAtProvider, providerDetail });
}
