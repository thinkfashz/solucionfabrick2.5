'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Link2, Loader2, Upload, X } from 'lucide-react';

type Source = 'json' | 'table' | 'google_sheets';
type Mode = 'insert' | 'upsert';

type ImportResult = {
  ok?: boolean;
  imported?: number;
  skipped?: number;
  errors?: Array<{ row: number; message: string }>;
  categories?: {
    created: number;
    matched: number;
    skipped: number;
    errors?: Array<{ category: string; message: string }>;
  };
  error?: string;
};

const SAMPLE_TABLE = `nombre\tprecio\tstock\tcategoria\timagen_url\tproveedor\turl_proveedor\tprecio_proveedor\tcaracteristicas
Aire acondicionado 9000 BTU\t299990\t8\tAire acondicionado\thttps://...\tMidea Store\thttps://www.mideastore.cl/...\t249990\t{"BTU":"9000","WiFi":"Sí"}
Aire acondicionado 12000 BTU\t399990\t5\tAire acondicionado\thttps://...\tTCL Store\thttps://tclstore.cl/...\t349990\t{"BTU":"12000","Inverter":"Sí"}`;

const SAMPLE_JSON = `{
  "products": [
    {
      "name": "Aire acondicionado 9000 BTU",
      "price": 299990,
      "supplier_price": 249990,
      "supplier_currency": "CLP",
      "stock": 8,
      "category": "Aire acondicionado",
      "image": "https://...",
      "source": "Midea Store",
      "source_url": "https://www.mideastore.cl/...",
      "specifications": {
        "BTU": "9000",
        "Inverter": "Sí",
        "WiFi": "Sí"
      },
      "featured": true
    }
  ]
}`;

export default function ProductImportModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const [source, setSource] = useState<Source>('json');
  const [mode, setMode] = useState<Mode>('insert');
  const [content, setContent] = useState(SAMPLE_JSON);
  const [sheetUrl, setSheetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const help = useMemo(() => {
    if (source === 'json') return 'Pega un array JSON o un objeto con products/items/productos/data. El importador crea la categoría si viene como texto, guarda proveedor, URL fuente, precio proveedor y especificaciones.';
    if (source === 'google_sheets') return 'Pega el link público de Google Sheets. Usa encabezados como nombre, precio, categoria, proveedor, url_proveedor, precio_proveedor, caracteristicas.';
    return 'Pega una tabla desde Excel/Sheets o sube CSV/TSV/TXT. La primera fila debe tener encabezados; las categorías se crean automáticamente si no existen.';
  }, [source]);

  const lineCount = useMemo(() => content.split(/\r?\n/).filter((line) => line.trim()).length, [content]);

  if (!open) return null;

  function setSourceWithSample(next: Source) {
    setSource(next);
    setResult(null);
    if (next === 'json') setContent(SAMPLE_JSON);
    if (next === 'table') setContent(SAMPLE_TABLE);
  }

  async function handleFile(file: File) {
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      setResult({ error: 'Para Excel directo, exporta como CSV o copia y pega la tabla. Así evitamos una dependencia pesada en el admin.' });
      return;
    }
    const text = await file.text();
    setContent(text);
    setSource(lower.endsWith('.json') ? 'json' : 'table');
    setResult(null);
  }

  async function submitImport() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, mode, content, url: sheetUrl }),
      });
      const json = await res.json() as ImportResult;
      setResult(json);
      if (!res.ok) throw new Error(json.error || 'No se pudo importar.');
      onImported();
    } catch (err) {
      setResult((current) => current?.error ? current : { error: err instanceof Error ? err.message : 'Error importando productos.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 px-3 py-4 backdrop-blur-xl sm:px-5 sm:py-8">
      <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] border border-yellow-300/15 bg-[#070707] shadow-[0_30px_120px_rgba(0,0,0,0.7)]">
        <div className="relative border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.22),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.07),transparent)] p-5 sm:p-6">
          <button onClick={onClose} className="absolute right-4 top-4 rounded-2xl border border-white/10 bg-black/40 p-3 text-zinc-400 transition hover:border-yellow-300/40 hover:text-white">
            <X className="h-5 w-5" />
          </button>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Carga masiva inteligente</p>
          <h2 className="mt-3 pr-14 text-2xl font-black text-white sm:text-3xl">Importar productos</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            Sube JSON, CSV, TXT o pega una tabla. Ahora crea categorías automáticamente y guarda proveedor, link fuente, precio proveedor, precio de venta y detalles técnicos.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MiniStat label="Formato activo" value={source === 'json' ? 'JSON' : source === 'google_sheets' ? 'Sheets' : 'Tabla'} />
            <MiniStat label="Modo" value={mode === 'insert' ? 'Insertar' : 'Actualizar'} />
            <MiniStat label="Contenido" value={source === 'google_sheets' ? 'URL' : `${lineCount} líneas`} />
          </div>
        </div>

        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-3">
            <SourceButton active={source === 'json'} icon={<Upload className="h-5 w-5" />} title="JSON" text="Ideal para productos generados con IA" onClick={() => setSourceWithSample('json')} />
            <SourceButton active={source === 'table'} icon={<FileSpreadsheet className="h-5 w-5" />} title="Excel / CSV" text="Pegar tabla o subir CSV/TSV/TXT" onClick={() => setSourceWithSample('table')} />
            <SourceButton active={source === 'google_sheets'} icon={<Link2 className="h-5 w-5" />} title="Google Sheets" text="Link público exportable" onClick={() => setSourceWithSample('google_sheets')} />

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Modo de importación</p>
              <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-yellow-300/40">
                <option value="insert">Insertar nuevos</option>
                <option value="upsert">Actualizar por ID si existe</option>
              </select>
              <p className="mt-3 text-xs leading-5 text-zinc-500">Usa “Actualizar” solo cuando tus filas traen un ID real UUID del producto.</p>
            </div>
          </aside>

          <section className="space-y-4">
            <div className="rounded-3xl border border-yellow-300/20 bg-yellow-300/10 p-4 text-sm leading-6 text-yellow-50/80">
              {help}
            </div>

            {source === 'google_sheets' ? (
              <label className="block rounded-3xl border border-white/10 bg-black/35 p-4">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">URL Google Sheets</span>
                <input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0" className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-yellow-300/40" />
              </label>
            ) : (
              <>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-yellow-300/25 bg-yellow-300/[0.04] px-4 py-7 text-center text-sm font-bold text-zinc-200 transition hover:border-yellow-300/60 hover:bg-yellow-300/10 hover:text-yellow-100">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-300 text-black shadow-[0_0_30px_rgba(250,204,21,0.25)]">
                    <Upload className="h-5 w-5" />
                  </span>
                  Subir CSV, TSV, TXT o JSON
                  <span className="text-xs font-medium text-zinc-500">También puedes pegar el contenido directamente abajo.</span>
                  <input type="file" accept=".csv,.tsv,.txt,.json,.xlsx,.xls" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleFile(file); e.target.value = ''; }} />
                </label>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={16} spellCheck={false} className="w-full rounded-3xl border border-white/10 bg-black/50 p-4 font-mono text-xs leading-6 text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-yellow-300/40 sm:text-sm" />
              </>
            )}

            {result && (
              <div className={`rounded-3xl border p-4 text-sm ${result.error ? 'border-red-400/30 bg-red-500/10 text-red-100' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'}`}>
                <div className="flex items-start gap-3">
                  {result.error ? <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />}
                  <div className="space-y-2">
                    {result.error ? <p>{result.error}</p> : <p><b>{result.imported}</b> productos importados · {result.skipped || 0} filas omitidas.</p>}
                    {result.categories && (
                      <p className="text-xs opacity-85">
                        Categorías: {result.categories.created} creadas · {result.categories.matched} vinculadas · {result.categories.skipped} sin categoría.
                      </p>
                    )}
                    {!!result.errors?.length && <ul className="max-h-32 list-disc overflow-y-auto pl-5 text-xs opacity-80">{result.errors.slice(0, 30).map((err, i) => <li key={`${err.row}-${i}`}>Fila {err.row}: {err.message}</li>)}</ul>}
                    {!!result.categories?.errors?.length && <ul className="max-h-32 list-disc overflow-y-auto pl-5 text-xs opacity-80">{result.categories.errors.slice(0, 20).map((err, i) => <li key={`${err.category}-${i}`}>Categoría {err.category}: {err.message}</li>)}</ul>}
                  </div>
                </div>
              </div>
            )}

            <div className="sticky bottom-0 grid gap-3 rounded-3xl border border-white/10 bg-black/75 p-3 backdrop-blur-xl sm:grid-cols-2">
              <button onClick={onClose} className="rounded-2xl border border-white/10 px-5 py-4 text-sm font-black text-zinc-300 transition hover:bg-white/5">Cancelar</button>
              <button onClick={() => void submitImport()} disabled={loading} className="inline-flex items-center justify-center rounded-2xl bg-yellow-300 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-black shadow-[0_15px_45px_rgba(250,204,21,0.18)] transition hover:bg-yellow-200 disabled:opacity-60">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {loading ? 'Importando…' : 'Importar a base de datos'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{label}</p><p className="mt-1 text-sm font-black text-white">{value}</p></div>;
}

function SourceButton({ active, icon, title, text, onClick }: { active: boolean; icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return <button onClick={onClick} className={`w-full rounded-3xl border p-4 text-left transition ${active ? 'border-yellow-300 bg-yellow-300 text-black shadow-[0_18px_45px_rgba(250,204,21,0.2)]' : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:border-yellow-300/40 hover:bg-yellow-300/[0.04]'}`}><span className="inline-flex items-center gap-2 font-black">{icon}{title}</span><span className={`mt-1 block text-xs leading-5 ${active ? 'text-black/65' : 'text-zinc-500'}`}>{text}</span></button>;
}
