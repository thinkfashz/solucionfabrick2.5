import 'server-only';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

function apiKey() {
  return process.env.INSFORGE_API_KEY || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_7e23032539c2dc64d5d27ca29d07b928';
}

export async function runProspectingRawSql(query: string) {
  const res = await fetch(`${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey() },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(30_000),
    cache: 'no-store',
  });
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

export async function ensureProspectsTable() {
  return runProspectingRawSql(`
CREATE TABLE IF NOT EXISTS prospects (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  client_name TEXT,
  industry TEXT,
  city TEXT,
  region TEXT,
  country TEXT DEFAULT 'Chile',
  instagram TEXT,
  facebook TEXT,
  website TEXT,
  whatsapp TEXT,
  email TEXT,
  followers TEXT,
  rating TEXT,
  source TEXT DEFAULT 'manual',
  problem_detected TEXT,
  opportunity TEXT,
  probability_level TEXT DEFAULT 'media',
  score INTEGER DEFAULT 50,
  status TEXT DEFAULT 'nuevo',
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prospects_updated_at ON prospects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_probability ON prospects(probability_level);
CREATE INDEX IF NOT EXISTS idx_prospects_city ON prospects(city);
CREATE INDEX IF NOT EXISTS idx_prospects_industry ON prospects(industry);
CREATE INDEX IF NOT EXISTS idx_prospects_brand ON prospects(brand);
`);
}
