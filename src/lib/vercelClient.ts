import 'server-only';
import { createClient } from '@insforge/sdk';

/**
 * Vercel API client (server-only).
 *
 * Resolves the Vercel API token + project + (optional) team from environment
 * variables first, falling back to the `integrations` table (`provider =
 * 'vercel'`) so credentials can be rotated from /admin/configuracion without
 * a redeploy.
 *
 * Lookup order (each field independently):
 *   1. Env vars: `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`.
 *   2. `integrations.credentials` JSONB columns:
 *        - `api_token`    (the personal/team REST token)
 *        - `project_id`   (the prj_xxx identifier)
 *        - `team_id`      (optional, only for team-scoped projects)
 *
 * All HTTP calls go through `vercelFetch`, which adds the bearer token,
 * appends `?teamId=…` when present, surfaces upstream `error.message` and
 * normalises errors into the same shape used by the InsForge SDK
 * (`{ message, code, statusCode, hint }`).
 */

export interface VercelCredentials {
  apiToken?: string;
  projectId?: string;
  teamId?: string;
  sources: Record<'apiToken' | 'projectId' | 'teamId', 'env' | 'db' | undefined>;
}

export interface VercelApiError {
  message: string;
  code?: string;
  statusCode?: number;
  hint?: string;
}

function normalize(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export async function getVercelCredentials(): Promise<VercelCredentials> {
  const envToken = normalize(process.env.VERCEL_API_TOKEN);
  const envProject = normalize(process.env.VERCEL_PROJECT_ID);
  const envTeam = normalize(process.env.VERCEL_TEAM_ID);

  const creds: VercelCredentials = {
    apiToken: envToken,
    projectId: envProject,
    teamId: envTeam,
    sources: {
      apiToken: envToken ? 'env' : undefined,
      projectId: envProject ? 'env' : undefined,
      teamId: envTeam ? 'env' : undefined,
    },
  };

  if (creds.apiToken && creds.projectId) {
    return creds;
  }

  const baseUrl = normalize(process.env.NEXT_PUBLIC_INSFORGE_URL);
  const anonKey =
    normalize(process.env.INSFORGE_API_KEY) ?? normalize(process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY);
  if (!baseUrl || !anonKey) return creds;

  try {
    const client = createClient({ baseUrl, anonKey });
    const { data, error } = await client.database
      .from('integrations')
      .select('credentials')
      .eq('provider', 'vercel')
      .limit(1);
    if (error || !Array.isArray(data) || data.length === 0) return creds;

    const row = data[0] as { credentials?: Record<string, unknown> };
    const dbCreds = row.credentials ?? {};
    const dbToken = normalize(dbCreds.api_token);
    const dbProject = normalize(dbCreds.project_id);
    const dbTeam = normalize(dbCreds.team_id);

    if (!creds.apiToken && dbToken) {
      creds.apiToken = dbToken;
      creds.sources.apiToken = 'db';
    }
    if (!creds.projectId && dbProject) {
      creds.projectId = dbProject;
      creds.sources.projectId = 'db';
    }
    if (!creds.teamId && dbTeam) {
      creds.teamId = dbTeam;
      creds.sources.teamId = 'db';
    }
  } catch {
    /* swallow — return env-sourced values */
  }

  return creds;
}

/**
 * Performs an authenticated GET against the Vercel REST API. Returns either
 * `{ ok: true, data }` or `{ ok: false, error }`. The error is shaped to be
 * forwarded through the InsForge-style error envelope used by the admin UI.
 */
export async function vercelFetch<T = unknown>(
  path: string,
  options: { token: string; teamId?: string; query?: Record<string, string | number | undefined> } = {
    token: '',
  },
): Promise<{ ok: true; data: T } | { ok: false; error: VercelApiError }> {
  const url = new URL(path.startsWith('http') ? path : `https://api.vercel.com${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v === undefined || v === null || v === '') continue;
      url.searchParams.set(k, String(v));
    }
  }
  if (options.teamId) {
    url.searchParams.set('teamId', options.teamId);
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${options.token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
      // Vercel sometimes hangs for >10s on /events; cap at 25s so the route
      // returns before Next/Vercel's own 30s function timeout fires.
      signal: AbortSignal.timeout(25_000),
    });
  } catch (err) {
    return {
      ok: false,
      error: {
        message: err instanceof Error ? err.message : 'Error de red al contactar Vercel.',
        code: 'VERCEL_NETWORK_ERROR',
      },
    };
  }

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }
  }

  if (!res.ok) {
    const upstream =
      parsed && typeof parsed === 'object' && 'error' in (parsed as Record<string, unknown>)
        ? ((parsed as Record<string, unknown>).error as { message?: string; code?: string } | undefined)
        : undefined;
    const message = upstream?.message ?? `HTTP ${res.status} desde Vercel.`;
    const hint =
      res.status === 401
        ? 'Token inválido o expirado. Genera uno nuevo en vercel.com → Account Settings → Tokens.'
        : res.status === 403
          ? 'El token no tiene acceso a este proyecto/equipo. Verifica el scope o agrega `team_id`.'
          : res.status === 404
            ? 'Recurso no encontrado. Revisa que `project_id` (prj_xxx) corresponda a un proyecto existente.'
            : undefined;
    return {
      ok: false,
      error: {
        message,
        code: upstream?.code ?? `VERCEL_HTTP_${res.status}`,
        statusCode: res.status,
        hint,
      },
    };
  }

  return { ok: true, data: parsed as T };
}

/**
 * Vercel's `GET /v3/deployments/{id}/events` returns a heterogeneous array of
 * build/runtime events. We collapse them into a stable shape so the admin UI
 * doesn't have to know about every event variant.
 *
 * Source = `build` for build-step events, `runtime` for serverless function
 * logs, `edge` for edge-middleware logs, and `static` for static-asset events.
 *
 * Extended (Plan §1) with the diagnostic fields the admin wanted exposed in
 * full: `requestId`, `host`, `region`, `statusCode`, `durationMs`, `function`
 * (lambda/edge name), `runtime`, `userAgent`, `referer`, and the original
 * `rawJson` for a "ver JSON crudo" expandable row.
 */
export interface VercelLogEntry {
  id: string;
  /** Unix-ms timestamp. */
  ts: number;
  level: 'info' | 'warning' | 'error';
  source: 'build' | 'runtime' | 'edge' | 'static' | 'system';
  message: string;
  /** Path/route that produced the log when known (e.g. `/api/admin/integrations`). */
  path?: string;
  deploymentId: string;
  /** HTTP method when known (`GET`, `POST`, …). */
  method?: string;
  /** Vercel request id used to correlate with `admin_error_logs`. */
  requestId?: string;
  /** Hostname that served the request (e.g. `app.fabrick.cl`). */
  host?: string;
  /** Vercel region code (`iad1`, `sfo1`, `gru1`, …). */
  region?: string;
  /** HTTP status code returned to the client. */
  statusCode?: number;
  /** Total duration in milliseconds when reported. */
  durationMs?: number;
  /** Lambda / edge function name (e.g. `pages-api-orders`). */
  function?: string;
  /** Runtime label (`nodejs20.x`, `edge`). */
  runtime?: string;
  /** User-Agent of the client that triggered the log. */
  userAgent?: string;
  /** Referer of the client that triggered the log. */
  referer?: string;
  /** Original raw event payload, JSON-stringified for the "raw" toggle. */
  rawJson: string;
}

interface RawVercelEvent {
  id?: string;
  type?: string;
  created?: number;
  date?: number;
  payload?: {
    text?: string;
    deploymentId?: string;
    info?: { type?: string; name?: string; entrypoint?: string; runtime?: string };
    proxy?: {
      path?: string;
      method?: string;
      statusCode?: number;
      host?: string;
      region?: string;
      userAgent?: string;
      referer?: string;
      duration?: number;
    };
    requestId?: string;
    statusCode?: number;
    level?: string;
    region?: string;
    host?: string;
    duration?: number;
    durationMs?: number;
    runtime?: string;
  };
  text?: string;
  level?: string;
  serverless?: boolean;
  region?: string;
}

/**
 * Maps Vercel's raw event payload into a stable `VercelLogEntry`.
 *
 * Heuristics for `level`:
 *   - explicit `payload.level` / `event.level` if present (`error`/`warning`/`info`).
 *   - text starting with `Error`, `[error]`, or containing `failed`, `panic`,
 *     `unhandled` → `error`.
 *   - HTTP status >= 500 → `error`, 400-499 → `warning`.
 */
export function mapVercelEvent(event: RawVercelEvent, fallbackDeploymentId: string): VercelLogEntry | null {
  const ts = typeof event.created === 'number' ? event.created : typeof event.date === 'number' ? event.date : Date.now();
  const text = event.payload?.text ?? event.text ?? '';
  if (!text || text.trim().length === 0) {
    // Skip empty heartbeat events.
    if (!event.type || event.type === 'state') return null;
  }

  const explicitLevel = (event.payload?.level ?? event.level ?? '').toLowerCase();
  let level: VercelLogEntry['level'] = 'info';
  if (explicitLevel === 'error' || explicitLevel === 'fatal') level = 'error';
  else if (explicitLevel === 'warn' || explicitLevel === 'warning') level = 'warning';
  else {
    const lower = text.toLowerCase();
    const status = event.payload?.statusCode ?? event.payload?.proxy?.statusCode;
    if (typeof status === 'number') {
      if (status >= 500) level = 'error';
      else if (status >= 400) level = 'warning';
    }
    if (level === 'info') {
      if (
        lower.startsWith('error') ||
        lower.startsWith('[error]') ||
        lower.includes(' panic') ||
        lower.includes('unhandledrejection') ||
        lower.includes('uncaughtexception') ||
        lower.includes('module not found') ||
        lower.includes('build failed')
      ) {
        level = 'error';
      } else if (lower.startsWith('warn') || lower.startsWith('[warn')) {
        level = 'warning';
      }
    }
  }

  const type = (event.type ?? '').toLowerCase();
  let source: VercelLogEntry['source'] = 'system';
  if (type.includes('build') || type === 'stdout' || type === 'stderr') source = 'build';
  else if (event.payload?.proxy || event.payload?.requestId || type.includes('lambda') || type.includes('fn')) {
    source = 'runtime';
  } else if (type.includes('edge') || type.includes('middleware')) source = 'edge';
  else if (type.includes('static')) source = 'static';

  return {
    id: event.id ?? `${ts}-${Math.random().toString(36).slice(2, 8)}`,
    ts,
    level,
    source,
    message: text.length > 0 ? text : `(${event.type ?? 'evento sin texto'})`,
    path: event.payload?.proxy?.path,
    deploymentId: event.payload?.deploymentId ?? fallbackDeploymentId,
    method: event.payload?.proxy?.method,
    requestId: event.payload?.requestId,
    host: event.payload?.proxy?.host ?? event.payload?.host,
    region: event.payload?.proxy?.region ?? event.payload?.region ?? event.region,
    statusCode: event.payload?.proxy?.statusCode ?? event.payload?.statusCode,
    durationMs:
      event.payload?.proxy?.duration ??
      event.payload?.durationMs ??
      event.payload?.duration,
    function: event.payload?.info?.name ?? event.payload?.info?.entrypoint,
    runtime: event.payload?.info?.runtime ?? event.payload?.runtime,
    userAgent: event.payload?.proxy?.userAgent,
    referer: event.payload?.proxy?.referer,
    rawJson: safeStringify(event),
  };
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Filters mapped log entries by level. `'all'` returns everything; `'warning'`
 * returns warnings + errors; `'error'` returns only errors.
 */
export function filterLogsByLevel(
  logs: VercelLogEntry[],
  level: 'all' | 'warning' | 'error',
): VercelLogEntry[] {
  if (level === 'all') return logs;
  if (level === 'warning') return logs.filter((l) => l.level === 'warning' || l.level === 'error');
  return logs.filter((l) => l.level === 'error');
}
