'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ImagePlus, Loader2, RefreshCw, Sparkles, WandSparkles, X } from 'lucide-react';

type Product = {
  id: string;
  name: string;
  image_url?: string | null;
  sku?: string | null;
};

type Mode = 'generate' | 'improve';

export default function ProductAiImageDock() {
  const pathname = usePathname();
  const visible = pathname === '/admin/productos';
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [mode, setMode] = useState<Mode>('generate');
  const [instructions, setInstructions] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'error' | 'info'; text: string } | null>(null);
  const [result, setResult] = useState<{ url: string; model?: string; cost_usd?: number | null } | null>(null);

  const selected = useMemo(() => products.find((product) => product.id === selectedId) || null, [products, selectedId]);

  async function loadProducts() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/products', { cache: 'no-store' });
      const json = await response.json().catch(() => ({})) as { products?: Product[]; error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar el catálogo.');
      const rows = Array.isArray(json.products) ? json.products : [];
      setProducts(rows);
      const fromEditor = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('studio') || '' : '';
      const preferred = fromEditor !== 'new' && rows.some((item) => item.id === fromEditor) ? fromEditor : selectedId || rows[0]?.id || '';
      setSelectedId(preferred);
      const product = rows.find((item) => item.id === preferred);
      setMode(product?.image_url ? 'improve' : 'generate');
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo cargar el catálogo.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && visible) void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, visible]);

  useEffect(() => {
    if (!selected) return;
    if (!selected.image_url && mode === 'improve') setMode('generate');
    setResult(null);
    setMessage(null);
  }, [selectedId]);

  if (!visible) return null;

  async function run() {
    if (!selectedId) {
      setMessage({ type: 'error', text: 'Selecciona un producto guardado.' });
      return;
    }
    if (mode === 'improve' && !selected?.image_url) {
      setMessage({ type: 'error', text: 'Este producto no tiene imagen; usa “Generar nueva”.' });
      return;
    }
    setGenerating(true);
    setResult(null);
    setMessage({ type: 'info', text: mode === 'improve' ? 'Mejorando la imagen y guardándola en Cloudinary…' : 'Generando la imagen y guardándola en Cloudinary…' });
    try {
      const response = await fetch('/api/admin/products/ai-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedId, mode, instructions }),
      });
      const json = await response.json().catch(() => ({})) as { url?: string; model?: string; cost_usd?: number | null; error?: string };
      if (!response.ok || !json.url) throw new Error(json.error || 'No se pudo generar la imagen.');
      setResult({ url: json.url, model: json.model, cost_usd: json.cost_usd });
      setProducts((current) => current.map((product) => product.id === selectedId ? { ...product, image_url: json.url } : product));
      setMessage({ type: 'ok', text: 'Imagen generada, subida a Cloudinary y asignada como portada pública del producto.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo generar la imagen.' });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[180] inline-flex min-h-12 items-center gap-2 rounded-full border border-[#F6C64A]/45 bg-[#111214] px-4 text-xs font-black text-[#F6C64A] shadow-[0_18px_55px_rgba(0,0,0,.32)] transition hover:-translate-y-0.5 hover:border-[#F6C64A] sm:bottom-6 sm:right-6"
        aria-label="Abrir generador de imágenes de productos con IA"
      >
        <WandSparkles className="h-4 w-4" /> Imagen IA
      </button>

      {open ? (
        <div className="fixed inset-0 z-[220] overflow-y-auto bg-black/70 p-3 backdrop-blur-md sm:p-6">
          <section className="mx-auto mt-8 w-full max-w-2xl overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#111214] text-white shadow-2xl sm:mt-16">
            <header className="flex items-start gap-4 border-b border-white/8 p-5 sm:p-6">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#F6C64A] text-[#111214]"><Sparkles className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#F6C64A]">Product Studio · Imagen IA</p>
                <h2 className="mt-1 text-xl font-black tracking-[-.035em]">Generar o mejorar portada</h2>
                <p className="mt-2 text-xs leading-5 text-white/52">Usa los proveedores de imagen disponibles a través de OpenRouter. La imagen aprobada se guarda directamente en Cloudinary y queda asociada al producto.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-white/60 hover:text-white" aria-label="Cerrar"><X className="h-4 w-4" /></button>
            </header>

            <div className="space-y-5 p-5 sm:p-6">
              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-[.14em] text-white/45">Producto</span>
                <div className="flex gap-2">
                  <select value={selectedId} onChange={(event) => { const id = event.target.value; setSelectedId(id); const next = products.find((item) => item.id === id); setMode(next?.image_url ? 'improve' : 'generate'); }} disabled={loading || generating} className="min-h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0A0C0E] px-3 text-sm font-bold text-white outline-none focus:border-[#F6C64A]/60">
                    {products.map((product) => <option key={product.id} value={product.id}>{product.name}{product.sku ? ` · ${product.sku}` : ''}</option>)}
                  </select>
                  <button type="button" onClick={() => void loadProducts()} disabled={loading || generating} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/10 text-white/60 hover:text-[#F6C64A]" aria-label="Actualizar productos">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</button>
                </div>
              </label>

              {selected ? (
                <div className="grid gap-4 rounded-2xl border border-white/8 bg-white/[.035] p-4 sm:grid-cols-[128px_1fr]">
                  <div className="aspect-square overflow-hidden rounded-xl bg-black/35">
                    {(result?.url || selected.image_url) ? <img src={result?.url || selected.image_url || ''} alt={selected.name} className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center text-white/25"><ImagePlus className="h-8 w-8" /></div>}
                  </div>
                  <div className="min-w-0"><p className="text-sm font-black">{selected.name}</p><p className="mt-1 text-[11px] text-white/45">{selected.image_url ? 'Tiene portada · puedes mejorarla o generar una alternativa.' : 'Sin portada · puedes generar la primera imagen.'}</p><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setMode('generate')} disabled={generating} className={`min-h-11 rounded-xl px-3 text-[11px] font-black ${mode === 'generate' ? 'bg-[#F6C64A] text-[#111214]' : 'border border-white/10 text-white/65'}`}>Generar nueva</button><button type="button" onClick={() => setMode('improve')} disabled={!selected.image_url || generating} className={`min-h-11 rounded-xl px-3 text-[11px] font-black disabled:opacity-30 ${mode === 'improve' ? 'bg-[#F6C64A] text-[#111214]' : 'border border-white/10 text-white/65'}`}>Mejorar actual</button></div></div>
                </div>
              ) : null}

              <label className="grid gap-2"><span className="text-[10px] font-black uppercase tracking-[.14em] text-white/45">Indicaciones opcionales</span><textarea value={instructions} onChange={(event) => setInstructions(event.target.value.slice(0, 700))} disabled={generating} rows={4} placeholder={mode === 'improve' ? 'Ej. fondo blanco, iluminación más limpia, mantener exactamente el producto…' : 'Ej. vista frontal, fondo blanco, iluminación de catálogo…'} className="rounded-xl border border-white/10 bg-[#0A0C0E] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-[#F6C64A]/60" /><span className="text-right text-[9px] text-white/25">{instructions.length}/700</span></label>

              {message ? <div className={`rounded-xl border px-4 py-3 text-xs leading-5 ${message.type === 'error' ? 'border-red-400/25 bg-red-500/10 text-red-200' : message.type === 'ok' ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200' : 'border-[#F6C64A]/25 bg-[#F6C64A]/[.07] text-[#F5E6A6]'}`}>{message.text}</div> : null}
              {result?.model ? <p className="text-[10px] leading-5 text-white/35">Modelo: {result.model}{typeof result.cost_usd === 'number' ? ` · costo reportado US$${result.cost_usd.toFixed(4)}` : ''}</p> : null}

              <div className="flex flex-col gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-md text-[10px] leading-5 text-white/38">La generación es manual y puede consumir saldo del proveedor. No se ejecuta al guardar ni al abrir Productos.</p><button type="button" onClick={() => void run()} disabled={generating || loading || !selectedId} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F6C64A] px-5 text-xs font-black text-[#111214] shadow-[0_15px_40px_rgba(246,198,74,.16)] disabled:opacity-45">{generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}{generating ? 'Generando…' : mode === 'improve' ? 'Mejorar y guardar' : 'Generar y guardar'}</button></div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
