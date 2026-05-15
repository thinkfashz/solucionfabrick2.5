import { ADMIN_COOKIE_NAME, decodeSession, type AdminSessionPayload } from '@/lib/adminAuth';

export async function readAdminSessionFromRequest(request: Request): Promise<AdminSessionPayload | null> {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const raw = cookieHeader
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${ADMIN_COOKIE_NAME}=`))
    ?.slice(ADMIN_COOKIE_NAME.length + 1);

  if (!raw) return null;
  return decodeSession(decodeURIComponent(raw));
}
