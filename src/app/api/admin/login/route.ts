import { NextResponse } from 'next/server';
import { insforge, insforgeAdmin, getMissingAdminEnvVars } from '@/lib/insforge';
import {
  verifyAdminPassword,
  isAdminPasswordHash,
  assertPepperConfigured,
} from '@/lib/adminPasswordHash';
import { verifyTotp } from '@/lib/adminTotp';
import { decryptTotpSecret, isEncryptedTotpSecret } from '@/lib/adminTotpCrypto';
import { verifyAndConsumeBackupCode } from '@/lib/adminBackupCodes';
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
import {
  recordLoginAttempt,
  userAgentFromRequest,
  type LoginOutcome,
} from '@/lib/adminLoginAudit';

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

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = userAgentFromRequest(request);
  /** Fire-and-forget audit helper — never awaited so logging can never block login. */
  const audit = (outcome: LoginOutcome, email?: string | null, reason?: string | null) => {
    void recordLoginAttempt({ ip, email: email ?? null, outcome, reason: reason ?? null, userAgent });
  };

  /** Recovery-path marker — set when the second factor was a backup code. */
  let usedBackupCode = false;
  let backupCodesRemaining: number | null = null;

  try {
    // Fail fast with a self-diagnostic message if the deployment is missing
    // required env vars. This surfaces the exact variable names in the login
    // form so the operator can fix Vercel/Next config without reading logs.
    // Only variable *names* are exposed — never values.
    const missing = getMissingAdminEnvVars();
    if (missing.length > 0) {
      audit('misconfigured', null, `missing: ${missing.join(',')}`);
      return misconfiguredResponse(missing);
    }

    if (await isRateLimited(ip)) {
      const remaining = await blockedSecondsRemaining(ip);
      audit('rate_limited', null, `${remaining}s remaining`);
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
      audit('bad_request', null, 'json parse failed');
      return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
    }

    if (!email || !password) {
      audit('bad_request', email || null, 'missing email or password');
      return NextResponse.json({ error: 'Email y contraseña son requeridos.' }, { status: 400 });
    }

    const { data: authData, error: authError } = await insforge.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData) {
      await recordFailedAttempt(ip);
      audit('invalid_password', email, authError?.message ?? 'insforge auth rejected');
      return NextResponse.json(
        { error: 'Credenciales incorrectas.' },
        { status: 401 }
      );
    }

    // Resolve tenant from subdomain so admins only log into their own tenant
    const tenantSlug = (request as unknown as { headers: { get(n: string): string | null } })
      .headers.get('x-tenant-slug') ?? 'fabrick';
    const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';
    let tenantId = DEFAULT_TENANT_ID;
    let tenantStatus = 'active';
    if (tenantSlug !== 'fabrick') {
      const { data: tenantRows } = await insforgeAdmin.database
        .from('tenants').select('id, status').eq('slug', tenantSlug).limit(1);
      const t = tenantRows?.[0] as { id: string; status: string } | undefined;
      if (t) { tenantId = t.id; tenantStatus = t.status; }
    }

    let { data: adminRows, error: dbError } = await insforgeAdmin.database
      .from('admin_users')
      .select('email, rol, aprobado, password_hash, totp_secret_enc, backup_codes, tenant_id')
      .eq('email', email)
      .eq('tenant_id', tenantId)
      .limit(1);

    // If the tenant_id column doesn't exist yet (pre-migration schema), fall back
    // to a simple email lookup so the bootstrap admin can always log in.
    if ((dbError || !adminRows || adminRows.length === 0) && email === BOOTSTRAP_ADMIN_EMAIL) {
      const fallback = await insforgeAdmin.database
        .from('admin_users')
        .select('email, rol, aprobado, password_hash, totp_secret_enc, backup_codes')
        .eq('email', email)
        .limit(1);
      if (!fallback.error && fallback.data && fallback.data.length > 0) {
        adminRows = fallback.data as typeof adminRows;
        dbError = null;
      }
    }

    type AdminUserRow = {
      email: string;
      rol?: string;
      aprobado?: boolean;
      password_hash?: string | null;
      totp_secret_enc?: string | null;
      backup_codes?: string[] | null;
    };

    let adminUser: AdminUserRow;

    if (dbError || !adminRows || adminRows.length === 0) {
      // Self-heal: if InsForge auth succeeded and this is the bootstrap admin,
      // the row is simply missing (common after the multitenancy migration that
      // added tenant_id). Insert it now instead of permanently locking them out.
      if (email !== BOOTSTRAP_ADMIN_EMAIL) {
        await recordFailedAttempt(ip);
        audit('unknown_user', email, dbError?.message ?? 'no admin_users row');
        return NextResponse.json(
          { error: 'Acceso denegado. Este usuario no tiene permisos de administrador.' },
          { status: 403 }
        );
      }
      // Try with tenant_id first (post-migration schema). If it fails because
      // the column doesn't exist yet (pre-migration deploy), fall back to the
      // legacy schema without tenant_id so the bootstrap admin can always log in.
      const { error: insertErr } = await insforgeAdmin.database
        .from('admin_users')
        .upsert(
          [{ email, rol: 'superadmin', aprobado: true, tenant_id: tenantId }],
          { onConflict: 'email,tenant_id' },
        );
      if (insertErr) {
        const { error: insertErrLegacy } = await insforgeAdmin.database
          .from('admin_users')
          .upsert(
            [{ email, rol: 'superadmin', aprobado: true }],
            { onConflict: 'email' },
          );
        if (insertErrLegacy) {
          audit('unknown_user', email, `self-heal insert failed: ${insertErrLegacy.message}`);
          return NextResponse.json(
            { error: 'Acceso denegado. Este usuario no tiene permisos de administrador.' },
            { status: 403 }
          );
        }
      }
      // Use a synthetic row — no need to re-fetch; bootstrap admin has no TOTP or local hash yet.
      adminUser = { email, rol: 'superadmin', aprobado: true, password_hash: null, totp_secret_enc: null, backup_codes: null };
      audit('success', email, 'bootstrap admin self-healed into admin_users');
    } else {
      adminUser = adminRows[0] as AdminUserRow;
    }

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
        await recordFailedAttempt(ip);
        audit('invalid_password', email, 'local scrypt mismatch');
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
        await recordFailedAttempt(ip);
        audit('totp_required', email);
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
        audit('totp_decrypt_failed', email, (err as Error)?.message);
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
        // ── Backup-code fallback (Fase 1.3b) ──────────────────────────
        // If the user typed something that looks like a backup code
        // (10-char alphanumeric, possibly dashed) instead of a 6-digit
        // TOTP, try it against the stored hashes. On a hit we consume
        // the code (remove from the array), persist the trimmed array,
        // and let the login proceed. On a miss we return the SAME
        // generic TOTP_INVALID response so an attacker cannot tell
        // whether they hit a backup-code branch.
        const backupResult = await verifyAndConsumeBackupCode(
          totp,
          adminUser.backup_codes
        );
        if (!backupResult.ok) {
          await recordFailedAttempt(ip);
          audit('totp_invalid', email);
          return NextResponse.json(
            { error: 'Código de verificación inválido.', code: 'TOTP_INVALID' },
            { status: 401 }
          );
        }
        // Consume: persist the trimmed hash array. Best-effort write —
        // a transient DB error here would let the same code be reused
        // on a retry, which is bad, so we DO surface the error rather
        // than swallowing it. The login fails closed.
        const { error: consumeErr } = await insforgeAdmin.database
          .from('admin_users')
          .update({ backup_codes: backupResult.remainingHashes })
          .eq('email', email)
          .eq('tenant_id', tenantId);
        if (consumeErr) {
          console.error(
            '[admin/login] failed to consume backup code:',
            consumeErr.message ?? consumeErr
          );
          await recordFailedAttempt(ip);
          audit('error', email, 'backup_code_consume_failed');
          return NextResponse.json(
            { error: 'No se pudo procesar el código. Intenta nuevamente.' },
            { status: 500 }
          );
        }
        // Tag this success so the audit trail distinguishes "real TOTP"
        // from "recovery via backup code". Reason format is grep-able.
        usedBackupCode = true;
        backupCodesRemaining = backupResult.remainingCount;
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
      await recordFailedAttempt(ip);
      audit('not_approved', email);
      return NextResponse.json(
        { error: 'Tu cuenta está pendiente de aprobación.' },
        { status: 403 }
      );
    }

    if (isBootstrapAdmin && adminUser.aprobado === false) {
      // Fire-and-forget: never block login on this maintenance update, but
      // do log any DB error so the operator can diagnose persistent issues.
      void insforgeAdmin.database
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

    await clearFailedAttempts(ip);

    const rol = (adminUser.rol ?? 'admin') as 'superadmin' | 'admin' | 'viewer';
    const exp = Date.now() + SESSION_TTL_MS;
    const sessionValue = await encodeSession({ email, exp, rol, tenant_id: tenantId });

    audit(
      'success',
      email,
      usedBackupCode
        ? `rol=${rol}; via=backup_code; remaining=${backupCodesRemaining}`
        : `rol=${rol}`
    );

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE_NAME, sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_MS / 1000,
    });
    // Not httpOnly: Edge middleware needs to read this cookie to redirect
    // suspended/cancelled tenants before the request reaches route handlers.
    response.cookies.set('tenant_status', tenantStatus, {
      httpOnly: false,
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
    audit('error', null, message.slice(0, 500));
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
