/**
 * Shared constants and helpers for the Meta Marketing / Graph API.
 *
 * All `/api/meta/*` route handlers compose URLs as `${META_GRAPH_URL}/act_${id}/…`,
 * so the `id` they receive must NOT already include the `act_` prefix. Admins
 * routinely paste the account id either way (`1133…` or `act_1133…`) into
 * `META_AD_ACCOUNT_ID` or the InsForge `integrations` row, so callers must
 * normalize before composition.
 */

export const META_API_VERSION = process.env.META_API_VERSION?.trim() || 'v25.0';
export const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * Strips any leading `act_` prefix(es) from a Meta ad account id so callers
 * can safely compose URLs as `act_${id}` without producing `act_act_…`.
 * Accepts the admin-provided id with or without the prefix; both forms work.
 */
export function normalizeAdAccountId(id: string): string;
export function normalizeAdAccountId(id: string | undefined): string | undefined;
export function normalizeAdAccountId(id: string | undefined): string | undefined {
  if (!id) return id;
  return id.trim().replace(/^(?:act_)+/i, '');
}

export function getMetaAdAccountId(): string | undefined {
  return normalizeAdAccountId(process.env.META_AD_ACCOUNT_ID || process.env.META_ACCOUNT_ID);
}
