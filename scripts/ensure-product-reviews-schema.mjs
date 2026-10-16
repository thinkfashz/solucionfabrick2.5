/*
 * Product reviews schema bootstrap.
 * Idempotent: creates/repairs the moderation table used by public product reviews.
 */
const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || process.env.INSFORGE_URL;
const apiKey = process.env.INSFORGE_API_KEY;

if (!baseUrl || !apiKey) {
  console.warn('[product-reviews-bootstrap] InsForge env not present; skipping schema bootstrap.');
  process.exit(0);
}

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';
const sql = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '${DEFAULT_TENANT}'::uuid,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_email text,
  rating integer NOT NULL DEFAULT 5,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  verified_purchase boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  admin_reply text,
  analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  CONSTRAINT product_reviews_rating_check CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT product_reviews_status_check CHECK (status IN ('pending','published','archived'))
);

ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT '${DEFAULT_TENANT}'::uuid;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS product_id uuid;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS author_name text;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS author_email text;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS rating integer DEFAULT 5;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS verified_purchase boolean DEFAULT false;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS admin_reply text;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS analysis jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS ip_hash text;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS published_at timestamptz;

ALTER TABLE public.product_reviews DROP CONSTRAINT IF EXISTS product_reviews_rating_check;
ALTER TABLE public.product_reviews ADD CONSTRAINT product_reviews_rating_check CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE public.product_reviews DROP CONSTRAINT IF EXISTS product_reviews_status_check;
ALTER TABLE public.product_reviews ADD CONSTRAINT product_reviews_status_check CHECK (status IN ('pending','published','archived'));

CREATE INDEX IF NOT EXISTS product_reviews_product_status_idx ON public.product_reviews(tenant_id, product_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS product_reviews_status_created_idx ON public.product_reviews(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS product_reviews_featured_idx ON public.product_reviews(tenant_id, featured, published_at DESC) WHERE featured = true;
CREATE INDEX IF NOT EXISTS product_reviews_ip_created_idx ON public.product_reviews(ip_hash, created_at DESC) WHERE ip_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION public.touch_product_reviews_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS product_reviews_touch_updated_at ON public.product_reviews;
CREATE TRIGGER product_reviews_touch_updated_at BEFORE UPDATE ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION public.touch_product_reviews_updated_at();
`;

const endpoint = `${baseUrl.replace(/\/$/, '')}/api/database/advance/rawsql`;

try {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ query: sql }),
    signal: AbortSignal.timeout(45_000),
  });
  const body = await response.text();
  if (!response.ok) {
    console.error(`[product-reviews-bootstrap] HTTP ${response.status}: ${body.slice(0, 1800)}`);
    process.exit(1);
  }
  console.log('[product-reviews-bootstrap] product_reviews schema verified.');
} catch (error) {
  console.error('[product-reviews-bootstrap] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}
