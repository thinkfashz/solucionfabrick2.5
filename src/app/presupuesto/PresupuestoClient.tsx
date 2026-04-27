'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  History,
  Loader2,
  Mail,
  Phone,
  Radio,
  Sparkles,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import ProjectBuilder, {
  type CartLine,
  type CategoryId,
  type Product,
} from '@/components/ProjectBuilder';
import { useAuth } from '@/context/AuthContext';
import { insforge } from '@/lib/insforge';
import type { MaterialRow } from '@/lib/budget';
import type { QuoteLine } from '@/lib/budgetMath';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const VALID_CATEGORIES: ReadonlySet<CategoryId> = new Set([
  'obra-gruesa',
  'terminaciones',
  'especialidades',
  'servicios',
] as const);

/**
 * Maps DB categories (which include sub-disciplines like 'electricidad',
 * 'gasfiteria', etc.) to the four high-level tabs the public cotizador uses.
 */
function mapCategory(raw: string): CategoryId {
  const c = (raw || '').toLowerCase();
  if (VALID_CATEGORIES.has(c as CategoryId)) return c as CategoryId;
  switch (c) {
    case 'electricidad':
    case 'gasfiteria':
    case 'climatizacion':
    case 'conectividad':
    case 'seguridad':
      return 'especialidades';
    default:
      return 'servicios';
  }
}

function rowToProduct(m: MaterialRow): Product {
  return {
    id: m.id,
    name: m.name,
    description: m.description ?? '',
    price: Number(m.price) || 0,
    image: m.image_url || PLACEHOLDER,
    unit: m.unit,
    category: mapCategory(m.category),
  };
}

const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400'>
      <rect fill='#0a0a0a' width='600' height='400'/>
      <circle cx='300' cy='200' r='44' fill='rgba(250,204,21,0.12)' stroke='rgba(250,204,21,0.5)'/>
    </svg>`,
  );

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export interface PresupuestoClientProps {
  initialMaterials: MaterialRow[];
}

export default function PresupuestoClient({ initialMaterials }: PresupuestoClientProps) {
  const router = useRouter();
  const { user } = useAuth();

  /* Live materials (initial from server, refreshed via SSE). */
  const [materials, setMaterials] = useState<MaterialRow[]>(initialMaterials);
  const [liveStatus, setLiveStatus] = useState<'idle' | 'connected' | 'updated'>('idle');
  const updatedFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/materials', { cache: 'no-store' });
      if (!res.ok) return;
      const json = (await res.json()) as { materials?: MaterialRow[] };
      if (Array.isArray(json.materials)) {
        setMaterials(json.materials);
        setLiveStatus('updated');
        if (updatedFlashTimer.current) clearTimeout(updatedFlashTimer.current);
        updatedFlashTimer.current = setTimeout(() => setLiveStatus('connected'), 2_500);
      }
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.EventSource !== 'function') return;
    let es: EventSource | null = null;
    let closed = false;
    let backoff = 1_000;
    let reconnect: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      try {
        es = new EventSource('/api/cms/events');
        es.addEventListener('open', () => {
          backoff = 1_000;
          setLiveStatus('connected');
        });
        es.addEventListener('cms-change', (ev) => {
          try {
            const data = JSON.parse((ev as MessageEvent).data) as { topic?: string };
            if (data?.topic === 'materials') void refetch();
          } catch {
            /* ignore */
          }
        });
        es.addEventListener('error', () => {
          if (closed) return;
          es?.close();
          es = null;
          backoff = Math.min(backoff * 2, 30_000);
          reconnect = setTimeout(connect, backoff);
        });
      } catch {
        /* noop */
      }
    };
    connect();

    return () => {
      closed = true;
      if (reconnect) clearTimeout(reconnect);
      if (updatedFlashTimer.current) clearTimeout(updatedFlashTimer.current);
      es?.close();
    };
  }, [refetch]);

  /* Build the catalog passed to ProjectBuilder. */
  const products = useMemo(() => materials.map(rowToProduct), [materials]);

  /* ----- Finalize-quote modal flow ----- */
  const [pendingCart, setPendingCart] = useState<CartLine[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback((lines: CartLine[]) => {
    if (lines.length === 0) return;
    setError(null);
    setPendingCart(lines);
  }, []);

  const cancelFinalize = useCallback(() => {
    if (submitting) return;
    setPendingCart(null);
    setError(null);
  }, [submitting]);

  const finalize = useCallback(
    async (form: FinalizeForm) => {
      if (!pendingCart) return;
      setSubmitting(true);
      setError(null);
      try {
        const lines: QuoteLine[] = pendingCart.map((l) => ({
          materialId: l.product.id,
          name: l.product.name,
          category: l.product.category,
          unit: l.product.unit,
          unitPrice: l.product.price,
          quantity: l.quantity,
          imageUrl: l.product.image,
        }));

        // If the user is logged in, forward a freshly-refreshed InsForge
        // access token so the server can attribute the quote to the right
        // account (it ignores any client-supplied user id for security).
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (user) {
          try {
            const { data: refreshed } = await insforge.auth.refreshSession();
            if (refreshed?.accessToken) {
              headers.Authorization = `Bearer ${refreshed.accessToken}`;
            }
          } catch {
            /* fall back to anonymous attribution */
          }
        }

        const res = await fetch('/api/quotes', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            lines,
            customer: {
              name: form.name,
              email: form.email,
              phone: form.phone,
              region: form.region,
              notes: form.notes,
            },
            shippingCost: form.shippingCost,
            installationCost: form.installationCost,
          }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          quote?: { id?: string };
          error?: string;
        };
        if (!res.ok || !json.quote?.id) {
          throw new Error(json.error || 'No se pudo guardar la cotización.');
        }
        router.push(`/presupuesto/${json.quote.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado.');
        setSubmitting(false);
      }
    },
    [pendingCart, router, user],
  );

  /* ----- UI ----- */
  return (
    <>
      <LiveBadge status={liveStatus} />

      <ProjectBuilder products={products} onSubmit={handleSubmit} />

      {/* History link for logged-in customers. */}
      {user && (
        <div className="relative z-10 mx-auto -mt-8 mb-12 max-w-7xl px-4 sm:px-6">
          <a
            href="/presupuesto/historial"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-300 transition-colors hover:border-yellow-400/40 hover:text-yellow-300"
          >
            <History className="h-3.5 w-3.5" aria-hidden />
            Ver mis presupuestos guardados
          </a>
        </div>
      )}

      {pendingCart && (
        <FinalizeModal
          defaultName={user?.name ?? ''}
          defaultEmail={user?.email ?? ''}
          submitting={submitting}
          error={error}
          onCancel={cancelFinalize}
          onSubmit={finalize}
          itemCount={pendingCart.reduce((n, l) => n + l.quantity, 0)}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Live status badge                                                         */
/* -------------------------------------------------------------------------- */

function LiveBadge({ status }: { status: 'idle' | 'connected' | 'updated' }) {
  if (status === 'idle') return null;
  const updated = status === 'updated';
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'pointer-events-none fixed left-1/2 top-20 z-40 -translate-x-1/2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur transition-all duration-300',
        updated
          ? 'border-yellow-400/50 bg-yellow-400/10 text-yellow-300 shadow-[0_0_24px_rgba(250,204,21,0.35)]'
          : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
      ].join(' ')}
    >
      <span className="inline-flex items-center gap-1.5">
        <Radio className={['h-3 w-3', updated ? 'animate-pulse' : ''].join(' ')} aria-hidden />
        {updated ? 'Catálogo actualizado en vivo' : 'Conectado en tiempo real'}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Finalize-quote modal                                                      */
/* -------------------------------------------------------------------------- */

interface FinalizeForm {
  name: string;
  email: string;
  phone: string;
  region: string;
  notes: string;
  shippingCost: number;
  installationCost: number;
}

const REGIONS = [
  'Arica y Parinacota',
  'Tarapacá',
  'Antofagasta',
  'Atacama',
  'Coquimbo',
  'Valparaíso',
  'Metropolitana',
  "O'Higgins",
  'Maule',
  'Ñuble',
  'Biobío',
  'La Araucanía',
  'Los Ríos',
  'Los Lagos',
  'Aysén',
  'Magallanes',
];

function FinalizeModal({
  defaultName,
  defaultEmail,
  submitting,
  error,
  onCancel,
  onSubmit,
  itemCount,
}: {
  defaultName: string;
  defaultEmail: string;
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (f: FinalizeForm) => void;
  itemCount: number;
}) {
  const [form, setForm] = useState<FinalizeForm>({
    name: defaultName,
    email: defaultEmail,
    phone: '',
    region: 'Maule',
    notes: '',
    shippingCost: 0,
    installationCost: 0,
  });

  const update = <K extends keyof FinalizeForm>(key: K, value: FinalizeForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    onSubmit(form);
  };

  // Close on escape.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && !submitting) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, submitting]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="finalize-title"
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-yellow-400/25 bg-gradient-to-b from-zinc-950 to-black shadow-[0_20px_60px_-12px_rgba(250,204,21,0.35)]">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          aria-label="Cerrar"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        <div className="border-b border-white/10 px-6 py-5">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-yellow-400">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> Finalizar Cotización
          </span>
          <h2 id="finalize-title" className="mt-2 text-xl font-bold text-white">
            Resumen del Proyecto
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            {itemCount} ítem{itemCount === 1 ? '' : 's'} · Te enviaremos la propuesta técnica al
            correo registrado.
          </p>
        </div>

        <form onSubmit={handle} className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
          <Field label="Nombre completo" icon={User} className="sm:col-span-2">
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="finput"
              autoFocus
              autoComplete="name"
            />
          </Field>
          <Field label="Email" icon={Mail}>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className="finput"
              autoComplete="email"
            />
          </Field>
          <Field label="Teléfono" icon={Phone}>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className="finput"
              placeholder="+56 9 …"
              autoComplete="tel"
            />
          </Field>
          <Field label="Región" className="sm:col-span-2">
            <select
              value={form.region}
              onChange={(e) => update('region', e.target.value)}
              className="finput"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Despacho estimado (CLP)">
            <input
              type="number"
              min={0}
              step={1000}
              value={form.shippingCost}
              onChange={(e) => update('shippingCost', Math.max(0, Number(e.target.value) || 0))}
              className="finput"
            />
          </Field>
          <Field label="Instalación (CLP)">
            <input
              type="number"
              min={0}
              step={1000}
              value={form.installationCost}
              onChange={(e) => update('installationCost', Math.max(0, Number(e.target.value) || 0))}
              className="finput"
            />
          </Field>
          <Field label="Notas / requerimientos" className="sm:col-span-2">
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={3}
              className="finput resize-none"
              placeholder="Comentarios sobre el terreno, plazos, especificaciones…"
            />
          </Field>

          {error && (
            <p
              role="alert"
              className="sm:col-span-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
            >
              {error}
            </p>
          )}

          <div className="sm:col-span-2 flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="text-xs uppercase tracking-wider text-zinc-400 hover:text-white disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-yellow-400 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-black shadow-[0_8px_24px_-8px_rgba(250,204,21,0.5)] transition-all hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-[0_0_24px_rgba(250,204,21,0.55)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Guardando…
                </>
              ) : (
                <>
                  Finalizar Cotización
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        :global(.finput) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background-color: rgba(0, 0, 0, 0.5);
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          color: #fafafa;
          outline: none;
          transition: border-color 150ms, box-shadow 150ms;
        }
        :global(.finput::placeholder) {
          color: #52525b;
        }
        :global(.finput:focus) {
          border-color: rgba(250, 204, 21, 0.6);
          box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.15);
        }
        :global(select.finput option) {
          background-color: #18181b;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
  className = '',
}: {
  label: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={['block', className].join(' ')}>
      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
        {Icon && <Icon className="h-3 w-3" aria-hidden />}
        {label}
      </span>
      {children}
    </label>
  );
}
