import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { insforge } from '@/lib/insforge';
import { recentAdminSessions } from '@/lib/adminSessionAudit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SessionPayload = { email: string; rol?: string; tenant_id?: string; session_id?: string };

async function getProfile(email: string) {
  const { data } = await insforge.database
    .from('admin_profiles')
    .select('email, display_name, avatar_url, bio')
    .eq('email', email)
    .limit(1);
  const p = data?.[0] as { email?: string; display_name?: string | null; avatar_url?: string | null; bio?: string | null } | undefined;
  return {
    email,
    name: p?.display_name || email.split('@')[0],
    avatar_url: p?.avatar_url || null,
    bio: p?.bio || 'Administrador Soluciones Fabrick',
  };
}

async function safeCount(table: string) {
  try {
    const res = await insforge.database.from(table).select('id', { count: 'exact', head: true });
    return typeof res.count === 'number' ? res.count : 0;
  } catch { return 0; }
}

async function safeRows(table: string, limit = 8) {
  try {
    const res = await insforge.database.from(table).select('*').order('created_at', { ascending: false }).limit(limit);
    return res.data || [];
  } catch { return []; }
}

export async function GET(request: NextRequest) {
  const started = Date.now();
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!cookie?.value) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const session = await decodeSession(cookie.value) as SessionPayload | null;
  if (!session) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

  const [profile, sessions, products, orders, budgets, invoices, leads, recentOrders] = await Promise.all([
    getProfile(session.email),
    recentAdminSessions(10).catch(() => []),
    safeCount('products'),
    safeCount('orders'),
    safeCount('presupuesto_registros'),
    safeCount('invoices'),
    safeCount('leads'),
    safeRows('orders', 6),
  ]);

  const revenue = (recentOrders as Record<string, unknown>[]).reduce((sum, row) => sum + Number(row.total || 0), 0);
  const health = {
    app: 'online',
    db: 'online',
    latency_ms: Date.now() - started,
    realtime: 'on-demand',
    last_deploy: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
  };

  return NextResponse.json({
    ok: true,
    profile: { ...profile, role: session.rol || 'admin', session_id: session.session_id || null },
    stats: { products, orders, budgets, invoices, leads, revenue },
    sessions,
    health,
    console: [
      `[${new Date().toLocaleTimeString('es-CL')}] Admin activo: ${session.email}`,
      `[DB] latency=${health.latency_ms}ms · productos=${products} · pedidos=${orders}`,
      `[SECURITY] sesiones auditadas=${sessions.length}`,
      `[BUILD] commit=${health.last_deploy}`,
    ],
  });
}
