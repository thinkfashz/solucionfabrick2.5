import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import { clearFailedAttempts, getClientIp } from '@/lib/adminAuth';

/**
 * Finalises the password-recovery flow server-side.
 *
 * The client first calls `insforge.auth.exchangeResetPasswordToken({ email,
 * code })` from the browser to swap the OTP from the recovery email for an
 * `otp_token`. Receiving that OTP via email is the proof of control of the
 * admin mailbox. The client then POSTs `{ email, otp_token, newPassword }`
 * here. This route:
 *
 *  1. Calls `insforge.auth.resetPassword` server-side. If InsForge accepts
 *     the `otp_token`, the proof is valid (the SDK rejects forged or stale
 *     tokens with an auth error).
 *  2. Clears the IP rate-limit on success so the user can immediately
 *     attempt a normal login.
 *
 * This replaces the previous flow where the browser called
 * `resetPassword` directly and then POSTed `/api/admin/unlock` — that
 * endpoint took no proof and let any caller wipe their IP's failed-attempt
 * counter, completely defeating the persistent rate-limit. See Greptile
 * review of PR #148.
 *
 * Failure modes are intentionally indistinguishable so the endpoint cannot
 * be used as an oracle to enumerate valid OTP tokens or admin emails.
 */
export async function POST(request: Request) {
  let body: { email?: unknown; otp_token?: unknown; newPassword?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const otpToken = typeof body.otp_token === 'string' ? body.otp_token.trim() : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

  if (!email || !otpToken || !newPassword) {
    return NextResponse.json(
      { error: 'Email, token de recuperación y nueva contraseña son requeridos.' },
      { status: 400 }
    );
  }

  const { error: resetErr } = await insforge.auth.resetPassword({
    newPassword,
    otp: otpToken,
  });

  if (resetErr) {
    // Log the SDK-side reason for debugging but DO NOT echo it to the
    // client. Different InsForge messages ("invalid token", "expired
    // token", "user not found", "weak password", …) would otherwise turn
    // this endpoint into an enumeration oracle for OTP validity. Greptile
    // P2 on PR #149 — fixed by always returning the same generic 401.
    console.warn('[recover/finalize] resetPassword rejected:', resetErr.message);
    return NextResponse.json(
      { error: 'No se pudo completar la recuperación.' },
      { status: 401 }
    );
  }

  await clearFailedAttempts(getClientIp(request));

  return NextResponse.json({ ok: true });
}
