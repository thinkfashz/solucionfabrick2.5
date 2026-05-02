'use client';

/**
 * MercadoLibreScraper (a.k.a. ProductUrlImporter)
 * ------------------------------------------------------------------
 * Admin tool that resolves *any* product URL — Mercado Libre short
 * links (`https://meli.la/…`), full ML article URLs, or third-party
 * stores (Falabella, Ripley, AliExpress, Amazon, branded sites…) —
 * to a uniform preview, then persists it as a row in `products` so
 * the admin can later click "Comprar y enviar al cliente" from
 * `/admin/pedidos/[id]` to fulfill the order.
 *
 * All resolution and persistence happens on the server via
 * `POST /api/admin/productos/import-from-url`. The browser only
 * orchestrates the UX.
 *
 * The legacy `extractMlcId` helper is kept as a re-export so any
 * caller relying on it continues to work; the canonical implementation
 * now lives in `@/lib/productImport`.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Link2,
  Search,
  Loader2,
  AlertTriangle,
  Package,
  CheckCircle2,
  Download,
  ExternalLink,
} from 'lucide-react';
import { extractMlcId as canonicalExtractMlcId } from '@/lib/productImportShared';

/** Re-exported for backwards-compatibility with existing callers. */
export const extractMlcId = canonicalExtractMlcId;

// ---------------------------------------------------------------------------
// Types — match @/lib/productImport ImportedProduct shape
// ---------------------------------------------------------------------------

interface ImportedProductPreview {
  source: 'mercadolibre' | 'generic';
  sourceId: string | null;
  sourceUrl: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  imageUrl: string | null;
  available: boolean | null;
  stock: number | null;
}

const CLP_FORMATTER = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

function formatPrice(value: number, currency: string): string {
  if (!Number.isFinite(value) || value <= 0) return '—';
  if (currency === 'CLP') return CLP_FORMATTER.format(value);
  try {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString('es-CL')}`;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MercadoLibreScraper() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportedProductPreview | null>(null);
  const [importedId, setImportedId] = useState<string | null>(null);

  async function handleExtract(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setPreview(null);
    setImportedId(null);

    if (!url.trim()) {
      setError('Pega una URL de producto.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/productos/import-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        preview?: ImportedProductPreview;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.preview) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setPreview(json.preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al resolver la URL.');
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!preview || importing) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/productos/import-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: preview.sourceUrl || url.trim(), persist: true }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        id?: string | null;
        error?: string;
        hint?: string;
        code?: string;
      };
      if (!res.ok || !json.ok) {
        const hint = json.hint ? ` ${json.hint}` : '';
        throw new Error(`${json.error ?? `HTTP ${res.status}`}${hint}`);
      }
      setImportedId(json.id ?? null);
      // Refresh server components that list products.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar el producto.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="w-full rounded-2xl border border-zinc-800/80 bg-zinc-950 p-6 shadow-2xl shadow-black/40 sm:p-8">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-400/10 ring-1 ring-yellow-400/30">
            <Link2 className="h-4 w-4 text-yellow-400" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Importar producto desde URL
            </h2>
            <p className="text-sm text-zinc-400">
              Pega un link de Mercado Libre (incluye los nuevos{' '}
              <code className="rounded bg-zinc-900 px-1 py-0.5 text-yellow-300">meli.la/…</code>),
              Falabella, Ripley, AliExpress, Amazon, o cualquier tienda con metadatos Open Graph
              y crea el producto automáticamente en tu catálogo.
            </p>
          </div>
        </div>
      </header>

      {/* Form */}
      <form onSubmit={handleExtract} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://meli.la/2pWqo  ·  https://articulo.mercadolibre.cl/MLC-123456-…  ·  https://www.falabella.com/…"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            disabled={loading || importing}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 py-3 pl-10 pr-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/30 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
        <button
          type="submit"
          disabled={loading || importing || !url.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-black shadow-[0_8px_24px_-8px_rgba(250,204,21,0.6)] transition hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Resolviendo…
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Buscar
            </>
          )}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
          <span className="break-words">{error}</span>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !preview && (
        <div className="mt-6 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="h-40 w-full flex-shrink-0 rounded-xl bg-zinc-800/80 sm:h-40 sm:w-40" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-3/4 rounded bg-zinc-800" />
              <div className="h-4 w-1/2 rounded bg-zinc-800" />
              <div className="h-8 w-1/3 rounded bg-zinc-800" />
            </div>
          </div>
        </div>
      )}

      {/* Result card */}
      {preview && (
        <PreviewCard
          preview={preview}
          onImport={handleImport}
          importing={importing}
          importedId={importedId}
        />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Preview card
// ---------------------------------------------------------------------------

interface PreviewCardProps {
  preview: ImportedProductPreview;
  onImport: () => void;
  importing: boolean;
  importedId: string | null;
}

function PreviewCard({ preview, onImport, importing, importedId }: PreviewCardProps) {
  return (
    <article className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950 shadow-xl">
      <div className="flex flex-col gap-5 p-5 sm:flex-row">
        {/* Image */}
        <div className="relative h-48 w-full flex-shrink-0 overflow-hidden rounded-xl bg-zinc-800 sm:h-48 sm:w-48">
          {preview.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.imageUrl}
              alt={preview.title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-500">
              <Package className="h-10 w-10" />
            </div>
          )}
          <span className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-yellow-400 ring-1 ring-yellow-400/30 backdrop-blur">
            {preview.source === 'mercadolibre' ? preview.sourceId ?? 'ML' : 'URL'}
          </span>
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col">
          <h3 className="text-base font-semibold leading-snug text-white sm:text-lg">
            {preview.title}
          </h3>

          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-2xl font-bold text-yellow-400 sm:text-3xl">
              {formatPrice(preview.price, preview.currency)}
            </span>
            <span className="text-xs uppercase tracking-wider text-zinc-500">
              {preview.currency}
            </span>
          </div>

          {/* Description */}
          {preview.description && (
            <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-zinc-400">
              {preview.description}
            </p>
          )}

          {/* Pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            <SourcePill source={preview.source} />
            {preview.available !== null && (
              <Pill
                icon={
                  preview.available ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  )
                }
                label="Estado"
                value={preview.available ? 'Disponible' : 'Sin stock'}
              />
            )}
            {preview.stock !== null && (
              <Pill
                icon={<Package className="h-3.5 w-3.5" />}
                label="Stock"
                value={`${preview.stock}`}
              />
            )}
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <a
              href={preview.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 underline-offset-4 transition hover:text-yellow-400 hover:underline"
            >
              Ver publicación original
              <ExternalLink className="h-3 w-3" />
            </a>
            {importedId ? (
              <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                <CheckCircle2 className="h-4 w-4" />
                Importado · ID {importedId.slice(0, 8)}…
              </span>
            ) : (
              <button
                type="button"
                onClick={onImport}
                disabled={importing}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-semibold text-black shadow-[0_8px_24px_-8px_rgba(250,204,21,0.6)] transition hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importando…
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Importar a mi Tienda
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Pills
// ---------------------------------------------------------------------------

interface PillProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function Pill({ icon, label, value }: PillProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700/80 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-200">
      <span className="text-zinc-400">{icon}</span>
      <span className="text-zinc-400">{label}:</span>
      <span className="text-white">{value}</span>
    </span>
  );
}

function SourcePill({ source }: { source: 'mercadolibre' | 'generic' }) {
  if (source === 'mercadolibre') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-200">
        <Link2 className="h-3.5 w-3.5" />
        Mercado Libre
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200">
      <Link2 className="h-3.5 w-3.5" />
      Tienda externa
    </span>
  );
}
