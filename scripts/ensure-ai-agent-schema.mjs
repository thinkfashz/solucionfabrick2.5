/* Soluciones Fabrick Ollama agent task schema. Idempotent and non-destructive. */
const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const apiKey = process.env.INSFORGE_API_KEY;
if (!baseUrl || !apiKey) {
  console.warn('[ai-agent-bootstrap] InsForge env not present; skipping.');
  process.exit(0);
}

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
  console.log(`[ai-agent-bootstrap] ${label} OK`);
}

try {
  await runSql('phase 1 agent tables', `
CREATE TABLE IF NOT EXISTS public.ai_agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  key_id text NOT NULL,
  label text NOT NULL,
  prompt text NOT NULL,
  provider text NOT NULL DEFAULT 'ollama',
  model text NOT NULL,
  schedule_kind text NOT NULL DEFAULT 'manual',
  weekday smallint,
  allow_writes boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'idle',
  last_run_at timestamptz,
  last_result jsonb,
  last_error text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_agent_tasks_schedule_check CHECK (schedule_kind IN ('manual','daily','weekly')),
  CONSTRAINT ai_agent_tasks_status_check CHECK (status IN ('idle','running','success','error','paused')),
  CONSTRAINT ai_agent_tasks_weekday_check CHECK (weekday IS NULL OR (weekday >= 0 AND weekday <= 6))
);

CREATE TABLE IF NOT EXISTS public.ai_agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  task_id uuid,
  key_id text NOT NULL,
  provider text NOT NULL DEFAULT 'ollama',
  model text NOT NULL,
  prompt text NOT NULL,
  response text,
  trace jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'success',
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  CONSTRAINT ai_agent_runs_status_check CHECK (status IN ('success','error'))
);
`);

  await runSql('phase 2 agent indexes', `
CREATE INDEX IF NOT EXISTS ai_agent_tasks_tenant_idx
  ON public.ai_agent_tasks(tenant_id, enabled, updated_at DESC);
CREATE INDEX IF NOT EXISTS ai_agent_tasks_schedule_idx
  ON public.ai_agent_tasks(schedule_kind, enabled, last_run_at);
CREATE INDEX IF NOT EXISTS ai_agent_runs_tenant_idx
  ON public.ai_agent_runs(tenant_id, started_at DESC);
CREATE INDEX IF NOT EXISTS ai_agent_runs_task_idx
  ON public.ai_agent_runs(task_id, started_at DESC);
`);

  console.log('[ai-agent-bootstrap] Ollama agent tasks and run history aligned.');
} catch (error) {
  console.error('[ai-agent-bootstrap] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}
