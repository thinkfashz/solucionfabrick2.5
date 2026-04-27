'use client';

/**
 * MercadoLibreScraper
 * ------------------------------------------------------------------
 * Admin tool that takes a Mercado Libre Chile product URL, extracts
 * the MLC item id and queries the public ML API to render a premium,
 * dark-themed preview card before importing the product into the
 * store database.
 *
 *   - Endpoint item:      https://api.mercadolibre.com/items/{ID}
 *   - Endpoint questions: https://api.mercadolibre.com/questions/search?item={ID}
 *
 * The "Importar a mi Tienda" button currently only logs the payload
 * to the console; wiring it to the real import flow is left to the
 * caller / a follow-up task.
 */

import { useState } from 'react';
import {
  Link2,
  Search,
  Loader2,
  AlertTriangle,
  Package,
  MessageSquare,
  CheckCircle2,
  PauseCircle,
  Download,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types — Mercado Libre public API
// ---------------------------------------------------------------------------

interface MLPicture {
  id: string;
  url: string;
  secure_url: string;
  size?: string;
  max_size?: string;
  quality?: string;
}

interface MLAttribute {
  id: string;
  name: string;
  value_name: string | null;
}

export interface MLItem {
  id: string;
  site_id: string;
  title: string;
  price: number;
  base_price?: number;
  original_price?: number | null;
  currency_id: string;
  available_quantity: number;
  sold_quantity?: number;
  condition?: string;
  permalink: string;
  thumbnail: string;
  pictures: MLPicture[];
  status: 'active' | 'paused' | 'closed' | 'under_review' | string;
  category_id?: string;
  attributes?: MLAttribute[];
  warranty?: string | null;
}

interface MLQuestionsResponse {
  total: number;
  questions: Array<{ id: number; text: string; status: string }>;
}

interface ScrapedData {
  item: MLItem;
  questionsTotal: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MLC_ID_REGEX = /MLC[-\s]?(\d+)/i;

/** Extracts a normalized MLC item id (e.g. "MLC123456") from a ML Chile URL. */
export function extractMlcId(url: string): string | null {
  if (!url) return null;
  const match = url.match(MLC_ID_REGEX);
  if (!match) return null;
  return `MLC${match[1]}`;
}

const CLP_FORMATTER = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

function formatCLP(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return CLP_FORMATTER.format(value);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MercadoLibreScraper() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ScrapedData | null>(null);

  async function handleExtract(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setData(null);

    const id = extractMlcId(url.trim());
    if (!id) {
      setError(
        'No pudimos detectar un ID de Mercado Libre Chile en la URL. Asegúrate de que contenga el patrón "MLC" seguido de números.'
      );
      return;
    }

    setLoading(true);
    try {
      const [itemRes, questionsRes] = await Promise.all([
        fetch(`https://api.mercadolibre.com/items/${id}`),
        fetch(`https://api.mercadolibre.com/questions/search?item=${id}`),
      ]);

      if (!itemRes.ok) {
        throw new Error(
          `No pudimos obtener el producto (HTTP ${itemRes.status}). Verifica que la publicación exista y sea pública.`
        );
      }

      const item = (await itemRes.json()) as MLItem;

      // Questions endpoint may return 401/403 for private items; degrade gracefully.
      let questionsTotal = 0;
      if (questionsRes.ok) {
        const questions = (await questionsRes.json()) as MLQuestionsResponse;
        questionsTotal =
          typeof questions?.total === 'number'
            ? questions.total
            : Array.isArray(questions?.questions)
              ? questions.questions.length
              : 0;
      }

      setData({ item, questionsTotal });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Ocurrió un error inesperado al consultar Mercado Libre.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleImport() {
    if (!data) return;
    // TODO: wire this up to the real product-import endpoint.
    // eslint-disable-next-line no-console
    console.log('[MercadoLibreScraper] Importar a mi Tienda →', data);
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
              Importar desde Mercado Libre
            </h2>
            <p className="text-sm text-zinc-400">
              Pega la URL de un producto de Mercado Libre Chile y obtén una
              vista previa antes de guardarlo en tu tienda.
            </p>
          </div>
        </div>
      </header>

      {/* Form */}
      <form
        onSubmit={handleExtract}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://articulo.mercadolibre.cl/MLC-123456-..."
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 py-3 pl-10 pr-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/30 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-black shadow-[0_8px_24px_-8px_rgba(250,204,21,0.6)] transition hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Extrayendo…
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Extraer
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
          <span>{error}</span>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="mt-6 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="h-40 w-full flex-shrink-0 rounded-xl bg-zinc-800/80 sm:h-40 sm:w-40" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-3/4 rounded bg-zinc-800" />
              <div className="h-4 w-1/2 rounded bg-zinc-800" />
              <div className="h-8 w-1/3 rounded bg-zinc-800" />
              <div className="flex gap-2">
                <div className="h-6 w-20 rounded-full bg-zinc-800" />
                <div className="h-6 w-24 rounded-full bg-zinc-800" />
                <div className="h-6 w-24 rounded-full bg-zinc-800" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result card */}
      {data && <PreviewCard data={data} onImport={handleImport} />}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Preview card
// ---------------------------------------------------------------------------

interface PreviewCardProps {
  data: ScrapedData;
  onImport: () => void;
}

function PreviewCard({ data, onImport }: PreviewCardProps) {
  const { item, questionsTotal } = data;
  const cover =
    item.pictures?.[0]?.secure_url ||
    item.pictures?.[0]?.url ||
    item.thumbnail;

  const isOnline = item.status === 'active';
  const isPaused = item.status === 'paused';

  return (
    <article className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950 shadow-xl">
      <div className="flex flex-col gap-5 p-5 sm:flex-row">
        {/* Image */}
        <div className="relative h-48 w-full flex-shrink-0 overflow-hidden rounded-xl bg-zinc-800 sm:h-48 sm:w-48">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-500">
              <Package className="h-10 w-10" />
            </div>
          )}
          <span className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-yellow-400 ring-1 ring-yellow-400/30 backdrop-blur">
            {item.id}
          </span>
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col">
          <h3 className="text-base font-semibold leading-snug text-white sm:text-lg">
            {item.title}
          </h3>

          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-2xl font-bold text-yellow-400 sm:text-3xl">
              {formatCLP(item.price)}
            </span>
            {item.original_price && item.original_price > item.price && (
              <span className="text-sm text-zinc-500 line-through">
                {formatCLP(item.original_price)}
              </span>
            )}
          </div>

          {/* Pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusPill online={isOnline} paused={isPaused} raw={item.status} />
            <Pill
              icon={<Package className="h-3.5 w-3.5" />}
              label="Stock"
              value={`${item.available_quantity}`}
            />
            <Pill
              icon={<MessageSquare className="h-3.5 w-3.5" />}
              label="Preguntas"
              value={`${questionsTotal}`}
            />
          </div>

          {/* Meta */}
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-400 sm:grid-cols-3">
            {item.condition && (
              <div className="flex justify-between gap-2 sm:block">
                <dt className="text-zinc-500">Condición</dt>
                <dd className="text-zinc-200">
                  {item.condition === 'new' ? 'Nuevo' : 'Usado'}
                </dd>
              </div>
            )}
            {typeof item.sold_quantity === 'number' && (
              <div className="flex justify-between gap-2 sm:block">
                <dt className="text-zinc-500">Vendidos</dt>
                <dd className="text-zinc-200">{item.sold_quantity}</dd>
              </div>
            )}
            {item.category_id && (
              <div className="flex justify-between gap-2 sm:block">
                <dt className="text-zinc-500">Categoría</dt>
                <dd className="text-zinc-200">{item.category_id}</dd>
              </div>
            )}
          </dl>

          {/* Actions */}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <a
              href={item.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-zinc-400 underline-offset-4 transition hover:text-yellow-400 hover:underline"
            >
              Ver publicación original ↗
            </a>
            <button
              type="button"
              onClick={onImport}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-semibold text-black shadow-[0_8px_24px_-8px_rgba(250,204,21,0.6)] transition hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              <Download className="h-4 w-4" />
              Importar a mi Tienda
            </button>
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

interface StatusPillProps {
  online: boolean;
  paused: boolean;
  raw: string;
}

function StatusPill({ online, paused, raw }: StatusPillProps) {
  if (online) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        Online
      </span>
    );
  }
  if (paused) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300">
        <PauseCircle className="h-3.5 w-3.5" />
        <span className="h-2 w-2 rounded-full bg-red-400" />
        Pausado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-300">
      <span className="h-2 w-2 rounded-full bg-zinc-500" />
      {raw || 'Desconocido'}
    </span>
  );
}
