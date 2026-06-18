'use client';

import { useMemo, useState } from 'react';
import { FileSpreadsheet, Link2, Loader2, Percent, Upload, X } from 'lucide-react';

type Source = 'json' | 'table' | 'google_sheets';
type Mode = 'insert' | 'upsert';

type ImportResult = {
  ok?: boolean;
  imported?: number;
  skipped?: number;
  marginPct?: number;
  errors?: Array<{ row: number; message: string }>;
  error?: string;
};

const SAMPLE_TABLE = `nombre\tcosto_compra\tstock\tcategoria\timagen_url\tdestacado\turl_proveedor\torigen
Collar Aloha con Smart ID\t15920\t12\tMascotas\thttps://...\tsi\thttps://proveedor.cl/producto\tgeneric
Cámara IP 360 Exterior\t63120\t5\tSeguridad\thttps://...\tno\thttps://articulo.mercadolibre.cl/MLC-...\tmercadolibre`;
const SAMPLE_JSON = `[
  {
    "nombre": "Collar Aloha con Smart ID",
    "costo_compra": 15920,
    "stock": 12,
    "categoria": "Mascotas",
    "imagen_url": "https://...",
    "destacado": true,
    "url_proveedor": "https://proveedor.cl/producto",
    "origen": "generic"
  }
]`;

export default function ProductImportModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const [source, setSource] = useState<Source>('table');
  const [mode, setMode] = useState<Mode>('insert');
  const [content, setContent] = useState(SAMPLE_TABLE);
  const [sheetUrl, setSheetUrl] = useState('');
  const [profitMarginPct, setProfitMarginPct] = useState('25');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const help = useMemo(() => {
    const margin = profitMarginPct || '25';
    if (source === 'json') return `Pega un array JSON o un objeto con products/items. El campo precio/costo_compra se tratará como costo y se venderá con +${margin}% de margen.`;
    if (source === 'google_sheets') return `Pega el link público de Google Sheets. La primera fila debe tener encabezados; el importador aplicará +${margin}% automáticamente.`;
    return `Pega una tabla copiada desde Excel/Google Sheets, o sube CSV/TSV/TXT/JSON. La primera fila debe tener encabezados; se aplicará +${margin}% automáticamente.`;
  }, [source, profitMarginPct]);

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
  }

  async function submitImport() {
    setLoading(true);
    setResult(null);
    try {
      const marginPct = Number(String(profitMarginPct || '25').replace(',', '.'));
      const res = await fetch('/api/admin/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, mode, content, url: sheetUrl, marginPct }),
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 px-4 py-6 backdrop-blur-md">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-yellow-300">Carga masiva</p>
            <h2 className="mt-2 text-2xl font-black text-white">Importar productos</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">JSON, CSV, tabla pegada desde Excel/Sheets o Google Sheets público con margen automático.</p>
          </div>
          <button onClick={onClose} className="rounded-2xl border border-white/10 p-3 text-zinc-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-3">
            <SourceButton active={source === 'table'} icon={<FileSpreadsheet className="h-5 w-5" />} title="Excel / CSV" text="Pegar tabla o subir CSV" onClick={() => { setSource('table'); setContent(SAMPLE_TABLE); setResult(null); }} />
            <SourceButton active={source === 'json'} icon={<Upload className="h-5 w-5" />} title="JSON" text="Array de productos" onClick={() => { setSource('json'); setContent(SAMPLE_JSON); setResult(null); }} />
            <SourceButton active={source === 'google_sheets'} icon={<Link2 className="h-5 w-5" />} title="Google Sheets" text="Link público exportable" onClick={() => { setSource('google_sheets'); setResult(null); }} />
            <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Modo</p>
              <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none">
                <option value="insert">Insertar nuevos</option>
                <option value="upsert">Actualizar por ID si existe</option>
              </select>
            </div>
            <label className="block rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-3">
              <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-200"><Percent className="h-3.5 w-3.5" /> Margen</span>
              <div className="relative mt-2">
                <input value={profitMarginPct} onChange={(e) => setProfitMarginPct(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))} inputMode="decimal" className="w-full rounded-xl border border-yellow-300/20 bg-black px-3 py-2 pr-8 text-sm font-black text-white outline-none" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-yellow-200">%</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-yellow-50/65">Por defecto: 25%. Si importas costo_compra 10.000, se guarda precio público 12.500.</p>
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
                <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={14} spellCheck={false} className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-xs leading-6 text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-yellow-300/40" />
              </>
            )}

            {result && (
              <div className={`rounded-2xl border p-4 text-sm ${result.error ? 'border-red-400/30 bg-red-500/10 text-red-100' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'}`}>
                {result.error ? <p>{result.error}</p> : <p><b>{result.imported}</b> productos importados · {result.skipped || 0} filas omitidas · margen aplicado: {result.marginPct ?? profitMarginPct}%.</p>}
                {!!result.errors?.length && <ul className="mt-2 max-h-28 list-disc overflow-y-auto pl-5 text-xs opacity-80">{result.errors.slice(0, 20).map((err, i) => <li key={`${err.row}-${i}`}>Fila {err.row}: {err.message}</li>)}</ul>}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <button onClick={onClose} className="rounded-2xl border border-white/10 px-5 py-4 text-sm font-black text-zinc-300 hover:bg-white/5">Cancelar</button>
              <button onClick={() => void submitImport()} disabled={loading} className="inline-flex items-center justify-center rounded-2xl bg-yellow-300 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-black disabled:opacity-60">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Importar con margen
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
