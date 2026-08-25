/*
 * Market Intelligence tenant isolation bootstrap.
 * Idempotent and non-destructive: legacy rows are assigned to the original
 * Fabrick tenant so existing history remains available after migration.
 */

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const apiKey = process.env.INSFORGE_API_KEY;

if (!baseUrl || !apiKey) {
  console.warn('[market-intel-bootstrap] InsForge env not present; skipping schema bootstrap.');
  process.exit(0);
}

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';

const sql = `
DO $$
BEGIN
  IF to_regclass('public.market_intel_snapshots') IS NOT NULL THEN
    ALTER TABLE public.market_intel_snapshots
      ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT '${DEFAULT_TENANT}'::uuid;
    UPDATE public.market_intel_snapshots
      SET tenant_id = '${DEFAULT_TENANT}'::uuid
      WHERE tenant_id IS NULL;
    ALTER TABLE public.market_intel_snapshots
      ALTER COLUMN tenant_id SET DEFAULT '${DEFAULT_TENANT}'::uuid;
    CREATE INDEX IF NOT EXISTS market_intel_snapshots_tenant_query_idx
      ON public.market_intel_snapshots(tenant_id, normalized_query, created_at DESC);
  END IF;

  IF to_regclass('public.market_intel_refs') IS NOT NULL THEN
    ALTER TABLE public.market_intel_refs
      ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT '${DEFAULT_TENANT}'::uuid;
    UPDATE public.market_intel_refs r
      SET tenant_id = s.tenant_id
      FROM public.market_intel_snapshots s
      WHERE r.snapshot_id = s.id
        AND (r.tenant_id IS NULL OR r.tenant_id = '${DEFAULT_TENANT}'::uuid);
    UPDATE public.market_intel_refs
      SET tenant_id = '${DEFAULT_TENANT}'::uuid
      WHERE tenant_id IS NULL;
    ALTER TABLE public.market_intel_refs
      ALTER COLUMN tenant_id SET DEFAULT '${DEFAULT_TENANT}'::uuid;
    CREATE INDEX IF NOT EXISTS market_intel_refs_tenant_snapshot_idx
      ON public.market_intel_refs(tenant_id, snapshot_id);
  END IF;
END $$;
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
    console.error(`[market-intel-bootstrap] HTTP ${response.status}: ${body.slice(0, 1500)}`);
    process.exit(1);
  }
  console.log('[market-intel-bootstrap] snapshots and refs isolated by tenant.');
} catch (error) {
  console.error('[market-intel-bootstrap] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}
