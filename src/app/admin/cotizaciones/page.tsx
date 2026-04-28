'use client';

/**
 * /admin/cotizaciones — Listado de cotizaciones (tabla `quotes`).
 *
 * Reutiliza la tabla de cotizaciones existente (creada por /api/quotes y
 * /api/cotizaciones). Filtra por estado y permite abrir el detalle
 * imprimible existente en /presupuesto/[id].
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { FileText, Search } from 'lucide-react';
import { insforge } from '@/lib/insforge';

interface QuoteRow {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  region: string | null;
  status: string | null;
  total: number | null;
  created_at: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  in_review: 'En revisión',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  archived: 'Archivada',
};
const STATUS_OPTIONS = ['todos', ...Object.keys(STATUS_LABELS)] as const;

const formatCLP = (n: number | null) =>
  typeof n === 'number'
    ? new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
      }).format(n)
    : '—';

function statusColor(s: string | null): string {
  switch (s) {
    case 'approved':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'sent':
    case 'in_review':
      return 'bg-yellow-400/15 text-yellow-300 border-yellow-400/30';
    case 'rejected':
      return 'bg-red-500/15 text-red-300 border-red-500/30';
    case 'archived':
      return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
    default:
      return 'bg-white/5 text-zinc-400 border-white/10';
  }
}

export default function AdminCotizacionesPage() {
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof STATUS_OPTIONS)[number]>('todos');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchQuotes = useCallback(async () => {
    setError(null);
    try {
      const { data, error: dbErr } = await insforge.database
        .from('quotes')
        .select(
          'id,customer_name,customer_email,customer_phone,region,status,total,created_at',
        )
        .order('created_at', { ascending: false });
      if (dbErr) throw dbErr;
      setRows((data as QuoteRow[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando cotizaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchQuotes();
  }, [fetchQuotes]);

  const filtered = rows.filter((r) => {
    if (filter !== 'todos' && (r.status ?? 'draft') !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = `${r.customer_name ?? ''} ${r.customer_email ?? ''} ${r.region ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <main className="px-4 md:px-8 py-6 md:py-10 pb-24 lg:pb-10 min-h-screen">
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400 mb-1">
          Admin · Cotizaciones
        </p>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
          Cotizaciones recibidas
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Solicitudes generadas desde el carrito de servicios y el diseñador 3D.
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, email o región..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-white/10 focus:border-yellow-400/50 focus:outline-none text-sm text-white placeholder-zinc-600"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
                filter === s
                  ? 'bg-yellow-400 text-black'
                  : 'bg-white/5 text-zinc-300 border border-white/10 hover:border-white/20'
              }`}
            >
              {s === 'todos' ? 'Todos' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-zinc-400 text-sm">Cargando...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay cotizaciones que coincidan.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/8 bg-zinc-950/85 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5">
                  <th className="px-4 py-3">Folio</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3 hidden md:table-cell">Región</th>
                  <th className="px-4 py-3 hidden md:table-cell">Total</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Creada</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-white/5 last:border-b-0 hover:bg-white/5"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-yellow-400">
                      {r.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white font-semibold">
                        {r.customer_name ?? 'Sin nombre'}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {r.customer_email ?? '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-zinc-300">
                      {r.region ?? '—'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-zinc-200 tabular-nums">
                      {formatCLP(r.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-[0.18em] ${statusColor(
                          r.status,
                        )}`}
                      >
                        {STATUS_LABELS[r.status ?? 'draft'] ?? r.status ?? 'draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-zinc-500 text-xs">
                      {r.created_at
                        ? new Date(r.created_at).toLocaleDateString('es-CL', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/presupuesto/${r.id}`}
                        className="inline-flex items-center gap-1 text-yellow-400 hover:text-yellow-300 text-[10px] font-black uppercase tracking-[0.18em]"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
