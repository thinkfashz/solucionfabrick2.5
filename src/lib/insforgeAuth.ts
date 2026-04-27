import 'server-only';
import { INSFORGE_BASE_URL, INSFORGE_PUBLIC_ANON_KEY } from './insforge';

/**
 * Server-side helpers to validate an InsForge user session.
 *
 * The public client SDK keeps the access token in memory in the browser; for
 * authenticated endpoints we have the client forward it as
 * `Authorization: Bearer <accessToken>`. We then validate it by hitting
 * InsForge's `/api/auth/sessions/current` directly — clients can't forge a
 * token InsForge would accept, so the returned `user.id` is trusted.
 *
 * Never trust user identifiers received from the client query string or body.
 */

export interface InsforgeUser {
  id: string;
  email?: string;
}

/** Extract a Bearer token from a request's Authorization header. */
export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

/**
 * Validates an InsForge access token against the backend and returns the
 * associated user, or `null` if the token is invalid/expired/missing.
 *
 * Pulled out of the SDK because the SDK's `getCurrentUser()` uses an
 * in-memory tokenManager that we'd have to mutate per-request — a direct
 * REST call is simpler and keeps the validation contract obvious.
 */
export async function validateInsforgeToken(token: string | null): Promise<InsforgeUser | null> {
  if (!token) return null;
  try {
    const res = await fetch(`${INSFORGE_BASE_URL}/api/auth/sessions/current`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-api-key': INSFORGE_PUBLIC_ANON_KEY,
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as { user?: { id?: string; email?: string } } | null;
    const user = json?.user;
    if (!user || typeof user.id !== 'string' || !user.id) return null;
    return { id: user.id, email: typeof user.email === 'string' ? user.email : undefined };
  } catch {
    return null;
  }
}

/** Convenience: get the user from the request (Authorization: Bearer <token>). */
export async function getInsforgeUserFromRequest(request: Request): Promise<InsforgeUser | null> {
  return validateInsforgeToken(extractBearerToken(request));
}
