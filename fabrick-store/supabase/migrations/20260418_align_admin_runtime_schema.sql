CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE public.products
SET activo = true
WHERE activo IS NULL;

UPDATE public.products
SET tagline = CASE
  WHEN tagline IS NOT NULL AND btrim(tagline) <> '' THEN tagline
  WHEN delivery_days IS NOT NULL AND btrim(delivery_days) <> '' THEN 'Entrega ' || delivery_days
  ELSE 'Calidad profesional para tu proyecto'
END
WHERE tagline IS NULL OR btrim(tagline) = '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.orders ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE public.orders ALTER COLUMN id TYPE TEXT USING id::text;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'shipping_address'
      AND data_type = 'jsonb'
  ) THEN
    ALTER TABLE public.orders
      ALTER COLUMN shipping_address TYPE TEXT
      USING COALESCE(shipping_address::text, '');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'user_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email TEXT DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS region TEXT DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'CLP';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE public.orders SET items = '[]'::jsonb WHERE items IS NULL;
UPDATE public.orders SET currency = 'CLP' WHERE currency IS NULL OR btrim(currency) = '';
UPDATE public.orders
SET status = CASE lower(COALESCE(status, ''))
  WHEN 'pendiente_pago' THEN 'pendiente'
  WHEN 'pending' THEN 'pendiente'
  WHEN 'pagado' THEN 'confirmado'
  WHEN 'pagada' THEN 'confirmado'
  WHEN 'approved' THEN 'confirmado'
  WHEN 'succeeded' THEN 'confirmado'
  WHEN 'processing' THEN 'en_preparacion'
  WHEN 'shipped' THEN 'enviado'
  WHEN 'delivered' THEN 'entregado'
  WHEN 'failed' THEN 'cancelado'
  WHEN 'fallida' THEN 'cancelado'
  WHEN 'rejected' THEN 'cancelado'
  WHEN 'cancelled' THEN 'cancelado'
  WHEN 'canceled' THEN 'cancelado'
  WHEN 'refunded' THEN 'cancelado'
  WHEN 'reembolsada' THEN 'cancelado'
  ELSE COALESCE(status, 'pendiente')
END;

ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'pendiente';

CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);

CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  address TEXT,
  estimated_date DATE,
  responsible TEXT,
  status TEXT DEFAULT 'pendiente',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deliveries_status_idx ON public.deliveries (status);
CREATE INDEX IF NOT EXISTS deliveries_updated_at_idx ON public.deliveries (updated_at DESC);

CREATE TABLE IF NOT EXISTS public.payment_webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  idempotency_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  order_id TEXT NOT NULL,
  payment_id TEXT,
  payment_status TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_webhooks_idempotency_key_idx
  ON public.payment_webhooks (idempotency_key);

CREATE TABLE IF NOT EXISTS public.business_config (
  id TEXT PRIMARY KEY,
  nombre TEXT,
  rut TEXT,
  direccion TEXT,
  ciudad TEXT,
  whatsapp TEXT,
  email_contacto TEXT,
  sitio_web TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS rol TEXT DEFAULT 'admin';

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_idx ON public.admin_users (email);