/*
 * Inspiration comments bootstrap.
 * Idempotent and non-destructive: comments are never deleted automatically.
 */

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || process.env.INSFORGE_URL;
const apiKey = process.env.INSFORGE_API_KEY;

if (!baseUrl || !apiKey) {
  console.warn('[inspiration-comments-bootstrap] InsForge env not present; skipping schema bootstrap.');
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
  kind text NOT NULL DEFAULT 'comment' CHECK (kind IN ('comment','suggestion')),
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','archived')),
  admin_reply text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE INDEX IF NOT EXISTS inspiration_comments_album_status_idx
  ON public.inspiration_comments(tenant_id, album_slug, status, created_at DESC);
CREATE INDEX IF NOT EXISTS inspiration_comments_status_created_idx
  ON public.inspiration_comments(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS inspiration_comments_ip_created_idx
  ON public.inspiration_comments(ip_hash, created_at DESC)
  WHERE ip_hash IS NOT NULL;
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
    console.error(`[inspiration-comments-bootstrap] HTTP ${response.status}: ${body.slice(0, 1500)}`);
    process.exit(1);
  }
  console.log('[inspiration-comments-bootstrap] inspiration_comments schema aligned.');
} catch (error) {
  console.error('[inspiration-comments-bootstrap] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}
