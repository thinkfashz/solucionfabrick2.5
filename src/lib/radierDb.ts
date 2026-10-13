/**
 * Persistencia de la página de radier.
 *
 * Sigue el mismo patrón que `/api/leads` y `/api/inspiraciones/comments`:
 * el DDL es idempotente (`IF NOT EXISTS`) y se ejecuta tanto al arrancar el
 * servidor (`instrumentation.ts`) como al recibir la primera escritura, para
 * que la tabla exista en producción aunque nadie la haya creado a mano.
 */

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';
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

export const RADIER_COMMENTS_DDL = `
CREATE TABLE IF NOT EXISTS public.radier_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '${DEFAULT_TENANT}',
  page_slug text NOT NULL DEFAULT 'radier',
  author_name text NOT NULL,
  author_email text,
  kind text NOT NULL DEFAULT 'comment',
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_reply text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
CREATE INDEX IF NOT EXISTS radier_comments_tenant_status_idx ON public.radier_comments (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS radier_comments_ip_idx ON public.radier_comments (tenant_id, ip_hash, created_at DESC);
`;

/** Asegura la tabla sin romper. Devuelve `skipped` si no hay credenciales (dev sin DB). */
export async function ensureRadierCommentsTable(): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!process.env.INSFORGE_API_KEY && !process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY && !process.env.INSFORGE_URL && !process.env.NEXT_PUBLIC_INSFORGE_URL) {
    return { ok: false, skipped: true };
  }
  try {
    const result = await runRawSql(RADIER_COMMENTS_DDL);
    if (!result.ok) return { ok: false, error: `HTTP ${result.status}` };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export { DEFAULT_TENANT };
