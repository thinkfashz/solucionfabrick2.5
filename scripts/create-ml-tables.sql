-- ─── MercadoLibre Integration Tables ────────────────────────────────────────
-- Run with: /admin/sql  or  psql -f scripts/create-ml-tables.sql
-- Existing legacy rows are assigned to the original Fabrick tenant.

-- TABLA: ml_orders
CREATE TABLE IF NOT EXISTS public.ml_orders (
  id bigint PRIMARY KEY,
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  status text NOT NULL DEFAULT 'unknown',
  status_detail text,
  buyer_id bigint,
  buyer_nickname text,
  buyer_email text,
  total_amount numeric(12,2),
  currency_id text DEFAULT 'CLP',
  items jsonb DEFAULT '[]',
  shipping_id bigint,
  shipping_status text,
  shipping_address text,
  payments jsonb DEFAULT '[]',
  date_created timestamptz,
  date_closed timestamptz,
  last_updated timestamptz,
  synced_at timestamptz DEFAULT now()
);

-- TABLA: ml_questions
CREATE TABLE IF NOT EXISTS public.ml_questions (
  id bigint PRIMARY KEY,
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
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

-- TABLA: ml_price_alerts
CREATE TABLE IF NOT EXISTS public.ml_price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  item_id text NOT NULL,
  item_title text,
  my_price numeric(12,2),
  target_price numeric(12,2),
  last_checked_price numeric(12,2),
  last_checked_at timestamptz,
  alert_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Migrate pre-SaaS tables without losing local cache rows.
ALTER TABLE public.ml_orders ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
ALTER TABLE public.ml_questions ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
ALTER TABLE public.ml_price_alerts ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
UPDATE public.ml_orders SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE tenant_id IS NULL;
UPDATE public.ml_questions SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE tenant_id IS NULL;
UPDATE public.ml_price_alerts SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE tenant_id IS NULL;
ALTER TABLE public.ml_orders ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.ml_questions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.ml_price_alerts ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS ml_questions_status_idx ON public.ml_questions (status);
CREATE INDEX IF NOT EXISTS ml_questions_item_idx ON public.ml_questions (item_id);
CREATE INDEX IF NOT EXISTS ml_orders_status_idx ON public.ml_orders (status);
CREATE INDEX IF NOT EXISTS ml_orders_created_idx ON public.ml_orders (date_created DESC);
CREATE INDEX IF NOT EXISTS ml_orders_tenant_status_idx ON public.ml_orders (tenant_id, status, date_created DESC);
CREATE INDEX IF NOT EXISTS ml_orders_tenant_created_idx ON public.ml_orders (tenant_id, date_created DESC);
CREATE INDEX IF NOT EXISTS ml_questions_tenant_status_idx ON public.ml_questions (tenant_id, status, date_created DESC);
CREATE INDEX IF NOT EXISTS ml_questions_tenant_item_idx ON public.ml_questions (tenant_id, item_id);
CREATE INDEX IF NOT EXISTS ml_price_alerts_tenant_active_idx ON public.ml_price_alerts (tenant_id, alert_active, created_at DESC);
CREATE INDEX IF NOT EXISTS ml_price_alerts_tenant_item_idx ON public.ml_price_alerts (tenant_id, item_id);
