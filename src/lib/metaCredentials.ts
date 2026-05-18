import 'server-only';
import { createClient } from '@insforge/sdk';
import { decryptCredentials, encryptCredentials } from '@/lib/integrationsCrypto';
import { readEnvFromMap } from '@/lib/integrationsEnvMap';
import {
  debugToken,
  exchangeForLongLivedToken,
  getMetaAppId,
  getMetaAppSecret,
} from '@/lib/metaOAuth';

/**
 * Resolves Meta (Facebook/Instagram Graph API) credentials.
 *
 * Lookup order:
 *  1. Environment variables (`META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`,
 *     `META_FACEBOOK_PAGE_ID`, `META_INSTAGRAM_BUSINESS_ID`). These take
 *     precedence so deployments can pin credentials without touching the DB.
 *  2. The `integrations` table row for `provider = 'meta'` as managed from
 *     `/admin/configuracion`. The UI stores `access_token`, `ad_account_id`,
 *     `page_id` (Facebook) and `instagram_business_id`.
 *
 * Returns `null` when InsForge isn't configured on the server; callers
 * should treat that as a 503.
 */
export interface MetaCredentials {
  accessToken?: string;
  adAccountId?: string;
  facebookPageId?: string;
  instagramBusinessId?: string;
  /**
   * Source information, useful for error messages. Populated only for fields
   * whose value actually resolved to something non-empty.
   */
  sources: Record<
    'accessToken' | 'adAccountId' | 'facebookPageId' | 'instagramBusinessId',
    'env' | 'db' | undefined
  >;
}

function normalize(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

/** Renew Meta long-lived token when fewer than 7 days remain. */
const META_REFRESH_GRACE_DAYS = 7;

function shouldRefreshMeta(expiresAt: string | undefined): boolean {
  if (!expiresAt) return false;
  const ts = Date.parse(expiresAt);
  if (Number.isNaN(ts)) return false;
  return ts - META_REFRESH_GRACE_DAYS * 86_400_000 <= Date.now();
}

export async function getMetaCredentials(): Promise<MetaCredentials | null> {
  // Resolve env aliases through the central env map so this helper honours
  // every alias declared there (e.g. META_PAGE_ID in addition to
  // META_FACEBOOK_PAGE_ID). See `src/lib/integrationsEnvMap.ts`.
  const envToken = readEnvFromMap('meta', 'access_token')?.value;
  const envAdAccount = readEnvFromMap('meta', 'ad_account_id')?.value;
  const envPage = readEnvFromMap('meta', 'page_id')?.value;
  const envIg = readEnvFromMap('meta', 'instagram_business_id')?.value;

  const creds: MetaCredentials = {
    accessToken: envToken,
    adAccountId: envAdAccount,
    facebookPageId: envPage,
    instagramBusinessId: envIg,
    sources: {
      accessToken: envToken ? 'env' : undefined,
      adAccountId: envAdAccount ? 'env' : undefined,
      facebookPageId: envPage ? 'env' : undefined,
      instagramBusinessId: envIg ? 'env' : undefined,
    },
  };

  // If every field is already resolved via env vars, skip the DB round-trip.
  if (
    creds.accessToken &&
    creds.adAccountId &&
    creds.facebookPageId &&
    creds.instagramBusinessId
  ) {
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
    let dbToken = normalize(dbCreds.access_token);
    const dbAdAccount = normalize(dbCreds.ad_account_id);
    // Accept both `facebook_page_id` and the legacy `page_id` used by the UI.
    const dbPage = normalize(dbCreds.facebook_page_id) ?? normalize(dbCreds.page_id);
    const dbIg = normalize(dbCreds.instagram_business_id);
    const dbExpiresAt = normalize(dbCreds.expires_at as string | undefined);

    // Auto-renew the long-lived token when fewer than 7 days remain.
    // Meta accepts the current long-lived token in `fb_exchange_token` and
    // returns a fresh 60-day token as long as it hasn't expired yet.
    if (dbToken && shouldRefreshMeta(dbExpiresAt)) {
      const appId = getMetaAppId();
      const appSecret = getMetaAppSecret();
      if (appId && appSecret) {
        try {
          const renewed = await exchangeForLongLivedToken({
            shortLivedToken: dbToken,
            clientId: appId,
            clientSecret: appSecret,
          });
          // Re-read debug_token to get authoritative expires_at.
          let newExpiresAt: string | undefined;
          try {
            const appAccessToken = `${appId}|${appSecret}`;
            const debug = await debugToken({
              inputToken: renewed.access_token,
              appAccessToken,
            });
            if (typeof debug.expires_at === 'number' && debug.expires_at > 0) {
              newExpiresAt = new Date(debug.expires_at * 1000).toISOString();
            }
          } catch {
            // fallback: estimate 60 days from now
            newExpiresAt = renewed.expires_in
              ? new Date(Date.now() + renewed.expires_in * 1000).toISOString()
              : new Date(Date.now() + 60 * 86_400_000).toISOString();
          }
          const updated = encryptCredentials({
            ...dbCreds,
            access_token: renewed.access_token,
            expires_at: newExpiresAt ?? dbExpiresAt ?? '',
            connected_at: new Date().toISOString(),
          });
          await client.database
            .from('integrations')
            .upsert([{ provider: 'meta', credentials: updated }], { onConflict: 'provider' });
          dbToken = renewed.access_token;
        } catch (err) {
          console.error('[meta-credentials] auto-refresh failed', err);
        }
      }
    }

    if (!creds.accessToken && dbToken) {
      creds.accessToken = dbToken;
      creds.sources.accessToken = 'db';
    }
    if (!creds.adAccountId && dbAdAccount) {
      creds.adAccountId = dbAdAccount;
      creds.sources.adAccountId = 'db';
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
