import { NextResponse } from 'next/server';
import { insforge, insforgeAdmin } from '@/lib/insforge';
import {
  clearFailedAttempts,
  getClientIp,
  validateInitSecret,
} from '@/lib/adminAuth';

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'f.eduardomicolta@gmail.com')
  .trim()
  .toLowerCase();

const INSFORGE_BASE = (
  process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app'
).replace(/\/+$/, '');

async function ensureAdminRowViaSql(email: string): Promise<boolean> {
  const apiKey = process.env.INSFORGE_API_KEY;
  if (!apiKey) return false;
  const safeEmail = email.replace(/'/g, "''");
  const query =
    `INSERT INTO public.admin_users (email, nombre, rol, aprobado) ` +
    `VALUES ('${safeEmail}', 'Admin Fabrick', 'superadmin', true) ` +
    `ON CONFLICT (email) DO UPDATE SET rol = 'superadmin', aprobado = true`;
  try {
    const res = await fetch(`${INSFORGE_BASE}/api/database/advance/rawsql/unrestricted`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  // ── Hardening (Greptile post-mortem of PR #149) ──────────────────────
  // The endpoint used to default `ADMIN_INITIAL_PASSWORD` to a hardcoded
  // string and ran without auth. That meant anyone who cloned the public
  // repo could deploy it, hit /api/admin/init-account, and create the
  // admin account with a known password — a self-pwn waiting to happen.
  //
  // Hardening applied:
  //  1. ADMIN_INITIAL_PASSWORD is now REQUIRED env var (no default). The
  //     handler refuses to proceed if it's empty.
  //  2. ADMIN_INIT_SECRET is also REQUIRED. The client must echo it back
  //     in the `x-admin-init-secret` header. Operators set this in the
  //     same Vercel/host env-vars panel where they set the password, and
  //     paste it into the init UI when bootstrapping. Comparison is
  //     constant-time so no timing oracle leaks.
  // ─────────────────────────────────────────────────────────────────────
  const initialPassword = (process.env.ADMIN_INITIAL_PASSWORD ?? '').trim();
  const expectedSecret = (process.env.ADMIN_INIT_SECRET ?? '').trim();
  if (!initialPassword || !expectedSecret) {
    const missing: string[] = [];
    if (!initialPassword) missing.push('ADMIN_INITIAL_PASSWORD');
    if (!expectedSecret) missing.push('ADMIN_INIT_SECRET');
    return NextResponse.json(
      {
        error:
          `Init no configurado. Faltan variables de entorno: ${missing.join(', ')}. ` +
          'Configúralas en Vercel → Settings → Environment Variables (marcadas para Production) y vuelve a desplegar.',
        code: 'INIT_NOT_CONFIGURED',
        missing,
      },
      { status: 500 }
    );
  }

  const providedSecret = request.headers.get('x-admin-init-secret');
  if (!validateInitSecret(providedSecret, expectedSecret)) {
    // Generic 401 — never echo whether the header was missing vs wrong.
    return NextResponse.json(
      { error: 'No autorizado.' },
      { status: 401 }
    );
  }

  // Attempt to create the admin account in InsForge
  const { data: signUpData, error: signUpError } = await insforge.auth.signUp({
    email: ADMIN_EMAIL,
    password: initialPassword,
    name: 'Admin Fabrick',
  });

  const userAlreadyExists =
    signUpError &&
    (signUpError.message.toLowerCase().includes('already') ||
      signUpError.message.toLowerCase().includes('exists') ||
      signUpError.message.toLowerCase().includes('duplicate') ||
      signUpError.message.toLowerCase().includes('registrado') ||
      (signUpError.statusCode !== undefined && signUpError.statusCode === 409));

  if (signUpError && !userAlreadyExists) {
    return NextResponse.json(
      { error: signUpError.message || 'Error al crear la cuenta.' },
      { status: 400 }
    );
  }

  // Ensure the admin email is in the admin_users table AND approved. Without
  // `aprobado: true` the login route will block this bootstrap account with
  // "Tu cuenta está pendiente de aprobación." once the team/invitations
  // feature is in use (which adds an `aprobado` column defaulting to false).
  const bootstrapRow = {
    email: ADMIN_EMAIL,
    nombre: 'Admin Fabrick',
    rol: 'superadmin',
    aprobado: true,
  };

  const { error: dbError } = await insforgeAdmin.database
    .from('admin_users')
    .upsert([bootstrapRow], { onConflict: 'email' });

  if (dbError) {
    // Try a plain insert as fallback, then a best-effort update in case the
    // row already exists with aprobado=false from a previous run.
    const { error: insertError } = await insforgeAdmin.database
      .from('admin_users')
      .insert([bootstrapRow]);

    if (
      insertError &&
      !insertError.message.toLowerCase().includes('duplicate') &&
      !insertError.message.toLowerCase().includes('unique')
    ) {
      console.error('[AdminInit] DB error:', insertError);
    }

    // Row likely exists — force-approve the bootstrap admin.
    const { error: approveError } = await insforgeAdmin.database
      .from('admin_users')
      .update({ aprobado: true, rol: 'superadmin' })
      .eq('email', ADMIN_EMAIL);
    if (approveError) {
      console.error('[AdminInit] failed to force-approve bootstrap admin:', approveError);
    }

    // Final fallback: raw SQL via unrestricted endpoint (works even when SDK
    // key lacks INSERT/UPDATE permissions on admin_users).
    void ensureAdminRowViaSql(ADMIN_EMAIL);
  }

  if (userAlreadyExists) {
    // Do NOT clear the rate-limit here. Once the admin account exists this
    // endpoint becomes a permanent gated handler that legitimate operators
    // can still call (e.g. to re-approve the bootstrap admin), but a
    // successful call no longer touches the IP counter — that would let
    // an operator-with-the-secret bypass their own rate-limit, which is
    // out of scope for this endpoint.
    return NextResponse.json({
      ok: false,
      alreadyExists: true,
      message:
        'La cuenta ya existe en InsForge. Si no recuerdas la contraseña, usa la opción de recuperación.',
    });
  }

  // New-account branch only: the InsForge signUp succeeded for the very
  // first time. Combined with the ADMIN_INIT_SECRET gate above, this is
  // a solid proof of control of both the deployment env and the bootstrap
  // intent — clear the IP rate-limit so the operator can sign in
  // immediately afterwards.
  await clearFailedAttempts(getClientIp(request));

  void signUpData; // consumed above; included to keep linter happy
  return NextResponse.json({
    ok: true,
    message:
      'Cuenta de administrador creada correctamente. Ya puedes iniciar sesión con la contraseña configurada.',
  });
}
