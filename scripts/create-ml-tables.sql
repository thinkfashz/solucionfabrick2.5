-- ─── MercadoLibre Integration Tables ────────────────────────────────────────
-- Run with: /admin/sql  or  psql -f scripts/create-ml-tables.sql

-- TABLA: ml_orders
-- Pedidos sincronizados desde MercadoLibre.
CREATE TABLE IF NOT EXISTS public.ml_orders (
  id bigint PRIMARY KEY,                        -- ML order id
  status text NOT NULL DEFAULT 'unknown',
  status_detail text,
  buyer_id bigint,
  buyer_nickname text,
  buyer_email text,
  total_amount numeric(12,2),
  currency_id text DEFAULT 'CLP',
  items jsonb DEFAULT '[]',                     -- MLOrderItem[]
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
-- Preguntas de compradores en MercadoLibre.
CREATE TABLE IF NOT EXISTS public.ml_questions (
  id bigint PRIMARY KEY,                        -- ML question id
  item_id text NOT NULL,
  seller_id bigint,
  status text NOT NULL DEFAULT 'UNANSWERED',    -- UNANSWERED | ANSWERED | DELETED
  text text NOT NULL,
  answer_text text,
  answer_status text,
  answer_date timestamptz,
  buyer_id bigint,
  date_created timestamptz,
  synced_at timestamptz DEFAULT now()
);

-- TABLA: ml_price_alerts
-- Monitor de precios: artículos vigilados por el admin.
CREATE TABLE IF NOT EXISTS public.ml_price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id text NOT NULL,                        -- ML item id being monitored
  item_title text,
  my_price numeric(12,2),
  target_price numeric(12,2),                   -- trigger alert below this
  last_checked_price numeric(12,2),
  last_checked_at timestamptz,
  alert_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Index for fast unanswered question lookups.
CREATE INDEX IF NOT EXISTS ml_questions_status_idx ON public.ml_questions (status);
CREATE INDEX IF NOT EXISTS ml_questions_item_idx  ON public.ml_questions (item_id);
CREATE INDEX IF NOT EXISTS ml_orders_status_idx   ON public.ml_orders (status);
CREATE INDEX IF NOT EXISTS ml_orders_created_idx  ON public.ml_orders (date_created DESC);
