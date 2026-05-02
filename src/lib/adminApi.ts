import 'server-only';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@insforge/sdk';
import { ADMIN_COOKIE_NAME, decodeSession, type AdminSessionPayload } from './adminAuth';

/**
 * Returns the decoded admin session if the request carries a valid cookie,
 * otherwise null. Designed for `/api/admin/*` route handlers — caller should
 * short-circuit with `return adminUnauthorized()` when null.
 */
export async function getAdminSession(request: NextRequest): Promise<AdminSessionPayload | null> {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!cookie?.value) return null;
  return decodeSession(cookie.value);
}

export function adminUnauthorized(): NextResponse {
  return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
}

/**
 * Persist an error log to `admin_error_logs` (best-effort; never throws).
 * Lazy-imported to avoid a circular import (apiHandler.ts also imports from here).
 */
async function logAdminError(params: {
  endpoint?: string;
  method?: string;
  message: string;
  code: string;
  status: number;
}): Promise<void> {
  try {
    const client = getAdminInsforge();
    await client.database.from('admin_error_logs').insert([
      {
        endpoint: params.endpoint ?? null,
        method: params.method ?? null,
        payload: { code: params.code },
        error_message: params.message,
        status_code: params.status,
      },
    ]);
  } catch (err) {
    // Best-effort: the table may not exist yet, or the DB may be down.
    console.error('[adminError] failed to persist log', err);
  }
}

export function adminError(
  err: unknown,
  code = 'INTERNAL_ERROR',
  status = 500,
  request?: NextRequest,
): NextResponse {
  const message = err instanceof Error ? err.message : 'Error inesperado.';
  // Only log server-side failures (5xx). Client-error 4xx are not "real" errors.
  if (status >= 500) {
    let endpoint: string | undefined;
    let method: string | undefined;
    if (request) {
      try {
        const u = new URL(request.url);
        endpoint = u.pathname + u.search;
        method = request.method;
      } catch {
        /* ignore */
      }
    }
    // Fire-and-forget; don't await so the response isn't delayed.
    void logAdminError({ endpoint, method, message, code, status });
  }
  return NextResponse.json({ error: message, code }, { status });
}

/**
 * Returns an InsForge client for server-side admin routes. Falls back to the
 * public anon key if INSFORGE_API_KEY is not set, mirroring the pattern used
 * by `src/lib/insforge.ts` so admin endpoints work in environments where only
 * the anon key is configured.
 */
export function getAdminInsforge() {
  const baseUrl =
    process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';
  const anonKey =
    process.env.INSFORGE_API_KEY ||
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ||
    'ik_7e23032539c2dc64d5d27ca29d07b928';
  return createClient({ baseUrl, anonKey });
}
