import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { insforgeAdmin } from '@/lib/insforge';
import { probeMercadoPago } from '@/lib/mercadopago';
import { campaignStatusSnapshot } from '@/lib/campaignMode';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

type ServiceId = 'vercel' | 'insforge' | 'github' | 'mercadopago' | 'cloudflare';

type ServiceHealth = {
  online: boolean;
  latencyMs: number;
  status?: string;
  message?: string;
};

type LatestOrder = {
  id: string;
  total: number | null;
  status: string;
  created_at: string;
};

type ErrorRow = {
  id: string;
  error_message?: string | null;
  endpoint?: string | null;
  created_at: string;
  status_code?: number | null;
};

function measure() {
  const started = performance.now();
  return () => Math.max(1, Math.round(performance.now() - started));
}

function countFrom(result: PromiseSettledResult<unknown>) {
  if (result.status !== 'fulfilled') return 0;
  const value = result.value as { count?: number | null } | null;
  return value?.count ?? 0;
}

function dataFrom<T>(result: PromiseSettledResult<unknown>, fallback: T): T {
  if (result.status !== 'fulfilled') return fallback;
  const value = result.value as { data?: unknown } | null;
  return (value?.data ?? fallback) as T;
}

async function requireAdmin(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return null;
  return decodeSession(sessionCookie.value);
}

async function probeInsforge() {
  const done = measure();
  try {
    const { error } = await insforgeAdmin.database
      .from('products')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    return {
      online: !error,
      latencyMs: done(),
      status: error ? 'error' : 'ok',
      message: error?.message,
    } satisfies ServiceHealth;
  } catch (error) {
    return {
      online: false,
      latencyMs: done(),
      status: 'error',
      message: error instanceof Error ? error.message : 'insforge_unreachable',
    } satisfies ServiceHealth;
  }
}

async function probeMercadoPagoHealth() {
  const done = measure();
  try {
    const mp = await probeMercadoPago({ timeoutMs: 3_500 });
    return {
      online: mp.status === 'ok',
      latencyMs: mp.latencyMs ?? done(),
      status: mp.status,
      message: mp.message,
    } satisfies ServiceHealth;
  } catch (error) {
    return {
      online: false,
      latencyMs: done(),
      status: 'error',
      message: error instanceof Error ? error.message : 'mercadopago_unreachable',
    } satisfies ServiceHealth;
  }
}

function buildReadiness(args: {
  servicioStatus: Record<ServiceId, ServiceHealth>;
  errorsHour: number;
  productosActivos: number;
}) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const campaign = campaignStatusSnapshot();

  if (!args.servicioStatus.insforge.online) blockers.push('InsForge no responde; catálogo, pedidos y admin pueden fallar.');
  if (!args.servicioStatus.vercel.online) blockers.push('Runtime Vercel no aparece saludable.');
  if (!args.servicioStatus.mercadopago.online) warnings.push('Mercado Pago no está OK; checkout puede quedar degradado.');
  if (args.servicioStatus.insforge.latencyMs > 900) warnings.push(`InsForge lento: ${args.servicioStatus.insforge.latencyMs}ms.`);
  if (args.servicioStatus.mercadopago.latencyMs > 1200) warnings.push(`Mercado Pago lento: ${args.servicioStatus.mercadopago.latencyMs}ms.`);
  if (args.errorsHour >= 10) warnings.push(`Errores última hora altos: ${args.errorsHour}.`);
  if (args.productosActivos === 0) warnings.push('No hay productos activos disponibles para catálogo/checkout.');
  if (campaign.mode !== 'normal') warnings.push(`Modo campaña activo: ${campaign.mode}.`);
  if (!campaign.checkoutEnabled) warnings.push('Checkout público pausado por configuración de campaña.');
  if (!campaign.aiChatEnabled) warnings.push('Chat IA público pausado por configuración de campaña.');

  return {
    level: blockers.length ? 'degraded' : warnings.length ? 'watch' : 'ready',
    publicPagesReady: !blockers.some((msg) => /InsForge|Vercel/i.test(msg)),
    checkoutReady: !blockers.length && campaign.checkoutEnabled && args.servicioStatus.mercadopago.status !== 'invalid_token',
    blockers,
    warnings,
    campaign,
  };
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401, headers: NO_STORE });
  }

  const started = measure();
  const now = Date.now();
  const hoy = new Date(now);
  hoy.setHours(0, 0, 0, 0);
  const hoyISO = hoy.toISOString();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();

  const [prod, ped, leads, orders, revenue, errors, insforgeHealth, mpHealth] = await Promise.allSettled([
    insforgeAdmin.database.from('products').select('id', { count: 'exact', head: true }).neq('activo', false),
    insforgeAdmin.database.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', hoyISO),
    insforgeAdmin.database.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', hoyISO),
    insforgeAdmin.database.from('orders').select('id,total,status,created_at').order('created_at', { ascending: false }).limit(8),
    insforgeAdmin.database.from('orders').select('total').gte('created_at', weekAgo).eq('status', 'pagada'),
    insforgeAdmin.database.from('admin_error_logs').select('id,error_message,endpoint,created_at,status_code').gte('created_at', hourAgo).order('created_at', { ascending: false }).limit(8),
    probeInsforge(),
    probeMercadoPagoHealth(),
  ]);

  const latestOrders = dataFrom<LatestOrder[]>(orders, []);
  const revenueRows = dataFrom<Array<{ total: number | null }>>(revenue, []);
  const errorRows = dataFrom<ErrorRow[]>(errors, []);
  const productosActivos = countFrom(prod);
  const errorsHour = errorRows.length;
  const insforgeService = insforgeHealth.status === 'fulfilled'
    ? insforgeHealth.value as ServiceHealth
    : { online: false, latencyMs: 0, status: 'error', message: 'insforge_probe_failed' };
  const mercadoPagoService = mpHealth.status === 'fulfilled'
    ? mpHealth.value as ServiceHealth
    : { online: false, latencyMs: 0, status: 'error', message: 'mercadopago_probe_failed' };

  const servicioStatus: Record<ServiceId, ServiceHealth> = {
    vercel: {
      online: true,
      latencyMs: started(),
      status: process.env.VERCEL ? 'ok' : 'local',
      message: process.env.VERCEL_REGION ? `region:${process.env.VERCEL_REGION}` : 'runtime activo',
    },
    insforge: insforgeService,
    github: {
      online: true,
      latencyMs: 1,
      status: 'not_probed',
      message: 'No se consulta GitHub en cada poll para evitar gasto de API.',
    },
    mercadopago: mercadoPagoService,
    cloudflare: {
      online: true,
      latencyMs: 1,
      status: 'edge_protected',
      message: 'Protección/CDN gestionada fuera de la app.',
    },
  };
  const readiness = buildReadiness({ servicioStatus, errorsHour, productosActivos });

  const payload = {
    ok: true,
    generatedAt: new Date().toISOString(),
    admin: { email: session.email, role: session.rol ?? 'admin' },
    metrics: {
      productosActivos,
      pedidosHoy: countFrom(ped),
      leadsHoy: countFrom(leads),
      revenueWeek: revenueRows.reduce((sum, row) => sum + Number(row.total ?? 0), 0),
      errorsHour,
      latestOrders,
      errorRows,
    },
    readiness,
    servicioStatus,
  };

  return NextResponse.json(payload, { status: 200, headers: NO_STORE });
}
