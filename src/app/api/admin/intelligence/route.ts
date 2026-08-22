import { NextResponse, type NextRequest } from '@/lib/nextResponseCompat';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { insforgeAdmin } from '@/lib/insforge';
import { DEFAULT_TENANT_ID } from '@/lib/tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };
const PAGE_SIZE = 1000;
const MAX_ROWS = 100_000;

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

type OrderRow = { id: string; status?: string; total?: number | string; created_at?: string };
type ErrorRow = { id?: string; error_message?: string | null; endpoint?: string | null; status_code?: number | null; created_at?: string | null };
type QueryResult<T> = { data?: T[] | null; error?: { message?: string } | null };

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rate(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 10_000) / 100 : 0;
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

function belongsToTenant(row: EventRow, tenantId: string) {
  const eventTenant = String(row.meta?.tenantId || row.meta?.tenant_id || '').trim();
  if (eventTenant) return eventTenant === tenantId;
  // Legacy events did not always carry tenant metadata. They are only
  // attributed to the default tenant to avoid leaking them into SaaS tenants.
  return tenantId === DEFAULT_TENANT_ID;
}

async function fetchAll<T>(label: string, pageFactory: (from: number, to: number) => Promise<QueryResult<T>>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const result = await pageFactory(from, from + PAGE_SIZE - 1);
    if (result.error) throw new Error(`${label}: ${result.error.message || 'consulta fallida'}`);
    const page = result.data || [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
  throw new Error(`${label}: se alcanzó el límite de seguridad de ${MAX_ROWS.toLocaleString('es-CL')} filas`);
}

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const session = cookie ? await decodeSession(cookie) : null;
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: NO_STORE });

  const tenantId = session.tenant_id || DEFAULT_TENANT_ID;
  if (!tenantId) return NextResponse.json({ error: 'Sesión sin tenant válido' }, { status: 403, headers: NO_STORE });

  const days = Math.min(90, Math.max(1, Number(request.nextUrl.searchParams.get('days') || 30)));
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();

  try {
    const [allEvents, products, errors, orders, leads] = await Promise.all([
      fetchAll<EventRow>('pwa_events', async (from, to) => {
        const result = await insforgeAdmin.database.from('pwa_events')
          .select('event,user_id,meta,created_at')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .range(from, to);
        return result as QueryResult<EventRow>;
      }),
      fetchAll<ProductRow>('products', async (from, to) => {
        const result = await insforgeAdmin.database.from('products')
          .select('id,name,description,price,supplier_price,stock,activo,featured,image_url,created_at')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .range(from, to);
        return result as QueryResult<ProductRow>;
      }),
      fetchAll<ErrorRow>('admin_error_logs', async (from, to) => {
        const result = await insforgeAdmin.database.from('admin_error_logs')
          .select('id,error_message,endpoint,status_code,created_at')
          .gte('created_at', hourAgo)
          .order('created_at', { ascending: false })
          .range(from, to);
        return result as QueryResult<ErrorRow>;
      }),
      fetchAll<OrderRow>('orders', async (from, to) => {
        const result = await insforgeAdmin.database.from('orders')
          .select('id,status,total,created_at')
          .eq('tenant_id', tenantId)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .range(from, to);
        return result as QueryResult<OrderRow>;
      }),
      fetchAll<{ id: string; created_at?: string }>('leads', async (from, to) => {
        const result = await insforgeAdmin.database.from('leads')
          .select('id,created_at')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .range(from, to);
        return result as QueryResult<{ id: string; created_at?: string }>;
      }),
    ]);

    const events = allEvents.filter((row) => belongsToTenant(row, tenantId));
    const pageViews = events.filter((row) => row.event === 'page_view');
    const visitors = new Set(pageViews.map((row) => row.user_id).filter(Boolean));
    const sessions = new Set(pageViews.map((row) => String(row.meta?.session_id || '')).filter(Boolean));
    const contactEvents = events.filter((row) => isEvent(row.event, /(whatsapp|lead|quote|cotiza|contact)/i));
    const productViews = events.filter((row) => isEvent(row.event, /(product_view|view_product|producto_visto)/i));
    const addToCart = events.filter((row) => isEvent(row.event, /(add_to_cart|cart_add|agregar_carrito)/i));
    const checkout = events.filter((row) => isEvent(row.event, /(checkout|begin_checkout)/i));

    const activeProducts = products.filter((product) => product.activo !== false);
    const criticalStockAll = activeProducts.filter((product) => n(product.stock) <= 5);
    const incompleteProductsAll = activeProducts.filter((product) => !product.description?.trim() || !product.image_url);
    const lowMarginAll = activeProducts
      .map((product) => {
        const price = n(product.price);
        const cost = n(product.supplier_price);
        const margin = price > 0 && cost > 0 ? Math.round(((price - cost) / price) * 100) : null;
        return { ...product, margin };
      })
      .filter((product) => product.margin !== null && product.margin < 25)
      .sort((a, b) => (a.margin ?? 0) - (b.margin ?? 0));

    const paidOrders = orders.filter((order) => /(paid|pagad|approved|complet)/i.test(String(order.status || '')));
    const revenue = paidOrders.reduce((sum, order) => sum + n(order.total), 0);
    const averageOrderValue = paidOrders.length ? Math.round(revenue / paidOrders.length) : 0;
    const visits = pageViews.length;
    const contacts = contactEvents.length + leads.length;

    const funnel = {
      visits,
      productViews: productViews.length,
      addToCart: addToCart.length,
      checkout: checkout.length,
      orders: orders.length,
      paidOrders: paidOrders.length,
      contacts,
      rates: {
        visitToProduct: rate(productViews.length, visits),
        productToCart: rate(addToCart.length, productViews.length),
        cartToCheckout: rate(checkout.length, addToCart.length),
        checkoutToOrder: rate(orders.length, checkout.length),
        visitToOrder: rate(orders.length, visits),
        visitToContact: rate(contacts, visits),
      },
    };

    const pages = countBy(pageViews, (row) => String(row.meta?.path || row.meta?.full_path || '/')).slice(0, 10);
    const sources = countBy(pageViews, (row) => String(row.meta?.utm_source || row.meta?.referrer || 'Directo')).slice(0, 10);

    const recommendations: Array<{ severity: 'high' | 'medium' | 'low'; title: string; detail: string; href?: string }> = [];
    if (errors.length) recommendations.push({ severity: 'high', title: `${errors.length} errores de runtime en la última hora`, detail: 'Revisa las rutas afectadas antes de publicar nuevos cambios.', href: '/admin/observabilidad' });
    if (criticalStockAll.length) recommendations.push({ severity: 'high', title: `${criticalStockAll.length} productos con stock crítico`, detail: 'Repón, pausa o ajusta la publicidad de estos productos.', href: '/admin/intelligence/operations' });
    if (incompleteProductsAll.length) recommendations.push({ severity: 'medium', title: `${incompleteProductsAll.length} productos incompletos`, detail: 'Faltan imágenes o descripciones; esto reduce confianza y conversión.', href: '/admin/productos' });
    if (lowMarginAll.length) recommendations.push({ severity: 'medium', title: `${lowMarginAll.length} productos con margen bajo 25%`, detail: 'Revisa costo proveedor, envío y Price Watch antes de promocionarlos.', href: '/admin/intelligence/operations' });
    if (visits >= 30 && funnel.rates.visitToContact < 1) recommendations.push({ severity: 'medium', title: `Conversión a contacto de ${funnel.rates.visitToContact}%`, detail: 'Hay tráfico pero pocos contactos. Prioriza CTA, WhatsApp y formulario en las páginas más vistas.', href: '/admin/analitica' });
    if (productViews.length >= 20 && funnel.rates.productToCart < 3) recommendations.push({ severity: 'medium', title: `Solo ${funnel.rates.productToCart}% pasa de producto a carrito`, detail: 'Revisa precio, confianza, imágenes, envío y claridad del botón de compra.', href: '/admin/productos' });
    if (checkout.length >= 5 && funnel.rates.checkoutToOrder < 30) recommendations.push({ severity: 'high', title: `Checkout convierte ${funnel.rates.checkoutToOrder}%`, detail: 'Existe fricción entre iniciar checkout y crear pedido. Revisa errores, costos de envío y medios de pago.', href: '/admin/observabilidad' });
    if (!recommendations.length) recommendations.push({ severity: 'low', title: 'Operación sin alertas críticas', detail: 'Mantén el monitoreo y compara rendimiento semanal.' });

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      periodDays: days,
      tenantId,
      summary: {
        pageViews: visits,
        visitors: visitors.size,
        sessions: sessions.size,
        contacts,
        productViews: productViews.length,
        addToCart: addToCart.length,
        checkoutStarts: checkout.length,
        orders: orders.length,
        paidOrders: paidOrders.length,
        revenue,
        averageOrderValue,
        activeProducts: activeProducts.length,
        criticalStock: criticalStockAll.length,
        runtimeErrorsHour: errors.length,
      },
      funnel,
      pages,
      sources,
      products: {
        criticalStock: criticalStockAll.slice(0, 12),
        incomplete: incompleteProductsAll.slice(0, 12),
        lowMargin: lowMarginAll.slice(0, 12),
      },
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
  } catch (error) {
    console.error('[admin/intelligence] analytics query failed:', error);
    return NextResponse.json({
      error: 'No se pudo cargar una o más fuentes de Fabrick Intelligence.',
      detail: error instanceof Error ? error.message : 'Error desconocido',
    }, { status: 503, headers: NO_STORE });
  }
}
