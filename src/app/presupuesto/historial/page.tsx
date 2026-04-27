'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, FileText, History, Loader2, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { QuoteRow } from '@/lib/budget';
import { formatCLP } from '@/lib/budgetMath';

export default function HistorialPage() {
  const { user, loading } = useAuth();
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setFetching(true);
    setError(null);
    fetch(`/api/quotes/mine?userId=${encodeURIComponent(user.id)}`, { cache: 'no-store' })
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as {
          quotes?: QuoteRow[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error || 'No se pudieron cargar tus presupuestos.');
        setQuotes(Array.isArray(json.quotes) ? json.quotes : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error inesperado.');
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-black text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[60rem] max-w-full -translate-x-1/2 rounded-full bg-yellow-400/[0.06] blur-3xl"
      />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/25 bg-yellow-400/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-yellow-300">
            <History className="h-3.5 w-3.5" aria-hidden /> Historial
          </span>
          <h1 className="font-playfair mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
            Mis Presupuestos
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            Todas las cotizaciones que has guardado. Haz clic en cualquiera para ver su propuesta
            técnica.
          </p>
        </header>

        {loading ? (
          <CenterCard>
            <Loader2 className="h-5 w-5 animate-spin text-yellow-400" aria-hidden />
            <span className="ml-2 text-sm text-zinc-300">Verificando sesión…</span>
          </CenterCard>
        ) : !user ? (
          <CenterCard>
            <Lock className="h-5 w-5 text-yellow-400" aria-hidden />
            <div className="ml-3">
              <p className="text-sm font-semibold text-white">Inicia sesión para ver tu historial</p>
              <p className="mt-1 text-xs text-zinc-400">
                Tus presupuestos guardados aparecerán acá una vez que ingreses con tu cuenta.
              </p>
              <Link
                href="/auth"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-yellow-400 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-black hover:bg-yellow-300"
              >
                Iniciar sesión <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </CenterCard>
        ) : fetching ? (
          <CenterCard>
            <Loader2 className="h-5 w-5 animate-spin text-yellow-400" aria-hidden />
            <span className="ml-2 text-sm text-zinc-300">Cargando presupuestos…</span>
          </CenterCard>
        ) : error ? (
          <CenterCard tone="error">
            <span className="text-sm">{error}</span>
          </CenterCard>
        ) : quotes.length === 0 ? (
          <CenterCard>
            <FileText className="h-5 w-5 text-zinc-500" aria-hidden />
            <div className="ml-3">
              <p className="text-sm font-semibold text-white">Aún no tienes presupuestos</p>
              <p className="mt-1 text-xs text-zinc-400">
                Cuando finalices una cotización, aparecerá acá.
              </p>
              <Link
                href="/presupuesto"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-yellow-400 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-black hover:bg-yellow-300"
              >
                Crear presupuesto <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </CenterCard>
        ) : (
          <ul className="grid grid-cols-1 gap-4">
            {quotes.map((q) => {
              const created = q.created_at ? new Date(q.created_at) : null;
              const itemCount = Array.isArray(q.lines)
                ? q.lines.reduce((n, l) => n + (Number(l.quantity) || 0), 0)
                : 0;
              return (
                <li key={q.id}>
                  <Link
                    href={`/presupuesto/${q.id}`}
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-yellow-400/40 hover:shadow-[0_8px_30px_-12px_rgba(250,204,21,0.35)]"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] uppercase tracking-wider text-yellow-300">
                        FAB · {q.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="mt-1 text-base font-semibold text-white">
                        {itemCount} ítem{itemCount === 1 ? '' : 's'} ·{' '}
                        <span className="text-yellow-300">{formatCLP(q.total)}</span>
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {created
                          ? created.toLocaleDateString('es-CL', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'Sin fecha'}
                        {q.region ? ` · ${q.region}` : ''}
                      </p>
                    </div>
                    <ArrowRight
                      className="h-5 w-5 shrink-0 text-zinc-500 transition-all group-hover:translate-x-0.5 group-hover:text-yellow-300"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

function CenterCard({
  children,
  tone = 'default',
}: {
  children: React.ReactNode;
  tone?: 'default' | 'error';
}) {
  return (
    <div
      className={[
        'flex items-center rounded-2xl border bg-zinc-950/60 p-6 backdrop-blur-sm',
        tone === 'error'
          ? 'border-red-500/30 text-red-300'
          : 'border-white/10 text-zinc-300',
      ].join(' ')}
    >
      {children}
    </div>
  );
}
