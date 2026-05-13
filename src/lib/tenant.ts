/**
 * Tenant resolution for the Fabrick multi-tenant platform.
 *
 * Resolution order (first match wins):
 *   1. `x-tenant-id` request header  — set by the edge middleware from subdomain
 *   2. `x-tenant-slug` request header — fallback set by middleware
 *   3. DEFAULT_TENANT_ID              — original Fabrick Linares installation
 *
 * The middleware writes these headers on every HTML + API request so that
 * server components and API route handlers can call `getTenantId(headers())`
 * without a DB round-trip.
 */

import { insforge } from '@/lib/insforge';

export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';
export const DEFAULT_TENANT_SLUG = 'fabrick';

/** Reserved slugs that cannot be registered by customers. */
export const RESERVED_SLUGS = new Set([
  'fabrick', 'www', 'app', 'api', 'admin', 'platform',
  'registro', 'login', 'dashboard', 'status', 'mail', 'smtp',
  'cdn', 'static', 'assets', 'media', 'blog',
]);

export interface TenantContext {
  id: string;
  slug: string;
  name: string;
  planId: string;
  status: string;
  primaryColor: string;
  logoUrl: string | null;
  mpAccessToken: string | null;
  mpPublicKey: string | null;
}

/** Cache tenants for 30s in-process to avoid DB hits on every request. */
const cache = new Map<string, { ctx: TenantContext; at: number }>();
const CACHE_TTL = 30_000;

function fromCache(key: string): TenantContext | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL) { cache.delete(key); return null; }
  return entry.ctx;
}

function toCache(key: string, ctx: TenantContext) {
  cache.set(key, { ctx, at: Date.now() });
}

/** Resolve tenant from a Next.js `headers()` ReadonlyHeaders object or a plain Headers object. */
export function getTenantIdFromHeaders(headers: { get(name: string): string | null }): string {
  return headers.get('x-tenant-id') ?? DEFAULT_TENANT_ID;
}

export function getTenantSlugFromHeaders(headers: { get(name: string): string | null }): string {
  return headers.get('x-tenant-slug') ?? DEFAULT_TENANT_SLUG;
}

/** Resolve tenant from subdomain. Returns null for the apex / www domains. */
export function slugFromHostname(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];
  // Expected pattern: {slug}.fabrick.cl or {slug}.vercel.app or localhost
  const parts = host.split('.');
  if (parts.length < 2) return null;
  // Apex domain (fabrick.cl, www.fabrick.cl) → no tenant slug
  if (parts.length === 2) return null;
  if (parts[0] === 'www') return null;
  return parts[0];
}

/** Fetch a full TenantContext by slug (with in-process cache). */
export async function getTenantBySlug(slug: string): Promise<TenantContext | null> {
  const cached = fromCache(`slug:${slug}`);
  if (cached) return cached;

  const { data, error } = await insforge.database
    .from('tenants')
    .select('id, slug, name, plan_id, status, primary_color, logo_url, mp_access_token, mp_public_key')
    .eq('slug', slug)
    .limit(1);

  if (error || !data || data.length === 0) return null;

  const row = data[0] as {
    id: string; slug: string; name: string; plan_id: string; status: string;
    primary_color: string | null; logo_url: string | null;
    mp_access_token: string | null; mp_public_key: string | null;
  };

  const ctx: TenantContext = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    planId: row.plan_id,
    status: row.status,
    primaryColor: row.primary_color ?? '#10b981',
    logoUrl: row.logo_url ?? null,
    mpAccessToken: row.mp_access_token ?? null,
    mpPublicKey: row.mp_public_key ?? null,
  };

  toCache(`slug:${slug}`, ctx);
  toCache(`id:${ctx.id}`, ctx);
  return ctx;
}

/** Fetch a full TenantContext by UUID (with in-process cache). */
export async function getTenantById(id: string): Promise<TenantContext | null> {
  const cached = fromCache(`id:${id}`);
  if (cached) return cached;

  const { data, error } = await insforge.database
    .from('tenants')
    .select('id, slug, name, plan_id, status, primary_color, logo_url, mp_access_token, mp_public_key')
    .eq('id', id)
    .limit(1);

  if (error || !data || data.length === 0) return null;

  const row = data[0] as {
    id: string; slug: string; name: string; plan_id: string; status: string;
    primary_color: string | null; logo_url: string | null;
    mp_access_token: string | null; mp_public_key: string | null;
  };

  const ctx: TenantContext = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    planId: row.plan_id,
    status: row.status,
    primaryColor: row.primary_color ?? '#10b981',
    logoUrl: row.logo_url ?? null,
    mpAccessToken: row.mp_access_token ?? null,
    mpPublicKey: row.mp_public_key ?? null,
  };

  toCache(`id:${id}`, ctx);
  toCache(`slug:${ctx.slug}`, ctx);
  return ctx;
}

/** Invalidate in-process cache for a tenant (call after updates). */
export function invalidateTenantCache(id: string, slug?: string) {
  cache.delete(`id:${id}`);
  if (slug) cache.delete(`slug:${slug}`);
}

/** Verify that the platform-owner secret is present and matches. */
export function isPlatformAdmin(authHeader: string | null): boolean {
  const secret = process.env.PLATFORM_ADMIN_SECRET;
  if (!secret || !authHeader) return false;
  return authHeader === `Bearer ${secret}`;
}

/** Slugify a business name into a valid subdomain slug. */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
