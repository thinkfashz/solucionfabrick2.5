# OAuth providers (Mejora 1)

This document describes how to set up the **real** OAuth flows for Google,
Meta and TikTok in Solución Fabrick. Mercado Libre is documented separately
as the canonical reference implementation
(`/api/admin/ml/oauth/{start,callback}`); the new providers replicate its
patterns 1-to-1: PKCE/HMAC-signed state, encrypted persistence in
`integrations`, auto-refresh in the credentials helper, and a connect
button on `/admin/integraciones`.

## Setup checklist (per provider)

For every provider you must:

1. Create an **OAuth client / app** in the provider's developer console.
2. Whitelist the **redirect URI** (defaults below; override with the
   `_REDIRECT_URI` env var if you don't host on the canonical path).
3. Set the env vars in **Vercel → Project Settings → Environment Variables**
   for both the Production and Preview environments.
4. Click **Conectar** on `/admin/integraciones` and approve consent.
5. Verify the success banner shows the connected account and an expiry
   date (where applicable). The cron at `0 9 * * *` will alert if any
   token approaches expiration.

`ADMIN_SESSION_SECRET` is used to HMAC-sign the OAuth `state` parameter
across all providers; if not set, a development-only fallback is used in
non-production builds.

---

## Google (Ads + Google Business Profile + Analytics)

| Step | Value |
|------|-------|
| Console | https://console.cloud.google.com/apis/credentials |
| Auth endpoint | `https://accounts.google.com/o/oauth2/v2/auth` |
| Token endpoint | `https://oauth2.googleapis.com/token` |
| Default redirect URI | `${NEXT_PUBLIC_SITE_URL}/api/admin/google/oauth/callback` |
| PKCE | S256 (mandatory) |
| Refresh strategy | `refresh_token` rotates **only** on the very first authorization (we force `prompt=consent` + `access_type=offline`); subsequent refreshes return only a new `access_token` (~1h TTL). |

Required scopes:

| Scope | Used for |
|-------|----------|
| `https://www.googleapis.com/auth/adwords` | Google Ads API |
| `https://www.googleapis.com/auth/business.manage` | Google Business Profile |
| `https://www.googleapis.com/auth/analytics.readonly` | GA4 read access |

Required env vars:

- `GOOGLE_CLIENT_ID` *(required)*
- `GOOGLE_CLIENT_SECRET` *(required)*
- `GOOGLE_REDIRECT_URI` *(optional; defaults to `${NEXT_PUBLIC_SITE_URL}/api/admin/google/oauth/callback`)*
- `GOOGLE_ADS_DEVELOPER_TOKEN` *(manual; Google does not emit this via OAuth — request it from the Google Ads UI under "API Center" once you have a manager account)*

Implementation:

- Lib: `src/lib/googleOAuth.ts`
- Routes: `src/app/api/admin/google/oauth/{start,callback}/route.ts`
- Credentials helper with auto-refresh: `src/lib/googleCredentials.ts`
- Tests: `tests/unit/googleOAuth.test.ts`

---

## Meta (Facebook Pages + Instagram Business + Ads + WhatsApp Business)

| Step | Value |
|------|-------|
| Console | https://developers.facebook.com/apps/ |
| Auth endpoint | `https://www.facebook.com/v21.0/dialog/oauth` |
| Token endpoint | `https://graph.facebook.com/v21.0/oauth/access_token` |
| Default redirect URI | `${NEXT_PUBLIC_SITE_URL}/api/admin/meta/oauth/callback` |
| PKCE | Not used by Meta — security is provided by the HMAC-signed state token |
| Refresh strategy | Meta does not have a refresh_token. Long-lived tokens (~60d) are minted via `grant_type=fb_exchange_token` and renewed by re-running the exchange before expiry; the cron alerts at the 72h threshold. |

Required scopes:

- `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`
- `instagram_basic`, `instagram_content_publish`
- `ads_management`, `ads_read`
- `whatsapp_business_messaging`, `whatsapp_business_management`
- `business_management`

> ⚠️ Several scopes (notably `instagram_content_publish`, `ads_management`,
> `whatsapp_business_messaging`) require **Meta App Review**. The callback
> tolerates partial grants: it persists the granted scopes and reports the
> missing ones via `pending_review=…` on the success banner; features that
> rely on missing scopes will fail at runtime with the underlying Graph
> error until the app is reviewed.

Required env vars:

- `META_APP_ID` *(required)*
- `META_APP_SECRET` *(required)*
- `META_REDIRECT_URI` *(optional)*

Post-callback, the integration row contains:

- `access_token` – long-lived user token (~60d)
- `granted_scopes` – comma-separated list of scopes Meta actually granted
- `pending_review` – comma-separated list of requested-but-not-granted scopes
- `expires_at` – ISO timestamp from `/debug_token`
- `pages` – JSON-encoded array of `{id,name,access_token,instagram_business_id}`

The merchant picks the active Page + IG account from the dropdown in
`/admin/integraciones` after connecting.

Implementation:

- Lib: `src/lib/metaOAuth.ts`
- Routes: `src/app/api/admin/meta/oauth/{start,callback}/route.ts`
- Tests: `tests/unit/metaOAuth.test.ts`

---

## TikTok (TikTok for Business / TikTok Ads)

| Step | Value |
|------|-------|
| Console | https://business-api.tiktok.com/portal/docs |
| Auth endpoint | `https://business-api.tiktok.com/portal/auth` |
| Token endpoint | `https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/` |
| Default redirect URI | `${NEXT_PUBLIC_SITE_URL}/api/admin/tiktok/oauth/callback` |
| PKCE | Not applicable on the Business endpoint (state HMAC only) |
| Refresh strategy | TikTok for Business `access_token` does **not** expire; it remains valid until the merchant revokes the app from TikTok's permission center. |

> The Business OAuth endpoint expects `auth_code` (not `code`) on the
> callback — our handler accepts both for forward-compatibility.

Required env vars:

- `TIKTOK_APP_ID` *(required)*
- `TIKTOK_APP_SECRET` *(required)*
- `TIKTOK_REDIRECT_URI` *(optional)*

After the exchange, the integration row contains:

- `access_token`
- `advertiser_ids` – comma-separated list returned by TikTok at exchange time
- `advertisers` – JSON array of `{advertiser_id,advertiser_name}` from
  `/oauth2/advertiser/get/` (richer data; includes the human-readable
  account name shown on `/admin/integraciones`).

The merchant picks the active advertiser from the dropdown.

Implementation:

- Lib: `src/lib/tiktokOAuth.ts`
- Routes: `src/app/api/admin/tiktok/oauth/{start,callback}/route.ts`
- Tests: `tests/unit/tiktokOAuth.test.ts`

---

## Healthcheck integration

The cron at `/api/cron/integrations-healthcheck` (daily, 9 AM UTC) calls
`runIntegrationsHealthcheck()`, which now includes generic token-expiry
checks for `mercadolibre`, `google` and `meta` via
`checkTokenExpiry({ provider, … })` in `src/lib/integrationsHealthcheck.ts`.

Behaviour:

- **Expired** → fail (red badge, email alert).
- **Expires within 72h** → warn (the auto-refresh layer should fix this
  before the next run, but persistent warnings indicate the refresh
  token / long-lived token is dead and needs re-consent).
- **Healthy** → green check with the ISO expiry.

TikTok is excluded from expiry checks because its Business `access_token`
does not expire; it would only fail because of revocation, which is
caught by the standard request runners (not by this expiry probe).
