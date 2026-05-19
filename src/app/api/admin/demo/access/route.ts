import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { ADMIN_COOKIE_NAME, encodeSession, getClientIp } from '@/lib/adminAuth';
import { adminAccessEmail, detectDevice, sendAdminEmail } from '@/lib/adminNotifications';

export const dynamic = 'force-dynamic';

const DEMO_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function getUserAgent(request: NextRequest) {
  return request.headers.get('user-agent')?.slice(0, 500) || 'unknown';
}

function isMissingTable(error: unknown) {
  const message = (error as { message?: string } | null)?.message ?? String(error ?? '');
  return /does not exist|relation|schema cache|could not find/i.test(message);
}

async function auditDemoAccess(params: {
  tokenId: string | null;
  token: string | null;
  sessionId: string | null;
  request: NextRequest;
  outcome: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const ua = getUserAgent(params.request);
    await insforgeAdmin.database.from('demo_access_audit').insert([
      {
        demo_token_id: params.tokenId,
        token: params.token,
        session_id: params.sessionId,
        ip: getClientIp(params.request),
        user_agent: ua,
        device: detectDevice(ua),
        outcome: params.outcome,
        metadata: params.metadata ?? {},
      },
    ]);
  } catch {
    /* Optional table. The access flow must keep working even before migration. */
  }
}

async function notifyDemoOwner(params: {
  createdBy: string | null;
  request: NextRequest;
  title: string;
}) {
  const owner = params.createdBy || process.env.ADMIN_EMAIL || process.env.NOTIFY_ADMIN_EMAIL;
  if (!owner) return;
  const ua = getUserAgent(params.request);
  const email = adminAccessEmail({
    title: params.title,
    email: 'demo@preview',
    ip: getClientIp(params.request),
    userAgent: ua,
    device: detectDevice(ua),
    locationHint: params.request.headers.get('x-vercel-ip-country') || params.request.headers.get('x-vercel-ip-city') || null,
  });
  await sendAdminEmail({ to: owner, subject: params.title, html: email.html, text: email.text });
}

export async function POST(request: NextRequest) {
  let token: string;
  try {
    const body = await request.json();
    token = (body.token ?? '').trim();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  if (!token) return NextResponse.json({ error: 'Token requerido.' }, { status: 400 });

  const { data: rows, error } = await insforgeAdmin.database
    .from('demo_tokens')
    .select('*')
    .eq('token', token)
    .gt('expira_at', new Date().toISOString())
    .limit(1);

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({ error: 'Sistema de demo no configurado.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Error al validar token.' }, { status: 500 });
  }

  if (!rows || rows.length === 0) {
    await auditDemoAccess({ tokenId: null, token, sessionId: null, request, outcome: 'invalid_or_expired' });
    return NextResponse.json({ error: 'Link de demo inválido o expirado.' }, { status: 400 });
  }

  const row = rows[0] as Record<string, unknown>;
  const rowId = String(row.id ?? '');
  const expiraAt = String(row.expira_at ?? '');
  const createdBy = typeof row.created_by === 'string' ? row.created_by : null;
  const ip = getClientIp(request);
  const ua = getUserAgent(request);
  const lockedIp = typeof row.locked_ip === 'string' && row.locked_ip.length > 0 ? row.locked_ip : null;

  if (lockedIp && lockedIp !== ip) {
    await auditDemoAccess({
      tokenId: rowId || null,
      token,
      sessionId: null,
      request,
      outcome: 'blocked_ip_mismatch',
      metadata: { lockedIp },
    });
    void notifyDemoOwner({ createdBy, request, title: 'Intento bloqueado de acceso demo desde otra IP' });
    return NextResponse.json({ error: 'Este link demo ya fue bloqueado para otra IP.' }, { status: 403 });
  }

  const tokenExpMs = new Date(expiraAt).getTime();
  const sessionExpMs = Math.min(Date.now() + DEMO_SESSION_TTL_MS, tokenExpMs);
  const maxAge = Math.max(60, Math.floor((sessionExpMs - Date.now()) / 1000));
  const sessionId = crypto.randomUUID();
  const accessCount = Number(row.accesos ?? 0) + 1;

  const sessionToken = await encodeSession({
    email: 'demo@preview',
    rol: 'viewer',
    exp: sessionExpMs,
  });

  await insforgeAdmin.database
    .from('demo_tokens')
    .update({
      accesos: accessCount,
      ultimo_acceso: new Date().toISOString(),
      locked_ip: lockedIp ?? ip,
      locked_at: lockedIp ? row.locked_at ?? null : new Date().toISOString(),
      ultimo_ip: ip,
      ultimo_user_agent: ua,
      ultimo_dispositivo: detectDevice(ua),
    })
    .eq('id', rowId);

  await auditDemoAccess({
    tokenId: rowId,
    token,
    sessionId,
    request,
    outcome: 'success',
    metadata: { accessCount, lockedIp: lockedIp ?? ip },
  });
  void notifyDemoOwner({ createdBy, request, title: lockedIp ? 'Nuevo acceso al demo de Soluciones Fabrick' : 'Primer acceso al demo de Soluciones Fabrick' });

  const response = NextResponse.json({
    ok: true,
    mode: 'viewer',
    sessionId,
    expiresAt: new Date(sessionExpMs).toISOString(),
    lockedIp: lockedIp ?? ip,
    accessCount,
  });

  response.cookies.set(ADMIN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/',
  });

  response.cookies.set('sf_demo_mode', '1', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/',
  });

  response.cookies.set('sf_demo_sid', sessionId, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/',
  });

  response.cookies.set('sf_demo_expires_at', new Date(sessionExpMs).toISOString(), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/',
  });

  return response;
}
