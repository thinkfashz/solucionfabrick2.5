'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Edit3,
  Inbox,
  Loader2,
  MessageCircle,
  PackageSearch,
  RefreshCw,
  Search,
  ShoppingCart,
  Store,
  Tag,
  TrendingDown,
  XCircle,
} from 'lucide-react';

export type MarketplaceView = 'dashboard' | 'products' | 'orders' | 'questions' | 'prices' | 'search';

type Product = {
  id: string;
  name?: string;
  description?: string | null;
  price: number;
  stock: number;
  image_url?: string | null;
  activo?: boolean;
  source?: string | null;
  source_id?: string | null;
  supplier_price?: number;
  marginPct?: number | null;
  marketplaceState?: 'active' | 'paused' | 'out_of_stock';
  updated_at?: string | null;
};

type Order = {
  id: string;
  total?: number | string | null;
  status?: string | null;
  payment_status?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  cliente_nombre?: string | null;
  cliente_email?: string | null;
  created_at?: string | null;
  tracking_number?: string | null;
  delivery_status?: string | null;
};

type Question = {
  id: number | string;
  item_id?: string | null;
  text?: string | null;
  status?: string | null;
  answer_text?: string | null;
  date_created?: string | null;
  nativeStatus?: 'answered' | 'pending';
};

type DashboardData = {
  kpis?: { products: number; active: number; paused: number; outOfStock: number; lowStock: number; orders: number; unanswered: number; revenue: number };
  novedades?: Array<{ tone: string; title: string; detail: string }>;
  recentOrders?: Order[];
  recentProducts?: Product[];
};

type ApiData = DashboardData & {
  ok?: boolean;
  engine?: string;
  providerRequired?: boolean;
  view?: MarketplaceView;
  products?: Product[];
  orders?: Order[];
  questions?: Question[];
  error?: string;
};

const LINKS = [
  { href: '/admin/ml', view: 'dashboard', label: 'Resumen', icon: Store },
  { href: '/admin/ml/publicaciones', view: 'products', label: 'Publicaciones', icon: Boxes },
  { href: '/admin/ml/pedidos', view: 'orders', label: 'Pedidos', icon: ShoppingCart },
  { href: '/admin/ml/preguntas', view: 'questions', label: 'Preguntas', icon: MessageCircle },
  { href: '/admin/ml/precios', view: 'prices', label: 'Precios', icon: TrendingDown },
  { href: '/admin/ml/buscar', view: 'search', label: 'Buscar', icon: Search },
] as const;

function money(value: unknown) {
  const n = Number(value);
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);
}

function when(value?: string | null) {
  if (!value) return 'Sin fecha';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' }).format(d);
}

function productState(product: Product) {
  if (product.marketplaceState === 'paused' || product.activo === false) return { label: 'Pausado', cls: 'text-zinc-300 border-white/10 bg-white/5' };
  if (product.marketplaceState === 'out_of_stock' || product.stock <= 0) return { label: 'Sin stock', cls: 'text-rose-200 border-rose-400/25 bg-rose-400/10' };
  return { label: 'Publicado', cls: 'text-emerald-200 border-emerald-400/25 bg-emerald-400/10' };
}

export default function NativeMarketplaceModule({ initialView }: { initialView: MarketplaceView }) {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams({ view: initialView });
      if (initialView === 'search' && query.trim()) params.set('q', query.trim());
      const res = await fetch(`/api/admin/marketplace/native?${params.toString()}`, { cache: 'no-store', credentials: 'same-origin' });
      const json = await res.json().catch(() => null) as ApiData | null;
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar Marketplace.');
    } finally {
      setLoading(false);
    }
  }, [initialView, query]);

  useEffect(() => { void load(); }, [load]);

  const localProducts = useMemo(() => {
    const rows = data?.products ?? [];
    if (initialView === 'search') return rows;
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((p) => [p.name, p.description, p.source, p.source_id].some((v) => String(v ?? '').toLowerCase().includes(q)));
  }, [data, initialView, query]);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/marketplace/native', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(json.error || 'No se pudo guardar el cambio.');
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el cambio.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveProduct() {
    if (!selectedProduct) return;
    const price = Number(editPrice);
    const stock = Number(editStock);
    const ok = await patch({ action: 'product.update', id: selectedProduct.id, price: Number.isFinite(price) ? price : undefined, stock: Number.isFinite(stock) ? stock : undefined });
    if (ok) setSelectedProduct(null);
  }

  async function toggleProduct(product: Product) {
    await patch({ action: 'product.update', id: product.id, active: product.activo === false });
  }

  async function answerQuestion() {
    if (!selectedQuestion || !answer.trim()) return;
    const ok = await patch({ action: 'question.answer', id: String(selectedQuestion.id), text: answer.trim() });
    if (ok) { setSelectedQuestion(null); setAnswer(''); }
  }

  const title = initialView === 'dashboard' ? 'Marketplace Fabrick' : LINKS.find((x) => x.view === initialView)?.label || 'Marketplace';
  const subtitle = initialView === 'dashboard'
    ? 'Módulo comercial nativo inspirado en la lógica de un marketplace: publicaciones, pedidos, preguntas, precios y búsqueda, sin credenciales externas.'
    : 'Esta vista trabaja directamente con los datos de tu app y no requiere una cuenta de Mercado Libre.';

  return (
    <div className="min-h-screen px-4 py-6 text-white md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.14),transparent_34%),linear-gradient(135deg,rgba(24,24,27,.98),rgba(9,9,11,.98))] p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-200"><CheckCircle2 className="h-3.5 w-3.5" /> Módulo nativo · sin OAuth</div>
              <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">{title}</h1>
              <p className="mt-3 text-sm leading-7 text-zinc-400 md:text-base">{subtitle}</p>
            </div>
            <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] hover:border-yellow-300/40 hover:bg-yellow-300/10 disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Actualizar</button>
          </div>
        </header>

        <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/70 p-2">
          {LINKS.map((item) => { const Icon = item.icon; const active = item.view === initialView; return <Link key={item.href} href={item.href} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${active ? 'bg-yellow-300 text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}><Icon className="h-4 w-4" />{item.label}</Link>; })}
        </nav>

        {error ? <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</div> : null}
        {loading ? <div className="grid min-h-[420px] place-items-center rounded-[2rem] border border-white/10 bg-zinc-950/70"><Loader2 className="h-7 w-7 animate-spin text-yellow-300" /></div> : null}
        {!loading && initialView === 'dashboard' ? <Dashboard data={data} /> : null}
        {!loading && (initialView === 'products' || initialView === 'prices' || initialView === 'search') ? (
          <ProductsView view={initialView} products={localProducts} query={query} setQuery={setQuery} onEdit={(product) => { setSelectedProduct(product); setEditPrice(String(product.price ?? 0)); setEditStock(String(product.stock ?? 0)); }} onToggle={toggleProduct} />
        ) : null}
        {!loading && initialView === 'orders' ? <OrdersView orders={data?.orders ?? []} /> : null}
        {!loading && initialView === 'questions' ? <QuestionsView questions={data?.questions ?? []} onAnswer={(question) => { setSelectedQuestion(question); setAnswer(question.answer_text || ''); }} /> : null}
      </div>

      {selectedProduct ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm md:items-center" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setSelectedProduct(null); }}>
          <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-zinc-950 p-5 md:p-6"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-300">Editar publicación</p><h3 className="mt-2 text-2xl font-black">{selectedProduct.name}</h3><div className="mt-5 grid gap-3 sm:grid-cols-2"><Field label="Precio" value={editPrice} onChange={setEditPrice} type="number" /><Field label="Stock" value={editStock} onChange={setEditStock} type="number" /></div><div className="mt-5 flex gap-2"><button type="button" onClick={() => void saveProduct()} disabled={saving} className="flex-1 rounded-2xl bg-yellow-300 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-black disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar cambios'}</button><button type="button" onClick={() => setSelectedProduct(null)} disabled={saving} className="rounded-2xl border border-white/10 px-4 py-3 text-xs font-bold text-zinc-400">Cancelar</button></div></div>
        </div>
      ) : null}

      {selectedQuestion ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm md:items-center" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setSelectedQuestion(null); }}>
          <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-zinc-950 p-5 md:p-6"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-300">Responder consulta</p><p className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm leading-6 text-zinc-300">{selectedQuestion.text || 'Sin texto'}</p><textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={5} placeholder="Escribe la respuesta interna…" className="mt-4 w-full rounded-2xl border border-white/10 bg-black p-4 text-sm text-white outline-none focus:border-yellow-300/50" /><div className="mt-4 flex gap-2"><button type="button" onClick={() => void answerQuestion()} disabled={saving || !answer.trim()} className="flex-1 rounded-2xl bg-yellow-300 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-black disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar respuesta'}</button><button type="button" onClick={() => setSelectedQuestion(null)} className="rounded-2xl border border-white/10 px-4 py-3 text-xs font-bold text-zinc-400">Cerrar</button></div></div>
        </div>
      ) : null}
    </div>
  );
}

function Dashboard({ data }: { data: ApiData | null }) {
  const k = data?.kpis;
  return <div className="grid gap-5 xl:grid-cols-[1fr_360px]"><div className="space-y-5"><section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric icon={Boxes} label="Publicaciones" value={String(k?.products ?? 0)} detail={`${k?.active ?? 0} activas`} /><Metric icon={ShoppingCart} label="Pedidos" value={String(k?.orders ?? 0)} detail={money(k?.revenue ?? 0)} /><Metric icon={MessageCircle} label="Consultas" value={String(k?.unanswered ?? 0)} detail="Pendientes" /><Metric icon={PackageSearch} label="Stock bajo" value={String(k?.lowStock ?? 0)} detail={`${k?.outOfStock ?? 0} sin stock`} /></section><section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-5"><h2 className="text-lg font-black">Actividad reciente</h2><div className="mt-4 space-y-2">{(data?.recentOrders ?? []).length === 0 ? <Empty /> : (data?.recentOrders ?? []).map((order) => <div key={order.id} className="grid gap-2 rounded-2xl border border-white/10 bg-black/35 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><p className="font-bold">{order.customer_name || order.cliente_nombre || order.customer_email || order.cliente_email || 'Cliente'}</p><p className="mt-1 text-xs text-zinc-500">#{order.id} · {when(order.created_at)}</p></div><p className="font-black">{money(order.total)}</p><span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-400">{order.status || 'pendiente'}</span></div>)}</div></section></div><aside className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-5"><div className="flex items-center gap-2"><Inbox className="h-5 w-5 text-yellow-300" /><h2 className="text-lg font-black">Novedades</h2></div><div className="mt-4 space-y-3">{(data?.novedades ?? []).length === 0 ? <p className="text-sm leading-6 text-zinc-500">Sin alertas. Tu marketplace interno está al día.</p> : (data?.novedades ?? []).map((n, i) => <div key={`${n.title}-${i}`} className="rounded-2xl border border-white/10 bg-black/35 p-4"><p className="text-sm font-bold">{n.title}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{n.detail}</p></div>)}</div></aside></div>;
}

function ProductsView({ view, products, query, setQuery, onEdit, onToggle }: { view: MarketplaceView; products: Product[]; query: string; setQuery: (v: string) => void; onEdit: (p: Product) => void; onToggle: (p: Product) => void }) {
  return <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-4 md:p-5"><div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-black">{view === 'prices' ? 'Control de precios y margen' : view === 'search' ? 'Buscador interno' : 'Publicaciones propias'}</h2><p className="mt-1 text-xs text-zinc-500">{view === 'search' ? 'Busca en tu catálogo local.' : 'Gestiona precio, stock y visibilidad sin sincronizar con un proveedor externo.'}</p></div><label className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2.5 sm:w-80"><Search className="h-4 w-4 text-zinc-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar producto" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-600" /></label></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{products.length === 0 ? <Empty /> : products.map((p) => { const state = productState(p); return <article key={p.id} className="rounded-2xl border border-white/10 bg-black/35 p-4"><div className="flex gap-3"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/5">{p.image_url ? <img src={p.image_url} alt={p.name || 'Producto'} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Tag className="h-5 w-5 text-zinc-700" /></div>}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="line-clamp-2 font-bold">{p.name || 'Producto'}</p><span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${state.cls}`}>{state.label}</span></div><p className="mt-1 text-xs text-zinc-500">Stock {p.stock} · {p.source || 'Fabrick'}</p></div></div><div className="mt-4 grid grid-cols-2 gap-2"><Info label="Venta" value={money(p.price)} /><Info label={view === 'prices' ? 'Margen' : 'Costo'} value={view === 'prices' ? (p.marginPct == null ? '—' : `${p.marginPct}%`) : money(p.supplier_price)} /></div><div className="mt-3 flex gap-2"><button type="button" onClick={() => onEdit(p)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-yellow-300 px-3 py-2.5 text-xs font-black text-black"><Edit3 className="h-3.5 w-3.5" />Editar</button><button type="button" onClick={() => void onToggle(p)} className="rounded-xl border border-white/10 px-3 py-2.5 text-xs font-bold text-zinc-400 hover:text-white">{p.activo === false ? 'Activar' : 'Pausar'}</button></div></article>; })}</div></section>;
}

function OrdersView({ orders }: { orders: Order[] }) {
  return <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-4 md:p-5"><div><h2 className="text-lg font-black">Pedidos del marketplace</h2><p className="mt-1 text-xs text-zinc-500">Usa el mismo motor de órdenes de Fabrick; no hay una bandeja separada que dependa de un tercero.</p></div><div className="mt-4 space-y-2">{orders.length === 0 ? <Empty /> : orders.map((o) => <div key={o.id} className="grid gap-3 rounded-2xl border border-white/10 bg-black/35 p-4 md:grid-cols-[1fr_150px_150px_150px] md:items-center"><div><p className="font-bold">{o.customer_name || o.cliente_nombre || o.customer_email || o.cliente_email || 'Cliente'}</p><p className="mt-1 text-xs text-zinc-500">#{o.id} · {when(o.created_at)}</p></div><p className="font-black">{money(o.total)}</p><span className="text-xs text-zinc-400">Pago: {o.payment_status || 'sin estado'}</span><span className="text-xs text-zinc-400">Pedido: {o.status || 'pendiente'}</span></div>)}</div></section>;
}

function QuestionsView({ questions, onAnswer }: { questions: Question[]; onAnswer: (q: Question) => void }) {
  return <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-4 md:p-5"><div><h2 className="text-lg font-black">Preguntas y atención</h2><p className="mt-1 text-xs text-zinc-500">Las consultas guardadas localmente se pueden revisar y responder sin llamar a Mercado Libre.</p></div><div className="mt-4 space-y-3">{questions.length === 0 ? <Empty label="No hay consultas locales pendientes." /> : questions.map((q) => <article key={String(q.id)} className="rounded-2xl border border-white/10 bg-black/35 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm leading-6 text-zinc-200">{q.text || 'Consulta sin texto'}</p><p className="mt-2 text-xs text-zinc-600">Producto {q.item_id || 'general'} · {when(q.date_created)}</p></div>{q.nativeStatus === 'answered' ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-200"><CheckCircle2 className="h-3 w-3" />Respondida</span> : <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-black uppercase text-amber-200"><Clock3 className="h-3 w-3" />Pendiente</span>}</div>{q.answer_text ? <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-zinc-400">Respuesta: {q.answer_text}</p> : null}<button type="button" onClick={() => onAnswer(q)} className="mt-3 rounded-xl bg-yellow-300 px-4 py-2.5 text-xs font-black text-black">{q.nativeStatus === 'answered' ? 'Editar respuesta' : 'Responder'}</button></article>)}</div></section>;
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Boxes; label: string; value: string; detail: string }) { return <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</p><Icon className="h-4 w-4 text-yellow-300" /></div><p className="mt-3 text-3xl font-black">{value}</p><p className="mt-1 text-xs text-zinc-500">{detail}</p></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">{label}</p><p className="mt-1 truncate text-sm font-bold">{value}</p></div>; }
function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) { return <label><span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-yellow-300/50" /></label>; }
function Empty({ label = 'No hay registros para mostrar.' }: { label?: string }) { return <div className="col-span-full grid min-h-40 place-items-center rounded-2xl border border-dashed border-white/10 text-sm text-zinc-600">{label}</div>; }
