import { NextResponse } from 'next/server';
import { insforge, getMissingAdminEnvVars } from '@/lib/insforge';
import {
  verifyAdminPassword,
  isAdminPasswordHash,
  assertPepperConfigured,
} from '@/lib/adminPasswordHash';
import { verifyTotp } from '@/lib/adminTotp';
import { decryptTotpSecret, isEncryptedTotpSecret } from '@/lib/adminTotpCrypto';

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
    let totp: string;
    try {
      const body = await request.json();
      email = (body.email ?? '').trim().toLowerCase();
      password = body.password ?? '';
      totp = typeof body.totp === 'string' ? body.totp.trim() : '';
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
      .select('email, rol, aprobado, password_hash, totp_secret_enc')
      .eq('email', email)
      .limit(1);

    if (dbError || !adminRows || adminRows.length === 0) {
      recordFailedAttempt(ip);
      return NextResponse.json(
        { error: 'Acceso denegado. Este usuario no tiene permisos de administrador.' },
        { status: 403 }
      );
    }

    const adminUser = adminRows[0] as {
      email: string;
      rol?: string;
      aprobado?: boolean;
      password_hash?: string | null;
      totp_secret_enc?: string | null;
    };

    // ── Layered owner-password verification (Fase 1 del plan de privatización)
    // If the row has a `password_hash`, verify the plaintext password against
    // it locally with scrypt + ADMIN_PASSWORD_PEPPER. This runs on top of
    // InsForge auth so a compromise of the InsForge user record alone is not
    // enough to log in. When the column is NULL the layer is skipped (legacy
    // accounts that haven't run `npm run admin:set-password` yet).
    if (isAdminPasswordHash(adminUser.password_hash)) {
      // Refuse to silently downgrade in production: a misconfigured pepper
      // would make every verification fail with "wrong password" — a much
      // worse UX than failing fast with a clear 500.
      assertPepperConfigured();
      const localOk = await verifyAdminPassword(password, adminUser.password_hash);
      if (!localOk) {
        recordFailedAttempt(ip);
        return NextResponse.json(
          { error: 'Credenciales incorrectas.' },
          { status: 401 }
        );
      }
    }

    // ── TOTP 2FA verification (Fase 1.3 del plan de privatización)
    // If the row has an encrypted TOTP secret, REQUIRE a 6-digit `totp`
    // field in the body and verify it before issuing the session. The
    // 401 carries `code: 'TOTP_REQUIRED'` so the login form can show the
    // 2FA input on the next attempt without leaking *whether* this email
    // has TOTP enabled (the response is identical to a wrong-code reply).
    if (isEncryptedTotpSecret(adminUser.totp_secret_enc)) {
      if (!totp) {
        recordFailedAttempt(ip);
        return NextResponse.json(
          { error: 'Código de verificación requerido.', code: 'TOTP_REQUIRED' },
          { status: 401 }
        );
      }
      let totpSecret: string;
      try {
        totpSecret = decryptTotpSecret(adminUser.totp_secret_enc);
      } catch (err) {
        // Either ADMIN_SESSION_SECRET was rotated (every stored TOTP secret
        // is now garbage) or the row was tampered with. Refuse login with a
        // clear 500 — silently bypassing here would downgrade 2FA to "off".
        console.error('[admin/login] TOTP decrypt failed:', err);
        return NextResponse.json(
          {
            error:
              'No se pudo verificar el segundo factor. Pide al administrador que vuelva a enrolar TOTP.',
            code: 'TOTP_DECRYPT_FAILED',
          },
          { status: 500 }
        );
      }
      const totpOk = verifyTotp(totp, totpSecret);
      if (!totpOk) {
        recordFailedAttempt(ip);
        return NextResponse.json(
          { error: 'Código de verificación inválido.', code: 'TOTP_INVALID' },
          { status: 401 }
        );
      }
    }

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
    const isMissingPepper = /ADMIN_PASSWORD_PEPPER/i.test(message);
    if (isMissingPepper) {
      return misconfiguredResponse(['ADMIN_PASSWORD_PEPPER']);
    }
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
