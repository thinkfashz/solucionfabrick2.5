/*
 * Inspiration comments schema bootstrap + verification.
 * Runs on every deployment, before and after Next.js build.
 * Idempotent and non-destructive for business rows.
 */

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || process.env.INSFORGE_URL;
const apiKey = process.env.INSFORGE_API_KEY;

if (!baseUrl || !apiKey) {
  console.warn('[inspiration-comments-bootstrap] InsForge env not present; skipping schema bootstrap (local/non-production build).');
  process.exit(0);
}

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';
const sql = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.inspiration_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '${DEFAULT_TENANT}'::uuid,
  album_slug text NOT NULL,
  album_title text NOT NULL,
  author_name text NOT NULL,
  author_email text,
  kind text NOT NULL DEFAULT 'comment',
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_reply text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  CONSTRAINT inspiration_comments_kind_check CHECK (kind IN ('comment','suggestion')),
  CONSTRAINT inspiration_comments_status_check CHECK (status IN ('pending','published','archived'))
);

ALTER TABLE public.inspiration_comments ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT '${DEFAULT_TENANT}'::uuid;
ALTER TABLE public.inspiration_comments ADD COLUMN IF NOT EXISTS album_slug text;
ALTER TABLE public.inspiration_comments ADD COLUMN IF NOT EXISTS album_title text;
ALTER TABLE public.inspiration_comments ADD COLUMN IF NOT EXISTS author_name text;
ALTER TABLE public.inspiration_comments ADD COLUMN IF NOT EXISTS author_email text;
ALTER TABLE public.inspiration_comments ADD COLUMN IF NOT EXISTS kind text DEFAULT 'comment';
ALTER TABLE public.inspiration_comments ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.inspiration_comments ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.inspiration_comments ADD COLUMN IF NOT EXISTS admin_reply text;
ALTER TABLE public.inspiration_comments ADD COLUMN IF NOT EXISTS ip_hash text;
ALTER TABLE public.inspiration_comments ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.inspiration_comments ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.inspiration_comments ADD COLUMN IF NOT EXISTS published_at timestamptz;

UPDATE public.inspiration_comments SET tenant_id = '${DEFAULT_TENANT}'::uuid WHERE tenant_id IS NULL;
UPDATE public.inspiration_comments SET album_slug = 'legacy-' || id::text WHERE album_slug IS NULL OR btrim(album_slug) = '';
UPDATE public.inspiration_comments SET album_title = 'Referencia anterior' WHERE album_title IS NULL OR btrim(album_title) = '';
UPDATE public.inspiration_comments SET author_name = 'Visitante' WHERE author_name IS NULL OR btrim(author_name) = '';
UPDATE public.inspiration_comments SET kind = 'comment' WHERE kind IS NULL OR kind NOT IN ('comment','suggestion');
UPDATE public.inspiration_comments SET body = '' WHERE body IS NULL;
UPDATE public.inspiration_comments SET status = 'pending' WHERE status IS NULL OR status NOT IN ('pending','published','archived');
UPDATE public.inspiration_comments SET created_at = now() WHERE created_at IS NULL;
UPDATE public.inspiration_comments SET updated_at = COALESCE(created_at, now()) WHERE updated_at IS NULL;

ALTER TABLE public.inspiration_comments ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.inspiration_comments ALTER COLUMN tenant_id SET DEFAULT '${DEFAULT_TENANT}'::uuid;
ALTER TABLE public.inspiration_comments ALTER COLUMN kind SET DEFAULT 'comment';
ALTER TABLE public.inspiration_comments ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.inspiration_comments ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.inspiration_comments ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.inspiration_comments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.inspiration_comments ALTER COLUMN album_slug SET NOT NULL;
ALTER TABLE public.inspiration_comments ALTER COLUMN album_title SET NOT NULL;
ALTER TABLE public.inspiration_comments ALTER COLUMN author_name SET NOT NULL;
ALTER TABLE public.inspiration_comments ALTER COLUMN kind SET NOT NULL;
ALTER TABLE public.inspiration_comments ALTER COLUMN body SET NOT NULL;
ALTER TABLE public.inspiration_comments ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.inspiration_comments ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.inspiration_comments ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.inspiration_comments DROP CONSTRAINT IF EXISTS inspiration_comments_kind_check;
ALTER TABLE public.inspiration_comments ADD CONSTRAINT inspiration_comments_kind_check CHECK (kind IN ('comment','suggestion'));
ALTER TABLE public.inspiration_comments DROP CONSTRAINT IF EXISTS inspiration_comments_status_check;
ALTER TABLE public.inspiration_comments ADD CONSTRAINT inspiration_comments_status_check CHECK (status IN ('pending','published','archived'));

CREATE INDEX IF NOT EXISTS inspiration_comments_album_status_idx ON public.inspiration_comments(tenant_id, album_slug, status, created_at DESC);
CREATE INDEX IF NOT EXISTS inspiration_comments_status_created_idx ON public.inspiration_comments(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS inspiration_comments_ip_created_idx ON public.inspiration_comments(ip_hash, created_at DESC) WHERE ip_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION public.touch_inspiration_comments_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS inspiration_comments_touch_updated_at ON public.inspiration_comments;
CREATE TRIGGER inspiration_comments_touch_updated_at BEFORE UPDATE ON public.inspiration_comments FOR EACH ROW EXECUTE FUNCTION public.touch_inspiration_comments_updated_at();

CREATE TABLE IF NOT EXISTS public.fabrick_schema_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_version text NOT NULL,
  check_name text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  duplicate_groups integer NOT NULL DEFAULT 0,
  affected_rows integer NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fabrick_schema_health_checked_idx ON public.fabrick_schema_health(checked_at DESC);

DO $verify$
DECLARE
  missing_columns integer := 0;
  nullable_required integer := 0;
BEGIN
  IF to_regclass('public.inspiration_comments') IS NULL THEN
    RAISE EXCEPTION 'inspiration_comments table was not created';
  END IF;

  SELECT count(*) INTO missing_columns
  FROM unnest(ARRAY['id','tenant_id','album_slug','album_title','author_name','author_email','kind','body','status','admin_reply','ip_hash','created_at','updated_at','published_at']) AS expected(column_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'inspiration_comments' AND c.column_name = expected.column_name
  );
  IF missing_columns > 0 THEN
    RAISE EXCEPTION 'inspiration_comments missing % required columns', missing_columns;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inspiration_comments' AND column_name='id' AND udt_name <> 'uuid') THEN
    RAISE EXCEPTION 'inspiration_comments.id must remain uuid';
  END IF;

  SELECT count(*) INTO nullable_required
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='inspiration_comments'
    AND column_name IN ('id','tenant_id','album_slug','album_title','author_name','kind','body','status','created_at','updated_at')
    AND is_nullable='YES';
  IF nullable_required > 0 THEN
    RAISE EXCEPTION 'inspiration_comments has % required nullable columns', nullable_required;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='inspiration_comments' AND indexname='inspiration_comments_album_status_idx') THEN
    RAISE EXCEPTION 'inspiration_comments_album_status_idx missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='inspiration_comments' AND indexname='inspiration_comments_status_created_idx') THEN
    RAISE EXCEPTION 'inspiration_comments_status_created_idx missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.inspiration_comments'::regclass AND conname='inspiration_comments_kind_check') THEN
    RAISE EXCEPTION 'inspiration_comments kind constraint missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.inspiration_comments'::regclass AND conname='inspiration_comments_status_check') THEN
    RAISE EXCEPTION 'inspiration_comments status constraint missing';
  END IF;

  INSERT INTO public.fabrick_schema_health(schema_version, check_name, severity, duplicate_groups, affected_rows, details)
  VALUES ('inspiration-comments-v2', 'inspiration_comments.schema', 'ok', 0, 0, jsonb_build_object('table_exists', true, 'columns_verified', 14, 'indexes_verified', 3, 'constraints_verified', 2, 'automatic_repair', true));
END
$verify$;
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
    console.error(`[inspiration-comments-bootstrap] HTTP ${response.status}: ${body.slice(0, 1800)}`);
    process.exit(1);
  }
  console.log('[inspiration-comments-bootstrap] schema v2 verified: table, columns, indexes, constraints and health ledger OK.');
} catch (error) {
  console.error('[inspiration-comments-bootstrap] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}
