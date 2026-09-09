const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const apiKey = process.env.INSFORGE_API_KEY;
if (!baseUrl || !apiKey) { console.warn('[store-seed-columns] InsForge env not present; skipping.'); process.exit(0); }
const endpoint = `${baseUrl.replace(/\/$/, '')}/api/database/advance/rawsql/unrestricted`;
const query = `
DO $$ BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source_id text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_name text;
  END IF;
END $$;
`;
const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey }, body: JSON.stringify({ query }), signal: AbortSignal.timeout(45_000) });
const body = await response.text();
if (!response.ok) { console.error(`[store-seed-columns] HTTP ${response.status}: ${body.slice(0, 1200)}`); process.exit(1); }
console.log('[store-seed-columns] storefront catalog columns OK');
