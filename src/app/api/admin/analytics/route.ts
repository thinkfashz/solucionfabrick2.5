import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { insforgeAdmin } from '@/lib/insforge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = { event?: string; user_id?: string | null; ua?: string | null; meta?: Record<string, unknown> | null; created_at?: string };

function parseBrowser(ua = '') {
  if (/edg/i.test(ua)) return 'Edge';
  if (/opr|opera/i.test(ua)) return 'Opera';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Otro';
}

function stringMeta(row: Row, key: string) {
  const value = row.meta?.[key];
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function numberMeta(row: Row, key: string) {
  const value = Number(row.meta?.[key] || 0);
  return Number.isFinite(value) ? value : 0;
}

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const session = cookie ? await decodeSession(cookie) : null;
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const days = Math.min(90, Math.max(1, Number(request.nextUrl.searchParams.get('days') || 30)));
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await insforgeAdmin.database.from('pwa_events').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(10000);
  if (error) return NextResponse.json({ error: 'No se pudieron cargar las visitas.' }, { status: 500 });

  const rows = (data || []) as Row[];
  const pageViews = rows.filter((row) => row.event === 'page_view');
  const durationRows = rows.filter((row) => row.event === 'session_end');
  const budgetEvents = rows.filter((row) => String(row.event || '').startsWith('budget_'));
  const visitors = new Set(pageViews.map((row) => row.user_id).filter(Boolean));
  const sessions = new Set(pageViews.map((row) => String(row.meta?.session_id || '')).filter(Boolean));
  const durations = durationRows.map((row) => Number(row.meta?.duration_seconds || 0)).filter((value) => value > 0);
  const avgDuration = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0;

  const countBy = (input: Row[], getter: (row: Row) => string) => Object.entries(input.reduce<Record<string, number>>((acc, row) => {
    const key = getter(row) || 'Desconocido';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));

  const daily = Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.now() - (days - 1 - index) * 86_400_000).toISOString().slice(0, 10);
    const items = pageViews.filter((row) => String(row.created_at || '').slice(0, 10) === date);
    return {
      date,
      label: new Date(`${date}T12:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }).replace('.', ''),
      views: items.length,
      visitors: new Set(items.map((row) => row.user_id).filter(Boolean)).size,
    };
  });

  const visits = pageViews.slice(0, 500).map((row) => ({
    date: row.created_at,
    visitor: row.user_id || 'anónimo',
    session: row.meta?.session_id || null,
    page: row.meta?.full_path || row.meta?.path || '/',
    title: row.meta?.title || null,
    source: row.meta?.utm_source || row.meta?.referrer || 'Directo',
    medium: row.meta?.utm_medium || null,
    campaign: row.meta?.utm_campaign || null,
    browser: row.meta?.browser || parseBrowser(row.ua || ''),
    device: row.meta?.device || 'Desconocido',
    type: row.meta?.visitor_type || 'human',
    country: row.meta?.country || null,
    region: row.meta?.region || null,
    city: row.meta?.city || null,
    ipHash: row.meta?.ip_hash || null,
    language: row.meta?.language || null,
    screen: row.meta?.screen || null,
  }));

  const serviceSelections = budgetEvents.filter((row) => row.event === 'budget_service_selected');
  const serviceAdds = budgetEvents.filter((row) => row.event === 'budget_service_added');
  const productAdds = budgetEvents.filter((row) => row.event === 'budget_product_added');
  const submissions = budgetEvents.filter((row) => row.event === 'budget_submitted');
  const whatsapp = budgetEvents.filter((row) => row.event === 'budget_whatsapp_opened');
  const receiptViews = budgetEvents.filter((row) => row.event === 'budget_receipt_viewed');

  const recentBudget = budgetEvents.slice(0, 250).map((row) => ({
    date: row.created_at,
    event: row.event || '',
    visitor: row.user_id || 'anónimo',
    session: stringMeta(row, 'session_id') || null,
    category: stringMeta(row, 'category') || null,
    service: stringMeta(row, 'service_title') || null,
    product: stringMeta(row, 'product_title') || null,
    channel: stringMeta(row, 'channel') || null,
    quoteId: stringMeta(row, 'quote_id') || null,
    totalLow: numberMeta(row, 'total_low'),
    totalHigh: numberMeta(row, 'total_high'),
    unit: stringMeta(row, 'unit') || null,
    entryMode: stringMeta(row, 'entry_mode') || null,
    priceMode: stringMeta(row, 'price_mode') || null,
    quantity: numberMeta(row, 'quantity'),
  }));

  return NextResponse.json({
    ok: true,
    periodDays: days,
    summary: {
      pageViews: pageViews.length,
      visitors: visitors.size,
      sessions: sessions.size,
      avgDuration,
      bounceEstimate: sessions.size ? Math.round((Array.from(sessions).filter((id) => pageViews.filter((row) => row.meta?.session_id === id).length === 1).length / sessions.size) * 100) : 0,
    },
    daily,
    sources: countBy(pageViews, (row) => String(row.meta?.utm_source || row.meta?.referrer || 'Directo')),
    pages: countBy(pageViews, (row) => String(row.meta?.path || '/')),
    browsers: countBy(pageViews, (row) => String(row.meta?.browser || parseBrowser(row.ua || ''))),
    devices: countBy(pageViews, (row) => String(row.meta?.device || 'Desconocido')),
    visitorTypes: countBy(pageViews, (row) => String(row.meta?.visitor_type || 'human')),
    countries: countBy(pageViews, (row) => String(row.meta?.country || 'Desconocido')),
    visits,
    budget: {
      interactions: budgetEvents.length,
      serviceSelections: serviceSelections.length,
      servicesAdded: serviceAdds.length,
      productsAdded: productAdds.length,
      receiptViews: receiptViews.length,
      submissions: submissions.length,
      whatsappOpens: whatsapp.length,
      conversionRate: serviceSelections.length ? Math.round((submissions.length / serviceSelections.length) * 1000) / 10 : 0,
      topServices: countBy(serviceSelections, (row) => stringMeta(row, 'service_title')),
      topAreas: countBy(budgetEvents.filter((row) => Boolean(stringMeta(row, 'category'))), (row) => stringMeta(row, 'category')),
      topProducts: countBy(productAdds, (row) => stringMeta(row, 'product_title')),
      recent: recentBudget,
    },
    privacy: 'Las IP se almacenan como hash irreversible y no se infiere género. El tipo humano/bot se estima mediante user-agent.',
  });
}
