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
  await runSql('phase 1 extensions', `CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  await runSql('phase 2 product columns', `
DO $$
BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ean text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT '${DEFAULT_TENANT}'::uuid;
    UPDATE public.products SET tenant_id = '${DEFAULT_TENANT}'::uuid WHERE tenant_id IS NULL;
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

  await runSql('phase 5 movement indexes', `
CREATE INDEX IF NOT EXISTS inventory_movements_product_idx
  ON public.inventory_movements(tenant_id, product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_movements_reference_idx
  ON public.inventory_movements(tenant_id, reference_type, reference_id)
  WHERE reference_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS inventory_movements_barcode_idx
  ON public.inventory_movements(tenant_id, barcode, created_at DESC)
  WHERE barcode IS NOT NULL;
`);

  console.log('[inventory-bootstrap] SKU/EAN and movement schema aligned.');
} catch (error) {
  console.error('[inventory-bootstrap] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}
