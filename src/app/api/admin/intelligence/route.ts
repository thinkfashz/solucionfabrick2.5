import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { insforgeAdmin } from '@/lib/insforge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

type EventRow = {
  event?: string | null;
  user_id?: string | null;
  created_at?: string | null;
  meta?: Record<string, unknown> | null;
};

type ProductRow = {
  id: string;
  name?: string | null;
  description?: string | null;
  price?: number | string | null;
  supplier_price?: number | string | null;
  stock?: number | null;
  activo?: boolean | null;
  featured?: boolean | null;
  image_url?: string | null;
  created_at?: string | null;
};

type ErrorRow = {
  id?: string;
  error_message?: string | null;
  endpoint?: string | null;
  status_code?: number | null;
  created_at?: string | null;
};

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function countBy<T>(rows: T[], getter: (row: T) => string) {
  return Object.entries(rows.reduce<Record<string, number>>((acc, row) => {
    const key = getter(row) || 'Desconocido';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {}))
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));
}

function isEvent(event: string | null | undefined, pattern: RegExp) {
  return pattern.test(String(event || ''));
}

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const session = cookie ? await decodeSession(cookie) : null;
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: NO_STORE });

  const days = Math.min(90, Math.max(1, Number(request.nextUrl.searchParams.get('days') || 30)));
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();

  const [eventsResult, productsResult, errorsResult, ordersResult, leadsResult] = await Promise.allSettled([
    insforgeAdmin.database.from('pwa_events').select('event,user_id,meta,created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(15000),
    insforgeAdmin.database.from('products').select('id,name,description,price,supplier_price,stock,activo,featured,image_url,created_at').order('created_at', { ascending: false }).limit(2500),
    insforgeAdmin.database.from('admin_error_logs').select('id,error_message,endpoint,status_code,created_at').gte('created_at', hourAgo).order('created_at', { ascending: false }).limit(50),
    insforgeAdmin.database.from('orders').select('id,status,total,created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(5000),
    insforgeAdmin.database.from('leads').select('id,created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(5000),
  ]);

  const events = eventsResult.status === 'fulfilled' ? ((eventsResult.value.data || []) as EventRow[]) : [];
  const products = productsResult.status === 'fulfilled' ? ((productsResult.value.data || []) as ProductRow[]) : [];
  const errors = errorsResult.status === 'fulfilled' ? ((errorsResult.value.data || []) as ErrorRow[]) : [];
  const orders = ordersResult.status === 'fulfilled' ? ((ordersResult.value.data || []) as Array<{ id: string; status?: string; total?: number | string; created_at?: string }>) : [];
  const leads = leadsResult.status === 'fulfilled' ? ((leadsResult.value.data || []) as Array<{ id: string; created_at?: string }>) : [];

  const pageViews = events.filter((row) => row.event === 'page_view');
  const visitors = new Set(pageViews.map((row) => row.user_id).filter(Boolean));
  const sessions = new Set(pageViews.map((row) => String(row.meta?.session_id || '')).filter(Boolean));
  const contactEvents = events.filter((row) => isEvent(row.event, /(whatsapp|lead|quote|cotiza|contact)/i));
  const productViews = events.filter((row) => isEvent(row.event, /(product_view|view_product|producto_visto)/i));
  const addToCart = events.filter((row) => isEvent(row.event, /(add_to_cart|cart_add|agregar_carrito)/i));
  const checkout = events.filter((row) => isEvent(row.event, /(checkout|begin_checkout)/i));

  const activeProducts = products.filter((product) => product.activo !== false);
  const criticalStock = activeProducts.filter((product) => n(product.stock) <= 5).slice(0, 12);
  const incompleteProducts = activeProducts.filter((product) => !product.description?.trim() || !product.image_url).slice(0, 12);
  const lowMargin = activeProducts
    .map((product) => {
      const price = n(product.price);
      const cost = n(product.supplier_price);
      const margin = price > 0 && cost > 0 ? Math.round(((price - cost) / price) * 100) : null;
      return { ...product, margin };
    })
    .filter((product) => product.margin !== null && product.margin < 25)
    .sort((a, b) => (a.margin ?? 0) - (b.margin ?? 0))
    .slice(0, 12);

  const pages = countBy(pageViews, (row) => String(row.meta?.path || row.meta?.full_path || '/')).slice(0, 10);
  const sources = countBy(pageViews, (row) => String(row.meta?.utm_source || row.meta?.referrer || 'Directo')).slice(0, 10);

  const recommendations: Array<{ severity: 'high' | 'medium' | 'low'; title: string; detail: string; href?: string }> = [];
  if (errors.length) recommendations.push({ severity: 'high', title: `${errors.length} errores de runtime en la última hora`, detail: 'Revisa las rutas afectadas antes de publicar nuevos cambios.', href: '/admin/observabilidad' });
  if (criticalStock.length) recommendations.push({ severity: 'high', title: `${criticalStock.length} productos con stock crítico`, detail: 'Repón, pausa o ajusta la publicidad de estos productos.', href: '/admin/productos' });
  if (incompleteProducts.length) recommendations.push({ severity: 'medium', title: `${incompleteProducts.length} productos incompletos`, detail: 'Faltan imágenes o descripciones; esto reduce confianza y conversión.', href: '/admin/productos' });
  if (lowMargin.length) recommendations.push({ severity: 'medium', title: `${lowMargin.length} productos con margen bajo 25%`, detail: 'Revisa costo proveedor, envío y precio antes de promocionarlos.', href: '/admin/productos' });
  if (pageViews.length > 30 && contactEvents.length === 0 && leads.length === 0) recommendations.push({ severity: 'medium', title: 'Tráfico sin contactos registrados', detail: 'Revisa CTA de WhatsApp, formulario y medición de conversiones.', href: '/admin/analitica' });
  if (!recommendations.length) recommendations.push({ severity: 'low', title: 'Operación sin alertas críticas', detail: 'Mantén el monitoreo y compara rendimiento semanal.' });

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    periodDays: days,
    summary: {
      pageViews: pageViews.length,
      visitors: visitors.size,
      sessions: sessions.size,
      contacts: contactEvents.length + leads.length,
      productViews: productViews.length,
      addToCart: addToCart.length,
      checkoutStarts: checkout.length,
      orders: orders.length,
      activeProducts: activeProducts.length,
      criticalStock: criticalStock.length,
      runtimeErrorsHour: errors.length,
    },
    funnel: {
      visits: pageViews.length,
      productViews: productViews.length,
      addToCart: addToCart.length,
      checkout: checkout.length,
      orders: orders.length,
      contacts: contactEvents.length + leads.length,
    },
    pages,
    sources,
    products: { criticalStock, incomplete: incompleteProducts, lowMargin },
    errors: errors.slice(0, 12),
    recommendations,
    permissions: {
      mode: 'copilot',
      readOnlyAnalytics: true,
      productChangesRequireExplicitApproval: true,
      secretsAccessible: false,
      paymentCredentialsAccessible: false,
    },
  }, { headers: NO_STORE });
}
