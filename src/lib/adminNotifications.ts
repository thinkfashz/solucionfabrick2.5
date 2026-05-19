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
  <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#09090b;color:#f4f4f5;padding:28px;border-radius:18px;border:1px solid #27272a">
    <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#f59e0b">Soluciones Fabrick · Seguridad</p>
    <h1 style="margin:0 0 18px;font-size:22px;line-height:1.2">${params.title}</h1>
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#d4d4d8">
      <tr><td style="padding:8px 0;color:#a1a1aa">Usuario</td><td style="padding:8px 0;font-weight:700;color:#fff">${params.email}</td></tr>
      <tr><td style="padding:8px 0;color:#a1a1aa">IP</td><td style="padding:8px 0;font-family:monospace;color:#fff">${params.ip}</td></tr>
      <tr><td style="padding:8px 0;color:#a1a1aa">Dispositivo</td><td style="padding:8px 0;color:#fff">${params.device}</td></tr>
      <tr><td style="padding:8px 0;color:#a1a1aa">Ubicación</td><td style="padding:8px 0;color:#fff">${location}</td></tr>
      <tr><td style="padding:8px 0;color:#a1a1aa">Hora</td><td style="padding:8px 0;color:#fff">${at.toLocaleString('es-CL')}</td></tr>
    </table>
    <p style="margin:18px 0 0;color:#71717a;font-size:12px;line-height:1.5">User-Agent: ${params.userAgent}</p>
  </div>`;
  return { html, text };
}
