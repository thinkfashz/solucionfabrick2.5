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

import { useEffect, useMemo, useState } from 'react';
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
  Copy,
  RotateCcw,
  Star,
  X,
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
  images: string[];
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

interface ImportOverrides {
  title?: string;
  description?: string | null;
  price?: number;
  currency?: string;
  imageUrl?: string | null;
  images?: string[];
  delivery_days?: number | null;
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
      // Defensive: older server builds may not return `images`.
      const previewWithImages: ImportedProductPreview = {
        ...json.preview,
        images:
          Array.isArray(json.preview.images) && json.preview.images.length > 0
            ? json.preview.images
            : json.preview.imageUrl
              ? [json.preview.imageUrl]
              : [],
      };
      setPreview(previewWithImages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al resolver la URL.');
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(overrides: ImportOverrides) {
    if (!preview || importing) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/productos/import-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: preview.sourceUrl || url.trim(),
          persist: true,
          overrides,
        }),
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
        <EditablePreviewCard
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
// Editable preview card — admin can tweak title, description, price,
// currency, días de envío and the image gallery before persisting.
// ---------------------------------------------------------------------------

interface EditablePreviewCardProps {
  preview: ImportedProductPreview;
  onImport: (overrides: ImportOverrides) => void;
  importing: boolean;
  importedId: string | null;
}

function EditablePreviewCard({ preview, onImport, importing, importedId }: EditablePreviewCardProps) {
  // Local form state, seeded from the scraped preview.
  const initialPriceDigits = useMemo(() => {
    if (!Number.isFinite(preview.price) || preview.price <= 0) return '';
    return preview.currency.toUpperCase() === 'CLP'
      ? String(Math.round(preview.price))
      : String(preview.price);
  }, [preview.price, preview.currency]);

  const [title, setTitle] = useState(preview.title);
  const [description, setDescription] = useState(preview.description ?? '');
  const [priceDigits, setPriceDigits] = useState(initialPriceDigits);
  const [currency, setCurrency] = useState(preview.currency || 'CLP');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(preview.imageUrl);
  const [keptImages, setKeptImages] = useState<string[]>(() => {
    const list = preview.images.length > 0 ? preview.images : preview.imageUrl ? [preview.imageUrl] : [];
    return Array.from(new Set(list));
  });
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Re-seed when the scraped preview changes (e.g. user re-runs the scrape).
  useEffect(() => {
    setTitle(preview.title);
    setDescription(preview.description ?? '');
    setPriceDigits(initialPriceDigits);
    setCurrency(preview.currency || 'CLP');
    setDeliveryDays('');
    setCoverUrl(preview.imageUrl);
    const list = preview.images.length > 0 ? preview.images : preview.imageUrl ? [preview.imageUrl] : [];
    setKeptImages(Array.from(new Set(list)));
  }, [preview, initialPriceDigits]);

  const priceNumber = priceDigits ? Number.parseFloat(priceDigits) : 0;
  const priceDisplay = useMemo(() => {
    const n = priceNumber;
    if (!Number.isFinite(n) || n <= 0) return '';
    if (currency.toUpperCase() === 'CLP') return Math.round(n).toLocaleString('es-CL');
    return n.toLocaleString('es-CL');
  }, [priceNumber, currency]);

  function handlePriceChange(raw: string) {
    // Allow digits + at most one dot for non-CLP currencies.
    if (currency.toUpperCase() === 'CLP') {
      setPriceDigits(raw.replace(/\D/g, ''));
    } else {
      const cleaned = raw.replace(/[^\d.]/g, '');
      const firstDot = cleaned.indexOf('.');
      const normalized =
        firstDot === -1
          ? cleaned
          : cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
      setPriceDigits(normalized);
    }
  }

  function toggleImage(urlValue: string) {
    setKeptImages((current) => {
      if (current.includes(urlValue)) {
        const next = current.filter((u) => u !== urlValue);
        // If we just removed the cover, fall back to the first remaining image.
        if (coverUrl === urlValue) {
          setCoverUrl(next[0] ?? null);
        }
        return next;
      }
      return [...current, urlValue];
    });
  }

  async function copyToClipboard(value: string) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        // Best-effort fallback for older browsers.
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedUrl(value);
      setTimeout(() => setCopiedUrl((c) => (c === value ? null : c)), 1500);
    } catch {
      /* ignore — admin can still copy from the input */
    }
  }

  function handleReset() {
    setTitle(preview.title);
    setDescription(preview.description ?? '');
    setPriceDigits(initialPriceDigits);
    setCurrency(preview.currency || 'CLP');
    setDeliveryDays('');
    setCoverUrl(preview.imageUrl);
    const list = preview.images.length > 0 ? preview.images : preview.imageUrl ? [preview.imageUrl] : [];
    setKeptImages(Array.from(new Set(list)));
  }

  const galleryImages = useMemo(() => {
    if (preview.images.length > 0) return preview.images;
    return coverUrl ? [coverUrl] : [];
  }, [preview.images, coverUrl]);

  function handleSubmit() {
    if (!title.trim() || priceNumber <= 0) return;
    const finalCurrency = (currency || 'CLP').toUpperCase();
    const overrides: ImportOverrides = {
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      price: finalCurrency === 'CLP' ? Math.round(priceNumber) : priceNumber,
      currency: finalCurrency,
      imageUrl: coverUrl,
      images: keptImages,
    };
    if (deliveryDays.trim()) {
      const n = Number.parseInt(deliveryDays, 10);
      if (Number.isFinite(n) && n >= 0) overrides.delivery_days = n;
    } else {
      overrides.delivery_days = null;
    }
    onImport(overrides);
  }

  const canSubmit = title.trim().length > 0 && priceNumber > 0;

  return (
    <article className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950 shadow-xl">
      <div className="flex flex-col gap-5 p-5">
        {/* Header row */}
        <div className="flex flex-col gap-3 border-b border-zinc-800/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <SourcePill source={preview.source} />
            <a
              href={preview.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 underline-offset-4 transition hover:text-yellow-400 hover:underline"
            >
              Ver publicación original
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
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
              <Pill icon={<Package className="h-3.5 w-3.5" />} label="Stock" value={`${preview.stock}`} />
            )}
          </div>
        </div>

        {/* Editable fields */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Left column: text fields */}
          <div className="space-y-4">
            <FormField label="Título">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!!importedId}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/30 disabled:opacity-60"
                placeholder="Nombre del producto"
              />
            </FormField>

            <FormField label="Descripción">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!!importedId}
                rows={5}
                className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/30 disabled:opacity-60"
                placeholder="Describe las características del producto…"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Precio">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={priceDisplay}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    disabled={!!importedId}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-7 pr-3 text-sm text-white outline-none transition focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/30 disabled:opacity-60"
                    placeholder="0"
                  />
                </div>
              </FormField>
              <FormField label="Moneda">
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 5))}
                  disabled={!!importedId}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm uppercase text-white outline-none transition focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/30 disabled:opacity-60"
                  placeholder="CLP"
                  maxLength={5}
                />
              </FormField>
            </div>

            <FormField label="Días de envío" hint="Tiempo estimado de despacho. Déjalo vacío si no aplica.">
              <input
                type="number"
                min={0}
                step={1}
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
                disabled={!!importedId}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/30 disabled:opacity-60"
                placeholder="3"
              />
            </FormField>
          </div>

          {/* Right column: image gallery */}
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                Imágenes
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Elige cuál usar como portada, copia los links que quieras reutilizar en otra parte
                de tu sitio o quita las que no necesites.
              </p>
            </div>

            {keptImages.length === 0 && coverUrl === null ? (
              <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 text-xs text-zinc-500">
                Sin imágenes detectadas. Pega una URL en el formulario después de importar.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {galleryImages.map((imgUrl) => {
                  const kept = keptImages.includes(imgUrl);
                  const isCover = coverUrl === imgUrl;
                  return (
                    <div
                      key={imgUrl}
                      className={`group relative overflow-hidden rounded-xl border transition ${
                        isCover
                          ? 'border-yellow-400/70 ring-2 ring-yellow-400/40'
                          : kept
                            ? 'border-zinc-700'
                            : 'border-zinc-800 opacity-50'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgUrl}
                        alt=""
                        loading="lazy"
                        className="h-28 w-full object-cover"
                      />
                      {isCover && (
                        <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-yellow-400/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                          <Star className="h-3 w-3" />
                          Portada
                        </span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/90 to-black/0 p-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (!kept) toggleImage(imgUrl);
                            setCoverUrl(imgUrl);
                          }}
                          disabled={!!importedId || isCover}
                          title="Usar como portada"
                          aria-label={isCover ? 'Esta es la portada actual' : 'Usar esta imagen como portada'}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-yellow-300 ring-1 ring-yellow-400/40 transition hover:bg-yellow-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(imgUrl)}
                          title="Copiar URL"
                          aria-label="Copiar URL de la imagen al portapapeles"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/20"
                        >
                          {copiedUrl === imgUrl ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleImage(imgUrl)}
                          disabled={!!importedId}
                          title={kept ? 'Quitar de la lista' : 'Volver a incluir'}
                          aria-label={kept ? 'Quitar imagen de la galería' : 'Volver a incluir imagen en la galería'}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-zinc-200 ring-1 ring-white/10 transition hover:bg-red-500/30 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-[11px] text-zinc-500">
              {keptImages.length} {keptImages.length === 1 ? 'imagen guardada' : 'imágenes guardadas'} ·
              {coverUrl ? ' portada seleccionada' : ' sin portada'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 border-t border-zinc-800/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleReset}
            disabled={!!importedId || importing}
            className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 underline-offset-4 transition hover:text-yellow-400 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar valores originales
          </button>
          {importedId ? (
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                <CheckCircle2 className="h-4 w-4" />
                Importado · ID {importedId.slice(0, 8)}…
              </span>
              <a
                href={`/admin/productos/${importedId}/editar`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-2.5 text-sm font-semibold text-yellow-300 transition hover:bg-yellow-400/20"
              >
                Editar después
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={importing || !canSubmit}
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

        {/* Live preview summary */}
        <div className="flex items-baseline gap-3 rounded-xl border border-zinc-800/80 bg-black/40 px-4 py-3">
          <span className="text-xs uppercase tracking-wider text-zinc-500">Resumen</span>
          <span className="truncate text-sm font-semibold text-white">{title || '—'}</span>
          <span className="ml-auto text-base font-bold text-yellow-400">
            {formatPrice(priceNumber, currency)}
          </span>
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Field wrapper used inside the editable card
// ---------------------------------------------------------------------------

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
        {label}
      </span>
      <span className="mt-1.5 block">{children}</span>
      {hint && <span className="mt-1 block text-[11px] text-zinc-500">{hint}</span>}
    </label>
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
