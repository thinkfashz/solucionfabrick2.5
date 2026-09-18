'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  Globe2,
  Link2,
  Loader2,
  Percent,
  Search,
  Upload,
  X,
} from 'lucide-react';

type Source = 'online' | 'json' | 'table' | 'google_sheets';
type Mode = 'insert' | 'upsert';
type MarketSource = 'mercadolibre' | 'serper' | 'serpapi';

type ImportResult = {
  ok?: boolean;
  imported?: number;
  skipped?: number;
  markupPercentage?: number;
  applyMarkup?: boolean;
  errors?: Array<{ row: number; message: string }>;
  categories?: { created: number; matched: number; skipped: number };
  error?: string;
};

type MarketRef = {
  source: MarketSource;
  sourceId: string | null;
  title: string;
  price: number | null;
  currency: string | null;
  url: string;
  image: string | null;
  position: number;
};

type MarketSnapshot = {
  query: string;
  normalizedQuery: string;
  refs: MarketRef[];
  stats: {
    count: number;
    min: number | null;
    max: number | null;
    avg: number | null;
    median: number | null;
    currency: string | null;
  };
};

const SOURCE_LABEL: Record<MarketSource, string> = {
  mercadolibre: 'Mercado Libre',
  serper: 'Google · Serper',
  serpapi: 'Google · SerpAPI',
};

const SAMPLE_TABLE = `nombre\tprecio\tstock\tcategoria\timagen_url\tproveedor\turl_proveedor\tprecio_proveedor\tcaracteristicas
Aire acondicionado 9000 BTU\t249990\t8\tAire acondicionado\thttps://...\tMidea Store\thttps://www.mideastore.cl/...\t249990\t{"BTU":"9000","WiFi":"Sí"}`;
const SAMPLE_JSON = `{"products":[{"name":"Aire acondicionado 9000 BTU","price":249990,"supplier_price":249990,"supplier_currency":"CLP","stock":8,"category":"Aire acondicionado","image":"https://...","source":"Midea Store"}]}`;

function keyFor(ref: MarketRef) {
  return `${ref.source}:${ref.sourceId || ref.url}`;
}

function money(value: number | null, currency = 'CLP') {
  if (!value || !Number.isFinite(value)) return 'Precio no disponible';
  try {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `$${Math.round(value).toLocaleString('es-CL')}`;
  }
}

export default function ProductImportModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const [source, setSource] = useState<Source>('online');
  const [mode, setMode] = useState<Mode>('insert');
  const [content, setContent] = useState(SAMPLE_JSON);
  const [sheetUrl, setSheetUrl] = useState('');
  const [applyMarkup, setApplyMarkup] = useState(true);
  const [markupPercentage, setMarkupPercentage] = useState(30);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [onlineQuery, setOnlineQuery] = useState('');
  const [marketSources, setMarketSources] = useState<Record<MarketSource, boolean>>({ mercadolibre: true, serper: true, serpapi: false });
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [selectedOnline, setSelectedOnline] = useState<string[]>([]);
  const lineCount = useMemo(() => content.split(/\r?\n/).filter((line) => line.trim()).length, [content]);
  const exampleBase = 100000;
  const exampleSale = Math.round(exampleBase * (1 + markupPercentage / 100));

  if (!open) return null;

  function changeSource(next: Source) {
    setSource(next);
    setResult(null);
    if (next === 'json') setContent(SAMPLE_JSON);
    if (next === 'table') setContent(SAMPLE_TABLE);
  }

  async function handleFile(file: File) {
    if (/\.xlsx?$/i.test(file.name)) {
      setResult({ error: 'Exporta el archivo como CSV o copia y pega la tabla.' });
      return;
    }
    setContent(await file.text());
    setSource(file.name.toLowerCase().endsWith('.json') ? 'json' : 'table');
    setResult(null);
  }

  async function searchOnline() {
    const query = onlineQuery.trim();
    if (!query) {
      setResult({ error: 'Escribe qué producto quieres buscar.' });
      return;
    }
    const enabled = (Object.entries(marketSources) as Array<[MarketSource, boolean]>).filter(([, active]) => active).map(([id]) => id);
    if (!enabled.length) {
      setResult({ error: 'Activa al menos una fuente de búsqueda.' });
      return;
    }
    setLoading(true);
    setResult(null);
    setSnapshot(null);
    setSelectedOnline([]);
    try {
      const response = await fetch('/api/admin/market-intel/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, sources: enabled, site: 'MLC', persist: false, useCache: true, limitPerSource: 20 }),
      });
      const json = await response.json().catch(() => ({})) as { ok?: boolean; snapshot?: MarketSnapshot; error?: string };
      if (!response.ok || !json.ok || !json.snapshot) throw new Error(json.error || 'No se pudo buscar productos.');
      setSnapshot(json.snapshot);
      setResult({ ok: true, imported: 0 });
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Error buscando productos.' });
    } finally {
      setLoading(false);
    }
  }

  async function importOnline() {
    if (!snapshot) return;
    const refs = snapshot.refs.filter((ref) => selectedOnline.includes(keyFor(ref))).slice(0, 20);
    if (!refs.length) {
      setResult({ error: 'Selecciona al menos un producto de los resultados.' });
      return;
    }
    setLoading(true);
    setResult(null);
    let imported = 0;
    const errors: Array<{ row: number; message: string }> = [];
    try {
      for (let index = 0; index < refs.length; index += 4) {
        const batch = refs.slice(index, index + 4);
        const batchResults = await Promise.all(batch.map(async (ref, batchIndex) => {
          if (!ref.price || ref.price <= 0) return { ok: false, row: index + batchIndex + 1, error: 'Resultado sin precio.' };
          const sourcePrice = Math.round(ref.price);
          const salePrice = applyMarkup ? Math.round(sourcePrice * (1 + markupPercentage / 100)) : sourcePrice;
          const response = await fetch('/api/admin/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: ref.title,
              description: `Importado desde ${SOURCE_LABEL[ref.source]} para revisión. Confirma ficha técnica, costo real, disponibilidad y condiciones antes de publicarlo.`,
              tagline: 'Producto importado · revisar antes de publicar',
              price: salePrice,
              supplier_price: sourcePrice,
              supplier_currency: ref.currency || 'CLP',
              stock: 0,
              activo: false,
              featured: false,
              image_url: ref.image,
              source: SOURCE_LABEL[ref.source],
              source_url: ref.url,
              source_id: ref.sourceId,
              specifications: {
                imported_online: true,
                imported_at: new Date().toISOString(),
                default_markup_percentage: markupPercentage,
                auto_markup_enabled: applyMarkup,
                market_intel: {
                  query: snapshot.query,
                  normalized_query: snapshot.normalizedQuery,
                  source: ref.source,
                  source_label: SOURCE_LABEL[ref.source],
                  source_position: ref.position,
                  market_min: snapshot.stats.min,
                  market_avg: snapshot.stats.avg,
                  market_median: snapshot.stats.median,
                  market_max: snapshot.stats.max,
                  reference_cost: sourcePrice,
                  captured_at: new Date().toISOString(),
                },
                ...(ref.image ? { gallery_images: [ref.image], gallery_assets: [{ url: ref.image, source: ref.source }] } : {}),
              },
            }),
          });
          const json = await response.json().catch(() => ({})) as { error?: string };
          return response.ok ? { ok: true, row: index + batchIndex + 1, error: '' } : { ok: false, row: index + batchIndex + 1, error: json.error || 'No se pudo importar.' };
        }));
        for (const row of batchResults) {
          if (row.ok) imported += 1;
          else errors.push({ row: row.row, message: row.error });
        }
      }
      setResult({ ok: imported > 0, imported, skipped: errors.length, errors, applyMarkup, markupPercentage });
      if (imported > 0) onImported();
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Error importando resultados.' });
    } finally {
      setLoading(false);
    }
  }

  async function submitImport() {
    if (source === 'online') {
      await importOnline();
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/admin/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, mode, content, url: sheetUrl, applyMarkup, markupPercentage }),
      });
      const json = await response.json() as ImportResult;
      setResult(json);
      if (!response.ok) throw new Error(json.error || 'No se pudo importar.');
      onImported();
    } catch (error) {
      setResult((current) => current?.error ? current : { error: error instanceof Error ? error.message : 'Error importando productos.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#08090A]/85 px-2 py-3 backdrop-blur-xl sm:px-5 sm:py-8">
      <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] bg-[#FFF9EE] text-[#08090A] shadow-[0_35px_120px_rgba(0,0,0,.45)]">
        <header className="relative bg-[#08090A] p-5 text-[#FFF9EE] sm:p-7">
          <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-2xl bg-white/8"><X className="h-5 w-5" /></button>
          <p className="text-[9px] font-black uppercase tracking-[.24em] text-[#FFB000]">Importador de inventario</p>
          <h2 className="mt-2 pr-14 text-3xl font-black tracking-[-.045em]">Busca, selecciona e importa.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">Busca productos usando tus fuentes conectadas o importa archivos. Los productos encontrados online entran como borradores con stock 0 y ocultos hasta que confirmes inventario.</p>
        </header>

        <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-3">
            <SourceButton active={source === 'online'} icon={<Globe2 className="h-5 w-5" />} title="Buscar online" onClick={() => changeSource('online')} />
            <SourceButton active={source === 'json'} icon={<Upload className="h-5 w-5" />} title="JSON" onClick={() => changeSource('json')} />
            <SourceButton active={source === 'table'} icon={<FileSpreadsheet className="h-5 w-5" />} title="CSV o tabla" onClick={() => changeSource('table')} />
            <SourceButton active={source === 'google_sheets'} icon={<Link2 className="h-5 w-5" />} title="Google Sheets" onClick={() => changeSource('google_sheets')} />

            {source !== 'online' ? (
              <div className="rounded-[1.5rem] bg-white p-4 shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#F5871F]">Modo</p>
                <select value={mode} onChange={(event) => setMode(event.target.value as Mode)} className="mt-2 min-h-12 w-full rounded-2xl bg-[#EEE5DC] px-4 text-sm font-bold outline-none"><option value="insert">Insertar nuevos</option><option value="upsert">Actualizar por ID</option></select>
              </div>
            ) : null}

            <div className="rounded-[1.5rem] bg-[#D8C0A8] p-4">
              <div className="flex items-center gap-2"><Percent className="h-4 w-4" /><p className="text-[9px] font-black uppercase tracking-[.16em]">Precio automático</p></div>
              <label className="mt-4 flex items-center justify-between gap-3 text-sm font-bold"><span>Aplicar aumento</span><input type="checkbox" checked={applyMarkup} onChange={(event) => setApplyMarkup(event.target.checked)} className="h-6 w-6" /></label>
              <label className="mt-4 block"><span className="text-[10px] font-black uppercase tracking-[.14em]">Porcentaje</span><div className="mt-2 flex items-center rounded-2xl bg-[#FFF9EE] px-4"><input type="number" min="0" max="300" value={markupPercentage} onChange={(event) => setMarkupPercentage(Math.max(0, Number(event.target.value) || 0))} className="min-h-12 min-w-0 flex-1 bg-transparent text-2xl font-black outline-none" /><b>%</b></div></label>
              <div className="mt-4 rounded-2xl bg-[#08090A] p-4 text-[#FFF9EE]"><p className="text-[9px] uppercase tracking-[.14em] text-white/45">Ejemplo</p><p className="mt-2 text-xs text-white/55">Referencia {exampleBase.toLocaleString('es-CL')}</p><p className="mt-1 text-xl font-black text-[#F2DFBB]">Venta {exampleSale.toLocaleString('es-CL')}</p></div>
            </div>
          </aside>

          <section className="min-w-0 space-y-4">
            {source === 'online' ? (
              <>
                <div className="rounded-[1.5rem] bg-white p-4 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#F5871F]">Búsqueda conectada</p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <label className="relative flex-1"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" /><input value={onlineQuery} onChange={(event) => setOnlineQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void searchOnline(); } }} placeholder="Ej. aire acondicionado inverter 12000 BTU" className="min-h-12 w-full rounded-2xl bg-[#F4EFE6] pl-10 pr-4 text-sm font-bold outline-none" /></label>
                    <button type="button" onClick={() => void searchOnline()} disabled={loading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#08090A] px-5 text-sm font-black text-white disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 text-[#FFB000]" />}Buscar</button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(Object.keys(SOURCE_LABEL) as MarketSource[]).map((id) => <button key={id} type="button" onClick={() => setMarketSources((current) => ({ ...current, [id]: !current[id] }))} className={`rounded-full border px-3 py-2 text-[10px] font-black ${marketSources[id] ? 'border-[#08090A] bg-[#08090A] text-white' : 'border-black/10 bg-white text-black/45'}`}>{marketSources[id] ? <Check className="mr-1 inline h-3 w-3" /> : null}{SOURCE_LABEL[id]}</button>)}
                  </div>
                  <p className="mt-3 text-[10px] leading-4 text-black/40">Usa las APIs ya configuradas en Inteligencia de Mercado. Si una fuente no tiene credenciales, el backend informará el problema sin afectar las demás.</p>
                </div>

                {snapshot?.refs.length ? (
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-sm font-black">{snapshot.refs.length} resultados</p><p className="text-[10px] text-black/40">Seleccionados: {selectedOnline.length}</p></div><button type="button" onClick={() => setSelectedOnline((current) => current.length === snapshot.refs.length ? [] : snapshot.refs.map(keyFor))} className="rounded-xl bg-white px-3 py-2 text-[10px] font-black shadow-sm">{selectedOnline.length === snapshot.refs.length ? 'Quitar todos' : 'Seleccionar todos'}</button></div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {snapshot.refs.map((ref) => {
                        const key = keyFor(ref);
                        const selected = selectedOnline.includes(key);
                        return <button type="button" key={key} onClick={() => setSelectedOnline((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])} className={`overflow-hidden rounded-2xl border bg-white text-left transition ${selected ? 'border-[#F5871F] ring-2 ring-[#F5871F]/20' : 'border-black/8'}`}>
                          <div className="relative aspect-square bg-[#F4EFE6]">{ref.image ? <img src={ref.image} alt="" className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center text-xs text-black/25">Sin imagen</div>}<span className={`absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full ${selected ? 'bg-[#F5871F] text-black' : 'bg-white/90 text-black/25'}`}>{selected ? <Check className="h-4 w-4" /> : null}</span></div>
                          <div className="p-3"><p className="line-clamp-2 min-h-9 text-xs font-black leading-4">{ref.title}</p><p className="mt-2 text-base font-black">{money(ref.price, ref.currency || 'CLP')}</p><p className="mt-1 truncate text-[9px] font-bold uppercase tracking-[.1em] text-[#9b6b19]">{SOURCE_LABEL[ref.source]}</p></div>
                        </button>;
                      })}
                    </div>
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-5 text-amber-900">Los resultados online se importan <b>ocultos y con stock 0</b>. Después revisas costo, precio, imágenes y SEO, agregas inventario y recién entonces los activas.</div>
                  </div>
                ) : null}
              </>
            ) : source === 'google_sheets' ? (
              <input value={sheetUrl} onChange={(event) => setSheetUrl(event.target.value)} placeholder="URL pública de Google Sheets" className="min-h-14 w-full rounded-2xl bg-white px-4 text-sm outline-none shadow-sm" />
            ) : (
              <>
                <label className="grid min-h-32 cursor-pointer place-items-center rounded-[1.5rem] bg-[#E5D2C0] p-5 text-center"><span><Upload className="mx-auto h-7 w-7" /><b className="mt-2 block">Subir CSV, TXT o JSON</b><small className="text-[#7f776d]">También puedes pegar el contenido abajo.</small></span><input type="file" accept=".csv,.tsv,.txt,.json,.xlsx,.xls" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); event.target.value = ''; }} /></label>
                <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={15} spellCheck={false} className="w-full rounded-[1.5rem] bg-[#08090A] p-4 font-mono text-xs leading-6 text-[#FFF9EE] outline-none" />
              </>
            )}

            <div className="grid gap-3 rounded-[1.5rem] bg-white p-4 shadow-sm sm:grid-cols-3"><Mini label="Fuente" value={source === 'online' ? 'APIs online' : source === 'json' ? 'JSON' : source === 'google_sheets' ? 'Sheets' : 'Tabla'} /><Mini label="Contenido" value={source === 'online' ? (snapshot ? `${snapshot.refs.length} resultados` : 'Búsqueda') : source === 'google_sheets' ? 'URL' : `${lineCount} líneas`} /><Mini label="Precio" value={applyMarkup ? `Referencia + ${markupPercentage}%` : 'Usar recibido'} /></div>

            {result?.error ? <div className="rounded-[1.5rem] bg-red-100 p-4 text-sm text-red-800"><div className="flex gap-3"><AlertTriangle className="h-5 w-5 shrink-0" /><div>{result.error}</div></div></div> : null}

            <div className="sticky bottom-0 grid gap-3 rounded-[1.5rem] bg-[#FFF9EE]/94 p-3 shadow-[0_-20px_40px_rgba(255,249,238,.9)] backdrop-blur-xl sm:grid-cols-2">
              <button type="button" onClick={onClose} className="rounded-2xl bg-white px-5 py-4 text-sm font-black">Cancelar</button>
              <button type="button" onClick={() => void submitImport()} disabled={loading || (source === 'online' && selectedOnline.length === 0)} className="inline-flex items-center justify-center rounded-2xl bg-[#08090A] px-5 py-4 text-sm font-black text-[#FFF9EE] disabled:opacity-40">{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}{loading ? 'Procesando…' : source === 'online' ? `Importar ${selectedOnline.length || ''} al inventario` : `Importar con ${applyMarkup ? `${markupPercentage}%` : 'precio original'}`}</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SourceButton({ active, icon, title, onClick }: { active: boolean; icon: React.ReactNode; title: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`flex min-h-16 w-full items-center gap-3 rounded-[1.4rem] p-4 text-left font-black transition ${active ? 'bg-[#08090A] text-[#FFF9EE]' : 'bg-white text-[#08090A]'}`}><span className={active ? 'text-[#FFB000]' : 'text-[#F5871F]'}>{icon}</span>{title}</button>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#F5871F]">{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>;
}
