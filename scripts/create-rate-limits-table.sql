-- Rate-limiting table for public API endpoints.
-- Run this once against your InsForge / Postgres project.
--
-- The key column stores "{prefix}:{ip}", e.g. "leads:203.0.113.1".
-- Rows are overwritten lazily when a new window starts; no periodic
-- cleanup cron is required at the expected volume of public forms.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key        text        PRIMARY KEY,
  count      integer     NOT NULL DEFAULT 1,
  reset_at   timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Speeds up a future sweep that deletes expired rows (optional maintenance).
CREATE INDEX IF NOT EXISTS rate_limits_reset_at_idx ON public.rate_limits (reset_at);

-- Row-level security: only the service-role key (server) may write.
-- The anon key used by the public client cannot touch this table.
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow the server-side service role full access.
CREATE POLICY "service role full access"
  ON public.rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
