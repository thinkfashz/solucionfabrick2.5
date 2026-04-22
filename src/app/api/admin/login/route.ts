import { NextResponse } from 'next/server';
import { insforge, getMissingAdminEnvVars } from '@/lib/insforge';

const BOOTSTRAP_ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL || 'f.eduardomicolta@gmail.com'
)
  .trim()
  .toLowerCase();

/**
 * Builds the JSON body for a 500 response when the deployment is missing
 * required env vars. Centralised so the pre-check and the catch-all error
 * handler always emit the same shape/text.
 */
function misconfiguredResponse(missing: string[]) {
  const error =
    missing.length > 0
      ? `Error de configuración del servidor. Faltan variables de entorno: ${missing.join(', ')}. ` +
        'Configúralas en el panel de tu hosting (por ejemplo Vercel → Settings → Environment Variables, marcadas para Production) y vuelve a desplegar.'
      : 'Error de configuración del servidor. Contacta al administrador.';
  return NextResponse.json(
    { error, code: 'SERVER_MISCONFIGURED', missing },
    { status: 500 }
  );
}
import {
  isRateLimited,
  recordFailedAttempt,
  clearFailedAttempts,
  blockedSecondsRemaining,
  encodeSession,
  getClientIp,
  ADMIN_COOKIE_NAME,
  SESSION_TTL_MS,
} from '@/lib/adminAuth';

export async function POST(request: Request) {
  const ip = getClientIp(request);

  try {
    // Fail fast with a self-diagnostic message if the deployment is missing
    // required env vars. This surfaces the exact variable names in the login
    // form so the operator can fix Vercel/Next config without reading logs.
    // Only variable *names* are exposed — never values.
    const missing = getMissingAdminEnvVars();
    if (missing.length > 0) {
      return misconfiguredResponse(missing);
    }

    if (isRateLimited(ip)) {
      const remaining = blockedSecondsRemaining(ip);
      return NextResponse.json(
        { error: `Demasiados intentos fallidos. Intenta nuevamente en ${remaining} segundos.` },
        { status: 429 }
      );
    }

    let email: string;
    let password: string;
    try {
      const body = await request.json();
      email = (body.email ?? '').trim().toLowerCase();
      password = body.password ?? '';
    } catch {
      return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos.' }, { status: 400 });
    }

    const { data: authData, error: authError } = await insforge.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData) {
      recordFailedAttempt(ip);
      return NextResponse.json(
        { error: 'Credenciales incorrectas.' },
        { status: 401 }
      );
    }

    const { data: adminRows, error: dbError } = await insforge.database
      .from('admin_users')
      .select('email, rol, aprobado')
      .eq('email', email)
      .limit(1);

    if (dbError || !adminRows || adminRows.length === 0) {
      recordFailedAttempt(ip);
      return NextResponse.json(
        { error: 'Acceso denegado. Este usuario no tiene permisos de administrador.' },
        { status: 403 }
      );
    }

    const adminUser = adminRows[0] as { email: string; rol?: string; aprobado?: boolean };

    // The bootstrap admin (ADMIN_EMAIL) is the owner of the installation and
    // must never be blocked by the "pending approval" gate — there is nobody
    // above them who could approve. If the team/invitations feature added an
    // `aprobado` column that defaulted to false on their row, we treat them
    // as approved here and best-effort heal the row so subsequent reads
    // agree.
    const isBootstrapAdmin = email === BOOTSTRAP_ADMIN_EMAIL;

    if (adminUser.aprobado === false && !isBootstrapAdmin) {
      recordFailedAttempt(ip);
      return NextResponse.json(
        { error: 'Tu cuenta está pendiente de aprobación.' },
        { status: 403 }
      );
    }

    if (isBootstrapAdmin && adminUser.aprobado === false) {
      // Fire-and-forget: never block login on this maintenance update, but
      // do log any DB error so the operator can diagnose persistent issues.
      void insforge.database
        .from('admin_users')
        .update({ aprobado: true, rol: adminUser.rol ?? 'superadmin' })
        .eq('email', email)
        .then((result: { error?: { message?: string } | null }) => {
          if (result?.error) {
            console.error(
              '[admin/login] failed to self-approve bootstrap admin:',
              result.error.message ?? result.error
            );
          }
        });
    }

    clearFailedAttempts(ip);

    const rol = (adminUser.rol ?? 'admin') as 'superadmin' | 'admin' | 'viewer';
    const exp = Date.now() + SESSION_TTL_MS;
    const sessionValue = await encodeSession({ email, exp, rol });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE_NAME, sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_MS / 1000,
    });

    return response;
  } catch (err) {
    // Anything that escapes (missing env vars → requireEnv throws, InsForge
    // transport error, ADMIN_SESSION_SECRET missing in production, etc.) is
    // converted to a proper JSON 500 so the client can render the real cause
    // instead of choking on Next.js's default HTML error page (which is what
    // produces the misleading "Error de red" banner on the login form).
    const message = err instanceof Error ? err.message : String(err);
    console.error('[admin/login] unhandled error:', message, err);
    const isMissingConfig = /Missing required InsForge configuration|ADMIN_SESSION_SECRET/i.test(
      message
    );
    if (isMissingConfig) {
      // Belt-and-braces: the top-of-handler pre-check should already have
      // caught this, but if some other env var (e.g. one read lazily deeper
      // in the stack) is missing, still surface the names we know about.
      return misconfiguredResponse(getMissingAdminEnvVars());
    }
    return NextResponse.json(
      {
        error: 'Error interno del servidor. Intenta nuevamente en unos segundos.',
        code: 'SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
