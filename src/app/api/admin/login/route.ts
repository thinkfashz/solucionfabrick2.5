import { NextResponse } from 'next/server';
import { insforge, insforgeAdmin, getMissingAdminEnvVars } from '@/lib/insforge';
import { verifyAdminPassword, isAdminPasswordHash, assertPepperConfigured } from '@/lib/adminPasswordHash';
import { verifyTotp } from '@/lib/adminTotp';
import { decryptTotpSecret, isEncryptedTotpSecret } from '@/lib/adminTotpCrypto';
import { verifyAndConsumeBackupCode } from '@/lib/adminBackupCodes';
import { isRateLimited, recordFailedAttempt, clearFailedAttempts, blockedSecondsRemaining, encodeSession, getClientIp, ADMIN_COOKIE_NAME, SESSION_TTL_MS, SESSION_COOKIE_OPTIONS } from '@/lib/adminAuth';
import { recordLoginAttempt, userAgentFromRequest, type LoginOutcome } from '@/lib/adminLoginAudit';
import { sendLoginAlertEmail } from '@/lib/emailDriver';
import { createAdminSessionRecord, detectDeviceFromUa, locationHintFromHeaders } from '@/lib/adminSessionAudit';

function parseUserAgent(ua: string | null): string { return detectDeviceFromUa(ua); }
async function geolocateIp(ip: string): Promise<string> { if (/^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::1$|localhost$)/.test(ip)) return 'Red local'; try { const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal: AbortSignal.timeout(3000), cache: 'no-store' }); if (!res.ok) return 'Desconocida'; const data = await res.json() as { success?: boolean; city?: string; country?: string }; if (!data.success) return 'Desconocida'; return [data.city, data.country].filter(Boolean).join(', ') || 'Desconocida'; } catch { return 'Desconocida'; } }

const BOOTSTRAP_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'f.eduardomicolta@gmail.com').trim().toLowerCase();
const INSFORGE_BASE = (process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app').replace(/\/+$/, '');

async function bootstrapAdminViaSql(email: string): Promise<boolean> { const apiKey = process.env.INSFORGE_API_KEY; if (!apiKey) return false; const safeEmail = email.replace(/'/g, "''"); const query = `INSERT INTO public.admin_users (email, rol, aprobado) VALUES ('${safeEmail}', 'superadmin', true) ON CONFLICT (email) DO UPDATE SET rol = 'superadmin', aprobado = true`; try { const res = await fetch(`${INSFORGE_BASE}/api/database/advance/rawsql/unrestricted`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey }, body: JSON.stringify({ query }), signal: AbortSignal.timeout(10000) }); return res.ok; } catch { return false; } }
function misconfiguredResponse(missing: string[]) { const error = missing.length > 0 ? `Error de configuración del servidor. Faltan variables de entorno: ${missing.join(', ')}. Configúralas en el panel de tu hosting y vuelve a desplegar.` : 'Error de configuración del servidor. Contacta al administrador.'; return NextResponse.json({ error, code: 'SERVER_MISCONFIGURED', missing }, { status: 500 }); }

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = userAgentFromRequest(request);
  const audit = (outcome: LoginOutcome, email?: string | null, reason?: string | null) => { void recordLoginAttempt({ ip, email: email ?? null, outcome, reason: reason ?? null, userAgent }); };
  let usedBackupCode = false;
  let backupCodesRemaining: number | null = null;
  try {
    const missing = getMissingAdminEnvVars();
    if (missing.length > 0) { audit('misconfigured', null, `missing: ${missing.join(',')}`); return misconfiguredResponse(missing); }
    if (await isRateLimited(ip)) { const remaining = await blockedSecondsRemaining(ip); audit('rate_limited', null, `${remaining}s remaining`); return NextResponse.json({ error: `Demasiados intentos fallidos. Intenta nuevamente en ${remaining} segundos.` }, { status: 429 }); }
    let email: string; let password: string; let totp: string;
    try { const body = await request.json(); email = (body.email ?? '').trim().toLowerCase(); password = body.password ?? ''; totp = typeof body.totp === 'string' ? body.totp.trim() : ''; } catch { audit('bad_request', null, 'json parse failed'); return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 }); }
    if (!email || !password) { audit('bad_request', email || null, 'missing email or password'); return NextResponse.json({ error: 'Email y contraseña son requeridos.' }, { status: 400 }); }
    const { data: authData, error: authError } = await insforge.auth.signInWithPassword({ email, password });
    if (authError || !authData) { await recordFailedAttempt(ip); audit('invalid_password', email, authError?.message ?? 'insforge auth rejected'); return NextResponse.json({ error: 'Credenciales incorrectas.' }, { status: 401 }); }
    const tenantSlug = (request as unknown as { headers: { get(n: string): string | null } }).headers.get('x-tenant-slug') ?? 'fabrick';
    const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';
    let tenantId = DEFAULT_TENANT_ID; let tenantStatus = 'active';
    if (tenantSlug !== 'fabrick') { const { data: tenantRows } = await insforgeAdmin.database.from('tenants').select('id, status').eq('slug', tenantSlug).limit(1); const t = tenantRows?.[0] as { id: string; status: string } | undefined; if (t) { tenantId = t.id; tenantStatus = t.status; } }
    let { data: adminRows, error: dbError } = await insforgeAdmin.database.from('admin_users').select('email, rol, aprobado, password_hash, totp_secret_enc, backup_codes, tenant_id').eq('email', email).eq('tenant_id', tenantId).limit(1);
    if ((dbError || !adminRows || adminRows.length === 0) && email === BOOTSTRAP_ADMIN_EMAIL) { const fallback = await insforgeAdmin.database.from('admin_users').select('email, rol, aprobado, password_hash, totp_secret_enc, backup_codes').eq('email', email).limit(1); if (!fallback.error && fallback.data && fallback.data.length > 0) { adminRows = fallback.data as typeof adminRows; dbError = null; } }
    type AdminUserRow = { email: string; rol?: string; aprobado?: boolean; password_hash?: string | null; totp_secret_enc?: string | null; backup_codes?: string[] | null; };
    let adminUser: AdminUserRow;
    if (dbError || !adminRows || adminRows.length === 0) { if (email !== BOOTSTRAP_ADMIN_EMAIL) { await recordFailedAttempt(ip); audit('unknown_user', email, dbError?.message ?? 'no admin_users row'); return NextResponse.json({ error: 'Acceso denegado. Este usuario no tiene permisos de administrador.' }, { status: 403 }); } const { error: insertErr } = await insforgeAdmin.database.from('admin_users').upsert([{ email, rol: 'superadmin', aprobado: true, tenant_id: tenantId }], { onConflict: 'email,tenant_id' }); if (insertErr) { const { error: insertErrLegacy } = await insforgeAdmin.database.from('admin_users').upsert([{ email, rol: 'superadmin', aprobado: true }], { onConflict: 'email' }); if (insertErrLegacy) { const sqlOk = await bootstrapAdminViaSql(email); if (!sqlOk) { audit('unknown_user', email, `self-heal insert failed: ${insertErrLegacy.message}`); return NextResponse.json({ error: 'Acceso denegado. Este usuario no tiene permisos de administrador.' }, { status: 403 }); } audit('success', email, 'bootstrap admin self-healed via raw SQL fallback'); } } adminUser = { email, rol: 'superadmin', aprobado: true, password_hash: null, totp_secret_enc: null, backup_codes: null }; audit('success', email, 'bootstrap admin self-healed into admin_users'); } else { adminUser = adminRows[0] as AdminUserRow; }
    if (isAdminPasswordHash(adminUser.password_hash)) { assertPepperConfigured(); const localOk = await verifyAdminPassword(password, adminUser.password_hash); if (!localOk) { await recordFailedAttempt(ip); audit('invalid_password', email, 'local scrypt mismatch'); return NextResponse.json({ error: 'Credenciales incorrectas.' }, { status: 401 }); } }
    if (isEncryptedTotpSecret(adminUser.totp_secret_enc)) { if (!totp) { await recordFailedAttempt(ip); audit('totp_required', email); return NextResponse.json({ error: 'Código de verificación requerido.', code: 'TOTP_REQUIRED' }, { status: 401 }); } let totpSecret: string; try { totpSecret = decryptTotpSecret(adminUser.totp_secret_enc); } catch (err) { console.error('[admin/login] TOTP decrypt failed:', err); audit('totp_decrypt_failed', email, (err as Error)?.message); return NextResponse.json({ error: 'No se pudo verificar el segundo factor. Pide al administrador que vuelva a enrolar TOTP.', code: 'TOTP_DECRYPT_FAILED' }, { status: 500 }); } const totpOk = verifyTotp(totp, totpSecret); if (!totpOk) { const backupResult = await verifyAndConsumeBackupCode(totp, adminUser.backup_codes); if (!backupResult.ok) { await recordFailedAttempt(ip); audit('totp_invalid', email); return NextResponse.json({ error: 'Código de verificación inválido.', code: 'TOTP_INVALID' }, { status: 401 }); } const { error: consumeErr } = await insforgeAdmin.database.from('admin_users').update({ backup_codes: backupResult.remainingHashes }).eq('email', email).eq('tenant_id', tenantId); if (consumeErr) { console.error('[admin/login] failed to consume backup code:', consumeErr.message ?? consumeErr); await recordFailedAttempt(ip); audit('error', email, 'backup_code_consume_failed'); return NextResponse.json({ error: 'No se pudo procesar el código. Intenta nuevamente.' }, { status: 500 }); } usedBackupCode = true; backupCodesRemaining = backupResult.remainingCount; } }
    const isBootstrapAdmin = email === BOOTSTRAP_ADMIN_EMAIL;
    if (adminUser.aprobado === false && !isBootstrapAdmin) { await recordFailedAttempt(ip); audit('not_approved', email); return NextResponse.json({ error: 'Tu cuenta está pendiente de aprobación.' }, { status: 403 }); }
    if (isBootstrapAdmin && adminUser.aprobado === false) { void insforgeAdmin.database.from('admin_users').update({ aprobado: true, rol: adminUser.rol ?? 'superadmin' }).eq('email', email).then((result: { error?: { message?: string } | null }) => { if (result?.error) console.error('[admin/login] failed to self-approve bootstrap admin:', result.error.message ?? result.error); }); }
    await clearFailedAttempts(ip);
    const rol = (adminUser.rol ?? 'admin') as 'superadmin' | 'admin' | 'viewer';
    const exp = Date.now() + SESSION_TTL_MS;
    const sessionId = crypto.randomUUID();
    const sessionValue = await encodeSession({ email, exp, rol, tenant_id: tenantId, session_id: sessionId } as any);
    audit('success', email, usedBackupCode ? `rol=${rol}; via=backup_code; remaining=${backupCodesRemaining}` : `rol=${rol}`);
    void createAdminSessionRecord({ sessionId, email, role: rol, tenantId, ip, userAgent, locationHint: locationHintFromHeaders((request as unknown as { headers: Headers }).headers) });
    void (async () => { try { const [location, device] = await Promise.all([geolocateIp(ip), Promise.resolve(parseUserAgent(userAgent))]); await sendLoginAlertEmail({ to: email, adminEmail: email, role: rol, ip, device, location, loginAt: new Date().toISOString(), usedBackupCode }); } catch {} })();
    const response = NextResponse.json({ ok: true, sessionId });
    response.cookies.set(ADMIN_COOKIE_NAME, sessionValue, SESSION_COOKIE_OPTIONS);
    response.cookies.set('tenant_status', tenantStatus, SESSION_COOKIE_OPTIONS);
    response.cookies.set('admin_session_id', sessionId, { ...SESSION_COOKIE_OPTIONS, httpOnly: false });
    return response;
  } catch (err) { const message = err instanceof Error ? err.message : String(err); console.error('[admin/login] unhandled error:', message, err); audit('error', null, message.slice(0, 500)); if (/ADMIN_PASSWORD_PEPPER/i.test(message)) return misconfiguredResponse(['ADMIN_PASSWORD_PEPPER']); if (/Missing required InsForge configuration|ADMIN_SESSION_SECRET/i.test(message)) return misconfiguredResponse(getMissingAdminEnvVars()); return NextResponse.json({ error: 'Error interno del servidor. Intenta nuevamente en unos segundos.', code: 'SERVER_ERROR' }, { status: 500 }); }
}
