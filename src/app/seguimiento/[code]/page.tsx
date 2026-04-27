'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * Public shipment tracking page (epic 2).
 *
 * `/seguimiento/[code]` lets the customer follow the order without login.
 * Uses the cached `/api/shipping/tracking/[code]` endpoint.
 */
interface TrackingEvent {
  status: string;
  description: string;
  occurred_at: string;
  location?: string;
}

interface TrackingResponse {
  ok: boolean;
  shipment?: {
    carrier: string;
    tracking_code: string;
    status: string;
    eta_days: number | null;
    cost: number;
  };
  tracking?: {
    status: string;
    events: TrackingEvent[];
  } | null;
  error?: string;
}

export default function SeguimientoPage({ params }: { params: Promise<{ code: string }> }) {
  const [code, setCode] = useState<string>('');
  const [data, setData] = useState<TrackingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(({ code }) => setCode(code));
  }, [params]);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/shipping/tracking/${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData({ ok: false, error: 'fetch_failed' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-zinc-100">
      <Link href="/" className="text-xs text-yellow-400 hover:underline">
        ← Volver a Soluciones Fabrick
      </Link>
      <h1 className="mt-3 text-2xl font-bold">Seguimiento de envío</h1>
      <p className="mt-1 text-sm text-zinc-400">Código: <span className="font-mono">{code}</span></p>

      {loading && <p className="mt-8 text-sm text-zinc-400">Cargando…</p>}

      {!loading && data && !data.ok && (
        <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          No encontramos este envío. Si recién pagaste, es posible que el sistema lo registre en
          unos minutos.
        </div>
      )}

      {!loading && data?.ok && data.shipment && (
        <section className="mt-6 space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Empresa</span>
              <span className="font-semibold">{data.shipment.carrier}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-zinc-400">Estado</span>
              <span className="rounded-full bg-yellow-400/20 px-2 py-0.5 text-xs font-semibold text-yellow-300">
                {data.shipment.status}
              </span>
            </div>
            {data.shipment.eta_days != null && (
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-zinc-400">ETA</span>
                <span>{data.shipment.eta_days} días</span>
              </div>
            )}
          </div>

          {data.tracking?.events?.length ? (
            <ol className="relative ml-4 border-l border-zinc-800 pl-4">
              {data.tracking.events.map((ev, idx) => (
                <li key={idx} className="mb-4">
                  <div className="absolute -left-[5px] mt-1 h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <p className="text-sm font-semibold">{ev.description}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(ev.occurred_at).toLocaleString('es-CL')}
                    {ev.location ? ` · ${ev.location}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-zinc-400">
              Aún no hay eventos de tracking. Esto puede tardar unas horas después del despacho.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
