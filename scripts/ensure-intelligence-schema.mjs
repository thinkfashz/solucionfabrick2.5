/*
 * Fabrick Intelligence V2 database bootstrap.
 * Runs after `next build` so a Vercel deployment cannot become READY
 * without first aligning the non-destructive V2 schema.
 *
 * Rules:
 * - idempotent: CREATE/ALTER ... IF NOT EXISTS only
 * - never deletes or merges business rows automatically
 * - does not create proposal/audit tables because pwa_events is the
 *   canonical append-only event store already used by Intelligence V2
 * - records duplicate diagnostics for review instead of deleting data
 */

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const apiKey = process.env.INSFORGE_API_KEY;

if (!baseUrl || !apiKey) {
  console.warn('[db-bootstrap] InsForge env not present; skipping schema bootstrap (local/non-production build).');
  process.exit(0);
}

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';

const sql = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Canonical event store used by proposals + audit revisions.
CREATE TABLE IF NOT EXISTS public.pwa_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  user_id text,
  ua text,
  platform text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pwa_events_event_created_at_idx ON public.pwa_events(event, created_at DESC);
CREATE INDEX IF NOT EXISTS pwa_events_user_created_at_idx ON public.pwa_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pwa_events_tenant_expr_idx ON public.pwa_events ((meta->>'tenantId'), event, created_at DESC);

-- Product provenance required by Commerce Agent and Price Watch.
DO $$
BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source_url text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source_id text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_price numeric(12,2);
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_currency text DEFAULT 'CLP';
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT '${DEFAULT_TENANT}'::uuid;
    CREATE INDEX IF NOT EXISTS products_tenant_idx ON public.products(tenant_id);
    CREATE INDEX IF NOT EXISTS products_source_idx ON public.products(source, source_id) WHERE source IS NOT NULL;
    CREATE INDEX IF NOT EXISTS products_source_url_idx ON public.products(tenant_id, source_url) WHERE source_url IS NOT NULL;
  END IF;
END $$;

-- Price Watch targets. One supplier URL per product/tenant.
CREATE TABLE IF NOT EXISTS public.supplier_watch_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '${DEFAULT_TENANT}'::uuid,
  product_id uuid NOT NULL,
  source text,
  source_url text NOT NULL,
  source_id text,
  enabled boolean NOT NULL DEFAULT true,
  check_interval_minutes integer NOT NULL DEFAULT 1440 CHECK (check_interval_minutes >= 60),
  last_checked_at timestamptz,
  last_status text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, product_id, source_url)
);
CREATE INDEX IF NOT EXISTS supplier_watch_targets_due_idx
  ON public.supplier_watch_targets(tenant_id, enabled, last_checked_at);

-- Historical observations are intentionally append-only; equal prices at
-- different times are not duplicates because they prove continuity.
CREATE TABLE IF NOT EXISTS public.supplier_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '${DEFAULT_TENANT}'::uuid,
  product_id uuid NOT NULL,
  watch_target_id uuid,
  source text,
  source_url text,
  supplier_price numeric(12,2) NOT NULL CHECK (supplier_price >= 0),
  currency text NOT NULL DEFAULT 'CLP',
  in_stock boolean,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  observed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS supplier_price_history_product_idx
  ON public.supplier_price_history(tenant_id, product_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS supplier_price_history_target_idx
  ON public.supplier_price_history(watch_target_id, observed_at DESC);

-- Schema/duplicate health ledger. The deployment writes a new snapshot,
-- preserving history without altering business data.
CREATE TABLE IF NOT EXISTS public.fabrick_schema_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_version text NOT NULL,
  check_name text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  duplicate_groups integer NOT NULL DEFAULT 0,
  affected_rows integer NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fabrick_schema_health_checked_idx
  ON public.fabrick_schema_health(checked_at DESC);

-- Safe duplicate diagnostics. Never delete automatically.
DO $$
DECLARE
  v_groups integer := 0;
  v_rows integer := 0;
  v_legacy boolean := false;
BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN
    SELECT count(*), COALESCE(sum(n),0)
      INTO v_groups, v_rows
    FROM (
      SELECT count(*) AS n
      FROM public.products
      WHERE COALESCE(source_url, '') <> ''
      GROUP BY tenant_id, lower(trim(source_url))
      HAVING count(*) > 1
    ) d;

    INSERT INTO public.fabrick_schema_health(schema_version, check_name, severity, duplicate_groups, affected_rows, details)
    VALUES (
      'intelligence-v2.1',
      'products.same_source_url',
      CASE WHEN v_groups > 0 THEN 'warning' ELSE 'ok' END,
      v_groups,
      v_rows,
      jsonb_build_object('action','review_only','automatic_delete',false)
    );

    SELECT count(*), COALESCE(sum(n),0)
      INTO v_groups, v_rows
    FROM (
      SELECT count(*) AS n
      FROM public.products
      WHERE COALESCE(source, '') <> '' AND COALESCE(source_id, '') <> ''
      GROUP BY tenant_id, lower(trim(source)), lower(trim(source_id))
      HAVING count(*) > 1
    ) d;

    INSERT INTO public.fabrick_schema_health(schema_version, check_name, severity, duplicate_groups, affected_rows, details)
    VALUES (
      'intelligence-v2.1',
      'products.same_supplier_identity',
      CASE WHEN v_groups > 0 THEN 'warning' ELSE 'ok' END,
      v_groups,
      v_rows,
      jsonb_build_object('action','review_only','automatic_delete',false)
    );
  END IF;

  v_legacy := to_regclass('public.productos') IS NOT NULL AND to_regclass('public.products') IS NOT NULL;
  INSERT INTO public.fabrick_schema_health(schema_version, check_name, severity, duplicate_groups, affected_rows, details)
  VALUES (
    'intelligence-v2.1',
    'schema.products_vs_productos',
    CASE WHEN v_legacy THEN 'warning' ELSE 'ok' END,
    CASE WHEN v_legacy THEN 1 ELSE 0 END,
    0,
    jsonb_build_object(
      'products_exists', to_regclass('public.products') IS NOT NULL,
      'legacy_productos_exists', to_regclass('public.productos') IS NOT NULL,
      'note', 'No table is deleted automatically; products is canonical for Fabrick Intelligence.'
    )
  );
END $$;
`;

const endpoint = `${baseUrl.replace(/\/$/, '')}/api/database/advance/rawsql/unrestricted`;

try {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ query: sql }),
    signal: AbortSignal.timeout(45_000),
  });
  const body = await response.text();
  if (!response.ok) {
    console.error(`[db-bootstrap] HTTP ${response.status}: ${body.slice(0, 1500)}`);
    process.exit(1);
  }
  console.log('[db-bootstrap] Intelligence V2 schema aligned and duplicate diagnostics recorded.');
} catch (error) {
  console.error('[db-bootstrap] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}
