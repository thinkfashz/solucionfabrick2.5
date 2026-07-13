import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { insforgeAdmin } from '@/lib/insforge';
import { recentAdminSessions } from '@/lib/adminSessionAudit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SessionPayload = { email: string; rol?: string; tenant_id?: string; session_id?: string };
type DataRow = Record<string, unknown>;

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_DAYS = 30;

async function getProfile(email: string) {
  const { data } = await insforgeAdmin.database
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
    const res = await insforgeAdmin.database.from(table).select('id', { count: 'exact', head: true });
    return typeof res.count === 'number' ? res.count : 0;
  } catch { return 0; }
}

async function safeRowsSince(table: string, sinceIso: string, limit = 5000) {
  try {
    const res = await insforgeAdmin.database.from(table).select('*').gte('created_at', sinceIso).order('created_at', { ascending: false }).limit(limit);
    if (res.error) return { rows: [] as DataRow[], available: false };
    return { rows: (res.data || []) as DataRow[], available: true };
  } catch {
    return { rows: [] as DataRow[], available: false };
  }
}

function dayKey(value: unknown) {
  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function paymentKind(row: DataRow) {
  const state = `${row.status || ''} ${row.payment_status || ''}`.toLowerCase();
  const method = `${row.payment_method || ''} ${row.payment_type || ''} ${row.payment_method_id || ''} ${row.payment_provider || ''}`.toLowerCase();
  const approved = /(approved|succeeded|pagad|confirmad|en_preparacion|enviado|entregado)/.test(state);
  const failed = /(failed|fallid|reject|cancel|refund|charged_back|contracargo|error)/.test(state);
  const transfer = /transfer/.test(`${state} ${method}`);
  return { approved, failed, transfer, transferIssue: transfer && failed, transferPending: transfer && !approved && !failed };
}

export async function GET(request: NextRequest) {
  const started = Date.now();
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!cookie?.value) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const session = await decodeSession(cookie.value) as SessionPayload | null;
  if (!session) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

  const sinceDate = new Date(Date.now() - (PERIOD_DAYS - 1) * DAY_MS);
  sinceDate.setHours(0, 0, 0, 0);
  const sinceIso = sinceDate.toISOString();

  const [profile, sessions, products, orders, budgets, invoices, leads, orderWindow, visitWindow] = await Promise.all([
    getProfile(session.email),
    recentAdminSessions(10).catch(() => []),
    safeCount('products'),
    safeCount('orders'),
    safeCount('presupuesto_registros'),
    safeCount('invoices'),
    safeCount('leads'),
    safeRowsSince('orders', sinceIso),
    safeRowsSince('pwa_events', sinceIso),
  ]);

  const daily = Array.from({ length: PERIOD_DAYS }, (_, index) => {
    const date = new Date(sinceDate.getTime() + index * DAY_MS);
    return { date: date.toISOString().slice(0, 10), label: date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }).replace('.', ''), visitors: 0, pageViews: 0, sales: 0, failed: 0, revenue: 0 };
  });
  const dailyMap = new Map(daily.map((item) => [item.date, item]));
  const visitorSets = new Map<string, Set<string>>();
  const allVisitors = new Set<string>();
  let pageViews = 0;

  for (const [index, row] of visitWindow.rows.entries()) {
    if (String(row.event || '') !== 'page_view') continue;
    const key = dayKey(row.created_at);
    const point = dailyMap.get(key);
    if (!point) continue;
    const visitor = String(row.user_id || `anon-${key}-${index}`);
    if (!visitorSets.has(key)) visitorSets.set(key, new Set());
    visitorSets.get(key)?.add(visitor);
    allVisitors.add(visitor);
    point.pageViews += 1;
    pageViews += 1;
  }
  for (const point of daily) point.visitors = visitorSets.get(point.date)?.size || 0;

  let approvedSales = 0;
  let failedSales = 0;
  let pendingSales = 0;
  let transferPending = 0;
  let transferIssues = 0;
  let revenue = 0;
  const incidents: Array<{ id: string; customer: string; total: number; status: string; createdAt: string; kind: 'payment' | 'transfer' }> = [];

  for (const row of orderWindow.rows) {
    const kind = paymentKind(row);
    const total = Number(row.total || 0) || 0;
    const point = dailyMap.get(dayKey(row.created_at));
    if (kind.approved) {
      approvedSales += 1;
      revenue += total;
      if (point) { point.sales += 1; point.revenue += total; }
    } else if (kind.failed) {
      failedSales += 1;
      if (point) point.failed += 1;
    } else {
      pendingSales += 1;
    }
    if (kind.transferPending) transferPending += 1;
    if (kind.transferIssue) transferIssues += 1;
    if (kind.failed || kind.transferIssue) incidents.push({
      id: String(row.id || ''),
      customer: String(row.customer_email || row.cliente_email || row.customer_name || 'Cliente sin identificar'),
      total,
      status: String(row.payment_status || row.status || 'fallido'),
      createdAt: String(row.created_at || ''),
      kind: kind.transfer ? 'transfer' : 'payment',
    });
  }

  const uniqueVisitors = allVisitors.size;
  const conversionRate = uniqueVisitors > 0 ? Number(((approvedSales / uniqueVisitors) * 100).toFixed(1)) : 0;
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
    commerce30d: { approvedSales, failedSales, pendingSales, transferPending, transferIssues, revenue, conversionRate },
    traffic30d: { visitors: uniqueVisitors, pageViews, trackingAvailable: visitWindow.available },
    daily30d: daily,
    incidents: incidents.slice(0, 8),
    sessions,
    health,
    console: [
      `[${new Date().toLocaleTimeString('es-CL')}] Admin activo: ${session.email}`,
      `[DB] latency=${health.latency_ms}ms · productos=${products} · pedidos=${orders} · ingresos_pagados=${revenue}`,
      `[SECURITY] sesiones auditadas=${sessions.length}`,
      `[BUILD] commit=${health.last_deploy}`,
    ],
  });
}
