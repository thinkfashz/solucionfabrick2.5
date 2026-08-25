/* Fabrick Mercado Libre schema bootstrap. Idempotent and non-destructive. */
const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const apiKey = process.env.INSFORGE_API_KEY;
if (!baseUrl || !apiKey) {
  console.warn('[ml-bootstrap] InsForge env not present; skipping.');
  process.exit(0);
}

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';
const endpoint = `${baseUrl.replace(/\/$/, '')}/api/database/advance/rawsql/unrestricted`;

async function runSql(label, query) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(45_000),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${label} HTTP ${response.status}: ${body.slice(0, 1500)}`);
  }
  console.log(`[ml-bootstrap] ${label} OK`);
}

try {
  await runSql('phase 1 tables', `
CREATE TABLE IF NOT EXISTS public.ml_orders (
  id bigint PRIMARY KEY,
  tenant_id uuid NOT NULL DEFAULT '${DEFAULT_TENANT}'::uuid,
  status text NOT NULL DEFAULT 'unknown',
  status_detail text,
  buyer_id bigint,
  buyer_nickname text,
  buyer_email text,
  total_amount numeric(12,2),
  currency_id text DEFAULT 'CLP',
  items jsonb DEFAULT '[]'::jsonb,
  shipping_id bigint,
  shipping_status text,
  shipping_address text,
  payments jsonb DEFAULT '[]'::jsonb,
  date_created timestamptz,
  date_closed timestamptz,
  last_updated timestamptz,
  synced_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ml_questions (
  id bigint PRIMARY KEY,
  tenant_id uuid NOT NULL DEFAULT '${DEFAULT_TENANT}'::uuid,
  item_id text NOT NULL,
  seller_id bigint,
  status text NOT NULL DEFAULT 'UNANSWERED',
  text text NOT NULL,
  answer_text text,
  answer_status text,
  answer_date timestamptz,
  buyer_id bigint,
  date_created timestamptz,
  synced_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ml_price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '${DEFAULT_TENANT}'::uuid,
  item_id text NOT NULL,
  item_title text,
  my_price numeric(12,2),
  target_price numeric(12,2),
  last_checked_price numeric(12,2),
  last_checked_at timestamptz,
  alert_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
`);

  await runSql('phase 2 tenant columns', `
DO $$
BEGIN
  IF to_regclass('public.ml_orders') IS NOT NULL THEN
    ALTER TABLE public.ml_orders ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT '${DEFAULT_TENANT}'::uuid;
    UPDATE public.ml_orders SET tenant_id = '${DEFAULT_TENANT}'::uuid WHERE tenant_id IS NULL;
    ALTER TABLE public.ml_orders ALTER COLUMN tenant_id SET DEFAULT '${DEFAULT_TENANT}'::uuid;
    ALTER TABLE public.ml_orders ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
  IF to_regclass('public.ml_questions') IS NOT NULL THEN
    ALTER TABLE public.ml_questions ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT '${DEFAULT_TENANT}'::uuid;
    UPDATE public.ml_questions SET tenant_id = '${DEFAULT_TENANT}'::uuid WHERE tenant_id IS NULL;
    ALTER TABLE public.ml_questions ALTER COLUMN tenant_id SET DEFAULT '${DEFAULT_TENANT}'::uuid;
    ALTER TABLE public.ml_questions ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
  IF to_regclass('public.ml_price_alerts') IS NOT NULL THEN
    ALTER TABLE public.ml_price_alerts ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT '${DEFAULT_TENANT}'::uuid;
    UPDATE public.ml_price_alerts SET tenant_id = '${DEFAULT_TENANT}'::uuid WHERE tenant_id IS NULL;
    ALTER TABLE public.ml_price_alerts ALTER COLUMN tenant_id SET DEFAULT '${DEFAULT_TENANT}'::uuid;
    ALTER TABLE public.ml_price_alerts ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;
`);

  await runSql('phase 3 tenant indexes', `
CREATE INDEX IF NOT EXISTS ml_orders_tenant_status_idx
  ON public.ml_orders(tenant_id, status, date_created DESC);
CREATE INDEX IF NOT EXISTS ml_orders_tenant_created_idx
  ON public.ml_orders(tenant_id, date_created DESC);
CREATE INDEX IF NOT EXISTS ml_questions_tenant_status_idx
  ON public.ml_questions(tenant_id, status, date_created DESC);
CREATE INDEX IF NOT EXISTS ml_questions_tenant_item_idx
  ON public.ml_questions(tenant_id, item_id);
CREATE INDEX IF NOT EXISTS ml_price_alerts_tenant_active_idx
  ON public.ml_price_alerts(tenant_id, alert_active, created_at DESC);
CREATE INDEX IF NOT EXISTS ml_price_alerts_tenant_item_idx
  ON public.ml_price_alerts(tenant_id, item_id);
`);

  console.log('[ml-bootstrap] Mercado Libre local cache schema aligned by tenant.');
} catch (error) {
  console.error('[ml-bootstrap] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}
