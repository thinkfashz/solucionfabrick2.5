'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Link2, Loader2, Percent, Upload, X } from 'lucide-react';

type Source = 'json' | 'table' | 'google_sheets';
type Mode = 'insert' | 'upsert';
type ImportResult = { ok?: boolean; imported?: number; skipped?: number; markupPercentage?: number; applyMarkup?: boolean; errors?: Array<{ row: number; message: string }>; categories?: { created: number; matched: number; skipped: number }; error?: string };

const SAMPLE_TABLE = `nombre\tprecio\tstock\tcategoria\timagen_url\tproveedor\turl_proveedor\tprecio_proveedor\tcaracteristicas
Aire acondicionado 9000 BTU\t249990\t8\tAire acondicionado\thttps://...\tMidea Store\thttps://www.mideastore.cl/...\t249990\t{"BTU":"9000","WiFi":"Sí"}`;
const SAMPLE_JSON = `{"products":[{"name":"Aire acondicionado 9000 BTU","price":249990,"supplier_price":249990,"supplier_currency":"CLP","stock":8,"category":"Aire acondicionado","image":"https://...","source":"Midea Store"}]}`;

export default function ProductImportModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const [source, setSource] = useState<Source>('json');
  const [mode, setMode] = useState<Mode>('insert');
  const [content, setContent] = useState(SAMPLE_JSON);
  const [sheetUrl, setSheetUrl] = useState('');
  const [applyMarkup, setApplyMarkup] = useState(true);
  const [markupPercentage, setMarkupPercentage] = useState(30);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const lineCount = useMemo(() => content.split(/\r?\n/).filter((line) => line.trim()).length, [content]);
  const exampleBase = 100000;
  const exampleSale = Math.round(exampleBase * (1 + markupPercentage / 100));

  if (!open) return null;

  function changeSource(next: Source) {
    setSource(next); setResult(null);
    if (next === 'json') setContent(SAMPLE_JSON);
    if (next === 'table') setContent(SAMPLE_TABLE);
  }

  async function handleFile(file: File) {
    if (/\.xlsx?$/i.test(file.name)) { setResult({ error: 'Exporta el archivo como CSV o copia y pega la tabla.' }); return; }
    setContent(await file.text()); setSource(file.name.toLowerCase().endsWith('.json') ? 'json' : 'table'); setResult(null);
  }

  async function submitImport() {
    setLoading(true); setResult(null);
    try {
      const response = await fetch('/api/admin/products/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, mode, content, url: sheetUrl, applyMarkup, markupPercentage }),
      });
      const json = await response.json() as ImportResult;
      setResult(json);
      if (!response.ok) throw new Error(json.error || 'No se pudo importar.');
      onImported();
    } catch (error) { setResult((current) => current?.error ? current : { error: error instanceof Error ? error.message : 'Error importando productos.' }); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#171820]/85 px-2 py-3 backdrop-blur-xl sm:px-5 sm:py-8">
      <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] bg-[#F8F0E9] text-[#171820] shadow-[0_35px_120px_rgba(0,0,0,.45)]">
        <header className="relative bg-[#171820] p-5 text-[#F8F0E9] sm:p-7">
          <button onClick={onClose} className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-2xl bg-white/8"><X className="h-5 w-5" /></button>
          <p className="text-[9px] font-black uppercase tracking-[.24em] text-[#CCB196]">Importación con precio automático</p>
          <h2 className="mt-2 pr-14 text-3xl font-black tracking-[-.045em]">Carga, calcula y publica en un solo paso.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">Cada producto puede tomar el costo proveedor y sumarle automáticamente el porcentaje comercial antes de guardarse.</p>
        </header>

        <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-3">
            <SourceButton active={source === 'json'} icon={<Upload className="h-5 w-5" />} title="JSON" onClick={() => changeSource('json')} />
            <SourceButton active={source === 'table'} icon={<FileSpreadsheet className="h-5 w-5" />} title="CSV o tabla" onClick={() => changeSource('table')} />
            <SourceButton active={source === 'google_sheets'} icon={<Link2 className="h-5 w-5" />} title="Google Sheets" onClick={() => changeSource('google_sheets')} />

            <div className="rounded-[1.5rem] bg-white p-4 shadow-sm">
              <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#895E3D]">Modo</p>
              <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="mt-2 min-h-12 w-full rounded-2xl bg-[#EEE5DC] px-4 text-sm font-bold outline-none"><option value="insert">Insertar nuevos</option><option value="upsert">Actualizar por ID</option></select>
            </div>

            <div className="rounded-[1.5rem] bg-[#D8C0A8] p-4">
              <div className="flex items-center gap-2"><Percent className="h-4 w-4" /><p className="text-[9px] font-black uppercase tracking-[.16em]">Aumento automático</p></div>
              <label className="mt-4 flex items-center justify-between gap-3 text-sm font-bold"><span>Aplicar al importar</span><input type="checkbox" checked={applyMarkup} onChange={(e) => setApplyMarkup(e.target.checked)} className="h-6 w-6" /></label>
              <label className="mt-4 block"><span className="text-[10px] font-black uppercase tracking-[.14em]">Porcentaje</span><div className="mt-2 flex items-center rounded-2xl bg-[#F8F0E9] px-4"><input type="number" min="0" max="300" value={markupPercentage} onChange={(e) => setMarkupPercentage(Math.max(0, Number(e.target.value) || 0))} className="min-h-12 min-w-0 flex-1 bg-transparent text-2xl font-black outline-none" /><b>%</b></div></label>
              <div className="mt-4 rounded-2xl bg-[#171820] p-4 text-[#F8F0E9]"><p className="text-[9px] uppercase tracking-[.14em] text-white/45">Ejemplo</p><p className="mt-2 text-xs text-white/55">Costo {exampleBase.toLocaleString('es-CL')}</p><p className="mt-1 text-xl font-black text-[#E5CFBA]">Venta {exampleSale.toLocaleString('es-CL')}</p></div>
            </div>
          </aside>

          <section className="space-y-4">
            {source === 'google_sheets' ? <input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="URL pública de Google Sheets" className="min-h-14 w-full rounded-2xl bg-white px-4 text-sm outline-none shadow-sm" /> : <><label className="grid min-h-32 cursor-pointer place-items-center rounded-[1.5rem] bg-[#E5D2C0] p-5 text-center"><span><Upload className="mx-auto h-7 w-7" /><b className="mt-2 block">Subir CSV, TXT o JSON</b><small className="text-[#756B63]">También puedes pegar el contenido abajo.</small></span><input type="file" accept=".csv,.tsv,.txt,.json,.xlsx,.xls" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleFile(file); e.target.value = ''; }} /></label><textarea value={content} onChange={(e) => setContent(e.target.value)} rows={15} spellCheck={false} className="w-full rounded-[1.5rem] bg-[#171820] p-4 font-mono text-xs leading-6 text-[#F8F0E9] outline-none" /></>}

            <div className="grid gap-3 rounded-[1.5rem] bg-white p-4 shadow-sm sm:grid-cols-3"><Mini label="Formato" value={source === 'json' ? 'JSON' : source === 'google_sheets' ? 'Sheets' : 'Tabla'} /><Mini label="Contenido" value={source === 'google_sheets' ? 'URL' : `${lineCount} líneas`} /><Mini label="Precio" value={applyMarkup ? `Costo + ${markupPercentage}%` : 'Usar recibido'} /></div>

            {result ? <div className={`rounded-[1.5rem] p-4 text-sm ${result.error ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}><div className="flex gap-3">{result.error ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}<div>{result.error ? result.error : <><b>{result.imported}</b> productos importados con {result.applyMarkup ? `${result.markupPercentage}% de aumento` : 'el precio recibido'}.</>}</div></div></div> : null}

            <div className="sticky bottom-0 grid gap-3 rounded-[1.5rem] bg-[#F8F0E9]/92 p-3 backdrop-blur-xl sm:grid-cols-2"><button onClick={onClose} className="rounded-2xl bg-white px-5 py-4 text-sm font-black">Cancelar</button><button onClick={() => void submitImport()} disabled={loading} className="inline-flex items-center justify-center rounded-2xl bg-[#171820] px-5 py-4 text-sm font-black text-[#F8F0E9] disabled:opacity-50">{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}{loading ? 'Calculando e importando…' : `Importar con ${applyMarkup ? `${markupPercentage}%` : 'precio original'}`}</button></div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SourceButton({ active, icon, title, onClick }: { active: boolean; icon: React.ReactNode; title: string; onClick: () => void }) { return <button onClick={onClick} className={`flex min-h-16 w-full items-center gap-3 rounded-[1.4rem] p-4 text-left font-black transition ${active ? 'bg-[#171820] text-[#F8F0E9]' : 'bg-white text-[#171820]'}`}><span className={active ? 'text-[#CCB196]' : 'text-[#895E3D]'}>{icon}</span>{title}</button>; }
function Mini({ label, value }: { label: string; value: string }) { return <div><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#895E3D]">{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>; }
