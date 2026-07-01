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
  id                         UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  name                       VARCHAR(255) NOT NULL,
  description                TEXT,
  price                      NUMERIC(12,2) NOT NULL DEFAULT 0,
  category_id                VARCHAR(100),
  image_url                  TEXT,
  stock                      INTEGER      DEFAULT 0,
  featured                   BOOLEAN      DEFAULT false,
  activo                     BOOLEAN      DEFAULT true,
  rating                     NUMERIC(3,2),
  delivery_days              VARCHAR(50),
  discount_percentage        NUMERIC(5,2) DEFAULT 0,
  specifications             JSONB,
  tagline                    VARCHAR(255),
  shipping_mode              TEXT         DEFAULT 'inherit',
  shipping_fee               NUMERIC(12,2),
  shipping_weight_kg         NUMERIC(8,2),
  shipping_dimensions        TEXT,
  shipping_region_overrides  JSONB        DEFAULT '{}'::jsonb,
  source                     TEXT,
  source_url                 TEXT,
  source_id                  TEXT,
  supplier_price             NUMERIC(12,2),
  supplier_currency          TEXT,
  created_at                 TIMESTAMPTZ  DEFAULT now(),
  updated_at                 TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_public_catalog_idx ON products (activo, featured DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS products_category_active_idx ON products (category_id, activo);
CREATE INDEX IF NOT EXISTS products_stock_active_idx ON products (stock) WHERE activo = true;
CREATE INDEX IF NOT EXISTS products_source_idx ON products (source, source_id) WHERE source IS NOT NULL;

-- ----------------------------------------------------------------
-- orders
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id               TEXT PRIMARY KEY,
  customer_name    VARCHAR(255),
  customer_email   VARCHAR(255),
  customer_phone   VARCHAR(30),
  region           VARCHAR(50),
  shipping_address TEXT,
  items            JSONB        DEFAULT '[]'::jsonb,
  subtotal         NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax              NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_fee     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total            NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency         VARCHAR(10)  DEFAULT 'CLP',
  status           VARCHAR(50)  DEFAULT 'pendiente_pago',
  payment_id       TEXT,
  payment_status   VARCHAR(50),
  created_at       TIMESTAMPTZ  DEFAULT now(),
  updated_at       TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_created_at_idx ON orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_payment_id_idx ON orders (payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_payment_status_idx ON orders (payment_status, updated_at DESC) WHERE payment_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_customer_email_idx ON orders (lower(customer_email)) WHERE customer_email IS NOT NULL;

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

CREATE UNIQUE INDEX IF NOT EXISTS payment_webhooks_idempotency_key_idx ON payment_webhooks (idempotency_key);
CREATE INDEX IF NOT EXISTS payment_webhooks_order_idx ON payment_webhooks (order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_webhooks_payment_idx ON payment_webhooks (payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payment_webhooks_created_at_idx ON payment_webhooks (created_at DESC);

-- ----------------------------------------------------------------
-- Atomic stock decrement used by paid payment webhooks
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION decrement_stock_for_paid_order(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_items jsonb;
  v_item jsonb;
  v_product_id text;
  v_qty integer;
  v_updated integer := 0;
  v_skipped integer := 0;
  v_affected integer := 0;
BEGIN
  SELECT items INTO v_items
  FROM orders
  WHERE id::text = p_order_id
  LIMIT 1;

  IF v_items IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'warning', 'order_not_found', 'orderId', p_order_id);
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_items, '[]'::jsonb)) LOOP
    v_product_id := COALESCE(v_item->>'productoId', v_item->>'productId', v_item->>'id');
    v_qty := CASE
      WHEN COALESCE(v_item->>'cantidad', '') ~ '^[0-9]+$' THEN (v_item->>'cantidad')::integer
      WHEN COALESCE(v_item->>'quantity', '') ~ '^[0-9]+$' THEN (v_item->>'quantity')::integer
      ELSE 0
    END;

    IF v_product_id IS NULL OR v_product_id = '' OR v_qty <= 0 THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    UPDATE products
    SET stock = stock - v_qty,
        updated_at = now()
    WHERE id::text = v_product_id
      AND stock IS NOT NULL
      AND stock >= v_qty;

    GET DIAGNOSTICS v_affected = ROW_COUNT;
    IF v_affected > 0 THEN
      v_updated := v_updated + 1;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'updated', v_updated, 'skipped', v_skipped, 'orderId', p_order_id);
END;
$$;

-- ----------------------------------------------------------------
-- order_items (legacy/optional)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id     TEXT    NOT NULL REFERENCES orders(id)   ON DELETE CASCADE,
  product_id   UUID    NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name VARCHAR(255),
  quantity     INTEGER NOT NULL,
  unit_price   NUMERIC(12,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON order_items (product_id);

-- ----------------------------------------------------------------
-- deliveries
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deliveries (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id       TEXT        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status         VARCHAR(50) DEFAULT 'pendiente',
  estimated_date DATE,
  responsible    VARCHAR(255),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deliveries_order_id_idx ON deliveries (order_id);
CREATE INDEX IF NOT EXISTS deliveries_status_created_idx ON deliveries (status, created_at DESC);

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
-- admin_error_logs
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_error_logs (
  id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint      TEXT,
  method        TEXT,
  status_code   INTEGER,
  error_message TEXT,
  details       JSONB        DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ  DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_error_logs_created_at_idx ON admin_error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_error_logs_endpoint_created_idx ON admin_error_logs (endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_error_logs_status_created_idx ON admin_error_logs (status_code, created_at DESC);

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
END
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
END
$$;
`;
