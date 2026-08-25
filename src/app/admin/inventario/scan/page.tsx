'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import BarcodeScanner from '@/components/BarcodeScanner';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Camera,
  CheckCircle2,
  Link2,
  ListPlus,
  PackageCheck,
  PackagePlus,
  PackageSearch,
  RotateCcw,
  ScanLine,
  Trash2,
} from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

type Product = {
  id: string;
  name: string;
  stock: number | null;
  price?: number | null;
  sku: string | null;
  ean: string | null;
  scan_code?: string | null;
  scan_format?: string | null;
  image_url?: string | null;
  activo?: boolean;
};

type ScanStatus = 'found' | 'missing' | 'error';
type ScanEntry = { value: string; format: string; at: string; product?: Product | null; status: ScanStatus };
type IntakeItem = {
  code: string;
  format: string;
  productId?: string;
  existing: boolean;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  activo: boolean;
  addedAt: string;
  error?: string;
};

const STORAGE_KEY = 'fabrick.inventory.intake.v1';
const actionClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3.5 text-xs font-black text-[#5f594f] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45';
const inputClass = 'min-h-11 rounded-xl border border-black/10 bg-white px-3.5 text-sm font-semibold text-[#171612] outline-none transition placeholder:text-[#aaa294] focus:border-[#c77a00]/45 focus:ring-2 focus:ring-[#ffb000]/10';

function clampQty(value: unknown) {
  return Math.max(1, Math.min(999999, Math.trunc(Number(value) || 1)));
}

function isEan(format: string) {
  return format === 'ean_13' || format === 'ean_8' || format === 'upc_a' || format === 'upc_e';
}

function formatLabel(format: string) {
  const labels: Record<string, string> = {
    qr_code: 'QR',
    ean_13: 'EAN-13',
    ean_8: 'EAN-8',
    upc_a: 'UPC-A',
    upc_e: 'UPC-E',
    code_128: 'CODE-128',
    code_39: 'CODE-39',
    code_93: 'CODE-93',
    data_matrix: 'Data Matrix',
    manual: 'Manual',
  };
  return labels[format] || format || 'Manual';
}

export default function AdminInventarioScanPage() {
  const [scans, setScans] = useState<ScanEntry[]>([]);
  const [queue, setQueue] = useState<IntakeItem[]>([]);
  const [queueLoaded, setQueueLoaded] = useState(false);
  const [active, setActive] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const [currentFormat, setCurrentFormat] = useState('manual');
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [quickName, setQuickName] = useState('');
  const [quickSku, setQuickSku] = useState('');
  const [quickPrice, setQuickPrice] = useState(0);
  const [quickActive, setQuickActive] = useState(false);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const loadCatalog = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/inventory?catalog=1', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar el catálogo.');
      setCatalog(Array.isArray(json.products) ? json.products : []);
    } catch {
      setCatalog([]);
    }
  }, []);

  useEffect(() => { void loadCatalog(); }, [loadCatalog]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setQueue(parsed.slice(0, 150) as IntakeItem[]);
      }
    } catch {
      setQueue([]);
    } finally {
      setQueueLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!queueLoaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.slice(0, 150)));
  }, [queue, queueLoaded]);

  const lowStock = useMemo(() => catalog.filter((product) => Number(product.stock ?? 0) <= 5).length, [catalog]);
  const linked = useMemo(() => catalog.filter((product) => product.scan_code || product.ean || product.sku).length, [catalog]);
  const queuedUnits = useMemo(() => queue.reduce((sum, item) => sum + clampQty(item.quantity), 0), [queue]);
  const newQueued = useMemo(() => queue.filter((item) => !item.existing).length, [queue]);

  async function lookup(value: string, format = 'manual') {
    const code = value.trim();
    if (!code) return;
    setBusy('lookup');
    setMessage('');
    setCurrentCode(code);
    setCurrentFormat(format || 'manual');
    setCurrentProduct(null);
    setSelectedProductId('');
    try {
      const response = await fetch(`/api/admin/inventory?code=${encodeURIComponent(code)}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo consultar el código.');
      const product = json.found ? json.product as Product : null;
      const status: ScanStatus = product ? 'found' : 'missing';
      const entry: ScanEntry = { value: code, format, at: new Date().toISOString(), product, status };
      setCurrentProduct(product);
      setScans((current) => [entry, ...current.filter((item) => item.value !== code)].slice(0, 50));
      if (product) {
        setQuickName('');
        setQuickSku('');
        setQuickPrice(0);
        setMessage(`${product.name} identificado. Puedes mover stock ahora o añadir unidades a la lista de recepción.`);
      } else {
        setQuickSku(isEan(format) ? '' : code.slice(0, 64));
        setMessage('Código nuevo. Completa la ficha rápida o vincúlalo a un producto existente.');
      }
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

  function upsertQueue(item: IntakeItem) {
    setQueue((current) => {
      const index = current.findIndex((entry) => entry.code === item.code);
      if (index === -1) return [item, ...current].slice(0, 150);
      const copy = [...current];
      copy[index] = {
        ...copy[index],
        ...item,
        quantity: clampQty(copy[index].quantity) + clampQty(item.quantity),
        error: undefined,
      };
      return copy;
    });
  }

  function addExistingToQueue() {
    if (!currentProduct || !currentCode) return;
    upsertQueue({
      code: currentCode,
      format: currentFormat,
      productId: currentProduct.id,
      existing: true,
      name: currentProduct.name,
      sku: currentProduct.sku || '',
      price: Number(currentProduct.price ?? 0),
      quantity: clampQty(quantity),
      activo: currentProduct.activo !== false,
      addedAt: new Date().toISOString(),
    });
    setMessage(`${currentProduct.name} añadido a la lista de recepción.`);
    setQuantity(1);
  }

  function addNewToQueue() {
    if (!currentCode) return;
    if (!quickName.trim()) {
      setMessage('Escribe un nombre para guardar este producto nuevo en la lista.');
      return;
    }
    upsertQueue({
      code: currentCode,
      format: currentFormat || 'manual',
      existing: false,
      name: quickName.trim().slice(0, 180),
      sku: quickSku.trim().slice(0, 128),
      price: Math.max(0, Number(quickPrice) || 0),
      quantity: clampQty(quantity),
      activo: quickActive,
      addedAt: new Date().toISOString(),
    });
    setMessage(`${quickName.trim()} guardado en la lista. No se publicará en tienda hasta que lo decidas.`);
    setQuantity(1);
    setQuickName('');
    setQuickSku('');
    setQuickPrice(0);
  }

  async function bindCode() {
    if (!selectedProductId || !currentCode) return;
    setBusy('bind');
    setMessage('');
    try {
      const response = await fetch('/api/admin/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProductId, code: currentCode, format: currentFormat }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo asociar el código.');
      const product = json.product as Product;
      setCurrentProduct(product);
      setCatalog((list) => list.map((item) => item.id === product.id ? { ...item, ...product } : item));
      setScans((list) => list.map((scan) => scan.value === currentCode ? { ...scan, product, status: 'found' as const } : scan));
      setMessage(`Código ${formatLabel(currentFormat)} asociado a ${product.name}.`);
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
        body: JSON.stringify({ productId: currentProduct.id, type, quantity: clampQty(quantity), barcode: currentCode }),
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

  function patchQueue(code: string, patch: Partial<IntakeItem>) {
    setQueue((current) => current.map((item) => item.code === code ? { ...item, ...patch, error: undefined } : item));
  }

  function removeQueue(code: string) {
    setQueue((current) => current.filter((item) => item.code !== code));
  }

  async function resolveExistingCode(code: string) {
    const response = await fetch(`/api/admin/inventory?code=${encodeURIComponent(code)}`, { cache: 'no-store' });
    const json = await response.json();
    return response.ok && json.found ? json.product as Product : null;
  }

  async function incorporateQueue() {
    if (!queue.length || busy) return;
    setBusy('import');
    setMessage('');
    const remaining: IntakeItem[] = [];
    let completed = 0;

    for (const original of queue) {
      let item = { ...original, quantity: clampQty(original.quantity), error: undefined };
      try {
        let productId = item.productId;
        if (!productId) {
          const createResponse = await fetch('/api/admin/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: item.name,
              price: Math.max(0, Number(item.price) || 0),
              stock: 0,
              activo: item.activo,
              featured: false,
              sku: item.sku || null,
              ean: isEan(item.format) ? item.code : null,
              scan_code: item.code,
              scan_format: item.format,
              source: 'inventory_scan',
              specifications: {
                inventory_intake: {
                  code: item.code,
                  format: item.format,
                  captured_at: item.addedAt,
                },
              },
            }),
          });
          const createJson = await createResponse.json();
          if (!createResponse.ok) {
            if (createResponse.status === 409) {
              const existing = await resolveExistingCode(item.code);
              if (existing) {
                productId = existing.id;
                item = { ...item, productId, existing: true, name: existing.name };
              } else {
                throw new Error(createJson.error || 'El código ya existe y no se pudo resolver.');
              }
            } else {
              throw new Error(createJson.error || 'No se pudo crear el producto.');
            }
          } else {
            productId = String(createJson.product?.id || '');
            if (!productId) throw new Error('El producto fue creado sin un ID válido.');
          }
        }

        const movementResponse = await fetch('/api/admin/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId,
            type: 'in',
            quantity: item.quantity,
            barcode: item.code,
            note: 'Ingreso desde lista de escaneo QR/código de barras',
            referenceType: 'scanner_intake',
            referenceId: item.addedAt,
          }),
        });
        const movementJson = await movementResponse.json();
        if (!movementResponse.ok) throw new Error(movementJson.error || 'No se pudo incorporar el stock.');
        completed += 1;
      } catch (error) {
        remaining.push({ ...item, error: error instanceof Error ? error.message : 'No se pudo incorporar.' });
      }
    }

    setQueue(remaining);
    await loadCatalog();
    setBusy('');
    if (remaining.length) setMessage(`${completed} producto(s) incorporado(s). ${remaining.length} quedaron en la lista con errores para revisar.`);
    else setMessage(`${completed} producto(s) incorporado(s) al inventario con movimiento de entrada registrado.`);
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Inventario · Captura"
        title="Escáner QR y código de barras"
        description="Escanea productos, arma una lista de recepción y luego incorpórala al inventario con trazabilidad de stock."
        icon={ScanLine}
        actions={<><Link href="/admin/inventario" className={actionClass}>Inventario</Link><Link href="/admin/inventario/movimientos" className={actionClass}>Movimientos</Link></>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Lista" value={queue.length} icon={ListPlus} hint={`${queuedUnits} unidades preparadas`} />
        <AdminStat label="Nuevos" value={newQueued} icon={PackagePlus} accent="yellow" hint="Aún no existen en catálogo" />
        <AdminStat label="Vinculados" value={linked} icon={Link2} accent="emerald" hint="Código persistente" />
        <AdminStat label="Stock bajo" value={lowStock} icon={PackageSearch} accent="rose" hint="≤ 5 unidades" />
      </section>

      <AdminCard className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="button" onClick={() => setActive(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#171612] px-5 text-sm font-black text-white"><Camera className="h-4 w-4" /> Escanear cámara</button>
          <div className="flex min-w-0 flex-1 gap-2">
            <input value={currentCode} onChange={(event) => { setCurrentCode(event.target.value); setCurrentFormat('manual'); }} onKeyDown={(event) => { if (event.key === 'Enter') void lookup(currentCode, currentFormat); }} placeholder="EAN, SKU, QR o código de barras" className={`${inputClass} min-w-0 flex-1`} />
            <button type="button" onClick={() => void lookup(currentCode, currentFormat)} disabled={busy === 'lookup'} className={actionClass}>Buscar</button>
          </div>
        </div>
        {active ? <div className="overflow-hidden rounded-xl border border-black/10"><BarcodeScanner onDetect={handleDetect} onClose={() => setActive(false)} /></div> : null}
        {currentCode ? <p className="text-xs text-[#817a6f]">Código actual: <span className="font-mono font-bold text-[#171612]">{currentCode}</span> · {formatLabel(currentFormat)}</p> : null}
        {message ? <p className="rounded-xl bg-black/[.035] px-4 py-3 text-sm text-[#5f594f]">{message}</p> : null}
      </AdminCard>

      {currentCode && !currentProduct ? (
        <div className="grid gap-3 xl:grid-cols-2">
          <AdminCard className="border-amber-600/15 bg-amber-500/7">
            <div className="flex items-start gap-3"><PackageSearch className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div className="min-w-0 flex-1"><h2 className="font-black text-[#171612]">Vincular a producto existente</h2><p className="mt-1 text-sm text-[#716b60]">Úsalo si el producto ya existe y solo le falta este QR/código.</p></div></div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row"><select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} className={`${inputClass} flex-1`}><option value="">Selecciona producto…</option>{catalog.map((product) => <option key={product.id} value={product.id}>{product.name} · stock {product.stock ?? 0}</option>)}</select><button type="button" onClick={() => void bindCode()} disabled={!selectedProductId || busy === 'bind'} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#ffb000] px-4 text-sm font-black text-[#171612] disabled:opacity-50"><Link2 className="h-4 w-4" /> Vincular</button></div>
          </AdminCard>

          <AdminCard className="border-sky-600/15 bg-sky-500/7">
            <div className="flex items-start gap-3"><PackagePlus className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" /><div><h2 className="font-black text-[#171612]">Preparar producto nuevo</h2><p className="mt-1 text-sm text-[#716b60]">Se guarda primero en la lista. Por defecto queda oculto de la tienda.</p></div></div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2"><input value={quickName} onChange={(event) => setQuickName(event.target.value)} placeholder="Nombre del producto" className={`${inputClass} sm:col-span-2`} /><input value={quickSku} onChange={(event) => setQuickSku(event.target.value)} placeholder="SKU opcional" className={inputClass} /><input type="number" min={0} value={quickPrice} onChange={(event) => setQuickPrice(Math.max(0, Number(event.target.value) || 0))} placeholder="Precio CLP" className={inputClass} /><input type="number" min={1} value={quantity} onChange={(event) => setQuantity(clampQty(event.target.value))} className={inputClass} /><label className="flex min-h-11 items-center gap-2 rounded-xl border border-black/10 bg-white px-3.5 text-xs font-bold text-[#5f594f]"><input type="checkbox" checked={quickActive} onChange={(event) => setQuickActive(event.target.checked)} /> Publicar en tienda al incorporar</label></div>
            <button type="button" onClick={addNewToQueue} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-black text-white"><ListPlus className="h-4 w-4" /> Guardar en lista</button>
          </AdminCard>
        </div>
      ) : null}

      {currentProduct ? (
        <AdminCard className="border-emerald-600/15 bg-emerald-500/7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div><div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-[.14em]">Producto encontrado</span></div><h2 className="mt-1 text-xl font-black text-[#171612]">{currentProduct.name}</h2><p className="text-sm text-[#716b60]">SKU {currentProduct.sku || '—'} · EAN {currentProduct.ean || '—'} · Código {currentProduct.scan_code || currentCode}</p></div>
            <div className="text-left sm:text-right"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">Stock actual</p><p className="text-4xl font-black tracking-[-.05em] text-[#171612]">{currentProduct.stock ?? 0}</p></div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2"><input type="number" min={1} value={quantity} onChange={(event) => setQuantity(clampQty(event.target.value))} className={`${inputClass} w-24 text-center`} /><button type="button" onClick={addExistingToQueue} disabled={Boolean(busy)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#ffb000] px-4 text-sm font-black text-[#171612] disabled:opacity-50"><ListPlus className="h-4 w-4" /> Añadir a lista</button><button type="button" onClick={() => void move('in')} disabled={Boolean(busy)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50"><ArrowDownToLine className="h-4 w-4" /> Entrada inmediata</button><button type="button" onClick={() => void move('out')} disabled={Boolean(busy)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#171612] px-4 text-sm font-bold text-white disabled:opacity-50"><ArrowUpFromLine className="h-4 w-4" /> Salida</button><button type="button" onClick={() => void move('return')} disabled={Boolean(busy)} className={actionClass}><RotateCcw className="h-4 w-4" /> Devolución</button><button type="button" onClick={() => void move('adjustment')} disabled={Boolean(busy)} className={actionClass}>Fijar stock</button></div>
        </AdminCard>
      ) : null}

      <AdminCard className="p-0 sm:p-0">
        <div className="flex flex-col gap-3 border-b border-black/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-[#a56600]" /><h2 className="font-black text-[#171612]">Lista para incorporar</h2></div><p className="mt-1 text-xs text-[#817a6f]">Se guarda automáticamente en este dispositivo hasta completar el ingreso.</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setQueue([])} disabled={!queue.length || busy === 'import'} className={actionClass}><Trash2 className="h-4 w-4" /> Vaciar</button><button type="button" onClick={() => void incorporateQueue()} disabled={!queue.length || Boolean(busy)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white disabled:opacity-45"><PackageCheck className="h-4 w-4" /> {busy === 'import' ? 'Incorporando…' : `Incorporar ${queue.length}`}</button></div>
        </div>
        <div className="divide-y divide-black/6">
          {queue.length === 0 ? <div className="px-5 py-9 text-sm text-[#817a6f]">Escanea un producto y pulsa “Añadir a lista”. Puedes preparar varios antes de modificar el stock real.</div> : queue.map((item) => (
            <div key={item.code} className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(150px,.7fr)_110px_110px_auto] lg:items-center">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[.12em] ${item.existing ? 'bg-emerald-500/10 text-emerald-800' : 'bg-sky-500/10 text-sky-800'}`}>{item.existing ? 'Existente' : 'Nuevo'}</span><span className="text-[10px] font-bold text-[#817a6f]">{formatLabel(item.format)}</span></div>{item.existing ? <p className="mt-1 font-bold text-[#171612]">{item.name}</p> : <input value={item.name} onChange={(event) => patchQueue(item.code, { name: event.target.value })} className={`${inputClass} mt-2 w-full`} />}<p className="mt-1 truncate font-mono text-xs text-[#817a6f]" title={item.code}>{item.code}</p>{item.error ? <p className="mt-2 text-xs font-bold text-rose-700">{item.error}</p> : null}</div>
              <div>{item.existing ? <p className="text-xs text-[#716b60]">SKU {item.sku || '—'}</p> : <input value={item.sku} onChange={(event) => patchQueue(item.code, { sku: event.target.value })} placeholder="SKU opcional" className={`${inputClass} w-full`} />}</div>
              <div><label className="text-[9px] font-black uppercase tracking-[.12em] text-[#8f887c]">Cantidad</label><input type="number" min={1} value={item.quantity} onChange={(event) => patchQueue(item.code, { quantity: clampQty(event.target.value) })} className={`${inputClass} mt-1 w-full text-center`} /></div>
              <div>{item.existing ? <p className="text-xs text-[#716b60]">Stock actual se sumará al incorporar.</p> : <><label className="text-[9px] font-black uppercase tracking-[.12em] text-[#8f887c]">Precio</label><input type="number" min={0} value={item.price} onChange={(event) => patchQueue(item.code, { price: Math.max(0, Number(event.target.value) || 0) })} className={`${inputClass} mt-1 w-full`} /></>}</div>
              <button type="button" onClick={() => removeQueue(item.code)} className="grid h-10 w-10 place-items-center rounded-xl border border-rose-500/15 text-rose-700 hover:bg-rose-500/8" aria-label={`Quitar ${item.name}`}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard className="p-0 sm:p-0">
        <div className="flex items-center gap-2 border-b border-black/8 px-5 py-4"><ScanLine className="h-4 w-4 text-[#a56600]" /><h2 className="font-black text-[#171612]">Últimos escaneos</h2></div>
        <ul className="divide-y divide-black/6">{scans.length === 0 ? <li className="px-5 py-8 text-sm text-[#817a6f]">Aún no hay escaneos.</li> : scans.map((scan, index) => <li key={`${scan.value}-${index}`} className="flex items-center justify-between gap-3 px-5 py-3"><div className="min-w-0"><p className="truncate font-mono text-sm font-bold text-[#171612]">{scan.value}</p><p className="text-xs text-[#817a6f]">{scan.product?.name || (scan.status === 'missing' ? 'Código nuevo' : scan.status === 'error' ? 'Error' : formatLabel(scan.format))}</p></div><span className="shrink-0 text-xs text-[#817a6f]">{new Date(scan.at).toLocaleTimeString('es-CL')}</span></li>)}</ul>
      </AdminCard>
    </AdminPage>
  );
}
