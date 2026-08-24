'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import BarcodeScanner from '@/components/BarcodeScanner';
import { ArrowDownToLine, ArrowUpFromLine, Camera, CheckCircle2, Link2, PackageSearch, RotateCcw, ScanLine } from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

type Product = { id: string; name: string; stock: number | null; sku: string | null; ean: string | null; image_url?: string | null; activo?: boolean };
type ScanStatus = 'found' | 'missing' | 'error';
type ScanEntry = { value: string; format: string; at: string; product?: Product | null; status: ScanStatus };

const actionClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3.5 text-xs font-black text-[#5f594f] transition hover:bg-white';
const inputClass = 'min-h-11 rounded-xl border border-black/10 bg-white px-3.5 text-sm font-semibold text-[#171612] outline-none transition placeholder:text-[#aaa294] focus:border-[#c77a00]/45 focus:ring-2 focus:ring-[#ffb000]/10';

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
      .then((response) => response.json())
      .then((json) => setCatalog(Array.isArray(json.products) ? json.products : []))
      .catch(() => setCatalog([]));
  }, []);

  const lowStock = useMemo(() => catalog.filter((product) => Number(product.stock ?? 0) <= 5).length, [catalog]);
  const linked = useMemo(() => catalog.filter((product) => product.ean || product.sku).length, [catalog]);

  async function lookup(value: string, format = 'manual') {
    const code = value.trim();
    if (!code) return;
    setBusy('lookup');
    setMessage('');
    setCurrentCode(code);
    setCurrentProduct(null);
    try {
      const response = await fetch(`/api/admin/inventory?code=${encodeURIComponent(code)}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo consultar el código.');
      const product = json.found ? json.product as Product : null;
      const status: ScanStatus = product ? 'found' : 'missing';
      const entry: ScanEntry = { value: code, format, at: new Date().toISOString(), product, status };
      setCurrentProduct(product);
      setScans((current) => [entry, ...current.filter((item) => item.value !== code)].slice(0, 50));
      if (!product) setMessage('Código sin asociar. Selecciona un producto para vincularlo.');
    } catch (error) {
      const entry: ScanEntry = { value: code, format, at: new Date().toISOString(), status: 'error' };
      setScans((current) => [entry, ...current].slice(0, 50));
      setMessage(error instanceof Error ? error.message : 'Error consultando el código.');
    } finally {
      setBusy('');
    }
  }

  function handleDetect(value: string, format: string) {
    setActive(false);
    void lookup(value, format);
  }

  async function bindCode() {
    if (!selectedProductId || !currentCode) return;
    setBusy('bind');
    setMessage('');
    try {
      const response = await fetch('/api/admin/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProductId, ean: currentCode }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo asociar el código.');
      const product = json.product as Product;
      setCurrentProduct(product);
      setCatalog((list) => list.map((item) => item.id === product.id ? { ...item, ...product } : item));
      setScans((list) => list.map((scan) => scan.value === currentCode ? { ...scan, product, status: 'found' as const } : scan));
      setMessage(`Código asociado a ${product.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error asociando código.');
    } finally {
      setBusy('');
    }
  }

  async function move(type: 'in' | 'out' | 'adjustment' | 'return') {
    if (!currentProduct) return;
    setBusy(type);
    setMessage('');
    try {
      const response = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: currentProduct.id, type, quantity, barcode: currentCode }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo registrar el movimiento.');
      const product = json.product as Product;
      setCurrentProduct(product);
      setCatalog((list) => list.map((item) => item.id === product.id ? { ...item, stock: product.stock } : item));
      setMessage(`Movimiento registrado. Stock actual: ${product.stock ?? 0}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error registrando movimiento.');
    } finally {
      setBusy('');
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Inventario · Captura"
        title="Escáner de inventario"
        description="Escanea EAN/QR, identifica el producto y registra entradas, salidas, devoluciones o ajustes con trazabilidad."
        icon={ScanLine}
        actions={<><Link href="/admin/inventario" className={actionClass}>Inventario</Link><Link href="/admin/inventario/movimientos" className={actionClass}>Movimientos</Link></>}
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <AdminStat label="Escaneos" value={scans.length} icon={ScanLine} hint="Sesión actual" />
        <AdminStat label="Vinculados" value={linked} icon={Link2} accent="emerald" hint="SKU/EAN persistente" />
        <AdminStat label="Stock bajo" value={lowStock} icon={PackageSearch} accent="rose" hint="≤ 5 unidades" />
      </section>

      <AdminCard className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="button" onClick={() => setActive(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#171612] px-5 text-sm font-black text-white"><Camera className="h-4 w-4" /> Escanear código</button>
          <div className="flex min-w-0 flex-1 gap-2">
            <input value={currentCode} onChange={(event) => setCurrentCode(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void lookup(currentCode); }} placeholder="EAN, SKU o código QR" className={`${inputClass} min-w-0 flex-1`} />
            <button type="button" onClick={() => void lookup(currentCode)} disabled={busy === 'lookup'} className={actionClass}>Buscar</button>
          </div>
        </div>
        {active ? <div className="overflow-hidden rounded-xl border border-black/10"><BarcodeScanner onDetect={handleDetect} onClose={() => setActive(false)} /></div> : null}
        {message ? <p className="rounded-xl bg-black/[.035] px-4 py-3 text-sm text-[#5f594f]">{message}</p> : null}
      </AdminCard>

      {currentCode && !currentProduct ? (
        <AdminCard className="border-amber-600/15 bg-amber-500/7">
          <div className="flex items-start gap-3"><PackageSearch className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div className="min-w-0 flex-1"><h2 className="font-black text-[#171612]">Código no asociado</h2><p className="mt-1 text-sm text-[#716b60]">Vincula {currentCode} a un producto. El índice único evita reutilizar el mismo EAN.</p></div></div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row"><select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} className={`${inputClass} flex-1`}><option value="">Selecciona producto…</option>{catalog.map((product) => <option key={product.id} value={product.id}>{product.name} · stock {product.stock ?? 0}</option>)}</select><button type="button" onClick={() => void bindCode()} disabled={!selectedProductId || busy === 'bind'} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#ffb000] px-4 text-sm font-black text-[#171612] disabled:opacity-50"><Link2 className="h-4 w-4" /> Vincular EAN</button></div>
        </AdminCard>
      ) : null}

      {currentProduct ? (
        <AdminCard className="border-emerald-600/15 bg-emerald-500/7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div><div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-[.14em]">Producto encontrado</span></div><h2 className="mt-1 text-xl font-black text-[#171612]">{currentProduct.name}</h2><p className="text-sm text-[#716b60]">SKU {currentProduct.sku || '—'} · EAN {currentProduct.ean || '—'}</p></div>
            <div className="text-left sm:text-right"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">Stock actual</p><p className="text-4xl font-black tracking-[-.05em] text-[#171612]">{currentProduct.stock ?? 0}</p></div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2"><input type="number" min={0} value={quantity} onChange={(event) => setQuantity(Math.max(0, Number(event.target.value) || 0))} className={`${inputClass} w-24 text-center`} /><button type="button" onClick={() => void move('in')} disabled={Boolean(busy)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50"><ArrowDownToLine className="h-4 w-4" /> Entrada</button><button type="button" onClick={() => void move('out')} disabled={Boolean(busy)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#171612] px-4 text-sm font-bold text-white disabled:opacity-50"><ArrowUpFromLine className="h-4 w-4" /> Salida</button><button type="button" onClick={() => void move('return')} disabled={Boolean(busy)} className={actionClass}><RotateCcw className="h-4 w-4" /> Devolución</button><button type="button" onClick={() => void move('adjustment')} disabled={Boolean(busy)} className={actionClass}>Fijar stock</button></div>
        </AdminCard>
      ) : null}

      <AdminCard className="p-0 sm:p-0">
        <div className="flex items-center gap-2 border-b border-black/8 px-5 py-4"><ScanLine className="h-4 w-4 text-[#a56600]" /><h2 className="font-black text-[#171612]">Últimos escaneos</h2></div>
        <ul className="divide-y divide-black/6">{scans.length === 0 ? <li className="px-5 py-8 text-sm text-[#817a6f]">Aún no hay escaneos.</li> : scans.map((scan, index) => <li key={`${scan.value}-${index}`} className="flex items-center justify-between gap-3 px-5 py-3"><div><p className="font-mono text-sm font-bold text-[#171612]">{scan.value}</p><p className="text-xs text-[#817a6f]">{scan.product?.name || (scan.status === 'missing' ? 'Sin asociar' : scan.status === 'error' ? 'Error' : scan.format)}</p></div><span className="text-xs text-[#817a6f]">{new Date(scan.at).toLocaleTimeString('es-CL')}</span></li>)}</ul>
      </AdminCard>
    </AdminPage>
  );
}
