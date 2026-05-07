/**
 * Pure check runners for the integrations dispatcher in
 * `/api/admin/integrations/test`. Each function receives already-resolved
 * credentials (so the module is environment-free and testable) plus an
 * optional `fetchImpl` that defaults to the global `fetch`. It returns the
 * same shape the dispatcher serialises over the wire:
 *
 *     { ok: boolean; checks: DiagnosticCheck[]; error?: string; extras?: ... }
 *
 * Extracting these out of `route.ts` lets us:
 *   - Unit-test every branch (happy path / 401 / network error / domain
 *     mismatch / missing permission) without spinning a Next request.
 *   - Reuse the same logic from the daily health-check cron without
 *     duplicating fetch handling.
 */

export interface DiagnosticCheck {
	name: string;
	ok: boolean;
	detail?: string;
}

export interface CheckResult {
	ok: boolean;
	provider: string;
	checks: DiagnosticCheck[];
	error?: string;
	/** Optional structured payload for the cron / quota-bar to persist. */
	extras?: Record<string, unknown>;
}

export type FetchImpl = typeof fetch;

const WA_GRAPH = 'https://graph.facebook.com/v21.0';

function fetchOr(impl?: FetchImpl): FetchImpl {
	return impl ?? globalThis.fetch.bind(globalThis);
}

function networkErr(name: string, err: unknown, provider: string, prefix: string): CheckResult {
	const msg = err instanceof Error ? err.message : String(err);
	return {
		ok: false,
		provider,
		checks: [{ name, ok: false, detail: msg || 'Error de red.' }],
		error: `${prefix}: ${msg}`,
	};
}

// ---------------------------------------------------------------------------
// WhatsApp Business — Mejora 2
// ---------------------------------------------------------------------------

export interface WhatsAppCreds {
	access_token: string;
	phone_number_id: string;
	business_account_id?: string;
}

export async function runWhatsAppChecks(
	creds: WhatsAppCreds,
	fetchImpl?: FetchImpl,
): Promise<CheckResult> {
	const fetcher = fetchOr(fetchImpl);
	const checks: DiagnosticCheck[] = [];

	// 1) Phone number metadata + quality rating
	try {
		const res = await fetcher(
			`${WA_GRAPH}/${encodeURIComponent(creds.phone_number_id)}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`,
			{
				headers: { Authorization: `Bearer ${creds.access_token}` },
				cache: 'no-store',
			},
		);
		const json = (await res.json().catch(() => ({}))) as {
			display_phone_number?: string;
			verified_name?: string;
			quality_rating?: string;
			code_verification_status?: string;
			error?: { message?: string; code?: number; type?: string };
		};
		if (!res.ok) {
			const message = json.error?.message ?? `HTTP ${res.status}`;
			const isPermission =
				res.status === 401 ||
				res.status === 403 ||
				/permission|scope|whatsapp_business_messaging/i.test(message);
			checks.push({
				name: 'WhatsApp phone number',
				ok: false,
				detail: isPermission
					? `${message}. La app de Meta no tiene el permiso "whatsapp_business_messaging". Añádelo en Meta Business → System users → Add asset.`
					: message,
			});
			return {
				ok: false,
				provider: 'whatsapp',
				checks,
				error: `WhatsApp Business rechazó las credenciales: ${message}.`,
			};
		}
		const parts: string[] = [];
		parts.push(`Número accesible: ${json.display_phone_number ?? creds.phone_number_id}`);
		if (json.verified_name) parts.push(json.verified_name);
		checks.push({ name: 'WhatsApp phone number', ok: true, detail: `${parts.join(' · ')}.` });

		// Quality rating: GREEN/YELLOW/RED. Anything other than GREEN is still
		// "ok:true" (the line works) but surfaced as a separate row so the
		// admin sees deterioration before throttling kicks in.
		const rating = (json.quality_rating ?? '').toUpperCase();
		if (rating) {
			const isGreen = rating === 'GREEN';
			checks.push({
				name: 'Quality rating',
				ok: isGreen,
				detail: isGreen
					? `Calidad GREEN. WhatsApp no aplica restricciones.`
					: `Calidad ${rating}. Revisa los reportes de spam y la frecuencia de envíos antes de que Meta limite el número.`,
			});
		}

		// Verification status: helpful to confirm the line is fully onboarded.
		if (json.code_verification_status) {
			const verified = json.code_verification_status === 'VERIFIED';
			checks.push({
				name: 'Verificación de número',
				ok: verified,
				detail: verified
					? 'Número verificado por SMS/voz.'
					: `Estado: ${json.code_verification_status}. Completa la verificación en WhatsApp Manager.`,
			});
		}
	} catch (err) {
		return networkErr('WhatsApp phone number', err, 'whatsapp', 'Error de red al contactar WhatsApp Business');
	}

	// 2) Templates (only if WABA is configured) — confirms the app has the
	//    `whatsapp_business_messaging` permission scoped to the business
	//    account. Calling /message_templates is read-only and does not
	//    consume per-conversation budget, unlike /messages.
	if (creds.business_account_id) {
		try {
			const res = await fetcher(
				`${WA_GRAPH}/${encodeURIComponent(creds.business_account_id)}/message_templates?limit=1&fields=name,status`,
				{
					headers: { Authorization: `Bearer ${creds.access_token}` },
					cache: 'no-store',
				},
			);
			const json = (await res.json().catch(() => ({}))) as {
				data?: Array<{ name?: string; status?: string }>;
				paging?: { cursors?: { before?: string; after?: string } };
				error?: { message?: string; code?: number };
				summary?: { total_count?: number };
			};
			if (!res.ok) {
				const message = json.error?.message ?? `HTTP ${res.status}`;
				const isPermission =
					res.status === 401 ||
					res.status === 403 ||
					/permission|scope|whatsapp_business_messaging/i.test(message);
				checks.push({
					name: 'Plantillas (WABA)',
					ok: false,
					detail: isPermission
						? `${message}. La app de Meta no tiene "whatsapp_business_messaging". Pídelo en Meta Business → System users → Add asset → tu WABA.`
						: message,
				});
			} else {
				const sample = Array.isArray(json.data) && json.data.length > 0 ? json.data[0] : null;
				checks.push({
					name: 'Plantillas (WABA)',
					ok: true,
					detail: sample
						? `Permiso whatsapp_business_messaging OK. Plantilla detectada: "${sample.name ?? 'sin nombre'}" (${sample.status ?? 'sin estado'}).`
						: 'Permiso whatsapp_business_messaging OK. La cuenta no tiene plantillas todavía; créalas en WhatsApp Manager para enviar mensajes proactivos.',
				});
			}
		} catch (err) {
			checks.push({
				name: 'Plantillas (WABA)',
				ok: false,
				detail: err instanceof Error ? err.message : 'Error de red.',
			});
		}
	} else {
		checks.push({
			name: 'business_account_id',
			ok: false,
			detail: 'Falta el WhatsApp Business Account ID. Sin él no podemos confirmar el permiso whatsapp_business_messaging ni enviar plantillas.',
		});
	}

	return {
		ok: checks.every((c) => c.ok),
		provider: 'whatsapp',
		checks,
	};
}

// ---------------------------------------------------------------------------
// Resend
// ---------------------------------------------------------------------------

export interface ResendCreds {
	apiKey: string;
	from?: string;
	source: string;
}

export async function runResendChecks(creds: ResendCreds, fetchImpl?: FetchImpl): Promise<CheckResult> {
	const fetcher = fetchOr(fetchImpl);
	const checks: DiagnosticCheck[] = [];

	if (!/^re_/.test(creds.apiKey)) {
		checks.push({
			name: 'api_key',
			ok: false,
			detail: 'Las API keys de Resend empiezan por "re_". Verifica que copiaste la clave correcta.',
		});
	} else {
		checks.push({ name: 'api_key', ok: true, detail: `Formato OK (origen: ${creds.source}).` });
	}

	let fromAddr: string | null = null;
	if (creds.from) {
		const fromAddrMatch = creds.from.match(/<([^>]+)>\s*$/);
		const addr = (fromAddrMatch ? fromAddrMatch[1] : creds.from).trim();
		const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr);
		fromAddr = isEmail ? addr : null;
		checks.push({
			name: 'from',
			ok: isEmail,
			detail: isEmail
				? `Remitente: ${creds.from}.`
				: `Formato de "from" inválido: "${creds.from}". Usa "Nombre <correo@dominio>" o "correo@dominio".`,
		});
	} else {
		checks.push({
			name: 'from',
			ok: false,
			detail: 'Falta el remitente. Define RESEND_FROM o el campo "from" en la integración.',
		});
	}

	try {
		const res = await fetcher('https://api.resend.com/domains', {
			headers: { Authorization: `Bearer ${creds.apiKey}`, Accept: 'application/json' },
			cache: 'no-store',
		});
		const json = (await res.json().catch(() => ({}))) as {
			data?: Array<{ id?: string; name?: string; status?: string; region?: string }>;
			message?: string;
			name?: string;
		};
		if (!res.ok) {
			const msg = json.message ?? json.name ?? `HTTP ${res.status}`;
			checks.push({ name: 'Resend /domains', ok: false, detail: msg });
			return {
				ok: false,
				provider: 'resend',
				checks,
				error: `Resend rechazó la API key: ${msg}.`,
			};
		}
		const domains = Array.isArray(json.data) ? json.data : [];
		const verified = domains.filter((d) => d.status === 'verified');
		const detail =
			domains.length === 0
				? 'Key válida, pero no hay dominios. Verifica un dominio en resend.com/domains para enviar correo en producción.'
				: `${domains.length} dominio(s) · ${verified.length} verificado(s) (${verified.map((d) => d.name).filter(Boolean).join(', ') || 'ninguno verificado aún'}).`;
		checks.push({ name: 'Resend /domains', ok: true, detail });

		if (fromAddr) {
			const fromDomain = fromAddr.split('@')[1]?.toLowerCase().trim();
			if (fromDomain) {
				const matched = domains.find((d) => (d.name ?? '').toLowerCase() === fromDomain);
				if (!matched) {
					checks.push({
						name: 'Dominio del from',
						ok: false,
						detail: `El dominio "${fromDomain}" no aparece en tu cuenta de Resend. Agrégalo en resend.com/domains o cambia el remitente.`,
					});
				} else if (matched.status !== 'verified') {
					checks.push({
						name: 'Dominio del from',
						ok: false,
						detail: `El dominio "${fromDomain}" existe pero su estado es "${matched.status ?? 'desconocido'}". Termina la verificación DNS para enviar correos.`,
					});
				} else {
					checks.push({
						name: 'Dominio del from',
						ok: true,
						detail: `Dominio "${fromDomain}" verificado${matched.region ? ` en ${matched.region}` : ''}.`,
					});
				}
			}
		}

		return { ok: checks.every((c) => c.ok), provider: 'resend', checks };
	} catch (err) {
		return networkErr('Resend /domains', err, 'resend', 'Error de red al contactar Resend');
	}
}

// ---------------------------------------------------------------------------
// Serper.dev
// ---------------------------------------------------------------------------

export interface SerperCreds {
	apiKey: string;
	source: string;
}

export async function runSerperChecks(creds: SerperCreds, fetchImpl?: FetchImpl): Promise<CheckResult> {
	const fetcher = fetchOr(fetchImpl);
	const checks: DiagnosticCheck[] = [];

	if (!/^[a-f0-9]{40,}$/i.test(creds.apiKey)) {
		checks.push({
			name: 'api_key',
			ok: false,
			detail: 'La API key de Serper.dev es hexadecimal (≥40 caracteres). Verifica que copiaste la clave completa.',
		});
	} else {
		checks.push({ name: 'api_key', ok: true, detail: `Formato OK (origen: ${creds.source}).` });
	}

	try {
		const res = await fetcher('https://google.serper.dev/search', {
			method: 'POST',
			headers: { 'X-API-KEY': creds.apiKey, 'Content-Type': 'application/json' },
			body: JSON.stringify({ q: 'soluciones fabrick', num: 1, gl: 'cl', hl: 'es' }),
			cache: 'no-store',
		});
		const json = (await res.json().catch(() => ({}))) as {
			organic?: Array<unknown>;
			message?: string;
			statusCode?: number;
			credits?: number;
		};
		if (!res.ok) {
			const msg = json.message ?? `HTTP ${res.status}`;
			checks.push({ name: 'Serper /search', ok: false, detail: msg });
			return {
				ok: false,
				provider: 'serper',
				checks,
				error: `Serper.dev rechazó la API key: ${msg}.`,
			};
		}
		const organicCount = Array.isArray(json.organic) ? json.organic.length : 0;
		const credits = res.headers.get('x-ratelimit-remaining') ?? (typeof json.credits === 'number' ? String(json.credits) : null);
		const creditsTxt = credits ? ` · créditos restantes: ${credits}` : '';
		checks.push({
			name: 'Serper /search',
			ok: true,
			detail: `Búsqueda OK (${organicCount} resultado${organicCount === 1 ? '' : 's'} orgánico${organicCount === 1 ? '' : 's'})${creditsTxt}.`,
		});
		return {
			ok: checks.every((c) => c.ok),
			provider: 'serper',
			checks,
			extras: credits != null ? { credits_remaining: credits } : undefined,
		};
	} catch (err) {
		return networkErr('Serper /search', err, 'serper', 'Error de red al contactar Serper.dev');
	}
}

// ---------------------------------------------------------------------------
// SerpAPI
// ---------------------------------------------------------------------------

export interface SerpApiCreds {
	apiKey: string;
	source: string;
}

export async function runSerpApiChecks(creds: SerpApiCreds, fetchImpl?: FetchImpl): Promise<CheckResult> {
	const fetcher = fetchOr(fetchImpl);
	const checks: DiagnosticCheck[] = [];
	checks.push({ name: 'api_key', ok: true, detail: `Presente (origen: ${creds.source}).` });

	try {
		const url = `https://serpapi.com/account?api_key=${encodeURIComponent(creds.apiKey)}`;
		const res = await fetcher(url, { cache: 'no-store' });
		const json = (await res.json().catch(() => ({}))) as {
			account_email?: string;
			plan_name?: string;
			plan_id?: string;
			searches_left?: number;
			total_searches_left?: number;
			this_month_usage?: number;
			error?: string;
		};
		if (!res.ok || json.error) {
			const msg = json.error ?? `HTTP ${res.status}`;
			checks.push({ name: 'SerpAPI /account', ok: false, detail: msg });
			return {
				ok: false,
				provider: 'serpapi',
				checks,
				error: `SerpAPI rechazó la API key: ${msg}.`,
			};
		}
		const left =
			typeof json.total_searches_left === 'number'
				? json.total_searches_left
				: typeof json.searches_left === 'number'
					? json.searches_left
					: null;
		const detailParts: string[] = [];
		if (json.account_email) detailParts.push(json.account_email);
		if (json.plan_name) detailParts.push(`plan ${json.plan_name}`);
		if (left != null) detailParts.push(`${left} búsqueda(s) restantes`);
		if (typeof json.this_month_usage === 'number') detailParts.push(`uso mes: ${json.this_month_usage}`);
		checks.push({
			name: 'SerpAPI /account',
			ok: true,
			detail: detailParts.length > 0 ? detailParts.join(' · ') : 'Cuenta accesible.',
		});
		return {
			ok: checks.every((c) => c.ok),
			provider: 'serpapi',
			checks,
			extras:
				left != null || typeof json.this_month_usage === 'number'
					? {
							searches_left: left,
							this_month_usage: json.this_month_usage ?? null,
							plan: json.plan_name ?? null,
						}
					: undefined,
		};
	} catch (err) {
		return networkErr('SerpAPI /account', err, 'serpapi', 'Error de red al contactar SerpAPI');
	}
}

// ---------------------------------------------------------------------------
// OpenRouter
// ---------------------------------------------------------------------------

export interface OpenRouterCreds {
	apiKey: string;
	source: string;
	appName: string;
	siteUrl?: string;
}

export async function runOpenRouterChecks(creds: OpenRouterCreds, fetchImpl?: FetchImpl): Promise<CheckResult> {
	const fetcher = fetchOr(fetchImpl);
	const checks: DiagnosticCheck[] = [];

	if (!/^sk-or-/.test(creds.apiKey)) {
		checks.push({
			name: 'api_key',
			ok: false,
			detail: 'Las API keys de OpenRouter empiezan por "sk-or-". Verifica que copiaste la clave correcta.',
		});
	} else {
		checks.push({ name: 'api_key', ok: true, detail: `Formato OK (origen: ${creds.source}).` });
	}

	const headers: Record<string, string> = {
		Authorization: `Bearer ${creds.apiKey}`,
		'X-Title': creds.appName,
	};
	if (creds.siteUrl) headers['HTTP-Referer'] = creds.siteUrl;

	try {
		const res = await fetcher('https://openrouter.ai/api/v1/auth/key', { headers, cache: 'no-store' });
		const json = (await res.json().catch(() => ({}))) as {
			data?: { label?: string; usage?: number; limit?: number | null; is_free_tier?: boolean };
			error?: { message?: string };
		};
		if (!res.ok) {
			const msg = json.error?.message ?? `HTTP ${res.status}`;
			checks.push({ name: 'OpenRouter /auth/key', ok: false, detail: msg });
			return {
				ok: false,
				provider: 'openrouter',
				checks,
				error: `OpenRouter rechazó la API key: ${msg}.`,
			};
		}
		const info = json.data ?? {};
		const usage = typeof info.usage === 'number' ? info.usage.toFixed(4) : '0.0000';
		const limit = info.limit == null ? 'sin límite' : Number(info.limit).toFixed(4);
		const tier = info.is_free_tier ? ' · free tier' : '';
		checks.push({
			name: 'OpenRouter /auth/key',
			ok: true,
			detail: `Key válida (${info.label ?? 'sin etiqueta'}) · usado $${usage} / $${limit}${tier}.`,
		});
		return {
			ok: checks.every((c) => c.ok),
			provider: 'openrouter',
			checks,
			extras:
				typeof info.usage === 'number' || info.limit != null
					? {
							usage_usd: info.usage ?? 0,
							limit_usd: info.limit ?? null,
							is_free_tier: info.is_free_tier ?? false,
						}
					: undefined,
		};
	} catch (err) {
		return networkErr('OpenRouter /auth/key', err, 'openrouter', 'Error de red al contactar OpenRouter');
	}
}
