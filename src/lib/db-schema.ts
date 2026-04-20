/**
 * Canonical InsForge database schema for fabrick-store.
 * Contains the initial CREATE TABLE statements for a fresh database.
 * Imported by /api/setup-db so there is a single source of truth
 * shared between the migration file and the runtime setup endpoint.
 */
export const DB_SCHEMA_SQL = `
-- ----------------------------------------------------------------
-- products
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id                  UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  name                VARCHAR(255) NOT NULL,
  description         TEXT,
  price               INTEGER      NOT NULL,
  category_id         VARCHAR(100),
  image_url           TEXT,
  stock               INTEGER      DEFAULT 0,
  featured            BOOLEAN      DEFAULT false,
  rating              NUMERIC(3,2),
  delivery_days       VARCHAR(50),
  discount_percentage INTEGER      DEFAULT 0,
  specifications      JSONB,
  tagline             VARCHAR(255),
  created_at          TIMESTAMPTZ  DEFAULT now(),
  updated_at          TIMESTAMPTZ  DEFAULT now()
);

-- ----------------------------------------------------------------
-- orders
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name    VARCHAR(255),
  customer_email   VARCHAR(255),
  customer_phone   VARCHAR(20),
  region           VARCHAR(50),
  shipping_address TEXT,
  items            JSONB,
  subtotal         INTEGER      NOT NULL DEFAULT 0,
  tax              INTEGER      NOT NULL DEFAULT 0,
  shipping_fee     INTEGER      NOT NULL DEFAULT 0,
  total            INTEGER      NOT NULL,
  currency         VARCHAR(10)  DEFAULT 'CLP',
  status           VARCHAR(50)  DEFAULT 'pendiente_pago',
  payment_id       TEXT,
  payment_status   VARCHAR(50),
  created_at       TIMESTAMPTZ  DEFAULT now(),
  updated_at       TIMESTAMPTZ  DEFAULT now()
);

-- ----------------------------------------------------------------
-- order_items
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id     UUID    NOT NULL REFERENCES orders(id)   ON DELETE CASCADE,
  product_id   UUID    NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name VARCHAR(255),
  quantity     INTEGER NOT NULL,
  unit_price   INTEGER NOT NULL
);

-- ----------------------------------------------------------------
-- deliveries
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deliveries (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id       UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status         VARCHAR(50) DEFAULT 'pendiente',
  estimated_date DATE,
  responsible    VARCHAR(255),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------
-- admin_users
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id         UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  email      VARCHAR(255) UNIQUE NOT NULL,
  name       VARCHAR(255),
  role       VARCHAR(50)  DEFAULT 'admin',
  created_at TIMESTAMPTZ  DEFAULT now()
);

-- ----------------------------------------------------------------
-- payment_webhooks
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  idempotency_key  TEXT         UNIQUE NOT NULL,
  event_type       VARCHAR(100),
  order_id         TEXT,
  payment_id       TEXT,
  payment_status   VARCHAR(50),
  payload          JSONB,
  created_at       TIMESTAMPTZ  DEFAULT now()
);

-- ----------------------------------------------------------------
-- updated_at auto-update trigger
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_products_updated_at'
  ) THEN
    CREATE TRIGGER trg_products_updated_at
      BEFORE UPDATE ON products
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_orders_updated_at'
  ) THEN
    CREATE TRIGGER trg_orders_updated_at
      BEFORE UPDATE ON orders
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END;
$$;
`;
