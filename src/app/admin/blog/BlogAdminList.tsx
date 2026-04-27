'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus, Loader2, Search, Newspaper, Eye, EyeOff, Pencil, FileDown } from 'lucide-react';

interface BlogRow {
  id: string;
  slug: string;
  title: string;
  description?: string;
  published: boolean;
  published_at?: string | null;
  updated_at?: string;
  cover_url?: string | null;
}

export function BlogAdminList() {
  const [posts, setPosts] = useState<BlogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/blog', { cache: 'no-store' });
      const json = (await res.json()) as { posts?: BlogRow[]; error?: string; hint?: string };
      if (!res.ok) throw new Error(json.error ? `${json.error}${json.hint ? ` — ${json.hint}` : ''}` : `HTTP ${res.status}`);
      setPosts(json.posts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleImport() {
    if (!confirm('Importar entradas .md a la base de datos? Las que ya existan (por slug) se omitirán.')) return;
    setImporting(true);
    setImportMessage(null);
    try {
      const res = await fetch('/api/admin/blog/import-md', { method: 'POST' });
      const json = (await res.json()) as { imported?: number; total?: number; error?: string };
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setImportMessage(`Importadas ${json.imported ?? 0} de ${json.total ?? 0} entradas.`);
      await load();
    } catch (e) {
      setImportMessage(e instanceof Error ? e.message : 'Error al importar.');
    } finally {
      setImporting(false);
    }
  }

  const filtered = search.trim()
    ? posts.filter((p) => `${p.title} ${p.slug} ${p.description ?? ''}`.toLowerCase().includes(search.toLowerCase()))
    : posts;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-playfair text-2xl font-black tracking-wide text-yellow-400">Blog</h1>
          <p className="text-xs text-zinc-500">Crea, edita y publica entradas. Cambios visibles inmediatamente en /blog.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-300 hover:border-yellow-400/40 hover:text-yellow-400 disabled:opacity-50"
            title="Importar entradas .md existentes a la BD"
          >
            {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            Importar .md
          </button>
          <Link
            href="/admin/blog/nuevo"
            className="flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-black hover:bg-yellow-300"
          >
            <Plus className="h-3.5 w-3.5" /> Nueva entrada
          </Link>
        </div>
      </header>

      {importMessage && (
        <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-xs text-yellow-100">{importMessage}</div>
      )}

      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/60 px-3 py-2">
        <Search className="h-4 w-4 text-zinc-500" />
        <input
          type="search"
          placeholder="Buscar por título, slug o descripción…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-3 text-xs text-red-300">
          {error}
          <p className="mt-1 text-[10px] text-red-200/70">Si aún no existe la tabla, ve a <Link href="/admin/setup" className="underline">/admin/setup</Link> y pulsa “Crear tablas ahora”.</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-xs text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-black/40 py-12 text-zinc-500">
          <Newspaper className="h-8 w-8" />
          <p className="text-sm">No hay entradas todavía.</p>
          <Link href="/admin/blog/nuevo" className="text-xs uppercase tracking-[0.2em] text-yellow-400 hover:underline">Crear la primera</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-black/60 p-3 transition hover:border-yellow-400/30">
              {p.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_url} alt="" className="h-14 w-20 flex-shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-14 w-20 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-zinc-900 text-zinc-600">
                  <Newspaper className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-white">{p.title}</h3>
                  <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] ${p.published ? 'bg-green-500/20 text-green-300' : 'bg-zinc-800 text-zinc-400'}`}>
                    {p.published ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />} {p.published ? 'Publicado' : 'Borrador'}
                  </span>
                </div>
                <p className="truncate text-[11px] text-zinc-500">/{p.slug}</p>
                {p.description && <p className="mt-1 line-clamp-1 text-xs text-zinc-400">{p.description}</p>}
              </div>
              <Link
                href={`/admin/blog/${p.id}`}
                className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-300 hover:border-yellow-400/40 hover:text-yellow-400"
              >
                <Pencil className="h-3 w-3" /> Editar
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
