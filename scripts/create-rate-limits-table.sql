-- Rate-limiting table for public API endpoints.
-- Run this once against your InsForge / Postgres project
-- (SQL Editor in the InsForge dashboard).
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
