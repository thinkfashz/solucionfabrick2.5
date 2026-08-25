import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { requireTenantAdmin } from '@/lib/tenantAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type View = 'dashboard' | 'products' | 'orders' | 'questions' | 'prices' | 'search';
type ProductRecord = Record<string, unknown> & {
  id?: string;
  name?: unknown;
  description?: unknown;
  tagline?: unknown;
  source?: unknown;
  source_id?: unknown;
  activo?: unknown;
  price?: unknown;
  stock?: unknown;
  supplier_price?: unknown;
};
type NativeProduct = ProductRecord & {
  price: number;
  stock: number;
  supplier_price: number;
  marginPct: number | null;
  marketplaceState: 'active' | 'paused' | 'out_of_stock';
};

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function questionStatus(value: unknown) {
  const v = text(value).toUpperCase();
  return v === 'ANSWERED' ? 'answered' : 'pending';
}

async function productsForTenant(tenantId: string): Promise<ProductRecord[]> {
  const { data, error } = await insforgeAdmin.database
    .from('products')
    .select('id,name,description,tagline,price,stock,image_url,category_id,featured,activo,source,source_id,supplier_price,supplier_currency,created_at,updated_at')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })
    .limit(250);
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data as ProductRecord[] : [];
}

async function ordersForTenant(tenantId: string) {
  const { data, error } = await insforgeAdmin.database
    .from('orders')
    .select('id,total,status,payment_status,payment_id,customer_name,customer_email,cliente_nombre,cliente_email,items,created_at,updated_at,tracking_number,delivery_status')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data : [];
}

async function questionsForTenant(tenantId: string) {
  const { data, error } = await insforgeAdmin.database
    .from('ml_questions')
    .select('id,item_id,status,text,answer_text,answer_status,answer_date,buyer_id,date_created,synced_at')
    .eq('tenant_id', tenantId)
    .order('date_created', { ascending: false })
    .limit(150);
  if (error) return [];
  return Array.isArray(data) ? data : [];
}

function normalizeProducts(rows: ProductRecord[]): NativeProduct[] {
  return rows.map((row) => {
    const price = num(row.price);
    const supplier = num(row.supplier_price);
    const stock = num(row.stock);
    const marginPct = supplier > 0 ? Math.round(((price - supplier) / supplier) * 100) : null;
    return {
      ...row,
      price,
      stock,
      supplier_price: supplier,
      marginPct,
      marketplaceState: row.activo === false ? 'paused' : stock <= 0 ? 'out_of_stock' : 'active',
    };
  });
}

export async function GET(request: NextRequest) {
  const view = (request.nextUrl.searchParams.get('view') || 'dashboard') as View;
  const auth = view === 'orders' || view === 'questions' || view === 'dashboard'
    ? await requireTenantAdmin(request, { resource: 'orders', action: 'read' })
    : await requireTenantAdmin(request, { resource: 'products', action: 'read' });
  if (!auth.ok) return auth.response;

  try {
    if (view === 'products' || view === 'prices' || view === 'search') {
      const rows = normalizeProducts(await productsForTenant(auth.ctx.tenantId));
      const q = text(request.nextUrl.searchParams.get('q')).toLowerCase();
      const filtered = q
        ? rows.filter((row) => [row.name, row.description, row.tagline, row.source, row.source_id].some((value) => String(value ?? '').toLowerCase().includes(q)))
        : rows;
      return NextResponse.json({ ok: true, engine: 'fabrick-native-marketplace', providerRequired: false, view, products: filtered });
    }

    if (view === 'orders') {
      const orders = await ordersForTenant(auth.ctx.tenantId);
      return NextResponse.json({ ok: true, engine: 'fabrick-native-marketplace', providerRequired: false, view, orders });
    }

    if (view === 'questions') {
      const rows = await questionsForTenant(auth.ctx.tenantId);
      const questions = rows.map((raw) => {
        const row = raw as Record<string, unknown>;
        return { ...row, nativeStatus: questionStatus(row.status) };
      });
      return NextResponse.json({ ok: true, engine: 'fabrick-native-marketplace', providerRequired: false, view, questions });
    }

    const [productsRaw, ordersRaw, questionsRaw] = await Promise.all([
      productsForTenant(auth.ctx.tenantId),
      ordersForTenant(auth.ctx.tenantId),
      questionsForTenant(auth.ctx.tenantId),
    ]);
    const products = normalizeProducts(productsRaw);
    const orders = ordersRaw as Array<Record<string, unknown>>;
    const questions = questionsRaw as Array<Record<string, unknown>>;
    const active = products.filter((p) => p.marketplaceState === 'active').length;
    const paused = products.filter((p) => p.marketplaceState === 'paused').length;
    const outOfStock = products.filter((p) => p.marketplaceState === 'out_of_stock').length;
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5).length;
    const unanswered = questions.filter((q) => questionStatus(q.status) === 'pending').length;
    const recentOrders = orders.slice(0, 8);
    const revenue = orders.reduce((sum, row) => {
      const ps = text(row.payment_status).toLowerCase();
      const status = text(row.status).toLowerCase();
      return ps === 'approved' || ['pagada', 'pagado', 'en_preparacion', 'enviado', 'entregado'].includes(status) ? sum + num(row.total) : sum;
    }, 0);
    const novedades = [
      outOfStock > 0 ? { tone: 'danger', title: `${outOfStock} publicación${outOfStock === 1 ? '' : 'es'} sin stock`, detail: 'Puedes reponer stock o pausar esos productos.' } : null,
      lowStock > 0 ? { tone: 'warning', title: `${lowStock} producto${lowStock === 1 ? '' : 's'} con stock bajo`, detail: 'Quedan 5 unidades o menos.' } : null,
      unanswered > 0 ? { tone: 'info', title: `${unanswered} consulta${unanswered === 1 ? '' : 's'} pendiente${unanswered === 1 ? '' : 's'}`, detail: 'Responde desde el módulo Preguntas.' } : null,
      paused > 0 ? { tone: 'neutral', title: `${paused} publicación${paused === 1 ? '' : 'es'} pausada${paused === 1 ? '' : 's'}`, detail: 'Puedes reactivarlas desde Publicaciones.' } : null,
    ].filter(Boolean);

    return NextResponse.json({
      ok: true,
      engine: 'fabrick-native-marketplace',
      providerRequired: false,
      view: 'dashboard',
      kpis: { products: products.length, active, paused, outOfStock, lowStock, orders: orders.length, unanswered, revenue },
      novedades,
      recentOrders,
      recentProducts: products.slice(0, 8),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error cargando marketplace nativo.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  let body: { action?: unknown; id?: unknown; price?: unknown; stock?: unknown; active?: unknown; text?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const action = text(body.action);
  const id = text(body.id);
  if (!id) return NextResponse.json({ error: 'id es requerido.' }, { status: 400 });

  if (action === 'product.update') {
    const auth = await requireTenantAdmin(request, { resource: 'products', action: 'update' });
    if (!auth.ok) return auth.response;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.active === 'boolean') patch.activo = body.active;
    if (typeof body.price === 'number' && Number.isFinite(body.price) && body.price >= 0) patch.price = body.price;
    if (typeof body.stock === 'number' && Number.isFinite(body.stock) && body.stock >= 0) patch.stock = Math.floor(body.stock);
    if (Object.keys(patch).length === 1) return NextResponse.json({ error: 'No hay cambios válidos.' }, { status: 400 });
    const { data, error } = await insforgeAdmin.database.from('products').update(patch).eq('tenant_id', auth.ctx.tenantId).eq('id', id).select('id,name,price,stock,activo,updated_at').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, product: data });
  }

  if (action === 'question.answer') {
    const auth = await requireTenantAdmin(request, { resource: 'orders', action: 'update' });
    if (!auth.ok) return auth.response;
    const answer = text(body.text);
    if (!answer) return NextResponse.json({ error: 'La respuesta es requerida.' }, { status: 400 });
    const questionId = Number(id);
    if (!Number.isFinite(questionId)) return NextResponse.json({ error: 'ID de consulta inválido.' }, { status: 400 });
    const { data, error } = await insforgeAdmin.database.from('ml_questions').update({ status: 'ANSWERED', answer_status: 'ANSWERED', answer_text: answer.slice(0, 2000), answer_date: new Date().toISOString(), synced_at: new Date().toISOString() }).eq('tenant_id', auth.ctx.tenantId).eq('id', questionId).select('id,status,answer_text,answer_date').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, question: data });
  }

  return NextResponse.json({ error: 'Acción no soportada.' }, { status: 400 });
}
