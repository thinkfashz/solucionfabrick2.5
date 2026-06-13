import 'server-only';
import { runProspectingRawSql } from './prospect-table.server';

export async function ensureAiIntegrationsTable() {
  return runProspectingRawSql(`
CREATE TABLE IF NOT EXISTS integrations (
  provider TEXT PRIMARY KEY,
  credentials JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_integrations_updated_at ON integrations(updated_at DESC);
`);
}
