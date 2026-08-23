/* Fabrick inventory schema bootstrap. Idempotent and non-destructive. */
const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const apiKey = process.env.INSFORGE_API_KEY;
if (!baseUrl || !apiKey) {
  console.warn('[inventory-bootstrap] InsForge env not present; skipping.');
  process.exit(0);
}
const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';
const sql = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO $$
BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ean text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT '${DEFAULT_TENANT}'::uuid;
    CREATE UNIQUE INDEX IF NOT EXISTS products_tenant_sku_unique_idx
      ON public.products(tenant_id, lower(trim(sku))) WHERE COALESCE(trim(sku),'') <> '';
    CREATE UNIQUE INDEX IF NOT EXISTS products_tenant_ean_unique_idx
      ON public.products(tenant_id, trim(ean)) WHERE COALESCE(trim(ean),'') <> '';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '${DEFAULT_TENANT}'::uuid,
  product_id uuid NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('in','out','adjustment','order','return')),
  quantity integer NOT NULL,
  stock_before integer NOT NULL,
  stock_after integer NOT NULL CHECK (stock_after >= 0),
  reference_type text,
  reference_id text,
  barcode text,
  note text,
  actor_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_movements_product_idx
  ON public.inventory_movements(tenant_id, product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_movements_reference_idx
  ON public.inventory_movements(tenant_id, reference_type, reference_id)
  WHERE reference_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS inventory_movements_barcode_idx
  ON public.inventory_movements(tenant_id, barcode, created_at DESC)
  WHERE barcode IS NOT NULL;
`;
const endpoint = `${baseUrl.replace(/\/$/, '')}/api/database/advance/rawsql/unrestricted`;
try {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ query: sql }),
    signal: AbortSignal.timeout(45_000),
  });
  const body = await response.text();
  if (!response.ok) {
    console.error(`[inventory-bootstrap] HTTP ${response.status}: ${body.slice(0, 1500)}`);
    process.exit(1);
  }
  console.log('[inventory-bootstrap] SKU/EAN and movement schema aligned.');
} catch (error) {
  console.error('[inventory-bootstrap] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}
