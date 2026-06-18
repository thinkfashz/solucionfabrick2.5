'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Eye, FileSpreadsheet, Link2, Loader2, Percent, Save, Upload, X } from 'lucide-react';

type Source = 'json' | 'table' | 'google_sheets';
type Mode = 'insert' | 'upsert';

type PreviewProduct = {
  row?: number;
  id?: string;
  name: string;
  description?: string | null;
  price: number;
  stock?: number | null;
  image_url?: string | null;
  category_id?: string | null;
  source?: string | null;
  source_url?: string | null;
  source_id?: string | null;
  supplier_price?: number | null;
  supplier_currency?: string | null;
  margin_pct?: number | null;
  price_pack?: number | null;
  price_offer?: number | null;
  installation_price?: number | null;
  stock_status?: string | null;
  query_date?: string | null;
  activo?: boolean;
  featured?: boolean;
  warnings?: string[];
  raw_price?: number;
  rounded_price?: number;
  specifications?: Record<string, unknown> | null;
};

type ImportResult = {
  ok?: boolean;
  preview?: boolean;
  products?: PreviewProduct[];
  total?: number;
  imported?: number;
  skipped?: number;
  warnings?: number;
  marginPct?: number;
  errors?: Array<{ row: number; message: string }>;
  error?: string;
};

const SAMPLE_TABLE = `nombre\tcategoria\tmarca\tcapacidad_btu\tprecio_compra\tmargen\tstock\tproveedor\tlink_compra\tdescripcion\timagen\tgarantia\testado_stock\tfecha_consulta\tinstalacion\tprecio_pack\tprecio_oferta
Aire Acondicionado Samsung Inverter 12000 BTU\tAire acondicionado\tSamsung\t12000\t319990\t30\t3\tFalabella\thttps://tienda.cl/producto/samsung-12000\tSplit muro inverter frío/calor, ideal para dormitorios y oficinas.\thttps://tienda.cl/imagen-producto.jpg\t1 año proveedor\tdisponible\t2026-06-18\t149990\t549990\t529990`;

const SAMPLE_JSON = `[
  {
    "nombre": "Aire Acondicionado Samsung Inverter 12000 BTU",
    "categoria": "Aire acondicionado",
    "marca": "Samsung",
    "capacidad_btu": 12000,
    "precio_compra": 319990,
    "margen": 30,
    "link_compra": "https://tienda.cl/producto/samsung-12000",
    "descripcion": "Aire acondicionado split muro inverter frío/calor, ideal para dormitorios y oficinas.",
    "imagen": "https://tienda.cl/imagen-producto.jpg",
    "stock": 3,
    "proveedor": "Falabella",
    "garantia": "1 año proveedor",
    "estado_stock": "disponible",
    "fecha_consulta": "2026-06-18",
    "instalacion": 149990,
    "precio_pack": 549990,
    "precio_oferta": 529990
  }
]`;

function toNumber(value: unknown) {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(/\D/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function clp(value: unknown) {
  return `$${toNumber(value).toLocaleString('es-CL')}`;
}

function roundCommercial(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value >= 100000) return Math.floor(value / 10000) * 10000 + 9990;
  if (value >= 10000) return Math.floor(value / 1000) * 1000 + 990;
  if (value >= 1000) return Math.floor(value / 100) * 100 + 90;
  return Math.round(value);
}

function marginNumber(value: string) {
  const n = Number(String(value || '25').replace(',', '.'));
  return Number.isFinite(n) ? Math.max(0, n) : 25;
}

export default function ProductImportModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const [source, setSource] = useState<Source>('table');
  const [mode, setMode] = useState<Mode>('insert');
  const [content, setContent] = useState(SAMPLE_TABLE);
  const [sheetUrl, setSheetUrl] = useState('');
  const [profitMarginPct, setProfitMarginPct] = useState('25');
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState<'publish' | 'draft' | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewProducts, setPreviewProducts] = useState<PreviewProduct[]>([]);

  const help = useMemo(() => {
    const margin = profitMarginPct || '25';
    if (source === 'json') return `Pega un array JSON generado por IA. El admin validará productos, aplicará +${margin}% y mostrará vista previa antes de publicar.`;
    if (source === 'google_sheets') return `Pega un Google Sheets público. La primera fila debe tener encabezados; podrás editar margen/precio por producto antes de guardar.`;
    return `Pega una tabla desde Excel/Sheets o sube CSV/TSV/TXT/JSON. Se generará una vista previa editable con margen global de +${margin}%.`;
  }, [source, profitMarginPct]);

  const summary = useMemo(() => {
    const total = previewProducts.length;
    const warnings = previewProducts.reduce((sum, item) => sum + (item.warnings?.length ?? 0), 0);
    const value = previewProducts.reduce((sum, item) => sum + toNumber(item.price) * Math.max(1, toNumber(item.stock || 1)), 0);
    return { total, warnings, value };
  }, [previewProducts]);

  if (!open) return null;

  async function handleFile(file: File) {
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      setResult({ error: 'Excel directo (.xlsx/.xls) todavía debe exportarse como CSV o pegarse como tabla. El importador sí procesa tablas copiadas desde Excel/Google Sheets automáticamente.' });
      return;
    }
    const text = await file.text();
    setContent(text);
    setSource(lower.endsWith('.json') ? 'json' : 'table');
    setResult(null);
    setPreviewProducts([]);
  }

  function setSourceMode(next: Source) {
    setSource(next);
    setResult(null);
    setPreviewProducts([]);
    if (next === 'table') setContent(SAMPLE_TABLE);
    if (next === 'json') setContent(SAMPLE_JSON);
  }

  function updatePreviewProduct(index: number, patch: Partial<PreviewProduct>) {
    setPreviewProducts((current) => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  }

  function updateMargin(index: number, raw: string) {
    const margin = marginNumber(raw);
    setPreviewProducts((current) => current.map((item, i) => {
      if (i !== index) return item;
      const cost = toNumber(item.supplier_price || item.price);
      const rawPrice = Math.round(cost * (1 + margin / 100));
      const price = roundCommercial(rawPrice);
      return {
        ...item,
        margin_pct: margin,
        raw_price: rawPrice,
        rounded_price: price,
        price,
        specifications: {
          ...(item.specifications ?? {}),
          margen_importacion: margin,
          precio_calculado_sin_redondeo: rawPrice,
          precio_redondeado: price,
        },
      };
    }));
  }

  async function generatePreview() {
    setLoading(true);
    setResult(null);
    setPreviewProducts([]);
    try {
      const marginPct = marginNumber(profitMarginPct);
      const res = await fetch('/api/admin/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', source, mode, content, url: sheetUrl, marginPct }),
      });
      const json = await res.json() as ImportResult;
      setResult(json);
      if (!res.ok) throw new Error(json.error || 'No se pudo generar la vista previa.');
      setPreviewProducts(json.products ?? []);
    } catch (err) {
      setResult((current) => current?.error ? current : { error: err instanceof Error ? err.message : 'Error generando vista previa.' });
    } finally {
      setLoading(false);
    }
  }

  async function publishImport(asDraft = false) {
    if (previewProducts.length === 0) {
      setResult({ error: 'Primero genera la vista previa.' });
      return;
    }
    setPublishing(asDraft ? 'draft' : 'publish');
    setResult(null);
    try {
      const marginPct = marginNumber(profitMarginPct);
      const res = await fetch('/api/admin/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', source, mode, marginPct, asDraft, products: previewProducts }),
      });
      const json = await res.json() as ImportResult;
      setResult(json);
      if (!res.ok) throw new Error(json.error || 'No se pudo publicar.');
      onImported();
    } catch (err) {
      setResult((current) => current?.error ? current : { error: err instanceof Error ? err.message : 'Error publicando productos.' });
    } finally {
      setPublishing(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 px-4 py-6 backdrop-blur-md">
      <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-yellow-300">Carga masiva inteligente</p>
            <h2 className="mt-2 text-2xl font-black text-white">Importar productos</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-500">JSON / Excel / Google Sheets → validación → margen automático → redondeo comercial → vista previa → publicación.</p>
          </div>
          <button onClick={onClose} className="rounded-2xl border border-white/10 p-3 text-zinc-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-3">
            <SourceButton active={source === 'table'} icon={<FileSpreadsheet className="h-5 w-5" />} title="Excel / CSV" text="Pegar tabla o subir CSV" onClick={() => setSourceMode('table')} />
            <SourceButton active={source === 'json'} icon={<Upload className="h-5 w-5" />} title="JSON / Texto IA" text="Pegar JSON generado por IA" onClick={() => setSourceMode('json')} />
            <SourceButton active={source === 'google_sheets'} icon={<Link2 className="h-5 w-5" />} title="Google Sheets" text="Link público exportable" onClick={() => setSourceMode('google_sheets')} />
            <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Modo</p>
              <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none">
                <option value="insert">Insertar nuevos</option>
                <option value="upsert">Actualizar por ID si existe</option>
              </select>
            </div>
            <label className="block rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-3">
              <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-200"><Percent className="h-3.5 w-3.5" /> Margen global</span>
              <div className="relative mt-2">
                <input value={profitMarginPct} onChange={(e) => setProfitMarginPct(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))} inputMode="decimal" className="w-full rounded-xl border border-yellow-300/20 bg-black px-3 py-2 pr-8 text-sm font-black text-white outline-none" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-yellow-200">%</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-yellow-50/65">Puedes cambiar este margen por producto en la vista previa.</p>
            </label>
          </aside>

          <section className="space-y-4">
            <div className="rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-4 text-sm leading-6 text-yellow-50/75">{help}</div>
            {source === 'google_sheets' ? (
              <label className="block rounded-2xl border border-white/10 bg-black/30 p-4">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">URL Google Sheets</span>
                <input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0" className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-yellow-300/40" />
              </label>
            ) : (
              <>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-4 text-sm font-bold text-zinc-300 hover:border-yellow-300/40 hover:text-yellow-200">
                  <Upload className="h-4 w-4" /> Subir CSV, TSV, TXT o JSON
                  <input type="file" accept=".csv,.tsv,.txt,.json,.xlsx,.xls" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleFile(file); e.target.value = ''; }} />
                </label>
                <textarea value={content} onChange={(e) => { setContent(e.target.value); setPreviewProducts([]); }} rows={12} spellCheck={false} className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-xs leading-6 text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-yellow-300/40" />
              </>
            )}

            {result && (
              <div className={`rounded-2xl border p-4 text-sm ${result.error ? 'border-red-400/30 bg-red-500/10 text-red-100' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'}`}>
                {result.error ? <p>{result.error}</p> : result.preview ? <p><b>{result.total}</b> productos listos para revisar · {result.warnings || 0} alertas · {result.skipped || 0} filas omitidas.</p> : <p><b>{result.imported}</b> productos guardados · {result.skipped || 0} filas omitidas.</p>}
                {!!result.errors?.length && <ul className="mt-2 max-h-28 list-disc overflow-y-auto pl-5 text-xs opacity-80">{result.errors.slice(0, 20).map((err, i) => <li key={`${err.row}-${i}`}>Fila {err.row}: {err.message}</li>)}</ul>}
              </div>
            )}

            {previewProducts.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                  <Metric label="Productos" value={summary.total} />
                  <Metric label="Alertas" value={summary.warnings} />
                  <Metric label="Valor venta" value={clp(summary.value)} />
                </div>
                <div className="max-h-[430px] overflow-auto rounded-2xl border border-white/10">
                  <table className="w-full min-w-[960px] text-sm">
                    <thead className="sticky top-0 bg-zinc-950">
                      <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                        <th className="px-3 py-3">Producto</th>
                        <th className="px-3 py-3">Costo</th>
                        <th className="px-3 py-3">Margen</th>
                        <th className="px-3 py-3">Venta</th>
                        <th className="px-3 py-3">Stock</th>
                        <th className="px-3 py-3">Proveedor</th>
                        <th className="px-3 py-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {previewProducts.map((product, index) => (
                        <tr key={`${product.row}-${index}`} className="align-top">
                          <td className="px-3 py-3">
                            <input value={product.name} onChange={(e) => updatePreviewProduct(index, { name: e.target.value })} className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 font-bold text-white outline-none" />
                            <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{product.description || 'Sin descripción'}</p>
                          </td>
                          <td className="px-3 py-3">
                            <input value={toNumber(product.supplier_price)} inputMode="numeric" onChange={(e) => updatePreviewProduct(index, { supplier_price: toNumber(e.target.value) })} className="w-28 rounded-xl border border-white/10 bg-black px-3 py-2 text-yellow-200 outline-none" />
                          </td>
                          <td className="px-3 py-3">
                            <div className="relative w-24">
                              <input value={product.margin_pct ?? marginNumber(profitMarginPct)} inputMode="decimal" onChange={(e) => updateMargin(index, e.target.value)} className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 pr-7 text-white outline-none" />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">%</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <input value={toNumber(product.price)} inputMode="numeric" onChange={(e) => updatePreviewProduct(index, { price: toNumber(e.target.value), rounded_price: toNumber(e.target.value) })} className="w-32 rounded-xl border border-yellow-300/30 bg-yellow-300/10 px-3 py-2 font-black text-yellow-100 outline-none" />
                            <p className="mt-1 text-[10px] text-zinc-600">Calc: {clp(product.raw_price || 0)}</p>
                          </td>
                          <td className="px-3 py-3">
                            <input value={product.stock ?? 0} inputMode="numeric" onChange={(e) => updatePreviewProduct(index, { stock: toNumber(e.target.value) })} className="w-20 rounded-xl border border-white/10 bg-black px-3 py-2 text-white outline-none" />
                          </td>
                          <td className="px-3 py-3">
                            <input value={product.source_url ?? ''} onChange={(e) => updatePreviewProduct(index, { source_url: e.target.value })} placeholder="https://..." className="w-56 rounded-xl border border-white/10 bg-black px-3 py-2 text-xs text-zinc-200 outline-none" />
                            <p className="mt-1 text-[10px] text-zinc-600">{product.source || 'Proveedor no definido'}</p>
                          </td>
                          <td className="px-3 py-3">
                            {product.warnings?.length ? (
                              <ul className="max-w-[240px] list-disc space-y-1 pl-4 text-xs text-amber-200">
                                {product.warnings.slice(0, 4).map((warning, i) => <li key={i}>{warning}</li>)}
                              </ul>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200"><CheckCircle2 className="h-3 w-3" /> OK</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="grid gap-3 lg:grid-cols-3">
              <button onClick={() => void generatePreview()} disabled={loading || !!publishing} className="inline-flex items-center justify-center rounded-2xl border border-yellow-300/30 bg-yellow-300/10 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-yellow-100 disabled:opacity-60">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                Generar vista previa
              </button>
              <button onClick={() => void publishImport(true)} disabled={!previewProducts.length || !!publishing || loading} className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-5 py-4 text-sm font-black text-zinc-300 hover:bg-white/5 disabled:opacity-50">
                {publishing === 'draft' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar borrador
              </button>
              <button onClick={() => void publishImport(false)} disabled={!previewProducts.length || !!publishing || loading} className="inline-flex items-center justify-center rounded-2xl bg-yellow-300 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-black disabled:opacity-60">
                {publishing === 'publish' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Publicar todos
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SourceButton({ active, icon, title, text, onClick }: { active: boolean; icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return <button onClick={onClick} className={`w-full rounded-2xl border p-4 text-left transition ${active ? 'border-yellow-300 bg-yellow-300 text-black' : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:border-yellow-300/40'}`}><span className="inline-flex items-center gap-2 font-black">{icon}{title}</span><span className={`mt-1 block text-xs ${active ? 'text-black/65' : 'text-zinc-500'}`}>{text}</span></button>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-3"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{label}</p><p className="mt-1 text-xl font-black text-white">{value}</p></div>;
}
