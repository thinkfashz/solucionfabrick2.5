/**
 * Edge-safe tenant utilities — NO Node.js / InsForge imports.
 * Imported by middleware.ts which runs on the Edge runtime.
 * DB-dependent functions live in tenant.ts (Node.js only).
 */

export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';
export const DEFAULT_TENANT_SLUG = 'fabrick';

/** Reserved slugs that cannot be registered by customers. */
export const RESERVED_SLUGS = new Set([
  'fabrick', 'www', 'app', 'api', 'admin', 'platform',
  'registro', 'login', 'dashboard', 'status', 'mail', 'smtp',
  'cdn', 'static', 'assets', 'media', 'blog',
]);

/** Resolve tenant from subdomain. Returns null for apex / www domains. */
export function slugFromHostname(hostname: string): string | null {
  const host = hostname.split(':')[0];
  const parts = host.split('.');
  if (parts.length < 2) return null;
  if (parts.length === 2) return null;
  if (parts[0] === 'www') return null;
  return parts[0];
}

/** Read tenant_id from standard request headers set by middleware. */
export function getTenantIdFromHeaders(headers: { get(name: string): string | null }): string {
  return headers.get('x-tenant-id') ?? DEFAULT_TENANT_ID;
}

/** Read tenant_slug from standard request headers set by middleware. */
export function getTenantSlugFromHeaders(headers: { get(name: string): string | null }): string {
  return headers.get('x-tenant-slug') ?? DEFAULT_TENANT_SLUG;
}

/** Slugify a business name into a valid subdomain slug. */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** Verify platform-owner secret without touching DB. */
export function isPlatformAdmin(authHeader: string | null): boolean {
  const secret = process.env.PLATFORM_ADMIN_SECRET;
  if (!secret || !authHeader) return false;
  return authHeader === `Bearer ${secret}`;
}
