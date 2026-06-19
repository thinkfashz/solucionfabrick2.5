import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { insforge } from '@/lib/insforge';
import { recentAdminSessions } from '@/lib/adminSessionAudit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SessionPayload = { email: string; rol?: string; tenant_id?: string; session_id?: string };
type DashboardPayload = {
  ok: boolean;
  profile: Record<string, unknown>;
  stats: { products: number; orders: number; budgets: number; invoices: number; leads: number; revenue: number };
  sessions: unknown[];
  health: { app: string; db: string; latency_ms: number; realtime: string; last_deploy: string; cached?: boolean };
  console: string[];
};

const DASHBOARD_CACHE_TTL_MS = 15_000;
const dashboardCache = new Map<string, { expiresAt: number; payload: DashboardPayload }>();

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

function cacheKeyFor(session: SessionPayload) {
  return `${session.email}:${session.rol || 'admin'}:${session.tenant_id || 'default'}`;
}

function cachedResponse(key: string, started: number) {
  const cached = dashboardCache.get(key);
  if (!cached || cached.expiresAt <= Date.now()) return null;
  return {
    ...cached.payload,
    health: {
      ...cached.payload.health,
      latency_ms: Date.now() - started,
      cached: true,
    },
  } satisfies DashboardPayload;
}

export async function GET(request: NextRequest) {
  const started = Date.now();
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!cookie?.value) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const session = await decodeSession(cookie.value) as SessionPayload | null;
  if (!session) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

  const cacheKey = cacheKeyFor(session);
  const cached = cachedResponse(cacheKey, started);
  if (cached) return NextResponse.json(cached);

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

  const payload: DashboardPayload = {
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
  };

  dashboardCache.set(cacheKey, { expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS, payload });
  return NextResponse.json(payload);
}
