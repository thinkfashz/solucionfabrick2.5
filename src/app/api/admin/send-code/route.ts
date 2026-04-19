import { NextResponse } from 'next/server';
import { createClient } from '@insforge/sdk';
import { createOtp } from '@/lib/otpStore';

const ALLOWED_ADMIN_EMAIL = 'feduardomsz@gmail.com';

function otpEmailHtml(code: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid #222;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#111111;padding:32px 40px 24px;text-align:center;border-bottom:1px solid #222;">
            <span style="font-size:22px;font-weight:900;letter-spacing:0.3em;color:#facc15;">FABRICK</span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px 24px;text-align:center;">
            <p style="color:#ffffff;font-size:16px;font-weight:600;margin:0 0 8px;">Código de verificación</p>
            <p style="color:#999;font-size:13px;margin:0 0 32px;">Usa este código para configurar tu contraseña de administrador. Expira en 10 minutos.</p>
            <div style="display:inline-block;background:#1a1a1a;border:2px solid #facc15;border-radius:12px;padding:20px 48px;">
              <span style="font-size:40px;font-weight:900;letter-spacing:0.4em;color:#facc15;">${code}</span>
            </div>
            <p style="color:#666;font-size:11px;margin:32px 0 0;">Si no solicitaste este código, ignora este correo.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px 28px;text-align:center;border-top:1px solid #222;">
            <span style="color:#444;font-size:11px;letter-spacing:0.15em;">SOLUCIONES FABRICK · ADMINISTRADOR</span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(request: Request) {
  let email: string;
  try {
    const body = await request.json();
    email = (body.email ?? '').trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: 'El email es requerido.' }, { status: 400 });
  }

  // Only allow sending codes to the registered admin email
  if (email !== ALLOWED_ADMIN_EMAIL.toLowerCase()) {
    // Return a generic success to avoid email enumeration
    return NextResponse.json({ ok: true });
  }

  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_7e23032539c2dc64d5d27ca29d07b928';

  const insforge = createClient({ baseUrl, anonKey });

  const code = createOtp(email);

  const { error: emailError } = await insforge.emails.send({
    to: email,
    subject: '🔐 Tu código de verificación - Fabrick Admin',
    html: otpEmailHtml(code),
  });

  if (emailError) {
    console.error('[SendCode] emails.send error:', emailError);
    return NextResponse.json(
      { error: 'No se pudo enviar el código. Inténtalo de nuevo en unos momentos.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
