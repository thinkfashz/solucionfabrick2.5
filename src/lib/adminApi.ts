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

export function adminError(err: unknown, code = 'INTERNAL_ERROR', status = 500): NextResponse {
  const message = err instanceof Error ? err.message : 'Error inesperado.';
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
