/* Soluciones Fabrick governed AI agent schema. Idempotent and non-destructive. */
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
  await runSql('phase 1 agent tasks and runs', `
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

  await runSql('phase 2 persistent conversations', `
CREATE TABLE IF NOT EXISTS public.ai_agent_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  key_id text NOT NULL,
  title text NOT NULL DEFAULT 'Nueva conversación',
  provider text NOT NULL DEFAULT 'ollama',
  model text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  summary text,
  markdown_snapshot text NOT NULL DEFAULT '',
  created_by text,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_agent_conversations_status_check CHECK (status IN ('active','archived'))
);

CREATE TABLE IF NOT EXISTS public.ai_agent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  role text NOT NULL,
  provider text,
  model text,
  content text NOT NULL DEFAULT '',
  tool_name text,
  tool_call_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_agent_messages_role_check CHECK (role IN ('system','user','assistant','tool'))
);

CREATE TABLE IF NOT EXISTS public.ai_agent_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  conversation_id uuid,
  scope text NOT NULL DEFAULT 'tenant',
  kind text NOT NULL DEFAULT 'fact',
  memory_key text,
  content text NOT NULL,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  importance smallint NOT NULL DEFAULT 3,
  pinned boolean NOT NULL DEFAULT false,
  source_message_id uuid,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_agent_memory_scope_check CHECK (scope IN ('tenant','conversation','task')),
  CONSTRAINT ai_agent_memory_kind_check CHECK (kind IN ('fact','preference','decision','instruction','project','finding','summary')),
  CONSTRAINT ai_agent_memory_importance_check CHECK (importance >= 1 AND importance <= 5)
);

ALTER TABLE public.ai_agent_tasks ADD COLUMN IF NOT EXISTS conversation_id uuid;
ALTER TABLE public.ai_agent_tasks ADD COLUMN IF NOT EXISTS memory_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.ai_agent_runs ADD COLUMN IF NOT EXISTS conversation_id uuid;
`);

  await runSql('phase 3 agent indexes', `
CREATE INDEX IF NOT EXISTS ai_agent_tasks_tenant_idx
  ON public.ai_agent_tasks(tenant_id, enabled, updated_at DESC);
CREATE INDEX IF NOT EXISTS ai_agent_tasks_schedule_idx
  ON public.ai_agent_tasks(schedule_kind, enabled, last_run_at);
CREATE INDEX IF NOT EXISTS ai_agent_runs_tenant_idx
  ON public.ai_agent_runs(tenant_id, started_at DESC);
CREATE INDEX IF NOT EXISTS ai_agent_runs_task_idx
  ON public.ai_agent_runs(task_id, started_at DESC);
CREATE INDEX IF NOT EXISTS ai_agent_conversations_tenant_idx
  ON public.ai_agent_conversations(tenant_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS ai_agent_messages_conversation_idx
  ON public.ai_agent_messages(tenant_id, conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS ai_agent_memory_tenant_idx
  ON public.ai_agent_memory(tenant_id, pinned DESC, importance DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS ai_agent_memory_conversation_idx
  ON public.ai_agent_memory(tenant_id, conversation_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS ai_agent_memory_tags_idx
  ON public.ai_agent_memory USING gin(tags);
`);

  console.log('[ai-agent-bootstrap] tasks, runs, conversations, memory and Markdown history aligned.');
} catch (error) {
  console.error('[ai-agent-bootstrap] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}
