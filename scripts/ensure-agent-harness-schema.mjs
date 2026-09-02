/* Soluciones Fabrick AI Harness schema bootstrap. Idempotent and non-destructive. */
const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const apiKey = process.env.INSFORGE_API_KEY;
if (!baseUrl || !apiKey) {
  console.warn('[agent-harness-bootstrap] InsForge env not present; skipping.');
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
  console.log(`[agent-harness-bootstrap] ${label} OK`);
}

try {
  await runSql('phase 1 integration conflict target', `
DO $$
BEGIN
  IF to_regclass('public.integrations') IS NOT NULL THEN
    ALTER TABLE public.integrations
      ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT '${DEFAULT_TENANT}'::uuid;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'integrations_provider_tenant_unique'
        AND conrelid = 'public.integrations'::regclass
    ) THEN
      ALTER TABLE public.integrations
        ADD CONSTRAINT integrations_provider_tenant_unique UNIQUE (provider, tenant_id);
    END IF;

    CREATE INDEX IF NOT EXISTS integrations_tenant_idx ON public.integrations(tenant_id);
  END IF;
END $$;
`);

  await runSql('phase 2 agent profile and task tables', `
CREATE TABLE IF NOT EXISTS public.mcp_agent_profiles (
  tenant_id uuid PRIMARY KEY DEFAULT '${DEFAULT_TENANT}'::uuid,
  provider text NOT NULL DEFAULT 'ollama',
  enabled boolean NOT NULL DEFAULT true,
  scopes jsonb NOT NULL DEFAULT '["products:read","analytics:read"]'::jsonb,
  max_steps integer NOT NULL DEFAULT 6,
  allow_scheduled_writes boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mcp_agent_profiles_max_steps_check CHECK (max_steps BETWEEN 1 AND 12)
);

CREATE TABLE IF NOT EXISTS public.mcp_agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '${DEFAULT_TENANT}'::uuid,
  provider text NOT NULL DEFAULT 'ollama',
  model text,
  title text NOT NULL,
  prompt text NOT NULL,
  cadence text NOT NULL DEFAULT 'manual',
  enabled boolean NOT NULL DEFAULT false,
  allow_writes boolean NOT NULL DEFAULT false,
  next_run_at timestamptz,
  last_run_at timestamptz,
  last_status text,
  last_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mcp_agent_tasks_cadence_check CHECK (cadence IN ('manual','hourly','daily'))
);

CREATE INDEX IF NOT EXISTS mcp_agent_tasks_due_idx
  ON public.mcp_agent_tasks(enabled, next_run_at);
CREATE INDEX IF NOT EXISTS mcp_agent_tasks_tenant_idx
  ON public.mcp_agent_tasks(tenant_id, updated_at DESC);
`);

  console.log('[agent-harness-bootstrap] Ollama agent profiles, permissions and task queue aligned.');
} catch (error) {
  console.error('[agent-harness-bootstrap] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}
