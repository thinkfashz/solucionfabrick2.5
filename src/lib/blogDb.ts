/**
 * Esquema real que espera `/api/admin/blog`.
 *
 * El script `scripts/create-tables.sql` crea una versión mínima (sin description,
 * cover_url, body_md, body_html, tags, author, published_at, reading_minutes ni
 * tenant_id), por eso el editor falla aunque la tabla "exista". Este módulo crea
 * la tabla completa y repara las columnas faltantes en tablas ya creadas.
 */

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || process.env.INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

function resolveApiKey() {
  return process.env.INSFORGE_API_KEY || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_7e23032539c2dc64d5d27ca29d07b928';
}

async function runRawSql(query: string) {
  const url = `${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': resolveApiKey() },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(12_000),
    cache: 'no-store',
  });
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

export const BLOG_POSTS_DDL = `
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  cover_url text,
  body_md text DEFAULT '',
  body_html text DEFAULT '',
  tags text[] DEFAULT '{}',
  author text,
  published boolean DEFAULT false,
  published_at timestamptz,
  reading_minutes integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  tenant_id uuid
);
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS description text DEFAULT '';
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS body_md text DEFAULT '';
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS body_html text DEFAULT '';
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS author text;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS reading_minutes integer DEFAULT 1;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON public.blog_posts (slug);
CREATE INDEX IF NOT EXISTS blog_posts_tenant_published_idx ON public.blog_posts (tenant_id, published, updated_at DESC);
`;

/** Crea o repara `blog_posts` sin romper. Devuelve `skipped` si no hay credenciales. */
export async function ensureBlogPostsTable(): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!process.env.INSFORGE_API_KEY && !process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY && !process.env.INSFORGE_URL && !process.env.NEXT_PUBLIC_INSFORGE_URL) {
    return { ok: false, skipped: true };
  }
  try {
    const result = await runRawSql(BLOG_POSTS_DDL);
    if (!result.ok) return { ok: false, error: `HTTP ${result.status}` };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
