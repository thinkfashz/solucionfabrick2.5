'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageCircle,
  MessagesSquare,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  WandSparkles,
} from 'lucide-react';
import { AdminPage, AdminPageHeader, AdminStat, AdminStats, AdminSurface } from '@/components/admin/AdminPage';

type Status = 'pending' | 'published' | 'archived';
type AiProvider = 'ollama' | 'openrouter';
type ReviewAnalysis = {
  sentiment?: string;
  summary?: string;
  topics?: string[];
  riskFlags?: string[];
  replySuggestion?: string;
  confidence?: number;
  provider?: string;
  model?: string | null;
};
type Row = {
  id: string;
  product_id: string;
  product_name?: string;
  product_image_url?: string | null;
  author_name: string;
  author_email?: string | null;
  rating: number;
  body: string;
  status: Status;
  verified_purchase?: boolean;
  featured?: boolean;
  admin_reply?: string | null;
  analysis?: ReviewAnalysis | null;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
};
type AiModel = { id: string; name: string };

export default function ProductReviewsAdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [analyzingId, setAnalyzingId] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | Status>('pending');
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [provider, setProvider] = useState<AiProvider>('ollama');
  const [model, setModel] = useState('');
  const [models, setModels] = useState<Record<AiProvider, AiModel[]>>({ ollama: [], openrouter: [] });

  async function reload() {
    try {
      setLoading(true);
      setNotice('');
      const response = await fetch('/api/product-reviews?scope=admin', { cache: 'no-store' });
      const json = await response.json() as { reviews?: Row[]; error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudieron cargar las opiniones.');
      const next = json.reviews || [];
      setRows(next);
      setReplies(Object.fromEntries(next.map((row) => [row.id, row.admin_reply || ''])));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudieron cargar las opiniones.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  useEffect(() => {
    void fetch('/api/admin/modelos-ia/list', { cache: 'no-store' })
      .then((response) => response.json())
      .then((json: { providers?: Array<{ id?: string; configured?: boolean; models?: AiModel[] }> }) => {
        const next: Record<AiProvider, AiModel[]> = { ollama: [], openrouter: [] };
        for (const item of json.providers || []) {
          if ((item.id === 'ollama' || item.id === 'openrouter') && item.configured && Array.isArray(item.models)) {
            next[item.id] = item.models;
          }
        }
        setModels(next);
        setModel(next.ollama[0]?.id || next.openrouter[0]?.id || '');
        if (!next.ollama.length && next.openrouter.length) setProvider('openrouter');
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const available = models[provider];
    if (available.length && !available.some((item) => item.id === model)) setModel(available[0].id);
  }, [provider, models, model]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (status !== 'all' && row.status !== status) return false;
      if (onlyFeatured && !row.featured) return false;
      if (!q) return true;
      return `${row.product_name || ''} ${row.author_name} ${row.author_email || ''} ${row.body}`.toLowerCase().includes(q);
    });
  }, [onlyFeatured, query, rows, status]);

  const pending = rows.filter((row) => row.status === 'pending').length;
  const published = rows.filter((row) => row.status === 'published').length;
  const featured = rows.filter((row) => row.featured).length;
  const average = rows.length ? rows.reduce((sum, row) => sum + Number(row.rating || 0), 0) / rows.length : 0;

  async function patch(row: Row, patchValue: Record<string, unknown>, success: string) {
    try {
      setSavingId(row.id);
      setNotice('');
      const response = await fetch('/api/product-reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: row.id,
          adminReply: replies[row.id] ?? row.admin_reply ?? '',
          ...patchValue,
        }),
      });
      const json = await response.json() as { review?: Row; error?: string };
      if (!response.ok || !json.review) throw new Error(json.error || 'No se pudo actualizar la opinión.');
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, ...json.review, product_name: item.product_name, product_image_url: item.product_image_url } : item));
      setNotice(success);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo actualizar la opinión.');
    } finally {
      setSavingId('');
    }
  }

  async function analyze(row: Row) {
    try {
      setAnalyzingId(row.id);
      setNotice('');
      const response = await fetch('/api/admin/product-reviews/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: row.id, provider, model: model || undefined }),
      });
      const json = await response.json() as { analysis?: ReviewAnalysis; error?: string };
      if (!response.ok || !json.analysis) throw new Error(json.error || 'No se pudo analizar la opinión.');
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, analysis: json.analysis } : item));
      if (json.analysis.replySuggestion && !(replies[row.id] || '').trim()) {
        setReplies((current) => ({ ...current, [row.id]: json.analysis?.replySuggestion || '' }));
      }
      setNotice('Análisis listo. La respuesta sugerida queda editable antes de publicar.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo analizar la opinión.');
    } finally {
      setAnalyzingId('');
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Catálogo & inventario · Comunidad"
        title="Opiniones de productos"
        description="Bandeja central para revisar reseñas, responder clientes, analizar señales con IA y decidir qué opiniones destacar en las fichas públicas."
        actions={<div className="flex gap-2"><button onClick={() => void reload()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-xs font-black text-[#171612]"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</button></div>}
      />

      <AdminStats>
        <AdminStat label="Pendientes" value={pending} note="Esperando revisión" icon={MessageCircle} />
        <AdminStat label="Publicadas" value={published} note="Visibles en productos" icon={CheckCircle2} />
        <AdminStat label="Destacadas" value={featured} note="Prioridad visual" icon={Star} />
        <AdminStat label="Promedio" value={average ? average.toFixed(1) : '—'} note={`${rows.length} opiniones`} icon={MessagesSquare} />
      </AdminStats>

      <AdminSurface title="Bandeja de moderación" description="Busca por producto, cliente o contenido y configura qué IA utilizar para el análisis.">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_170px_150px_220px]">
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-black/10 bg-white px-3"><Search className="h-4 w-4 text-[#c77a00]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto, cliente u opinión…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /><span className="text-[10px] font-black text-black/35">{filtered.length}</span></label>
          <select value={status} onChange={(event) => setStatus(event.target.value as 'all' | Status)} className="h-11 rounded-xl border border-black/10 bg-white px-3 text-xs font-black"><option value="all">Todos</option><option value="pending">Pendientes</option><option value="published">Publicadas</option><option value="archived">Archivadas</option></select>
          <button type="button" onClick={() => setOnlyFeatured((value) => !value)} className={`h-11 rounded-xl border px-3 text-xs font-black ${onlyFeatured ? 'border-[#c77a00] bg-[#fff1cd] text-[#70480a]' : 'border-black/10 bg-white text-black/55'}`}><Star className={`mr-1 inline h-3.5 w-3.5 ${onlyFeatured ? 'fill-[#c77a00]' : ''}`} />Destacadas</button>
          <div className="grid grid-cols-2 gap-2"><select value={provider} onChange={(event) => setProvider(event.target.value as AiProvider)} className="h-11 rounded-xl border border-black/10 bg-white px-2 text-[10px] font-black"><option value="ollama">Ollama</option><option value="openrouter">OpenRouter</option></select><select value={model} onChange={(event) => setModel(event.target.value)} className="h-11 min-w-0 rounded-xl border border-black/10 bg-white px-2 text-[10px] font-bold"><option value="">Auto</option>{models[provider].map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        </div>
        {notice ? <p className="mt-3 rounded-xl border border-[#c77a00]/15 bg-[#c77a00]/[.06] p-3 text-xs text-[#6d4b11]">{notice}</p> : null}
      </AdminSurface>

      <div className="space-y-3">
        {loading ? <AdminSurface><div className="grid min-h-48 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[#c77a00]" /></div></AdminSurface> : filtered.length ? filtered.map((row) => (
          <AdminSurface key={row.id} className={row.status === 'pending' ? 'ring-1 ring-[#c77a00]/20' : ''}>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
              <div>
                <div className="flex gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#f3eee5]">{row.product_image_url ? <img src={row.product_image_url} alt="" className="h-full w-full object-contain" /> : null}</div>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase ${row.status === 'published' ? 'bg-emerald-100 text-emerald-800' : row.status === 'archived' ? 'bg-zinc-200 text-zinc-600' : 'bg-amber-100 text-amber-800'}`}>{row.status === 'published' ? 'Publicada' : row.status === 'archived' ? 'Archivada' : 'Pendiente'}</span>{row.featured ? <span className="rounded-full bg-[#fff0bd] px-2.5 py-1 text-[8px] font-black uppercase text-[#7a530e]">Destacada</span> : null}{row.verified_purchase ? <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[8px] font-black uppercase text-sky-800">Compra verificada</span> : null}<time className="text-[9px] text-black/35">{new Date(row.created_at).toLocaleString('es-CL')}</time></div><h3 className="mt-2 truncate text-lg font-black">{row.product_name || 'Producto'}</h3><p className="mt-1 text-xs text-black/45">{row.author_name}{row.author_email ? ` · ${row.author_email}` : ''}</p></div>
                </div>

                <div className="mt-4 flex gap-1">{[1,2,3,4,5].map((value) => <Star key={value} className={`h-4 w-4 ${value <= row.rating ? 'fill-[#F5871F] text-[#F5871F]' : 'text-black/15'}`} />)}<b className="ml-2 text-xs">{row.rating}/5</b></div>
                <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-[#4d493f]">{row.body}</p>

                {row.analysis?.summary ? <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/60 p-4"><div className="flex flex-wrap items-center gap-2"><Sparkles className="h-4 w-4 text-violet-700" /><b className="text-xs">Análisis IA</b><span className="rounded-full bg-white px-2 py-1 text-[9px] font-black text-violet-700">{row.analysis.sentiment || 'sin clasificar'}{typeof row.analysis.confidence === 'number' ? ` · ${row.analysis.confidence}%` : ''}</span></div><p className="mt-2 text-xs leading-5 text-violet-950/65">{row.analysis.summary}</p>{row.analysis.topics?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{row.analysis.topics.map((topic) => <span key={topic} className="rounded-full bg-white px-2 py-1 text-[9px] font-bold text-violet-800">{topic}</span>)}</div> : null}{row.analysis.riskFlags?.length ? <p className="mt-2 text-[10px] font-bold text-red-700">Señales: {row.analysis.riskFlags.join(' · ')}</p> : null}</div> : null}

                <div className="mt-4 flex flex-wrap gap-2"><Link href={`/tienda/${row.product_id}`} target="_blank" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.12em] text-[#9b6a12]">Ver producto <ExternalLink className="h-3.5 w-3.5" /></Link><button type="button" onClick={() => void analyze(row)} disabled={analyzingId === row.id} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.12em] text-violet-700">{analyzingId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WandSparkles className="h-3.5 w-3.5" />}Analizar con {provider === 'ollama' ? 'Ollama' : 'IA'}</button></div>
              </div>

              <div className="rounded-2xl border border-black/8 bg-[#f7f2e9] p-4">
                <label className="text-[9px] font-black uppercase tracking-[.13em] text-[#8f887c]">Respuesta de Soluciones Fabrick<textarea value={replies[row.id] || ''} onChange={(event) => setReplies((current) => ({ ...current, [row.id]: event.target.value }))} rows={5} maxLength={1200} placeholder="Respuesta que se mostrará debajo de la opinión publicada." className="mt-2 w-full resize-none rounded-xl border border-black/10 bg-white p-3 text-sm leading-6 outline-none focus:border-[#c77a00]/50" /></label>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => void patch(row, { status: 'published' }, 'Opinión publicada.')} disabled={savingId === row.id} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#171612] px-3 text-[10px] font-black text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Publicar</button>
                  <button onClick={() => void patch(row, { status: 'archived' }, 'Opinión archivada.')} disabled={savingId === row.id} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-[10px] font-black disabled:opacity-50"><Archive className="h-4 w-4" />Archivar</button>
                  <button onClick={() => void patch(row, { verifiedPurchase: !row.verified_purchase }, row.verified_purchase ? 'Marca de compra verificada retirada.' : 'Opinión marcada como compra verificada.')} disabled={savingId === row.id} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 text-[10px] font-black disabled:opacity-50 ${row.verified_purchase ? 'border-sky-300 bg-sky-50 text-sky-800' : 'border-black/10 bg-white'}`}><BadgeCheck className="h-4 w-4" />{row.verified_purchase ? 'Verificada' : 'Verificar'}</button>
                  <button onClick={() => void patch(row, { featured: !row.featured }, row.featured ? 'Opinión retirada de destacados.' : 'Opinión destacada.')} disabled={savingId === row.id} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 text-[10px] font-black disabled:opacity-50 ${row.featured ? 'border-[#d49a2d] bg-[#fff1cd] text-[#70480a]' : 'border-black/10 bg-white'}`}><Star className={`h-4 w-4 ${row.featured ? 'fill-current' : ''}`} />{row.featured ? 'Destacada' : 'Destacar'}</button>
                </div>
                <button onClick={() => void patch(row, {}, 'Respuesta guardada.')} disabled={savingId === row.id} className="mt-2 min-h-10 w-full rounded-xl border border-[#c77a00]/20 bg-[#c77a00]/[.06] px-3 text-[10px] font-black text-[#7b5410] disabled:opacity-50">Guardar respuesta</button>
              </div>
            </div>
          </AdminSurface>
        )) : <AdminSurface><div className="grid min-h-52 place-items-center text-center"><div><MessagesSquare className="mx-auto h-7 w-7 text-[#c77a00]" /><h3 className="mt-3 text-lg font-black">No hay opiniones en este filtro.</h3><p className="mt-1 text-sm text-black/45">Cambia el filtro o espera nuevas reseñas de clientes.</p></div></div></AdminSurface>}
      </div>
    </AdminPage>
  );
}
