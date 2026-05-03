import 'server-only';
import { createClient } from '@insforge/sdk';
import { decryptCredentials } from './integrationsCrypto';

/**
 * Resolves Meta (Facebook/Instagram Graph API) credentials.
 *
 * Lookup order:
 *  1. Environment variables (`META_ACCESS_TOKEN`, `META_FACEBOOK_PAGE_ID`,
 *     `META_INSTAGRAM_BUSINESS_ID`). These take precedence so deployments
 *     can pin credentials without touching the DB.
 *  2. The `integrations` table row for `provider = 'meta'` as managed from
 *     `/admin/configuracion`. The UI stores `access_token`, `page_id`
 *     (Facebook) and `instagram_business_id`.
 *
 * Returns `null` when InsForge isn't configured on the server; callers
 * should treat that as a 503.
 */
export interface MetaCredentials {
  accessToken?: string;
  facebookPageId?: string;
  instagramBusinessId?: string;
  /**
   * Source information, useful for error messages. Populated only for fields
   * whose value actually resolved to something non-empty.
   */
  sources: Record<'accessToken' | 'facebookPageId' | 'instagramBusinessId', 'env' | 'db' | undefined>;
}

function normalize(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export async function getMetaCredentials(): Promise<MetaCredentials | null> {
  const envToken = normalize(process.env.META_ACCESS_TOKEN);
  const envPage = normalize(process.env.META_FACEBOOK_PAGE_ID);
  const envIg = normalize(process.env.META_INSTAGRAM_BUSINESS_ID);

  const creds: MetaCredentials = {
    accessToken: envToken,
    facebookPageId: envPage,
    instagramBusinessId: envIg,
    sources: {
      accessToken: envToken ? 'env' : undefined,
      facebookPageId: envPage ? 'env' : undefined,
      instagramBusinessId: envIg ? 'env' : undefined,
    },
  };

  // If all three are already resolved via env vars, skip the DB round-trip.
  if (creds.accessToken && creds.facebookPageId && creds.instagramBusinessId) {
    return creds;
  }

  const baseUrl = normalize(process.env.NEXT_PUBLIC_INSFORGE_URL);
  const anonKey = normalize(process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY);
  if (!baseUrl || !anonKey) {
    // No DB available for fallback; return whatever env produced (possibly empty).
    return creds;
  }

  try {
    const client = createClient({ baseUrl, anonKey });
    const { data, error } = await client.database
      .from('integrations')
      .select('credentials')
      .eq('provider', 'meta')
      .limit(1);
    if (error || !Array.isArray(data) || data.length === 0) return creds;

    const row = data[0] as { credentials?: Record<string, unknown> };
    const dbCreds = decryptCredentials(row.credentials ?? {});
    const dbToken = normalize(dbCreds.access_token);
    // Accept both `facebook_page_id` and the legacy `page_id` used by the UI.
    const dbPage = normalize(dbCreds.facebook_page_id) ?? normalize(dbCreds.page_id);
    const dbIg = normalize(dbCreds.instagram_business_id);

    if (!creds.accessToken && dbToken) {
      creds.accessToken = dbToken;
      creds.sources.accessToken = 'db';
    }
    if (!creds.facebookPageId && dbPage) {
      creds.facebookPageId = dbPage;
      creds.sources.facebookPageId = 'db';
    }
    if (!creds.instagramBusinessId && dbIg) {
      creds.instagramBusinessId = dbIg;
      creds.sources.instagramBusinessId = 'db';
    }
  } catch {
    /* Swallow DB errors — return env-sourced values */
  }

  return creds;
}
