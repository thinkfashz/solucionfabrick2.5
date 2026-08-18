import 'server-only';

import { getResendCredentials } from '@/lib/resendCredentials';

export async function sendAdminEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
  const recipients = Array.isArray(params.to) ? params.to.filter(Boolean) : [params.to].filter(Boolean);
  if (recipients.length === 0) return { sent: false, skipped: true, error: 'NO_RECIPIENTS' };

  const creds = await getResendCredentials({ preferDb: true });
  if (!creds.apiKey) {
    return { sent: false, skipped: true, error: `RESEND_NOT_CONFIGURED:${creds.missing.join(',')}` };
  }

  const from = creds.from || process.env.EMAIL_FROM || 'Soluciones Fabrick <notificaciones@solucionesfabrick.com>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: recipients, subject: params.subject, html: params.html, text: params.text }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { sent: false, error: `RESEND_${res.status}: ${body.slice(0, 240)}` };
  }

  return { sent: true };
}

export function detectDevice(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ios/.test(ua)) return 'iPhone/iPad';
  if (/android/.test(ua)) return 'Android';
  if (/windows/.test(ua)) return 'Windows';
  if (/macintosh|mac os/.test(ua)) return 'Mac';
  if (/linux/.test(ua)) return 'Linux';
  return 'Dispositivo desconocido';
}

export function adminAccessEmail(params: {
  title: string;
  email: string;
  ip: string;
  userAgent: string;
  device: string;
  locationHint?: string | null;
  at?: Date;
}) {
  const at = params.at ?? new Date();
  const location = params.locationHint || 'Ubicación no disponible';
  const text = `${params.title}\n\nUsuario: ${params.email}\nIP: ${params.ip}\nDispositivo: ${params.device}\nUser-Agent: ${params.userAgent}\nUbicación: ${location}\nHora: ${at.toISOString()}`;
  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#08090A;color:#F2DFBB;padding:28px;border-radius:18px;border:1px solid #1A1B1F">
    <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#F5871F">Soluciones Fabrick · Seguridad</p>
    <h1 style="margin:0 0 18px;font-size:22px;line-height:1.2">${params.title}</h1>
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#BFB8AC">
      <tr><td style="padding:8px 0;color:#BFB8AC">Usuario</td><td style="padding:8px 0;font-weight:700;color:#FFF9EE">${params.email}</td></tr>
      <tr><td style="padding:8px 0;color:#BFB8AC">IP</td><td style="padding:8px 0;font-family:monospace;color:#FFF9EE">${params.ip}</td></tr>
      <tr><td style="padding:8px 0;color:#BFB8AC">Dispositivo</td><td style="padding:8px 0;color:#FFF9EE">${params.device}</td></tr>
      <tr><td style="padding:8px 0;color:#BFB8AC">Ubicación</td><td style="padding:8px 0;color:#FFF9EE">${location}</td></tr>
      <tr><td style="padding:8px 0;color:#BFB8AC">Hora</td><td style="padding:8px 0;color:#FFF9EE">${at.toLocaleString('es-CL')}</td></tr>
    </table>
    <p style="margin:18px 0 0;color:#BFB8AC;font-size:12px;line-height:1.5">User-Agent: ${params.userAgent}</p>
  </div>`;
  return { html, text };
}
