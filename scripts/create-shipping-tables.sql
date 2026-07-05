-- TABLA: order-shipping-columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS carrier text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_notes text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status_email_sent_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status_email_last_status text;
CREATE INDEX IF NOT EXISTS orders_shipping_status_idx ON public.orders (status, updated_at DESC);

-- TABLA: deliveries
CREATE TABLE IF NOT EXISTS public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text UNIQUE,
  customer_name text,
  address text,
  status text DEFAULT 'pendiente',
  tracking_number text,
  carrier text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS order_id text;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS status text DEFAULT 'pendiente';
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS carrier text;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS deliveries_order_id_idx ON public.deliveries (order_id);
CREATE INDEX IF NOT EXISTS deliveries_status_idx ON public.deliveries (status, updated_at DESC);
