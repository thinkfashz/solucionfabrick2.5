/* Revenue P0 commerce schema bootstrap. Idempotent and non-destructive. */
const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || process.env.INSFORGE_URL;
const apiKey = process.env.INSFORGE_API_KEY;

if (!baseUrl || !apiKey) {
  const message = '[commerce-p0-bootstrap] NEXT_PUBLIC_INSFORGE_URL/INSFORGE_URL and INSFORGE_API_KEY are required.';
  if (process.env.NODE_ENV === 'production') {
    console.error(message);
    process.exit(1);
  }
  console.warn(`${message} Skipping outside production.`);
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
  if (!response.ok) throw new Error(`${label} HTTP ${response.status}: ${body.slice(0, 1800)}`);
  console.log(`[commerce-p0-bootstrap] ${label} OK`);
}

try {
  await runSql('order payment audit columns', `
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS expected_payment_amount numeric(12,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS received_payment_amount numeric(12,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS expected_payment_currency text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS received_payment_currency text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_validation_result jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_review_reason text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_reservation_expires_at timestamptz;
`);

  await runSql('reservation table', `
CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','committed','released','expired')),
  expires_at timestamptz NOT NULL,
  release_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  committed_at timestamptz,
  released_at timestamptz,
  UNIQUE (order_id, product_id)
);
CREATE INDEX IF NOT EXISTS inventory_reservations_active_product_idx
  ON public.inventory_reservations(product_id, expires_at)
  WHERE status = 'reserved';
CREATE INDEX IF NOT EXISTS inventory_reservations_order_idx
  ON public.inventory_reservations(order_id, status);
`);

  await runSql('atomic reserve/create order rpc', `
CREATE OR REPLACE FUNCTION public.commerce_create_order_with_reservations(
  p_order jsonb,
  p_items jsonb,
  p_ttl_minutes integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_order_id text := NULLIF(BTRIM(p_order->>'id'), '');
  v_total numeric := COALESCE((p_order->>'total')::numeric, 0);
  v_currency text := UPPER(COALESCE(NULLIF(BTRIM(p_order->>'currency'), ''), 'CLP'));
  v_now timestamptz := now();
  v_expires timestamptz;
  v_existing_total numeric;
  v_existing_currency text;
  v_existing_status text;
  v_existing boolean := false;
  v_stock integer;
  v_active boolean;
  v_other_reserved integer;
  v_existing_res public.inventory_reservations%ROWTYPE;
  r record;
BEGIN
  IF v_order_id IS NULL THEN RAISE EXCEPTION 'ORDER_ID_REQUIRED'; END IF;
  IF p_ttl_minutes IS NULL OR p_ttl_minutes < 5 OR p_ttl_minutes > 60 THEN RAISE EXCEPTION 'INVALID_RESERVATION_TTL'; END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'EMPTY_CART'; END IF;
  IF v_total <= 0 THEN RAISE EXCEPTION 'INVALID_ORDER_TOTAL'; END IF;

  v_expires := v_now + make_interval(mins => p_ttl_minutes);

  UPDATE public.inventory_reservations
     SET status = 'expired', updated_at = v_now, released_at = COALESCE(released_at, v_now), release_reason = COALESCE(release_reason, 'ttl_expired')
   WHERE status = 'reserved' AND expires_at <= v_now;

  SELECT total, UPPER(COALESCE(currency, 'CLP')), status
    INTO v_existing_total, v_existing_currency, v_existing_status
    FROM public.orders
   WHERE id = v_order_id
   FOR UPDATE;

  IF FOUND THEN
    v_existing := true;
    IF ROUND(COALESCE(v_existing_total, 0), 2) <> ROUND(v_total, 2) OR v_existing_currency <> v_currency THEN
      RAISE EXCEPTION 'ORDER_KEY_REUSED_WITH_DIFFERENT_TOTAL';
    END IF;
    IF LOWER(COALESCE(v_existing_status, '')) IN ('pagada','confirmado','confirmada','en_preparacion','enviado','entregado') THEN
      RAISE EXCEPTION 'ORDER_ALREADY_PAID';
    END IF;
  ELSE
    INSERT INTO public.orders (
      id, customer_name, customer_email, customer_phone, region, shipping_address,
      items, subtotal, tax, shipping_fee, total, currency, status,
      tracking_number, carrier, delivery_status, tracking_created_at, estimated_delivery_at,
      shipment_details, created_at, updated_at,
      expected_payment_amount, expected_payment_currency, stock_reservation_expires_at
    ) VALUES (
      v_order_id,
      NULLIF(p_order->>'customer_name',''), NULLIF(p_order->>'customer_email',''), NULLIF(p_order->>'customer_phone',''),
      NULLIF(p_order->>'region',''), NULLIF(p_order->>'shipping_address',''),
      COALESCE(p_order->'items','[]'::jsonb),
      COALESCE((p_order->>'subtotal')::numeric,0), COALESCE((p_order->>'tax')::numeric,0), COALESCE((p_order->>'shipping_fee')::numeric,0),
      v_total, v_currency, COALESCE(NULLIF(p_order->>'status',''),'pendiente_pago'),
      NULLIF(p_order->>'tracking_number',''), NULLIF(p_order->>'carrier',''), COALESCE(NULLIF(p_order->>'delivery_status',''),'pendiente'),
      COALESCE(NULLIF(p_order->>'tracking_created_at','')::timestamptz, v_now),
      NULLIF(p_order->>'estimated_delivery_at','')::timestamptz,
      COALESCE(p_order->'shipment_details','{}'::jsonb),
      COALESCE(NULLIF(p_order->>'created_at','')::timestamptz, v_now),
      COALESCE(NULLIF(p_order->>'updated_at','')::timestamptz, v_now),
      v_total, v_currency, v_expires
    );
  END IF;

  FOR r IN
    SELECT (x->>'product_id')::uuid AS product_id, SUM((x->>'quantity')::integer)::integer AS quantity
      FROM jsonb_array_elements(p_items) x
     GROUP BY (x->>'product_id')::uuid
     ORDER BY (x->>'product_id')::uuid
  LOOP
    IF r.product_id IS NULL OR r.quantity IS NULL OR r.quantity <= 0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;

    SELECT COALESCE(stock,0)::integer, COALESCE(activo,true)
      INTO v_stock, v_active
      FROM public.products
     WHERE id = r.product_id
     FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND:%', r.product_id; END IF;
    IF NOT v_active THEN RAISE EXCEPTION 'PRODUCT_INACTIVE:%', r.product_id; END IF;

    SELECT COALESCE(SUM(quantity),0)::integer
      INTO v_other_reserved
      FROM public.inventory_reservations
     WHERE product_id = r.product_id
       AND status = 'reserved'
       AND expires_at > v_now
       AND order_id <> v_order_id;

    IF (v_stock - v_other_reserved) < r.quantity THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%:%', r.product_id, GREATEST(0, v_stock - v_other_reserved);
    END IF;

    SELECT * INTO v_existing_res
      FROM public.inventory_reservations
     WHERE order_id = v_order_id AND product_id = r.product_id
     FOR UPDATE;

    IF FOUND AND v_existing_res.status = 'committed' THEN
      RAISE EXCEPTION 'RESERVATION_ALREADY_COMMITTED:%', r.product_id;
    END IF;

    INSERT INTO public.inventory_reservations(order_id, product_id, quantity, status, expires_at, created_at, updated_at, committed_at, released_at, release_reason)
    VALUES (v_order_id, r.product_id, r.quantity, 'reserved', v_expires, v_now, v_now, NULL, NULL, NULL)
    ON CONFLICT (order_id, product_id) DO UPDATE SET
      quantity = EXCLUDED.quantity,
      status = 'reserved',
      expires_at = EXCLUDED.expires_at,
      updated_at = EXCLUDED.updated_at,
      committed_at = NULL,
      released_at = NULL,
      release_reason = NULL;
  END LOOP;

  UPDATE public.orders
     SET expected_payment_amount = v_total,
         expected_payment_currency = v_currency,
         stock_reservation_expires_at = v_expires,
         updated_at = v_now
   WHERE id = v_order_id;

  RETURN jsonb_build_object('ok', true, 'order_id', v_order_id, 'existing', v_existing, 'expires_at', v_expires);
END;
$$;
`);

  await runSql('atomic commit/release rpcs', `
CREATE OR REPLACE FUNCTION public.commerce_commit_order_reservation(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_order_status text;
  v_stock integer;
  v_tenant uuid;
  v_count integer := 0;
  v_committed integer := 0;
  r public.inventory_reservations%ROWTYPE;
BEGIN
  SELECT status INTO v_order_status FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;

  UPDATE public.inventory_reservations
     SET status='expired', updated_at=v_now, released_at=COALESCE(released_at,v_now), release_reason=COALESCE(release_reason,'ttl_expired')
   WHERE order_id=p_order_id AND status='reserved' AND expires_at <= v_now;

  SELECT COUNT(*) INTO v_count FROM public.inventory_reservations WHERE order_id=p_order_id;
  IF v_count = 0 THEN RAISE EXCEPTION 'RESERVATION_MISSING'; END IF;
  IF EXISTS (SELECT 1 FROM public.inventory_reservations WHERE order_id=p_order_id AND status IN ('released','expired')) THEN
    RAISE EXCEPTION 'RESERVATION_NOT_ACTIVE';
  END IF;

  FOR r IN SELECT * FROM public.inventory_reservations WHERE order_id=p_order_id ORDER BY product_id FOR UPDATE
  LOOP
    IF r.status = 'committed' THEN CONTINUE; END IF;
    IF r.status <> 'reserved' OR r.expires_at <= v_now THEN RAISE EXCEPTION 'RESERVATION_NOT_ACTIVE'; END IF;

    SELECT COALESCE(stock,0)::integer, COALESCE(tenant_id, '${DEFAULT_TENANT}'::uuid)
      INTO v_stock, v_tenant
      FROM public.products
     WHERE id=r.product_id
     FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND:%', r.product_id; END IF;
    IF v_stock < r.quantity THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK_AT_COMMIT:%:%', r.product_id, v_stock; END IF;

    UPDATE public.products SET stock = v_stock - r.quantity, updated_at=v_now WHERE id=r.product_id;
    UPDATE public.inventory_reservations SET status='committed', committed_at=v_now, updated_at=v_now WHERE id=r.id;

    INSERT INTO public.inventory_movements(
      tenant_id, product_id, movement_type, quantity, stock_before, stock_after,
      reference_type, reference_id, note, created_at
    ) VALUES (
      v_tenant, r.product_id, 'out', -r.quantity, v_stock, v_stock-r.quantity,
      'commerce_commit', p_order_id || ':' || r.product_id::text, 'checkout reservation commit', v_now
    );
    v_committed := v_committed + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'order_id', p_order_id, 'committed_now', v_committed, 'duplicate', v_committed = 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.commerce_release_order_reservation(p_order_id text, p_reason text DEFAULT 'payment_not_approved')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_released integer := 0;
BEGIN
  UPDATE public.inventory_reservations
     SET status='released', released_at=v_now, updated_at=v_now, release_reason=LEFT(COALESCE(p_reason,'released'),180)
   WHERE order_id=p_order_id AND status='reserved';
  GET DIAGNOSTICS v_released = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'order_id', p_order_id, 'released', v_released);
END;
$$;

CREATE OR REPLACE FUNCTION public.commerce_expire_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.inventory_reservations
     SET status='expired', released_at=COALESCE(released_at,now()), updated_at=now(), release_reason=COALESCE(release_reason,'ttl_expired')
   WHERE status='reserved' AND expires_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
`);

  console.log('[commerce-p0-bootstrap] order reservations and payment audit schema aligned.');
} catch (error) {
  console.error('[commerce-p0-bootstrap] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}
