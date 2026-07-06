-- TABLA: order-shipping-columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS carrier text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'pendiente';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_created_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_delivery_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipment_details jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_notes text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispatch_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS codigo_despacho text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status_email_sent_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status_email_last_status text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_account_email text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_registered_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS orders_tracking_number_idx ON public.orders (tracking_number) WHERE tracking_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_dispatch_code_idx ON public.orders (dispatch_code) WHERE dispatch_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_delivery_status_idx ON public.orders (delivery_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS orders_shipping_status_idx ON public.orders (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS orders_deleted_at_idx ON public.orders (deleted_at) WHERE deleted_at IS NOT NULL;

-- TABLA: deliveries
CREATE TABLE IF NOT EXISTS public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text UNIQUE,
  dispatch_code text,
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
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS dispatch_code text;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS status text DEFAULT 'pendiente';
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS carrier text;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS deliveries_order_id_idx ON public.deliveries (order_id);
CREATE INDEX IF NOT EXISTS deliveries_dispatch_code_idx ON public.deliveries (dispatch_code) WHERE dispatch_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS deliveries_status_idx ON public.deliveries (status, updated_at DESC);

-- TABLA: order_shipments
CREATE TABLE IF NOT EXISTS public.order_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text UNIQUE NOT NULL,
  tracking_number text UNIQUE NOT NULL,
  carrier text DEFAULT 'Chilexpress',
  status text DEFAULT 'pendiente',
  origin text DEFAULT 'Bodega Soluciones Fabrick',
  destination text,
  estimated_delivery_at timestamptz,
  events jsonb DEFAULT '[]'::jsonb,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.order_shipments ADD COLUMN IF NOT EXISTS order_id text;
ALTER TABLE public.order_shipments ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE public.order_shipments ADD COLUMN IF NOT EXISTS carrier text DEFAULT 'Chilexpress';
ALTER TABLE public.order_shipments ADD COLUMN IF NOT EXISTS status text DEFAULT 'pendiente';
ALTER TABLE public.order_shipments ADD COLUMN IF NOT EXISTS origin text DEFAULT 'Bodega Soluciones Fabrick';
ALTER TABLE public.order_shipments ADD COLUMN IF NOT EXISTS destination text;
ALTER TABLE public.order_shipments ADD COLUMN IF NOT EXISTS estimated_delivery_at timestamptz;
ALTER TABLE public.order_shipments ADD COLUMN IF NOT EXISTS events jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.order_shipments ADD COLUMN IF NOT EXISTS details jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.order_shipments ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.order_shipments ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS order_shipments_order_id_idx ON public.order_shipments (order_id);
CREATE UNIQUE INDEX IF NOT EXISTS order_shipments_tracking_number_idx ON public.order_shipments (tracking_number);
CREATE INDEX IF NOT EXISTS order_shipments_status_idx ON public.order_shipments (status, updated_at DESC);

-- TABLA: customer-account-order-link
ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS order_id text;
ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS last_order_id text;
ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS customer_accounts_email_idx ON public.customer_accounts (lower(email));
CREATE INDEX IF NOT EXISTS customer_accounts_last_order_idx ON public.customer_accounts (last_order_id) WHERE last_order_id IS NOT NULL;
