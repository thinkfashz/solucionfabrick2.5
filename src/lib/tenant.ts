/**
 * Tenant resolution for the Fabrick multi-tenant platform (Node.js runtime).
 *
 * Edge-safe utilities (slugFromHostname, DEFAULT_TENANT_ID, etc.) live in
 * tenant-edge.ts which has zero Node.js dependencies and is safe to import
 * from middleware.ts.
 *
 * Resolution order (first match wins):
 *   1. `x-tenant-id` request header  — set by the edge middleware from subdomain
 *   2. `x-tenant-slug` request header — fallback set by middleware
 *   3. DEFAULT_TENANT_ID              — original Fabrick Linares installation
 */

import { insforge } from '@/lib/insforge';

// Re-export Edge-safe utilities so callers can import from one place.
export {
  DEFAULT_TENANT_ID,
  DEFAULT_TENANT_SLUG,
  RESERVED_SLUGS,
  slugFromHostname,
  getTenantIdFromHeaders,
  getTenantSlugFromHeaders,
  toSlug,
  isPlatformAdmin,
} from '@/lib/tenant-edge';

export interface TenantContext {
  id: string;
  slug: string;
  name: string;
  planId: string;
  status: string;
  primaryColor: string;
  logoUrl: string | null;
  phone: string | null;
  billingEmail: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  customDomain: string | null;
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

const TENANT_SELECT = 'id, slug, name, plan_id, status, primary_color, logo_url, phone, billing_email, owner_email, owner_name, custom_domain, mp_access_token, mp_public_key';

type TenantRow = {
  id: string;
  slug: string;
  name: string;
  plan_id: string;
  status: string;
  primary_color: string | null;
  logo_url: string | null;
  phone: string | null;
  billing_email: string | null;
  owner_email: string | null;
  owner_name: string | null;
  custom_domain: string | null;
  mp_access_token: string | null;
  mp_public_key: string | null;
};

function rowToContext(row: TenantRow): TenantContext {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    planId: row.plan_id,
    status: row.status,
    primaryColor: row.primary_color ?? '#10b981',
    logoUrl: row.logo_url ?? null,
    phone: row.phone ?? null,
    billingEmail: row.billing_email ?? null,
    ownerEmail: row.owner_email ?? null,
    ownerName: row.owner_name ?? null,
    customDomain: row.custom_domain ?? null,
    mpAccessToken: row.mp_access_token ?? null,
    mpPublicKey: row.mp_public_key ?? null,
  };
}

/** Fetch a full TenantContext by slug (with in-process cache). */
export async function getTenantBySlug(slug: string): Promise<TenantContext | null> {
  const cached = fromCache(`slug:${slug}`);
  if (cached) return cached;

  const { data, error } = await insforge.database
    .from('tenants')
    .select(TENANT_SELECT)
    .eq('slug', slug)
    .limit(1);

  if (error || !data || data.length === 0) return null;

  const ctx = rowToContext(data[0] as TenantRow);

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
    .select(TENANT_SELECT)
    .eq('id', id)
    .limit(1);

  if (error || !data || data.length === 0) return null;

  const ctx = rowToContext(data[0] as TenantRow);

  toCache(`id:${id}`, ctx);
  toCache(`slug:${ctx.slug}`, ctx);
  return ctx;
}

/** Invalidate in-process cache for a tenant (call after updates). */
export function invalidateTenantCache(id: string, slug?: string) {
  cache.delete(`id:${id}`);
  if (slug) cache.delete(`slug:${slug}`);
}
