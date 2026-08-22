import { insforgeAdmin } from '@/lib/insforge';
import { DEFAULT_TENANT_ID } from '@/lib/tenant';

export type DailyBriefAction = {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  area: 'conversion' | 'catalog' | 'stock' | 'margin' | 'traffic' | 'operations';
  title: string;
  detail: string;
  href: string;
  score: number;
};

export type FabrickDailyBrief = {
  tenantId: string;
  generatedAt: string;
  periodDays: number;
  healthScore: number;
  headline: string;
  metrics: {
    visits: number;
    productViews: number;
    addToCart: number;
    checkout: number;
    orders: number;
    paidOrders: number;
    contacts: number;
    revenue: number;
    criticalStock: number;
    lowMargin: number;
    incompleteProducts: number;
  };
  actions: DailyBriefAction[];
};

type EventRow = { event?: string | null; meta?: Record<string, unknown> | null; created_at?: string | null };
type ProductRow = { id: string; name?: string | null; description?: string | null; image_url?: string | null; price?: number | string | null; supplier_price?: number | string | null; stock?: number | null; activo?: boolean | null; tenant_id?: string | null };
type OrderRow = { id: string; total?: number | string | null; status?: string | null; payment_status?: string | null; tenant_id?: string | null; created_at?: string | null };

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isEvent(value: string | null | undefined, pattern: RegExp) {
  return pattern.test(String(value || ''));
}

function eventBelongsToTenant(row: EventRow, tenantId: string) {
  const metaTenant = String(row.meta?.tenantId || row.meta?.tenant_id || '');
  if (metaTenant) return metaTenant === tenantId;
  return tenantId === DEFAULT_TENANT_ID;
}

function scoreActions(actions: DailyBriefAction[]) {
  return actions.sort((a, b) => b.score - a.score).slice(0, 5);
}

export async function buildFabrickDailyBrief(tenantId: string, periodDays = 7): Promise<FabrickDailyBrief> {
  const days = Math.min(30, Math.max(1, periodDays));
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const [eventsResult, productsResult, ordersResult] = await Promise.all([
    insforgeAdmin.database.from('pwa_events').select('event,meta,created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(20_000),
    insforgeAdmin.database.from('products').select('id,name,description,image_url,price,supplier_price,stock,activo,tenant_id').eq('tenant_id', tenantId).limit(10_000),
    insforgeAdmin.database.from('orders').select('id,total,status,payment_status,tenant_id,created_at').eq('tenant_id', tenantId).gte('created_at', since).limit(10_000),
  ]);

  if (eventsResult.error) throw new Error(`pwa_events: ${eventsResult.error.message}`);
  if (productsResult.error) throw new Error(`products: ${productsResult.error.message}`);
  if (ordersResult.error) throw new Error(`orders: ${ordersResult.error.message}`);

  const events = ((eventsResult.data || []) as EventRow[]).filter((row) => eventBelongsToTenant(row, tenantId));
  const products = (productsResult.data || []) as ProductRow[];
  const orders = (ordersResult.data || []) as OrderRow[];

  const visits = events.filter((row) => row.event === 'page_view').length;
  const productViews = events.filter((row) => isEvent(row.event, /(product_view|view_product|producto_visto)/i)).length;
  const addToCart = events.filter((row) => isEvent(row.event, /(add_to_cart|cart_add|agregar_carrito)/i)).length;
  const checkout = events.filter((row) => isEvent(row.event, /(checkout|begin_checkout)/i)).length;
  const contacts = events.filter((row) => isEvent(row.event, /(whatsapp|lead|quote|cotiza|contact)/i)).length;
  const paidOrders = orders.filter((order) => /paid|approved|pagad|complet/i.test(String(order.payment_status || order.status || ''))).length;
  const revenue = orders.reduce((sum, order) => /paid|approved|pagad|complet/i.test(String(order.payment_status || order.status || '')) ? sum + num(order.total) : sum, 0);

  const activeProducts = products.filter((product) => product.activo !== false);
  const criticalStock = activeProducts.filter((product) => num(product.stock) <= 5).length;
  const incompleteProducts = activeProducts.filter((product) => !String(product.description || '').trim() || !String(product.image_url || '').trim()).length;
  const lowMargin = activeProducts.filter((product) => {
    const price = num(product.price);
    const cost = num(product.supplier_price);
    return price > 0 && cost > 0 && ((price - cost) / price) * 100 < 25;
  }).length;

  const actions: DailyBriefAction[] = [];
  const visitToProduct = visits > 0 ? (productViews / visits) * 100 : 0;
  const productToCart = productViews > 0 ? (addToCart / productViews) * 100 : 0;
  const cartToCheckout = addToCart > 0 ? (checkout / addToCart) * 100 : 0;
  const checkoutToOrder = checkout > 0 ? (orders.length / checkout) * 100 : 0;
  const visitToContact = visits > 0 ? (contacts / visits) * 100 : 0;

  if (criticalStock > 0) actions.push({ id: 'stock-critical', priority: criticalStock >= 5 ? 'critical' : 'high', area: 'stock', title: `${criticalStock} productos con stock crítico`, detail: 'Repón, pausa publicidad o ajusta disponibilidad antes de generar demanda que no puedas cumplir.', href: '/admin/intelligence/operations', score: 96 });
  if (lowMargin > 0) actions.push({ id: 'margin-risk', priority: lowMargin >= 5 ? 'high' : 'medium', area: 'margin', title: `${lowMargin} productos bajo 25 % de margen`, detail: 'Revisa costo proveedor y precio sugerido antes de promocionarlos.', href: '/admin/intelligence/operations', score: 90 });
  if (incompleteProducts > 0) actions.push({ id: 'catalog-incomplete', priority: incompleteProducts >= 8 ? 'high' : 'medium', area: 'catalog', title: `${incompleteProducts} fichas incompletas`, detail: 'Completa imágenes y descripciones: son señales directas de confianza y conversión.', href: '/admin/productos', score: 82 });
  if (visits >= 25 && visitToProduct < 20) actions.push({ id: 'visit-product', priority: visitToProduct < 10 ? 'high' : 'medium', area: 'conversion', title: 'Pocas visitas llegan a productos', detail: `Solo ${visitToProduct.toFixed(1)} % de las vistas terminan viendo un producto. Revisa navegación, recomendaciones y CTA de tienda.`, href: '/admin/intelligence/funnel', score: 88 });
  if (productViews >= 15 && productToCart < 5) actions.push({ id: 'product-cart', priority: productToCart < 2 ? 'high' : 'medium', area: 'conversion', title: 'Fricción entre producto y carrito', detail: `La tasa producto → carrito es ${productToCart.toFixed(1)} %. Revisa precio, confianza, despacho y CTA.`, href: '/admin/intelligence/funnel', score: 92 });
  if (addToCart >= 5 && cartToCheckout < 35) actions.push({ id: 'cart-checkout', priority: 'high', area: 'conversion', title: 'El carrito no avanza al checkout', detail: `Solo ${cartToCheckout.toFixed(1)} % de los carritos inicia checkout. Simplifica costos, envío y pasos.`, href: '/admin/intelligence/funnel', score: 94 });
  if (checkout >= 3 && checkoutToOrder < 35) actions.push({ id: 'checkout-order', priority: 'critical', area: 'conversion', title: 'Checkout con abandono alto', detail: `Solo ${checkoutToOrder.toFixed(1)} % de los checkouts termina en pedido. Revisa errores, medios de pago y campos obligatorios.`, href: '/admin/intelligence/funnel', score: 99 });
  if (visits >= 30 && visitToContact < 1) actions.push({ id: 'contact-conversion', priority: 'medium', area: 'conversion', title: 'Tráfico con pocos contactos', detail: `La conversión a contacto es ${visitToContact.toFixed(1)} %. Refuerza WhatsApp y cotización en las páginas con más tráfico.`, href: '/admin/intelligence/funnel', score: 78 });
  if (!actions.length) actions.push({ id: 'healthy', priority: 'low', area: 'operations', title: 'Sin alertas comerciales críticas', detail: 'La operación está estable. Continúa monitoreando conversión, stock, margen y proveedores.', href: '/admin/intelligence', score: 20 });

  const prioritized = scoreActions(actions);
  const penalties = prioritized.reduce((sum, action) => sum + (action.priority === 'critical' ? 22 : action.priority === 'high' ? 14 : action.priority === 'medium' ? 8 : 2), 0);
  const healthScore = Math.max(0, Math.min(100, 100 - penalties));
  const top = prioritized[0];

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    periodDays: days,
    healthScore,
    headline: top.priority === 'low' ? 'Operación estable: enfócate en crecimiento.' : `Prioridad de hoy: ${top.title}`,
    metrics: { visits, productViews, addToCart, checkout, orders: orders.length, paidOrders, contacts, revenue, criticalStock, lowMargin, incompleteProducts },
    actions: prioritized,
  };
}

export async function persistDailyBrief(brief: FabrickDailyBrief) {
  const { error } = await insforgeAdmin.database.from('pwa_events').insert([{
    event: 'intelligence_daily_brief',
    user_id: 'fabrick-intelligence@system',
    platform: 'server',
    meta: { tenantId: brief.tenantId, brief },
    created_at: brief.generatedAt,
  }]);
  if (error) throw new Error(`No se pudo persistir daily brief: ${error.message}`);
  return brief;
}

export async function listKnownTenantIds() {
  const { data, error } = await insforgeAdmin.database.from('products').select('tenant_id').limit(5000);
  if (error) throw new Error(`No se pudieron listar tenants: ${error.message}`);
  const ids = new Set<string>([DEFAULT_TENANT_ID]);
  for (const row of (data || []) as Array<{ tenant_id?: string | null }>) if (row.tenant_id) ids.add(String(row.tenant_id));
  return Array.from(ids);
}
