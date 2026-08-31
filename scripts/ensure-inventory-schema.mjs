/* Fabrick inventory schema bootstrap. Idempotent and non-destructive. */
const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const apiKey = process.env.INSFORGE_API_KEY;
if (!baseUrl || !apiKey) {
  console.warn('[inventory-bootstrap] InsForge env not present; skipping.');
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
  console.log(`[inventory-bootstrap] ${label} OK`);
}

try {
  await runSql('phase 1 extensions', `
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
`);

  await runSql('phase 2 product columns', `
DO $$
BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ean text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS scan_code text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS scan_format text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT '${DEFAULT_TENANT}'::uuid;
    UPDATE public.products SET tenant_id = '${DEFAULT_TENANT}'::uuid WHERE tenant_id IS NULL;
    UPDATE public.products
      SET scan_code = ean,
          scan_format = COALESCE(scan_format, CASE WHEN length(trim(ean)) = 8 THEN 'ean_8' ELSE 'ean_13' END)
      WHERE COALESCE(trim(scan_code),'') = '' AND COALESCE(trim(ean),'') <> '';
  END IF;
END $$;
`);

  await runSql('phase 3 product indexes', `
DO $$
BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS products_tenant_sku_unique_idx
      ON public.products(tenant_id, lower(trim(sku))) WHERE COALESCE(trim(sku),'') <> '';
    CREATE UNIQUE INDEX IF NOT EXISTS products_tenant_ean_unique_idx
      ON public.products(tenant_id, trim(ean)) WHERE COALESCE(trim(ean),'') <> '';
    CREATE UNIQUE INDEX IF NOT EXISTS products_tenant_scan_code_unique_idx
      ON public.products(tenant_id, trim(scan_code)) WHERE COALESCE(trim(scan_code),'') <> '';
    DROP INDEX IF EXISTS public.products_tenant_name_trgm_idx;
    CREATE INDEX products_tenant_name_trgm_idx
      ON public.products USING gin (name gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS products_tenant_stock_idx
      ON public.products(tenant_id, activo, stock);
  END IF;
END $$;
`);

  // Create the table when missing. A legacy table may already exist with only a
  // subset of these columns, so the next phase explicitly migrates it.
  await runSql('phase 4a movements table', `
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '${DEFAULT_TENANT}'::uuid,
  product_id uuid NOT NULL,
  movement_type text NOT NULL,
  quantity integer NOT NULL,
  stock_before integer NOT NULL,
  stock_after integer NOT NULL,
  reference_type text,
  reference_id text,
  barcode text,
  note text,
  actor_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
`);

  await runSql('phase 4b migrate legacy movements', `
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT '${DEFAULT_TENANT}'::uuid;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS product_id uuid;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS movement_type text;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS quantity integer;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS stock_before integer;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS stock_after integer;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS reference_type text;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS reference_id text;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS actor_id text;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
UPDATE public.inventory_movements SET tenant_id = '${DEFAULT_TENANT}'::uuid WHERE tenant_id IS NULL;
UPDATE public.inventory_movements SET created_at = now() WHERE created_at IS NULL;
`);

  await runSql('phase 5 movement indexes and operation keys', `
CREATE INDEX IF NOT EXISTS inventory_movements_product_idx
  ON public.inventory_movements(tenant_id, product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_movements_reference_idx
  ON public.inventory_movements(tenant_id, reference_type, reference_id)
  WHERE reference_id IS NOT NULL;
DROP INDEX IF EXISTS public.inventory_movements_idempotency_idx;
CREATE INDEX IF NOT EXISTS inventory_movements_barcode_idx
  ON public.inventory_movements(tenant_id, barcode, created_at DESC)
  WHERE barcode IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.inventory_operation_keys (
  tenant_id uuid NOT NULL DEFAULT '${DEFAULT_TENANT}'::uuid,
  reference_type text NOT NULL,
  reference_id text NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, reference_type, reference_id)
);
CREATE INDEX IF NOT EXISTS inventory_operation_keys_product_idx
  ON public.inventory_operation_keys(tenant_id, product_id, created_at DESC);
`);

  await runSql('phase 6 persistent intake', `
CREATE TABLE IF NOT EXISTS public.inventory_intake_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '${DEFAULT_TENANT}'::uuid,
  status text NOT NULL DEFAULT 'open',
  source text NOT NULL DEFAULT 'admin_camera',
  label text,
  device_label text,
  actor_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  committed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.inventory_intake_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '${DEFAULT_TENANT}'::uuid,
  batch_id uuid NOT NULL,
  client_item_id text NOT NULL,
  product_id uuid,
  code text,
  scan_format text,
  name text,
  sku text,
  ean text,
  image_url text,
  quantity integer NOT NULL DEFAULT 1,
  unit_cost numeric,
  match_method text,
  confidence numeric,
  status text NOT NULL DEFAULT 'draft',
  product_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  committed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_intake_items_client_unique_idx
  ON public.inventory_intake_items(tenant_id, batch_id, client_item_id);
CREATE INDEX IF NOT EXISTS inventory_intake_batches_actor_idx
  ON public.inventory_intake_batches(tenant_id, actor_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS inventory_intake_items_batch_idx
  ON public.inventory_intake_items(tenant_id, batch_id, status, created_at ASC);
CREATE INDEX IF NOT EXISTS inventory_intake_items_code_idx
  ON public.inventory_intake_items(tenant_id, code)
  WHERE code IS NOT NULL;
`);

  await runSql('phase 7 external sync ledger', `
CREATE TABLE IF NOT EXISTS public.inventory_source_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '${DEFAULT_TENANT}'::uuid,
  provider text NOT NULL,
  external_product_id text NOT NULL,
  product_id uuid NOT NULL,
  external_sku text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_source_bindings_unique_idx
  ON public.inventory_source_bindings(tenant_id, provider, external_product_id);
CREATE INDEX IF NOT EXISTS inventory_source_bindings_product_idx
  ON public.inventory_source_bindings(tenant_id, product_id);

CREATE TABLE IF NOT EXISTS public.inventory_sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '${DEFAULT_TENANT}'::uuid,
  provider text NOT NULL,
  external_event_id text NOT NULL,
  event_type text NOT NULL,
  direction text NOT NULL DEFAULT 'inbound',
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_sync_events_unique_idx
  ON public.inventory_sync_events(tenant_id, provider, external_event_id, event_type);
CREATE INDEX IF NOT EXISTS inventory_sync_events_status_idx
  ON public.inventory_sync_events(tenant_id, status, created_at DESC);
`);

  await runSql('phase 8 atomic stock movement rpc', `
CREATE OR REPLACE FUNCTION public.inventory_apply_movement(
  p_tenant_id uuid,
  p_product_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_reference_type text DEFAULT NULL,
  p_reference_id text DEFAULT NULL,
  p_barcode text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_actor_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_before integer;
  v_after integer;
  v_signed integer;
  v_claimed boolean := false;
  v_existing public.inventory_movements%ROWTYPE;
  v_movement public.inventory_movements%ROWTYPE;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;

  IF p_movement_type NOT IN ('in', 'out', 'adjustment', 'return') THEN
    RAISE EXCEPTION 'INVALID_MOVEMENT_TYPE';
  END IF;

  IF p_reference_type IS NOT NULL AND p_reference_id IS NOT NULL THEN
    INSERT INTO public.inventory_operation_keys (
      tenant_id, reference_type, reference_id, product_id
    ) VALUES (
      p_tenant_id, p_reference_type, p_reference_id, p_product_id
    )
    ON CONFLICT (tenant_id, reference_type, reference_id) DO NOTHING
    RETURNING true INTO v_claimed;

    IF NOT COALESCE(v_claimed, false) THEN
      SELECT * INTO v_existing
      FROM public.inventory_movements
      WHERE tenant_id = p_tenant_id
        AND reference_type = p_reference_type
        AND reference_id = p_reference_id
      ORDER BY created_at DESC
      LIMIT 1;

      IF FOUND THEN
        RETURN jsonb_build_object(
          'ok', true,
          'duplicate', true,
          'movement_id', v_existing.id,
          'stock_before', v_existing.stock_before,
          'stock_after', v_existing.stock_after,
          'quantity', v_existing.quantity
        );
      END IF;

      RAISE EXCEPTION 'IDEMPOTENCY_STATE_MISSING';
    END IF;
  END IF;

  SELECT COALESCE(stock, 0)::integer INTO v_before
  FROM public.products
  WHERE tenant_id = p_tenant_id AND id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
  END IF;

  v_after := v_before;
  v_signed := p_quantity;

  IF p_movement_type IN ('in', 'return') THEN
    v_after := v_before + p_quantity;
  ELSIF p_movement_type = 'out' THEN
    v_after := v_before - p_quantity;
    v_signed := -p_quantity;
  ELSE
    v_after := p_quantity;
    v_signed := v_after - v_before;
  END IF;

  IF v_after < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_before;
  END IF;

  UPDATE public.products
  SET stock = v_after
  WHERE tenant_id = p_tenant_id AND id = p_product_id;

  INSERT INTO public.inventory_movements (
    tenant_id, product_id, movement_type, quantity, stock_before, stock_after,
    reference_type, reference_id, barcode, note, actor_id
  ) VALUES (
    p_tenant_id, p_product_id, p_movement_type, v_signed, v_before, v_after,
    p_reference_type, p_reference_id, p_barcode, p_note, p_actor_id
  )
  RETURNING * INTO v_movement;

  RETURN jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'movement_id', v_movement.id,
    'stock_before', v_before,
    'stock_after', v_after,
    'quantity', v_signed
  );
END;
$$;
`);

  console.log('[inventory-bootstrap] inventory v2 schema, fast intake and atomic stock aligned.');
} catch (error) {
  console.error('[inventory-bootstrap] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}
