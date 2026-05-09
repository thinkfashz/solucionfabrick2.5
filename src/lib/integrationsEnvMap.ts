/**
 * Single source of truth that maps every provider field exposed by the admin
 * `/admin/configuracion` integrations panel to the candidate environment
 * variable names that may hold its value.
 *
 * Two invariants depend on this map and MUST stay in sync with it:
 *
 *  1. **Runtime credential helpers** in `src/lib/*Credentials.ts` / similar
 *     readers MUST resolve their fields through `readEnvFromMap()` (or by
 *     iterating the same alias list) so every alias declared here is
 *     actually consumed by the runtime. If the map advertises an env var
 *     name but no helper reads it, the UI will lock the corresponding field
 *     while the feature silently fails ("X no configurado").
 *
 *  2. **The admin integrations API** (`/api/admin/integrations`) merges
 *     env-detected values over the encrypted DB row when answering GET, and
 *     refuses (409 `ENV_VAR_PRESENT`) any POST that tries to write a field
 *     whose env var is currently set — env vars always win, so writing them
 *     to DB would silently shadow nothing and confuse operators.
 *
 * Adding a new provider field:
 *  - List every legitimate alias env var (most-preferred first).
 *  - Wire the runtime helper to call `readEnvFromMap(provider, field)` so it
 *    honours all aliases.
 *  - If the field has no env var override, omit it from the inner object —
 *    do not list a placeholder, since `envForProvider` treats any listed
 *    field as env-managed when at least one alias is set.
 *
 * Only env-var aliases that the runtime ALREADY consumes are listed here;
 * advertising aliases nobody reads is a footgun (see invariant #1 above).
 */

export const INTEGRATIONS_ENV_MAP = {
  meta: {
    access_token: ['META_ACCESS_TOKEN'],
    ad_account_id: ['META_AD_ACCOUNT_ID'],
    // Stored under `page_id` for backward compatibility with older rows. The
    // server-side resolver in `metaCredentials.ts` accepts both env aliases.
    page_id: ['META_FACEBOOK_PAGE_ID', 'META_PAGE_ID'],
    instagram_business_id: ['META_INSTAGRAM_BUSINESS_ID'],
  },
  google: {
    // No env aliases consumed by runtime helpers yet. Add only when a helper
    // actually reads them.
  },
  google_ads: {
    // GOOGLE_ADS_ACCESS_TOKEN is read only by the health probe, not the
    // runtime credential resolver, so it is intentionally not listed.
  },
  tiktok: {
    // Same as google_ads — only health probe reads TIKTOK_ADS_ACCESS_TOKEN.
  },
  cloudinary: {
    // No env aliases consumed by runtime helpers yet.
  },
  vercel: {
    api_token: ['VERCEL_API_TOKEN'],
    project_id: ['VERCEL_PROJECT_ID'],
    team_id: ['VERCEL_TEAM_ID'],
  },
} as const satisfies Record<string, Record<string, readonly string[]>>;

export type IntegrationProvider = keyof typeof INTEGRATIONS_ENV_MAP;

/**
 * Returns a string value from the first env-var alias that holds a non-empty
 * trimmed value, or `undefined`. Whitespace-only values are treated as unset.
 *
 * Returns `undefined` (not `null`) so call sites can `??`-chain a DB fallback
 * without re-checking the type.
 */
export function readEnvFromMap(
  provider: string,
  field: string,
): { value: string; envVar: string } | undefined {
  const aliases = (INTEGRATIONS_ENV_MAP as Record<string, Record<string, readonly string[]>>)[
    provider
  ]?.[field];
  if (!aliases || aliases.length === 0) return undefined;
  for (const envVar of aliases) {
    const raw = process.env[envVar];
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    return { value: trimmed, envVar };
  }
  return undefined;
}

/**
 * Returns the subset of provider fields whose env var is currently set, with
 * the alias name that resolved. Used by `GET /api/admin/integrations` to
 * shadow the DB row in the response and by `POST` to refuse env-managed
 * fields with a `409 ENV_VAR_PRESENT`.
 *
 * Values are intentionally NOT included — the API never echoes secrets back
 * to the client; only the alias name is exposed so the UI can render
 * "Gestionado por env (`META_ACCESS_TOKEN`)".
 */
export function envForProvider(
  provider: string,
): Record<string, { envVar: string }> {
  const fields = (INTEGRATIONS_ENV_MAP as Record<string, Record<string, readonly string[]>>)[
    provider
  ];
  if (!fields) return {};
  const out: Record<string, { envVar: string }> = {};
  for (const field of Object.keys(fields)) {
    const hit = readEnvFromMap(provider, field);
    if (hit) out[field] = { envVar: hit.envVar };
  }
  return out;
}

/**
 * Returns the list of providers known to the env map (regardless of whether
 * any alias is currently set). Useful for UI rendering where a deterministic
 * order matters.
 */
export function listIntegrationProviders(): readonly string[] {
  return Object.keys(INTEGRATIONS_ENV_MAP);
}
