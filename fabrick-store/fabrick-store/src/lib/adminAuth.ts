import { timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

/**
 * Returns true if the current request carries a valid admin_session cookie.
 * Uses constant-time comparison to prevent timing-based token discovery.
 */
export async function isAdminSession(): Promise<boolean> {
  const adminAccessToken = process.env.ADMIN_ACCESS_TOKEN;
  if (!adminAccessToken) return false;

  const adminSession = (await cookies()).get('admin_session')?.value;
  if (!adminSession) return false;

  const expected = Buffer.from(adminAccessToken, 'utf8');
  const provided = Buffer.from(adminSession, 'utf8');

  if (expected.length !== provided.length) return false;

  return timingSafeEqual(expected, provided);
}
