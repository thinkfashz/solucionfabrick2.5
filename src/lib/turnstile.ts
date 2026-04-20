/**
 * Server-side Cloudflare Turnstile verification helper.
 *
 * Usage (in a Next.js route handler):
 *
 *   const token = body['cf-turnstile-response'] as string | undefined;
 *   const ok = await verifyTurnstile(token, request.headers.get('x-forwarded-for') ?? undefined);
 *   if (!ok) return NextResponse.json({ error: 'captcha' }, { status: 400 });
 *
 * Behavior:
 *   - If TURNSTILE_SECRET_KEY is not set, this returns `true` (i.e. turnstile is
 *     disabled). This keeps current forms working until the secret is provisioned.
 *   - If the key IS set, the token MUST be valid, otherwise verification fails.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured → skip
  if (!token) return false;

  try {
    const form = new URLSearchParams();
    form.set('secret', secret);
    form.set('response', token);
    if (remoteIp) form.set('remoteip', remoteIp);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
      // Turnstile recommends a short timeout; we let the platform default handle it.
    });

    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
