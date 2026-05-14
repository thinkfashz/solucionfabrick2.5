import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const INSFORGE_URL =
  process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

function resolveApiKey(): string {
  const key = process.env.INSFORGE_API_KEY;
  if (!key) throw new Error('INSFORGE_API_KEY env var is not configured');
  return key;
}

async function runStatement(sql: string, apiKey: string): Promise<{ ok: boolean; error?: string }> {
  const url = `${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ query: sql }),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await res.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!res.ok) {
      const msg =
        data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)
          ? String((data as Record<string, unknown>).error)
          : text.slice(0, 200);
      return { ok: false, error: msg };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** Split the migration into individual executable statements.
 *  Handles multi-line statements, DO $$ blocks, and inline comments. */
function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarBlock = false;

  for (const line of sql.split('\n')) {
    const trimmed = line.trim();
    // Skip pure comment lines and blank lines at the start of a statement
    if (!current && (trimmed.startsWith('--') || trimmed === '')) continue;

    if (trimmed.includes('$$')) inDollarBlock = !inDollarBlock;
    current += line + '\n';

    // Statement ends at ; only outside a $$ block
    if (!inDollarBlock && trimmed.endsWith(';')) {
      const stmt = current.trim();
      if (stmt && !stmt.replace(/--[^\n]*/g, '').trim().match(/^$/)) {
        statements.push(stmt);
      }
      current = '';
    }
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

// The full migration SQL inlined so the route is self-contained.
// Keep in sync with scripts/add-multitenancy.sql
const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS public.platform_plans (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  description text,
  price_clp   integer NOT NULL,
  price_usd   numeric(8,2),
  mp_plan_id  text,
  limits      jsonb NOT NULL DEFAULT '{}',
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_plans (id, name, description, price_clp, price_usd, limits) VALUES
  ('starter',    'Starter',    'Ideal para negocios que empiezan a vender online.',
   29990,  33,
   '{"max_products":100,"max_orders_month":50,"features":["tienda","pedidos","cotizaciones","pagos_mp"]}'::jsonb),
  ('pro',        'Pro',        'Todo lo que necesita un negocio en crecimiento.',
   59990,  66,
   '{"max_products":500,"max_orders_month":null,"features":["tienda","pedidos","cotizaciones","pagos_mp","meta_ads","dte","envios","loyalty","blog"]}'::jsonb),
  ('enterprise', 'Enterprise', 'Plataforma completa con soporte prioritario.',
   149990, 165,
   '{"max_products":null,"max_orders_month":null,"features":["all","api_access","soporte_prioritario","onboarding_dedicado"]}'::jsonb)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.tenants (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text NOT NULL UNIQUE,
  name             text NOT NULL,
  owner_email      text NOT NULL,
  owner_name       text,
  owner_phone      text,
  phone            text,
  plan_id          text NOT NULL DEFAULT 'starter' REFERENCES public.platform_plans(id),
  status           text NOT NULL DEFAULT 'trial'
    CHECK (status IN ('trial','active','suspended','cancelled')),
  trial_ends_at    timestamptz,
  custom_domain    text UNIQUE,
  logo_url         text,
  primary_color    text DEFAULT '#10b981',
  mp_access_token  text,
  mp_public_key    text,
  billing_email    text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.tenants (id, slug, name, owner_email, plan_id, status) VALUES
  ('00000000-0000-0000-0000-000000000001',
   'fabrick', 'Soluciones Fabrick', 'admin@fabrick.cl', 'pro', 'active')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.platform_subscriptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id             text NOT NULL REFERENCES public.platform_plans(id),
  status              text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','authorized','paused','cancelled','error')),
  mp_preapproval_id   text UNIQUE,
  mp_plan_id          text,
  amount_clp          integer NOT NULL,
  next_payment_date   timestamptz,
  last_payment_date   timestamptz,
  last_payment_status text,
  cancelled_at        timestamptz,
  cancel_reason       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_subscriptions_tenant_idx ON public.platform_subscriptions(tenant_id);

CREATE INDEX IF NOT EXISTS platform_subscriptions_status_idx ON public.platform_subscriptions(status);

CREATE TABLE IF NOT EXISTS public.platform_payment_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.platform_subscriptions(id),
  tenant_id       uuid REFERENCES public.tenants(id),
  mp_payment_id   text,
  amount_clp      integer,
  status          text,
  event_type      text,
  raw             jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.tenants(id);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.tenants(id);

ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.tenants(id);

ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.tenants(id);

ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.tenants(id);

ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.tenants(id);

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.tenants(id);

ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.tenants(id);

CREATE INDEX IF NOT EXISTS products_tenant_idx ON public.products(tenant_id);

CREATE INDEX IF NOT EXISTS orders_tenant_idx ON public.orders(tenant_id);

CREATE INDEX IF NOT EXISTS admin_users_tenant_idx ON public.admin_users(tenant_id);

CREATE INDEX IF NOT EXISTS invoices_tenant_idx ON public.invoices(tenant_id);

CREATE INDEX IF NOT EXISTS blog_posts_tenant_idx ON public.blog_posts(tenant_id);

CREATE INDEX IF NOT EXISTS media_assets_tenant_idx ON public.media_assets(tenant_id);

CREATE INDEX IF NOT EXISTS banners_tenant_idx ON public.banners(tenant_id);

ALTER TABLE public.configuracion DROP CONSTRAINT IF EXISTS configuracion_clave_key;

ALTER TABLE public.configuracion ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.tenants(id);

ALTER TABLE public.configuracion ADD CONSTRAINT IF NOT EXISTS configuracion_clave_tenant_unique UNIQUE (clave, tenant_id);

CREATE INDEX IF NOT EXISTS configuracion_tenant_idx ON public.configuracion(tenant_id);

CREATE OR REPLACE VIEW public.platform_mrr AS
SELECT
  pp.id AS plan_id, pp.name AS plan_name, pp.price_clp,
  COUNT(ps.id) AS active_subscriptions,
  COUNT(ps.id) * pp.price_clp AS mrr_clp,
  ROUND(COUNT(ps.id) * pp.price_clp / 1000.0, 2) AS mrr_usd_approx
FROM public.platform_plans pp
LEFT JOIN public.platform_subscriptions ps ON ps.plan_id = pp.id AND ps.status = 'authorized'
GROUP BY pp.id, pp.name, pp.price_clp
ORDER BY pp.price_clp;

CREATE OR REPLACE VIEW public.platform_tenant_summary AS
SELECT
  t.id, t.slug, t.name, t.owner_email, t.plan_id, t.status, t.created_at,
  pp.price_clp, ps.status AS subscription_status, ps.mp_preapproval_id, ps.next_payment_date,
  (SELECT COUNT(*) FROM public.orders o WHERE o.tenant_id = t.id) AS total_orders,
  (SELECT COUNT(*) FROM public.products p WHERE p.tenant_id = t.id) AS total_products
FROM public.tenants t
LEFT JOIN public.platform_plans pp ON pp.id = t.plan_id
LEFT JOIN public.platform_subscriptions ps ON ps.tenant_id = t.id AND ps.status = 'authorized'
ORDER BY t.created_at DESC;

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_order_id_dte_type_key;

ALTER TABLE public.invoices ADD CONSTRAINT invoices_order_id_dte_type_key UNIQUE (order_id, dte_type);

-- Row Level Security: enforce tenant isolation at the database level.
-- ENABLE RLS only (no FORCE): the service key (table owner) bypasses RLS
-- intentionally so admin queries work without setting app.tenant_id.
-- The anon key is still subject to all tenant_isolation policies.
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.tenants
  USING (id = current_setting('app.tenant_id', TRUE)::uuid);

ALTER TABLE public.platform_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.platform_subscriptions
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::uuid);

ALTER TABLE public.platform_payment_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.platform_payment_log
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::uuid);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.products
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::uuid);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.orders
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::uuid);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.admin_users
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::uuid);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.integrations
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::uuid);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.blog_posts
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::uuid);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.media_assets
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::uuid);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.invoices
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::uuid);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.banners
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::uuid);

ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.configuracion
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::uuid);
`;

export async function POST(request: NextRequest) {
  // Auth check FIRST — unauthenticated callers must never learn about env-var state.
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const session = await decodeSession(sessionCookie.value);
  if (!session) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

  // Key resolution AFTER auth — a missing key is a server misconfiguration only
  // authenticated operators should see.
  let apiKey: string;
  try {
    apiKey = resolveApiKey();
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  const statements = splitStatements(MIGRATION_SQL);
  const results: { sql: string; ok: boolean; error?: string }[] = [];
  let failed = 0;

  for (const stmt of statements) {
    const result = await runStatement(stmt, apiKey);
    // Treat "already exists" as success (idempotent migration)
    const isAlreadyExists =
      !result.ok &&
      result.error &&
      (result.error.toLowerCase().includes('already exists') ||
       result.error.includes('42P07') ||
       result.error.includes('42710'));

    results.push({
      sql: stmt.slice(0, 80) + (stmt.length > 80 ? '…' : ''),
      ok: result.ok || !!isAlreadyExists,
      error: isAlreadyExists ? undefined : result.error,
    });
    if (!result.ok && !isAlreadyExists) failed++;
  }

  return NextResponse.json({
    ok: failed === 0,
    total: statements.length,
    passed: results.filter((r) => r.ok).length,
    failed,
    results,
  });
}
