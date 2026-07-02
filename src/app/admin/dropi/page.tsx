'use client';

import { useEffect, useState } from 'react';
import { DownloadCloud, Loader2, PackageSearch, Save, Store, TestTube2 } from 'lucide-react';

type FormState = {
  api_base_url: string;
  api_token: string;
  api_key: string;
  auth_header_name: string;
  auth_scheme: string;
  products_path: string;
  orders_path: string;
  health_path: string;
  default_category_id: string;
  price_markup_pct: string;
  currency: string;
  auto_fulfill_paid_orders: boolean;
};

type ProductPreview = { externalId: string; name: string; stock: number; supplierPrice: number; salePrice: number; imageUrl?: string };

const initialForm: FormState = {
  api_base_url: '',
  api_token: '',
  api_key: '',
  auth_header_name: 'Authorization',
  auth_scheme: 'Bearer',
  products_path: '/products',
  orders_path: '/orders',
  health_path: '',
  default_category_id: '',
  price_markup_pct: '35',
  currency: 'CLP',
  auto_fulfill_paid_orders: false,
};

const fmt = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export default function AdminDropiPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState<Array<{ name: string; ok: boolean; detail?: string }>>([]);
  const [products, setProducts] = useState<ProductPreview[]>([]);
  const [limit, setLimit] = useState(40);

  const patch = (value: Partial<FormState>) => setForm((prev) => ({ ...prev, ...value }));

  async function loadConfig() {
    setBusy('load');
    try {
      const res = await fetch('/api/admin/dropi/config', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo cargar Dropi.');
      const c = json.credentials || {};
      setForm({
        ...initialForm,
        api_base_url: c.api_base_url || '',
        auth_header_name: c.auth_header_name || 'Authorization',
        auth_scheme: c.auth_scheme || 'Bearer',
        products_path: c.products_path || '/products',
        orders_path: c.orders_path || '/orders',
        health_path: c.health_path || '',
        default_category_id: c.default_category_id || '',
        price_markup_pct: String(c.price_markup_pct ?? '35'),
        currency: c.currency || 'CLP',
        auto_fulfill_paid_orders: Boolean(c.auto_fulfill_paid_orders),
        api_token: '',
        api_key: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando Dropi.');
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => { void loadConfig(); }, []);

  async function save() {
    setBusy('save'); setMessage(null); setError(null);
    try {
      const res = await fetch('/api/admin/dropi/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo guardar Dropi.');
      setMessage('Dropi guardado en la base de datos.');
      await loadConfig();
    } catch (err) { setError(err instanceof Error ? err.message : 'Error guardando.'); }
    finally { setBusy(null); }
  }

  async function testConnection() {
    setBusy('test'); setMessage(null); setError(null); setChecks([]);
    try {
      const res = await fetch('/api/admin/dropi/test', { cache: 'no-store' });
      const json = await res.json();
      setChecks(json.checks || []);
      if (!res.ok) throw new Error(json.error || 'Dropi no respondió.');
      setMessage('Conexión Dropi validada.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Error probando conexión.'); }
    finally { setBusy(null); }
  }

  async function preview() {
    setBusy('preview'); setMessage(null); setError(null);
    try {
      const res = await fetch(`/api/admin/dropi/products?limit=${limit}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudieron leer productos.');
      setProducts(json.products || []);
      setMessage(`Vista previa cargada: ${json.total || 0} productos.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Error leyendo productos.'); }
    finally { setBusy(null); }
  }

  async function importProducts() {
    setBusy('import'); setMessage(null); setError(null);
    try {
      const res = await fetch('/api/admin/dropi/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limit }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo importar.');
      setProducts(json.products || []);
      setMessage(`Importación lista: ${json.created} creados, ${json.updated} actualizados, ${json.skipped} omitidos.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Error importando productos.'); }
    finally { setBusy(null); }
  }

  return (
    <div className="min-h-screen px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-black/60 p-6 backdrop-blur-xl md:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-yellow-300">Proveedor dropshipping</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Dropi</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">Conecta Dropi como proveedor: importa productos, aplica margen y crea órdenes de despacho cuando tu pedido ya esté pagado.</p>
        </section>

        {message ? <Alert kind="ok" text={message} /> : null}
        {error ? <Alert kind="error" text={error} /> : null}

        <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-5 md:p-6">
            <h2 className="text-2xl font-black">Datos de conexión</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="API base URL" value={form.api_base_url} onChange={(v) => patch({ api_base_url: v })} placeholder="https://api.dropi..." />
              <Field label="API token" type="password" value={form.api_token} onChange={(v) => patch({ api_token: v })} placeholder="pegar token" />
              <Field label="API key opcional" type="password" value={form.api_key} onChange={(v) => patch({ api_key: v })} placeholder="opcional" />
              <Field label="Header auth" value={form.auth_header_name} onChange={(v) => patch({ auth_header_name: v })} />
              <Field label="Auth scheme" value={form.auth_scheme} onChange={(v) => patch({ auth_scheme: v })} />
              <Field label="Ruta productos" value={form.products_path} onChange={(v) => patch({ products_path: v })} />
              <Field label="Ruta órdenes" value={form.orders_path} onChange={(v) => patch({ orders_path: v })} />
              <Field label="Ruta health opcional" value={form.health_path} onChange={(v) => patch({ health_path: v })} />
              <Field label="Margen %" value={form.price_markup_pct} onChange={(v) => patch({ price_markup_pct: v })} />
              <Field label="Moneda" value={form.currency} onChange={(v) => patch({ currency: v })} />
              <Field label="Category ID por defecto" value={form.default_category_id} onChange={(v) => patch({ default_category_id: v })} />
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-zinc-300">
                <input type="checkbox" className="h-4 w-4 accent-yellow-300" checked={form.auto_fulfill_paid_orders} onChange={(e) => patch({ auto_fulfill_paid_orders: e.target.checked })} />
                Crear orden en Dropi automáticamente cuando el pedido quede pagado
              </label>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={save} loading={busy === 'save' || busy === 'load'} icon={Save}>Guardar</Button>
              <Button onClick={testConnection} loading={busy === 'test'} icon={TestTube2} secondary>Probar</Button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-5 md:p-6">
            <h2 className="flex items-center gap-2 text-2xl font-black"><Store className="h-5 w-5 text-yellow-300" /> Productos</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">Primero carga vista previa. Si se ve bien, importa al catálogo con source=dropi.</p>
            <div className="mt-5 flex items-end gap-3">
              <Field label="Límite" value={String(limit)} onChange={(v) => setLimit(Math.max(1, Math.min(Number(v) || 40, 100)))} />
              <Button onClick={preview} loading={busy === 'preview'} icon={PackageSearch} secondary>Preview</Button>
            </div>
            <Button onClick={importProducts} loading={busy === 'import'} icon={DownloadCloud} className="mt-4 w-full">Importar catálogo</Button>
            <div className="mt-5 grid gap-2">
              {checks.map((c) => <div key={c.name} className="rounded-xl border border-white/10 bg-black/45 p-3 text-sm"><b className={c.ok ? 'text-emerald-300' : 'text-red-300'}>{c.name}</b><p className="text-zinc-500">{c.detail}</p></div>)}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-5 md:p-6">
          <h2 className="text-2xl font-black">Vista previa</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.length === 0 ? <p className="text-sm text-zinc-500">Aún no hay productos cargados.</p> : null}
            {products.map((p) => <ProductCard key={p.externalId} product={p} />)}
          </div>
        </section>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: ProductPreview }) {
  return <article className="overflow-hidden rounded-2xl border border-white/10 bg-black/45">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-40 w-full object-cover" /> : <div className="grid h-40 place-items-center bg-white/5 text-zinc-600">Sin imagen</div>}<div className="p-4"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{product.externalId}</p><h3 className="mt-2 line-clamp-2 font-black text-white">{product.name}</h3><p className="mt-3 text-sm text-zinc-400">Stock: {product.stock}</p><p className="mt-1 text-sm text-zinc-400">Costo: {fmt.format(product.supplierPrice)}</p><p className="mt-1 text-lg font-black text-yellow-300">Venta: {fmt.format(product.salePrice)}</p></div></article>;
}
function Alert({ kind, text }: { kind: 'ok' | 'error'; text: string }) { return <div className={`rounded-2xl border px-4 py-3 text-sm ${kind === 'ok' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-red-400/20 bg-red-400/10 text-red-200'}`}>{text}</div>; }
function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) { return <label className="block min-w-0 flex-1"><span className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-300/60" /></label>; }
function Button({ children, onClick, loading, icon: Icon, secondary = false, className = '' }: { children: React.ReactNode; onClick: () => void; loading?: boolean; icon: typeof Save; secondary?: boolean; className?: string }) { return <button type="button" onClick={onClick} disabled={loading} className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] transition disabled:opacity-60 ${secondary ? 'border border-white/15 text-white hover:border-yellow-300/40 hover:text-yellow-300' : 'bg-yellow-300 text-black hover:bg-white'} ${className}`}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}{children}</button>; }
