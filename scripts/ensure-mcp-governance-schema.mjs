/* Soluciones Fabrick MCP governance schema bootstrap. Idempotent and non-destructive. */
const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const apiKey = process.env.INSFORGE_API_KEY;
if (!baseUrl || !apiKey) {
  console.warn('[mcp-governance-bootstrap] InsForge env not present; skipping.');
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
  console.log(`[mcp-governance-bootstrap] ${label} OK`);
}

try {
  await runSql('phase 1 governance tables', `
CREATE TABLE IF NOT EXISTS public.mcp_governance_policies (
  tenant_id uuid NOT NULL DEFAULT '${DEFAULT_TENANT}'::uuid,
  key_id text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  request_limit_5m integer NOT NULL DEFAULT 240,
  write_limit_5m integer NOT NULL DEFAULT 40,
  approval_publish boolean NOT NULL DEFAULT true,
  approval_inventory boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, key_id)
);

CREATE TABLE IF NOT EXISTS public.mcp_rate_windows (
  tenant_id uuid NOT NULL DEFAULT '${DEFAULT_TENANT}'::uuid,
  key_id text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  write_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, key_id, window_start)
);

CREATE TABLE IF NOT EXISTS public.mcp_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '${DEFAULT_TENANT}'::uuid,
  key_id text NOT NULL,
  client_label text,
  tool_name text NOT NULL,
  action_hash text NOT NULL,
  summary text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  decided_at timestamptz,
  decided_by text,
  decision_note text,
  consumed_at timestamptz,
  CONSTRAINT mcp_approvals_status_check CHECK (status IN ('pending','approved','rejected','consumed','expired'))
);

CREATE TABLE IF NOT EXISTS public.mcp_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '${DEFAULT_TENANT}'::uuid,
  key_id text NOT NULL,
  client_label text,
  tool_name text NOT NULL,
  phase text NOT NULL,
  outcome text NOT NULL,
  request_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mcp_oauth_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '${DEFAULT_TENANT}'::uuid,
  issuer text NOT NULL,
  subject_hash text NOT NULL,
  subject_hint text,
  client_id text NOT NULL DEFAULT '',
  key_id text NOT NULL,
  label text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mcp_oauth_subject_hash_check CHECK (subject_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT mcp_oauth_identity_unique UNIQUE (issuer, subject_hash, client_id)
);
`);

  await runSql('phase 2 governance indexes', `
CREATE INDEX IF NOT EXISTS mcp_approvals_tenant_status_idx
  ON public.mcp_approvals(tenant_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS mcp_approvals_key_action_idx
  ON public.mcp_approvals(tenant_id, key_id, tool_name, action_hash, status, expires_at DESC);
CREATE INDEX IF NOT EXISTS mcp_audit_tenant_created_idx
  ON public.mcp_audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mcp_audit_tenant_key_idx
  ON public.mcp_audit_logs(tenant_id, key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mcp_audit_tenant_tool_idx
  ON public.mcp_audit_logs(tenant_id, tool_name, created_at DESC);
CREATE INDEX IF NOT EXISTS mcp_rate_windows_cleanup_idx
  ON public.mcp_rate_windows(window_start DESC);
CREATE INDEX IF NOT EXISTS mcp_oauth_bindings_tenant_idx
  ON public.mcp_oauth_bindings(tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS mcp_oauth_bindings_lookup_idx
  ON public.mcp_oauth_bindings(issuer, subject_hash, enabled);
CREATE INDEX IF NOT EXISTS mcp_oauth_bindings_key_idx
  ON public.mcp_oauth_bindings(tenant_id, key_id, enabled);
`);

  await runSql('phase 3 atomic rate limiter', `
DROP FUNCTION IF EXISTS public.mcp_claim_rate_limit(uuid,text,boolean,integer,integer,integer);
CREATE OR REPLACE FUNCTION public.mcp_claim_rate_limit(
  p_tenant_id uuid,
  p_key_id text,
  p_count_request boolean DEFAULT true,
  p_is_write boolean DEFAULT false,
  p_request_limit integer DEFAULT 240,
  p_write_limit integer DEFAULT 40,
  p_window_seconds integer DEFAULT 300
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_window timestamptz;
  v_request_count integer;
  v_write_count integer;
  v_request_limit integer := greatest(1, least(coalesce(p_request_limit, 240), 10000));
  v_write_limit integer := greatest(1, least(coalesce(p_write_limit, 40), 5000));
  v_window_seconds integer := greatest(60, least(coalesce(p_window_seconds, 300), 3600));
  v_allowed boolean;
BEGIN
  IF p_tenant_id IS NULL OR coalesce(trim(p_key_id), '') = '' THEN
    RAISE EXCEPTION 'MCP_RATE_IDENTITY_REQUIRED';
  END IF;

  v_window := to_timestamp(floor(extract(epoch from now()) / v_window_seconds) * v_window_seconds);

  INSERT INTO public.mcp_rate_windows(
    tenant_id, key_id, window_start, request_count, write_count, updated_at
  ) VALUES (
    p_tenant_id,
    left(trim(p_key_id), 120),
    v_window,
    CASE WHEN p_count_request THEN 1 ELSE 0 END,
    CASE WHEN p_is_write THEN 1 ELSE 0 END,
    now()
  )
  ON CONFLICT (tenant_id, key_id, window_start)
  DO UPDATE SET
    request_count = public.mcp_rate_windows.request_count + CASE WHEN p_count_request THEN 1 ELSE 0 END,
    write_count = public.mcp_rate_windows.write_count + CASE WHEN p_is_write THEN 1 ELSE 0 END,
    updated_at = now()
  RETURNING request_count, write_count INTO v_request_count, v_write_count;

  v_allowed :=
    (NOT p_count_request OR v_request_count <= v_request_limit)
    AND (NOT p_is_write OR v_write_count <= v_write_limit);

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'requestCount', v_request_count,
    'writeCount', v_write_count,
    'requestLimit', v_request_limit,
    'writeLimit', v_write_limit,
    'windowStart', v_window,
    'windowSeconds', v_window_seconds,
    'retryAfterSeconds', greatest(1, ceil(extract(epoch from (v_window + make_interval(secs => v_window_seconds) - now())))::integer)
  );
END;
$$;
`);

  await runSql('phase 4 cleanup old windows', `
DELETE FROM public.mcp_rate_windows WHERE window_start < now() - interval '2 days';
UPDATE public.mcp_approvals
SET status = 'expired'
WHERE status IN ('pending','approved') AND expires_at < now();
`);

  console.log('[mcp-governance-bootstrap] audit, approvals, OAuth bindings and rate limits aligned.');
} catch (error) {
  console.error('[mcp-governance-bootstrap] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}
