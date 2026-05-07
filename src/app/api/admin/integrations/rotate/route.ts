import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@insforge/sdk';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import {
	decryptCredentials,
	encryptCredentials,
} from '@/lib/integrationsCrypto';
import { detectEnvProviderCredentials } from '@/lib/integrationsEnvMap';
import { rotateResendKey } from '@/lib/resendKeyRotation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/integrations/rotate
 *
 * Body: `{ provider: 'resend' }`. Only Resend is supported today —
 * WhatsApp/Meta, Google and TikTok require manual rotation from their
 * respective consoles, so other providers receive HTTP 400 with
 * `{ error: 'rotate_not_supported' }`.
 *
 * Flow (Mejora 4):
 *   1. Read current credentials via getResendCredentials() (env-first).
 *   2. If env-managed → 409 ENV_VAR_PRESENT (mirrors the POST conflict
 *      guard in /api/admin/integrations).
 *   3. Otherwise call rotateResendKey() (pure helper) which lists,
 *      creates, probes and best-effort deletes the old key.
 *   4. On success: re-encrypt and upsert `integrations(provider='resend')`,
 *      then write an `integration_audit` row.
 */

const ROTATABLE_PROVIDERS = new Set(['resend']);

function getInsforgeClient() {
	const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL ?? process.env.INSFORGE_URL;
	const anonKey = process.env.INSFORGE_API_KEY ?? process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
	if (!baseUrl || !anonKey) return null;
	return createClient({ baseUrl, anonKey });
}

async function requireAdmin(request: NextRequest) {
	const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
	if (!sessionCookie?.value) return null;
	return decodeSession(sessionCookie.value);
}

async function writeAudit(
	client: ReturnType<typeof createClient>,
	request: NextRequest,
	session: { sub?: string; email?: string } | null,
	provider: string,
	details: Record<string, unknown>,
): Promise<void> {
	try {
		const ip =
			request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
			request.headers.get('x-real-ip') ??
			null;
		const ua = request.headers.get('user-agent') ?? null;
		await client.database.from('integration_audit').insert([
			{
				provider,
				action: 'rotate',
				actor: session?.email ?? session?.sub ?? null,
				ip,
				user_agent: ua,
				details,
			},
		]);
	} catch {
		/* swallow — table may not exist yet */
	}
}

export async function POST(request: NextRequest) {
	const session = await requireAdmin(request);
	if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

	const client = getInsforgeClient();
	if (!client) {
		return NextResponse.json(
			{ error: 'InsForge no configurado en el servidor.' },
			{ status: 503 },
		);
	}

	let provider: string;
	try {
		const body = await request.json();
		provider = String(body?.provider ?? '').trim();
	} catch {
		return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });
	}

	if (!ROTATABLE_PROVIDERS.has(provider)) {
		return NextResponse.json(
			{
				error:
					'rotate_not_supported · Este provider no expone una API para rotar credenciales por sí solo. Hazlo manualmente desde su consola.',
				code: 'rotate_not_supported',
			},
			{ status: 400 },
		);
	}

	// Step 1 — load current key. We read directly from `integrations` here
	// (rather than via getResendCredentials) so we can also detect when
	// the key comes from an env var.
	const envForProvider = detectEnvProviderCredentials(provider);
	if (envForProvider.api_key) {
		return NextResponse.json(
			{
				error: `La API key de Resend está definida por la variable de entorno ${envForProvider.api_key.envName}. Para poder rotarla automáticamente, primero borra esa env y guarda la key desde /admin/integraciones.`,
				code: 'ENV_VAR_PRESENT',
				envVar: envForProvider.api_key.envName,
			},
			{ status: 409 },
		);
	}

	let currentKey: string | null = null;
	let dbCreds: Record<string, unknown> = {};
	try {
		const { data, error } = await client.database
			.from('integrations')
			.select('credentials')
			.eq('provider', 'resend')
			.limit(1)
			.maybeSingle();
		if (error) throw error;
		if (data && typeof data === 'object' && 'credentials' in data) {
			dbCreds = decryptCredentials(
				(data as { credentials?: Record<string, unknown> }).credentials ?? {},
			);
			const k = dbCreds.api_key;
			if (typeof k === 'string' && k.trim().length > 0) currentKey = k.trim();
		}
	} catch (err) {
		return NextResponse.json(
			{
				error: `No se pudo leer la key actual de Resend: ${err instanceof Error ? err.message : String(err)}`,
			},
			{ status: 500 },
		);
	}

	if (!currentKey) {
		return NextResponse.json(
			{
				error:
					'No hay una API key de Resend guardada en la base de datos. Conecta primero la integración desde /admin/integraciones.',
			},
			{ status: 404 },
		);
	}

	// Step 2 — pure rotation helper
	const result = await rotateResendKey({
		currentKey,
		permission: 'full_access',
	});

	if (!result.success) {
		// Surface a clean 4xx/5xx based on the failed stage.
		const status = result.stage === 'create' || result.stage === 'list' ? 502 : 500;
		await writeAudit(client, request, session, 'resend', {
			outcome: 'failed',
			stage: result.stage,
			error: result.error,
			...(('newKeyId' in result) && result.newKeyId ? { discarded_new_key_id: result.newKeyId } : {}),
		});
		return NextResponse.json(
			{
				error: `Rotación fallida (${result.stage}): ${result.error}`,
				stage: result.stage,
			},
			{ status },
		);
	}

	// Step 3 — persist the new key (re-encrypted)
	try {
		const updated = encryptCredentials({
			...dbCreds,
			api_key: result.newKey,
			rotated_at: new Date().toISOString(),
		});
		const { error } = await client.database
			.from('integrations')
			.upsert([{ provider: 'resend', credentials: updated }], { onConflict: 'provider' });
		if (error) throw error;
	} catch (err) {
		return NextResponse.json(
			{
				error: `La nueva API key fue creada y validada, pero no se pudo guardar en la base de datos: ${err instanceof Error ? err.message : String(err)}. Cópiala manualmente desde Resend antes de borrarla.`,
				newKeyId: result.newKeyId,
			},
			{ status: 500 },
		);
	}

	// Step 4 — audit (best-effort)
	await writeAudit(client, request, session, 'resend', {
		outcome: 'success',
		old_key_id: result.oldKeyId,
		new_key_id: result.newKeyId,
		delete_warning: result.deleteWarning,
	});

	return NextResponse.json({
		ok: true,
		newKeyId: result.newKeyId,
		oldKeyId: result.oldKeyId,
		deleteWarning: result.deleteWarning,
	});
}
