export const runtime = 'nodejs';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

export function resolveInsforgeApiKey() {
  const key = process.env.INSFORGE_API_KEY || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
  if (!key) throw new Error('Falta INSFORGE_API_KEY o NEXT_PUBLIC_INSFORGE_ANON_KEY');
  return key;
}

export function sqlText(value: unknown) {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function sqlNum(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? String(Math.round(n)) : '0';
}

export function sqlDecimal(value: unknown, fallback = 2.5) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : fallback.toFixed(2);
}

export function sqlJson(value: unknown, fallback: unknown = {}) {
  const text = JSON.stringify(value ?? fallback);
  return `'${text.replace(/'/g, "''")}'::jsonb`;
}

export async function runRawSql(query: string) {
  const apiKey = resolveInsforgeApiKey();
  const url = `${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(30_000),
    cache: 'no-store',
  });
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

export function rows(result: { data: unknown }): Record<string, unknown>[] {
  const data = result.data as { data?: { rows?: Record<string, unknown>[] }, rows?: Record<string, unknown>[] } | null;
  return data?.data?.rows ?? data?.rows ?? [];
}

export async function ensureWebPagesTable() {
  const result = await runRawSql(`
    CREATE TABLE IF NOT EXISTS web_pages (
      id SERIAL PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      niche TEXT DEFAULT 'general',
      client_name TEXT DEFAULT '',
      client_phone TEXT DEFAULT '',
      status TEXT DEFAULT 'draft',
      project_json JSONB DEFAULT '{}'::jsonb,
      html TEXT DEFAULT '',
      css TEXT DEFAULT '',
      js TEXT DEFAULT '',
      seo_json JSONB DEFAULT '{}'::jsonb,
      assets_json JSONB DEFAULT '[]'::jsonb,
      visits BIGINT DEFAULT 0,
      last_viewed_at TIMESTAMPTZ,
      published_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE web_pages ADD COLUMN IF NOT EXISTS client_phone TEXT DEFAULT '';
    ALTER TABLE web_pages ADD COLUMN IF NOT EXISTS project_json JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE web_pages ADD COLUMN IF NOT EXISTS seo_json JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE web_pages ADD COLUMN IF NOT EXISTS assets_json JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE web_pages ADD COLUMN IF NOT EXISTS visits BIGINT DEFAULT 0;
    ALTER TABLE web_pages ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS idx_web_pages_token ON web_pages(token);
    CREATE INDEX IF NOT EXISTS idx_web_pages_slug ON web_pages(slug);
    CREATE INDEX IF NOT EXISTS idx_web_pages_status ON web_pages(status);
  `);
  if (!result.ok) throw new Error(JSON.stringify(result.data));
  return result;
}

export function publicPageUrl(slug: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.solucionesfabrick.com';
  return `${base.replace(/\/+$/, '')}/l/${slug}`;
}
