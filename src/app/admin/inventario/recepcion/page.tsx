'use client';

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  CirclePlus,
  Minus,
  PackageCheck,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

type Product = {
  id: string;
  name: string;
  stock: number | null;
  price?: number | null;
  sku?: string | null;
  ean?: string | null;
  scan_code?: string | null;
  image_url?: string | null;
  activo?: boolean | null;
};

type IntakeBatch = {
  id: string;
  status: string;
  source: string;
  label?: string | null;
  device_label?: string | null;
  created_at: string;
  updated_at: string;
};

type IntakeItem = {
  id: string;
  client_item_id: string;
  product_id?: string | null;
  code?: string | null;
  scan_format?: string | null;
  name?: string | null;
  sku?: string | null;
  ean?: string | null;
  image_url?: string | null;
  quantity: number;
  unit_cost?: number | null;
  confidence?: number | null;
  status: string;
  last_error?: string | null;
};

type IntakeSummary = {
  lines: number;
  units: number;
  matched: number;
  newProducts: number;
  errors: number;
  committed: number;
};

type Candidate = {
  name?: string;
  brand?: string;
  model?: string;
  description?: string;
  sku?: string;
  ean?: string;
  category?: string;
  referenceImageUrl?: string;
  confidence?: number;
  attributes?: Record<string, string>;
};

type IntelligenceResponse = {
  ok?: boolean;
  candidate?: Candidate | null;
  imageUrl?: string;
  warnings?: string[];
  error?: string;
};

const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-xs font-black text-[#5f594f] transition hover:bg-[#fffaf0] disabled:cursor-not-allowed disabled:opacity-45';
const darkButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-45';
const inputClass = 'min-h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm font-semibold text-[#171612] outline-none transition placeholder:text-[#aaa294] focus:border-[#c77a00]/45 focus:ring-2 focus:ring-[#ffb000]/10';

function clampQty(value: unknown) {
  return Math.max(1, Math.min(999999999, Math.trunc(Number(value) || 1)));
}

function money(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(parsed) : '$0';
}

async function compressImage(file: File): Promise<File> {
  const allowed = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif']);
  if (file.size <= 1.8 * 1024 * 1024 && allowed.has(file.type)) return file;

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const node = new Image();
      node.onload = () => resolve(node);
      node.onerror = () => reject(new Error('No se pudo preparar la fotografía.'));
      node.src = url;
    });
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('El navegador no pudo comprimir la fotografía.');
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    if (!blob) throw new Error('No se pudo comprimir la fotografía.');
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'producto'}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function InventoryReceivingPage() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [batch, setBatch] = useState<IntakeBatch | null>(null);
  const [items, setItems] = useState<IntakeItem[]>([]);
  const [summary, setSummary] = useState<IntakeSummary>({ lines: 0, units: 0, matched: 0, newProducts: 0, errors: 0, committed: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [productId, setProductId] = useState('');
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [ean, setEan] = useState('');
  const [code, setCode] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [snapshot, setSnapshot] = useState<Record<string, unknown>>({});
  const [preview, setPreview] = useState('');

  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  const loadBatch = useCallback(async (batchId?: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/inventory/intake${batchId ? `?batchId=${encodeURIComponent(batchId)}` : ''}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar la recepción.');
      setBatch(json.batch);
      setItems(Array.isArray(json.items) ? json.items : []);
      setSummary(json.summary || { lines: 0, units: 0, matched: 0, newProducts: 0, errors: 0, committed: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la recepción.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadBatch(); }, [loadBatch]);
  useEffect(() => () => { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

  const pendingCount = useMemo(() => items.filter((item) => item.status !== 'committed').length, [items]);

  function resetDraft() {
    setProductId('');
    setName('');
    setSku('');
    setEan('');
    setCode('');
    setImageUrl('');
    setQuantity(1);
    setUnitCost('');
    setConfidence(null);
    setSnapshot({});
    setSearchResults([]);
    setSearchText('');
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview('');
  }

  async function analyzePhoto(file: File) {
    setBusy('photo');
    setError('');
    setMessage('');
    try {
      const prepared = await compressImage(file);
      if (prepared.size > 3 * 1024 * 1024) throw new Error('La fotografía sigue siendo demasiado pesada.');
      if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(prepared));

      const form = new FormData();
      form.append('action', 'photo');
      form.append('code', code);
      form.append('persistPhoto', '1');
      form.append('image', prepared, prepared.name);
      const response = await fetch('/api/admin/inventory/intelligence', { method: 'POST', body: form });
      const json = await response.json() as IntelligenceResponse;
      if (!response.ok) throw new Error(json.error || 'La IA no pudo identificar el producto.');
      const candidate = json.candidate;
      if (!candidate) throw new Error('No se encontró una coincidencia suficientemente clara. Puedes completar el nombre manualmente.');

      setName(candidate.name || '');
      setSku(candidate.sku || '');
      setEan(candidate.ean || '');
      if (!code && candidate.ean) setCode(candidate.ean);
      setImageUrl(json.imageUrl || candidate.referenceImageUrl || '');
      setConfidence(Number.isFinite(Number(candidate.confidence)) ? Number(candidate.confidence) : null);
      setSnapshot({
        name: candidate.name || '',
        brand: candidate.brand || '',
        model: candidate.model || '',
        description: candidate.description || '',
        category: candidate.category || '',
        attributes: candidate.attributes || {},
        imageUrl: json.imageUrl || candidate.referenceImageUrl || '',
      });
      setMessage(`Producto identificado${candidate.confidence ? ` · confianza ${Math.round(Number(candidate.confidence) * 100)}%` : ''}. Ajusta la cantidad y guarda.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo analizar la fotografía.');
    } finally {
      setBusy('');
    }
  }

  async function onPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) await analyzePhoto(file);
  }

  async function searchProducts() {
    const q = searchText.trim();
    if (!q) return;
    setSearching(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/inventory/search?q=${encodeURIComponent(q)}&limit=12`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo buscar.');
      setSearchResults(Array.isArray(json.products) ? json.products : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo buscar.');
    } finally {
      setSearching(false);
    }
  }

  function chooseProduct(product: Product) {
    setProductId(product.id);
    setName(product.name);
    setSku(product.sku || '');
    setEan(product.ean || '');
    setCode(product.scan_code || product.ean || product.sku || '');
    setImageUrl(product.image_url || '');
    setSnapshot({ existingStock: product.stock ?? 0 });
    setSearchResults([]);
    setMessage(`Producto existente seleccionado · stock actual ${Number(product.stock ?? 0)}.`);
  }

  async function saveAndNext(openCamera = false) {
    if (!batch?.id) return;
    if (!name.trim() && !productId) {
      setError('Identifica o selecciona un producto antes de guardar.');
      return;
    }
    setBusy('save');
    setError('');
    try {
      const response = await fetch('/api/admin/inventory/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_item',
          batchId: batch.id,
          clientItemId: crypto.randomUUID(),
          productId: productId || undefined,
          name,
          sku,
          ean,
          code,
          scanFormat: ean ? (ean.length === 8 ? 'ean_8' : 'ean_13') : 'photo',
          imageUrl,
          quantity: clampQty(quantity),
          unitCost: unitCost ? Number(unitCost) : null,
          confidence,
          snapshot,
          merge: true,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo guardar la línea.');
      setMessage(json.merged ? 'Cantidad sumada al producto que ya estaba en esta recepción.' : 'Producto agregado a la recepción.');
      resetDraft();
      await loadBatch(batch.id);
      if (openCamera) window.setTimeout(() => fileRef.current?.click(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la línea.');
    } finally {
      setBusy('');
    }
  }

  async function updateItem(item: IntakeItem, nextQuantity: number) {
    if (!batch?.id || item.status === 'committed') return;
    setBusy(`qty:${item.id}`);
    try {
      const response = await fetch('/api/admin/inventory/intake', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_item', batchId: batch.id, itemId: item.id, quantity: clampQty(nextQuantity) }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo actualizar.');
      await loadBatch(batch.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar.');
    } finally {
      setBusy('');
    }
  }

  async function removeItem(item: IntakeItem) {
    if (!batch?.id || item.status === 'committed') return;
    setBusy(`delete:${item.id}`);
    try {
      const response = await fetch('/api/admin/inventory/intake', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_item', batchId: batch.id, itemId: item.id }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo eliminar.');
      setItems(json.items || []);
      setSummary(json.summary || summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar.');
    } finally {
      setBusy('');
    }
  }

  async function commitBatch() {
    if (!batch?.id || pendingCount === 0) return;
    setBusy('commit');
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/inventory/intake', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'commit_batch', batchId: batch.id }),
      });
      const json = await response.json();
      if (!response.ok && response.status !== 207) throw new Error(json.error || 'No se pudo incorporar la recepción.');
      setBatch(json.batch || batch);
      setItems(json.items || []);
      setSummary(json.summary || summary);
      setMessage(json.partial ? 'La recepción quedó parcial: revisa las líneas marcadas con error.' : 'Recepción incorporada al stock correctamente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo incorporar la recepción.');
    } finally {
      setBusy('');
    }
  }

  async function newBatch() {
    setBusy('new');
    setError('');
    try {
      const response = await fetch('/api/admin/inventory/intake', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open_batch', source: 'admin_camera', forceNew: true, label: `Recepción ${new Date().toLocaleDateString('es-CL')}` }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo crear una recepción.');
      setBatch(json.batch);
      setItems(json.items || []);
      setSummary(json.summary || { lines: 0, units: 0, matched: 0, newProducts: 0, errors: 0, committed: 0 });
      resetDraft();
      setMessage('Nueva recepción abierta.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear una recepción.');
    } finally {
      setBusy('');
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Inventario · Recepción V2"
        title="Recepción rápida por foto"
        description="Fotografía, identifica, suma cantidades y continúa. El lote queda guardado en la base y puedes retomarlo desde otro equipo."
        icon={PackagePlus}
        actions={<><Link href="/admin/inventario" className={buttonClass}><ArrowLeft className="h-4 w-4" /> Inventario</Link><button className={buttonClass} onClick={() => void newBatch()} disabled={Boolean(busy)}><CirclePlus className="h-4 w-4" /> Nueva recepción</button></>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Productos" value={loading ? '…' : summary.lines} icon={PackagePlus} hint="Líneas de recepción" />
        <AdminStat label="Unidades" value={loading ? '…' : summary.units} icon={PackageCheck} accent="cyan" hint="Cantidad acumulada" />
        <AdminStat label="Existentes" value={loading ? '…' : summary.matched} icon={CheckCircle2} accent="yellow" hint="Vinculados al catálogo" />
        <AdminStat label="Nuevos" value={loading ? '…' : summary.newProducts} icon={Sparkles} accent="rose" hint="Se crean al incorporar" />
      </section>

      {batch ? <div className="rounded-xl border border-black/10 bg-white/65 px-4 py-3 text-xs text-[#817a6f]"><strong className="text-[#171612]">Lote {batch.id.slice(0, 8)}</strong> · estado {batch.status} · actualizado {new Date(batch.updated_at).toLocaleString('es-CL')}</div> : null}
      {message ? <div className="rounded-xl border border-emerald-600/15 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-900">{message}</div> : null}
      {error ? <div className="rounded-xl border border-rose-600/15 bg-rose-500/8 px-4 py-3 text-sm text-rose-900">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <AdminCard className="space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Captura continua</p>
            <h2 className="mt-1 text-xl font-black text-[#171612]">1. Foto o producto existente</h2>
            <p className="mt-1 text-xs leading-5 text-[#817a6f]">Puedes fotografiar un producto sin código. La IA prepara la ficha y la imagen; si ya existe, búscalo y selecciónalo.</p>
          </div>

          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => void onPhoto(event)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={Boolean(busy)} className="flex min-h-28 items-center justify-center gap-3 rounded-[18px] border border-dashed border-[#c77a00]/30 bg-[#fff8e8] px-5 text-sm font-black text-[#8c5b00] transition hover:bg-[#fff2cc]"><Camera className="h-6 w-6" /> {busy === 'photo' ? 'Analizando foto…' : 'Tomar foto del producto'}</button>
            <div className="rounded-[18px] border border-black/10 bg-[#faf8f3] p-3">
              {preview || imageUrl ? <img src={preview || imageUrl} alt="Producto" className="h-24 w-full rounded-xl object-contain" /> : <div className="grid h-24 place-items-center text-xs font-bold text-[#aaa294]"><Upload className="mb-1 h-5 w-5" />Sin fotografía</div>}
            </div>
          </div>

          <div className="flex gap-2">
            <input value={searchText} onChange={(event) => setSearchText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void searchProducts(); }} className={inputClass} placeholder="Buscar por nombre, SKU, EAN o código…" />
            <button className={buttonClass} onClick={() => void searchProducts()} disabled={searching}><Search className="h-4 w-4" /> {searching ? '…' : 'Buscar'}</button>
          </div>
          {searchResults.length ? <div className="grid gap-2 sm:grid-cols-2">{searchResults.map((product) => <button key={product.id} type="button" onClick={() => chooseProduct(product)} className="flex items-center gap-3 rounded-xl border border-black/10 bg-white p-3 text-left transition hover:border-[#d79a27]/40"><div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#f2efe8]">{product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : null}</div><div className="min-w-0 flex-1"><strong className="block truncate text-xs text-[#171612]">{product.name}</strong><small className="block text-[11px] text-[#817a6f]">Stock {Number(product.stock ?? 0)} · {product.sku || product.ean || 'sin código'}</small></div></button>)}</div> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1"><span className="text-[11px] font-black text-[#6f685e]">Nombre</span><input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="Nombre del producto" /></label>
            <label className="space-y-1"><span className="text-[11px] font-black text-[#6f685e]">SKU</span><input value={sku} onChange={(event) => setSku(event.target.value)} className={inputClass} placeholder="SKU opcional" /></label>
            <label className="space-y-1"><span className="text-[11px] font-black text-[#6f685e]">EAN</span><input value={ean} onChange={(event) => setEan(event.target.value)} className={inputClass} placeholder="EAN opcional" /></label>
            <label className="space-y-1"><span className="text-[11px] font-black text-[#6f685e]">Costo unitario</span><input inputMode="numeric" value={unitCost} onChange={(event) => setUnitCost(event.target.value.replace(/[^0-9]/g, ''))} className={inputClass} placeholder="$ costo opcional" /></label>
          </div>

          <div className="rounded-[18px] border border-black/10 bg-[#faf8f3] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><span className="text-[10px] font-black uppercase tracking-[.14em] text-[#9b6a12]">2. Cantidad</span><p className="mt-1 text-xs text-[#817a6f]">Si el producto ya está en el lote, esta cantidad se suma automáticamente.</p></div>
              <div className="flex items-center gap-2"><button className={buttonClass} onClick={() => setQuantity((value) => clampQty(value - 1))}><Minus className="h-4 w-4" /></button><input value={quantity} onChange={(event) => setQuantity(clampQty(event.target.value))} inputMode="numeric" className="h-11 w-20 rounded-xl border border-black/10 bg-white text-center text-lg font-black" /><button className={buttonClass} onClick={() => setQuantity((value) => clampQty(value + 1))}><Plus className="h-4 w-4" /></button></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">{[1, 5, 10, 25, 50].map((value) => <button key={value} className={buttonClass} onClick={() => setQuantity((current) => clampQty(current + value))}>+{value}</button>)}</div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button className={darkButton} disabled={Boolean(busy)} onClick={() => void saveAndNext(true)}><Camera className="h-4 w-4" /> Guardar y tomar siguiente foto</button>
            <button className={buttonClass} disabled={Boolean(busy)} onClick={() => void saveAndNext(false)}><PackagePlus className="h-4 w-4" /> Guardar en el lote</button>
          </div>
          {confidence !== null ? <p className="text-[11px] font-bold text-[#817a6f]">Confianza de identificación: {Math.round(confidence * 100)}%</p> : null}
        </AdminCard>

        <AdminCard className="space-y-4">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Lote actual</p><h2 className="mt-1 text-lg font-black text-[#171612]">{summary.units} unidades</h2></div><button className={buttonClass} onClick={() => void loadBatch(batch?.id)} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
          <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
            {items.length === 0 ? <div className="rounded-xl border border-dashed border-black/10 p-8 text-center text-xs text-[#aaa294]">Aún no hay productos en esta recepción.</div> : items.map((item) => <div key={item.id} className={`rounded-xl border p-3 ${item.status === 'error' ? 'border-rose-500/20 bg-rose-50' : item.status === 'committed' ? 'border-emerald-500/15 bg-emerald-50/50' : 'border-black/10 bg-white'}`}>
              <div className="flex gap-3"><div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#f2efe8]">{item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" /> : null}</div><div className="min-w-0 flex-1"><strong className="block truncate text-xs text-[#171612]">{item.name || 'Producto sin nombre'}</strong><small className="block truncate text-[10px] text-[#817a6f]">{item.sku || item.ean || item.code || 'sin código'} · {item.product_id ? 'existente' : 'nuevo'}</small>{item.last_error ? <small className="mt-1 block text-[10px] font-bold text-rose-700">{item.last_error}</small> : null}</div>{item.status === 'committed' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : item.status === 'error' ? <XCircle className="h-4 w-4 text-rose-600" /> : null}</div>
              <div className="mt-3 flex items-center justify-between gap-2"><div className="flex items-center gap-1"><button className="grid h-8 w-8 place-items-center rounded-lg border border-black/10 bg-white disabled:opacity-40" disabled={item.status === 'committed' || Boolean(busy)} onClick={() => void updateItem(item, item.quantity - 1)}><Minus className="h-3.5 w-3.5" /></button><span className="min-w-10 text-center text-sm font-black">{item.quantity}</span><button className="grid h-8 w-8 place-items-center rounded-lg border border-black/10 bg-white disabled:opacity-40" disabled={item.status === 'committed' || Boolean(busy)} onClick={() => void updateItem(item, item.quantity + 1)}><Plus className="h-3.5 w-3.5" /></button></div><div className="flex items-center gap-2">{item.unit_cost ? <small className="font-bold text-[#817a6f]">{money(item.unit_cost)}</small> : null}<button className="grid h-8 w-8 place-items-center rounded-lg border border-rose-500/10 bg-white text-rose-700 disabled:opacity-40" disabled={item.status === 'committed' || Boolean(busy)} onClick={() => void removeItem(item)}><Trash2 className="h-3.5 w-3.5" /></button></div></div>
            </div>)}
          </div>
          <div className="border-t border-black/10 pt-4"><button className={`${darkButton} w-full`} disabled={pendingCount === 0 || Boolean(busy)} onClick={() => void commitBatch()}><PackageCheck className="h-4 w-4" /> {busy === 'commit' ? 'Incorporando…' : `Incorporar ${pendingCount} línea(s) al stock`}</button><p className="mt-2 text-[10px] leading-4 text-[#817a6f]">Los productos nuevos se crean inicialmente inactivos para no publicarlos automáticamente en la tienda. El stock se actualiza mediante un movimiento atómico y trazable.</p></div>
        </AdminCard>
      </div>
    </AdminPage>
  );
}
