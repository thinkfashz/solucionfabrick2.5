-- Dropi integration support
-- Ejecutar si quieres preparar manualmente las tablas antes de usar /admin/dropi.

CREATE TABLE IF NOT EXISTS public.integrations (
  provider text PRIMARY KEY,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_price numeric(12,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_currency text;

CREATE INDEX IF NOT EXISTS products_dropi_source_idx
  ON public.products (source, source_id)
  WHERE source = 'dropi';

CREATE TABLE IF NOT EXISTS public.dropi_order_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  dropi_order_id text,
  status text DEFAULT 'pending',
  request_payload jsonb DEFAULT '{}'::jsonb,
  response_payload jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dropi_order_links_order_idx
  ON public.dropi_order_links (order_id, created_at DESC);
