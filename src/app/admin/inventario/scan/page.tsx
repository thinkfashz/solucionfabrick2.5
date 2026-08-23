'use client';

import { useEffect, useMemo, useState } from 'react';
import BarcodeScanner from '@/components/BarcodeScanner';
import { Camera, ScanLine, PackageSearch, ArrowDownToLine, ArrowUpFromLine, RotateCcw, Link2, CheckCircle2 } from 'lucide-react';
import { AdminBaseButton, AdminBaseGrid, AdminBaseMetric, AdminBasePage } from '@/components/admin/baseui-kit';

type Product = { id: string; name: string; stock: number | null; sku: string | null; ean: string | null; image_url?: string | null; activo?: boolean };
type ScanEntry = { value: string; format: string; at: string; product?: Product | null; status: 'found' | 'missing' | 'error' };

export default function AdminInventarioScanPage() {
  const [scans, setScans] = useState<ScanEntry[]>([]);
  const [active, setActive] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/admin/inventory?catalog=1', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => setCatalog(Array.isArray(json.products) ? json.products : []))
      .catch(() => setCatalog([]));
  }, []);

  const lowStock = useMemo(() => catalog.filter((p) => Number(p.stock ?? 0) <= 5).length, [catalog]);

  async function lookup(value: string, format = 'manual') {
    const code = value.trim();
    if (!code) return;
    setBusy('lookup'); setMessage(''); setCurrentCode(code); setCurrentProduct(null);
    try {
      const response = await fetch(`/api/admin/inventory?code=${encodeURIComponent(code)}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo consultar el código.');
      const product = json.found ? (json.product as Product) : null;
      setCurrentProduct(product);
      setScans((prev) => [{ value: code, format, at: new Date().toISOString(), product, status: product ? 'found' : 'missing' }, ...prev.filter((x) => x.value !== code)].slice(0, 50));
      if (!product) setMessage('Código sin asociar. Selecciona un producto para vincularlo.');
    } catch (error) {
      setScans((prev) => [{ value: code, format, at: new Date().toISOString(), status: 'error' }, ...prev].slice(0, 50));
      setMessage(error instanceof Error ? error.message : 'Error consultando el código.');
    } finally { setBusy(''); }
  }

  const handleDetect = (value: string, format: string) => { setActive(false); void lookup(value, format); };

  async function bindCode() {
    if (!selectedProductId || !currentCode) return;
    setBusy('bind'); setMessage('');
    try {
      const response = await fetch('/api/admin/inventory', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProductId, ean: currentCode }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo asociar el código.');
      const product = json.product as Product;
      setCurrentProduct(product);
      setCatalog((list) => list.map((p) => p.id === product.id ? { ...p, ...product } : p));
      setScans((list) => list.map((s) => s.value === currentCode ? { ...s, product, status: 'found' } : s));
      setMessage(`Código asociado a ${product.name}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Error asociando código.'); }
    finally { setBusy(''); }
  }

  async function move(type: 'in' | 'out' | 'adjustment' | 'return') {
    if (!currentProduct) return;
    setBusy(type); setMessage('');
    try {
      const response = await fetch('/api/admin/inventory', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: currentProduct.id, type, quantity, barcode: currentCode }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo registrar el movimiento.');
      const product = json.product as Product;
      setCurrentProduct(product);
      setCatalog((list) => list.map((p) => p.id === product.id ? { ...p, stock: product.stock } : p));
      setMessage(`Movimiento registrado. Stock actual: ${product.stock ?? 0}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Error registrando movimiento.'); }
    finally { setBusy(''); }
  }

  return (
    <AdminBasePage
      eyebrow="Inventario"
      title="Escáner de inventario"
      description="Escanea EAN/QR, identifica el producto y registra entradas, salidas, devoluciones o ajustes con trazabilidad."
      actions={<><AdminBaseButton href="/admin/inventario" variant="ghost">Inventario</AdminBaseButton><AdminBaseButton href="/admin/productos">Catálogo</AdminBaseButton></>}
    >
      <AdminBaseGrid cols="3">
        <AdminBaseMetric label="Escaneos" value={scans.length} hint="sesión actual" />
        <AdminBaseMetric label="Productos vinculados" value={catalog.filter((p) => p.ean || p.sku).length} hint="SKU/EAN persistente" />
        <AdminBaseMetric label="Stock bajo" value={lowStock} hint="≤ 5 unidades" />
      </AdminBaseGrid>

      <section className="rounded-[1.5rem] border border-black/8 bg-white/70 p-4 md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="button" onClick={() => setActive(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#08090A] px-5 py-3 text-sm font-black text-white">
            <Camera className="h-4 w-4" /> Escanear código
          </button>
          <div className="flex flex-1 gap-2">
            <input value={currentCode} onChange={(e) => setCurrentCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void lookup(currentCode); }} placeholder="EAN, SKU o código QR" className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-[#08090A] outline-none focus:border-amber-500" />
            <button type="button" onClick={() => void lookup(currentCode)} disabled={busy === 'lookup'} className="rounded-xl border border-black/10 bg-white px-4 text-sm font-bold text-[#08090A]">Buscar</button>
          </div>
        </div>
        {active && <div className="mt-4 overflow-hidden rounded-2xl border border-black/10"><BarcodeScanner onDetect={handleDetect} onClose={() => setActive(false)} /></div>}
        {message && <p className="mt-3 rounded-xl bg-[#F6EFE7] px-4 py-3 text-sm text-[#4B4037]">{message}</p>}
      </section>

      {currentCode && !currentProduct && (
        <section className="rounded-[1.5rem] border border-amber-400/30 bg-amber-50 p-4 md:p-5">
          <div className="flex items-start gap-3"><PackageSearch className="mt-0.5 h-5 w-5 text-amber-700" /><div className="flex-1"><h2 className="font-black text-[#08090A]">Código no asociado</h2><p className="mt-1 text-sm text-[#6D6258]">Vincula {currentCode} a un producto. El índice único impide usar el mismo EAN dos veces.</p></div></div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="min-h-11 flex-1 rounded-xl border border-black/10 bg-white px-3 text-sm text-[#08090A]"><option value="">Selecciona producto…</option>{catalog.map((p) => <option key={p.id} value={p.id}>{p.name} · stock {p.stock ?? 0}</option>)}</select>
            <button type="button" onClick={bindCode} disabled={!selectedProductId || busy === 'bind'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black text-black disabled:opacity-50"><Link2 className="h-4 w-4" /> Vincular EAN</button>
          </div>
        </section>
      )}

      {currentProduct && (
        <section className="rounded-[1.5rem] border border-emerald-400/25 bg-emerald-50/80 p-4 md:p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div><div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" /><span className="text-xs font-black uppercase tracking-wider">Producto encontrado</span></div><h2 className="mt-1 text-xl font-black text-[#08090A]">{currentProduct.name}</h2><p className="text-sm text-[#6D6258]">SKU {currentProduct.sku || '—'} · EAN {currentProduct.ean || '—'}</p></div>
            <div className="text-left sm:text-right"><p className="text-xs uppercase tracking-wider text-[#7A7067]">Stock actual</p><p className="text-4xl font-black text-[#08090A]">{currentProduct.stock ?? 0}</p></div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2"><input type="number" min={0} value={quantity} onChange={(e) => setQuantity(Math.max(0, Number(e.target.value) || 0))} className="h-11 w-24 rounded-xl border border-black/10 bg-white px-3 text-center font-black text-[#08090A]" /><button onClick={() => void move('in')} className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white"><ArrowDownToLine className="h-4 w-4" /> Entrada</button><button onClick={() => void move('out')} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#08090A] px-4 text-sm font-bold text-white"><ArrowUpFromLine className="h-4 w-4" /> Salida</button><button onClick={() => void move('return')} className="inline-flex h-11 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-bold text-[#08090A]"><RotateCcw className="h-4 w-4" /> Devolución</button><button onClick={() => void move('adjustment')} className="h-11 rounded-xl border border-black/10 bg-white px-4 text-sm font-bold text-[#08090A]">Fijar stock</button></div>
        </section>
      )}

      <section className="overflow-hidden rounded-[1.5rem] border border-black/8 bg-white/70">
        <div className="flex items-center gap-2 border-b border-black/8 px-5 py-4"><ScanLine className="h-4 w-4 text-amber-600" /><h2 className="font-black text-[#08090A]">Últimos escaneos</h2></div>
        <ul className="divide-y divide-black/6">{scans.length === 0 ? <li className="px-5 py-8 text-sm text-[#82776C]">Aún no hay escaneos.</li> : scans.map((scan, index) => <li key={`${scan.value}-${index}`} className="flex items-center justify-between gap-3 px-5 py-3"><div><p className="font-mono text-sm font-bold text-[#08090A]">{scan.value}</p><p className="text-xs text-[#82776C]">{scan.product?.name || (scan.status === 'missing' ? 'Sin asociar' : scan.status === 'error' ? 'Error' : scan.format)}</p></div><span className="text-xs text-[#82776C]">{new Date(scan.at).toLocaleTimeString('es-CL')}</span></li>)}</ul>
      </section>
    </AdminBasePage>
  );
}
