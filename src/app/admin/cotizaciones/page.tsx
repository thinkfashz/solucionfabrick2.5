'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { FileText, Search, Calculator, Copy, CheckCircle2, RefreshCw } from 'lucide-react';
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

const STATUS_VALUES = Object.keys(STATUS_LABELS);
const STATUS_OPTIONS = ['todos', ...STATUS_VALUES] as const;

const SERVICE_RATES: Record<string, { label: string; base: number; unit: string }> = {
  electricidad: { label: 'Electricidad', base: 32000, unit: 'm2' },
  gasfiteria: { label: 'Gasfitería', base: 29000, unit: 'm2' },
  pintura: { label: 'Pintura', base: 18000, unit: 'm2' },
  revestimiento: { label: 'Revestimiento', base: 42000, unit: 'm2' },
  cimientos: { label: 'Cimientos', base: 65000, unit: 'm2' },
  seguridad: { label: 'Seguridad', base: 48000, unit: 'm2' },
};

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
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<(typeof STATUS_OPTIONS)[number]>('todos');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [serviceKey, setServiceKey] = useState<keyof typeof SERVICE_RATES>('electricidad');
  const [surface, setSurface] = useState(45);
  const [complexity, setComplexity] = useState(1);
  const [urgency, setUrgency] = useState(1);
  const [margin, setMargin] = useState(1.18);
  const [discountPct, setDiscountPct] = useState(0);
  const [copied, setCopied] = useState(false);

  const fetchQuotes = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
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
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchQuotes();
  }, [fetchQuotes]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter !== 'todos' && (r.status ?? 'draft') !== filter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${r.customer_name ?? ''} ${r.customer_email ?? ''} ${r.region ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filter, search]);

  const approvedCount = rows.filter((r) => r.status === 'approved').length;
  const pendingCount = rows.filter((r) => r.status === 'sent' || r.status === 'in_review').length;
  const totalPipeline = rows.reduce((acc, r) => acc + (r.total ?? 0), 0);

  const selectedService = SERVICE_RATES[serviceKey];
  const base = surface * selectedService.base;
  const adjusted = base * complexity * urgency * margin;
  const discountAmount = adjusted * (discountPct / 100);
  const calcTotal = Math.round(adjusted - discountAmount);

  const updateQuoteStatus = async (id: string, status: string) => {
    setSavingStatusId(id);
    setStatusMessage(null);
    try {
      const { error: dbErr } = await insforge.database
        .from('quotes')
        .update({ status })
        .eq('id', id);
      if (dbErr) throw dbErr;
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      setStatusMessage(`Estado actualizado a ${STATUS_LABELS[status] ?? status}.`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'No se pudo actualizar el estado.');
    } finally {
      setSavingStatusId(null);
    }
  };

  const copyBudget = async () => {
    const text = `Presupuesto ${selectedService.label}: ${formatCLP(calcTotal)} (${surface} ${selectedService.unit}, complejidad ${complexity.toFixed(2)}, urgencia ${urgency.toFixed(2)}).`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="min-h-screen px-4 pb-24 pt-6 md:px-8 md:py-10 lg:pb-10">
      <header className="mb-6">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400">
          Admin · Cotizaciones
        </p>
        <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">Cotizaciones recibidas</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Control de estados, pipeline comercial y calculadora de presupuesto por servicio.
        </p>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total cotizaciones" value={rows.length.toString()} />
        <MetricCard label="Pendientes" value={pendingCount.toString()} highlighted />
        <MetricCard label="Aprobadas" value={approvedCount.toString()} />
        <MetricCard label="Pipeline CLP" value={formatCLP(totalPipeline)} />
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/75 p-4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por cliente, email o región..."
                className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:border-yellow-400/50 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => void fetchQuotes(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/40 hover:text-white disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              Refrescar
            </button>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
                  filter === s
                    ? 'bg-yellow-400 text-black'
                    : 'border border-white/10 bg-white/5 text-zinc-300 hover:border-white/20'
                }`}
              >
                {s === 'todos' ? 'Todos' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {statusMessage && (
            <p className="mb-3 inline-flex items-center gap-1 text-xs text-zinc-400">
              <CheckCircle2 size={13} className="text-emerald-400" /> {statusMessage}
            </p>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-zinc-400">Cargando...</p>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-zinc-500">
              <FileText className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p className="text-sm">No hay cotizaciones que coincidan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    <th className="px-4 py-3">Folio</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="hidden px-4 py-3 md:table-cell">Región</th>
                    <th className="hidden px-4 py-3 md:table-cell">Total</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="hidden px-4 py-3 lg:table-cell">Creada</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 last:border-b-0">
                      <td className="px-4 py-3 font-mono text-xs text-yellow-400">{r.id.slice(0, 8)}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">{r.customer_name ?? 'Sin nombre'}</p>
                        <p className="text-[11px] text-zinc-500">{r.customer_email ?? '—'}</p>
                      </td>
                      <td className="hidden px-4 py-3 text-zinc-300 md:table-cell">{r.region ?? '—'}</td>
                      <td className="hidden px-4 py-3 tabular-nums text-zinc-200 md:table-cell">{formatCLP(r.total)}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <span
                            className={`inline-block rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${statusColor(
                              r.status,
                            )}`}
                          >
                            {STATUS_LABELS[r.status ?? 'draft'] ?? r.status ?? 'draft'}
                          </span>
                          <select
                            aria-label="Estado de cotización"
                            value={r.status ?? 'draft'}
                            disabled={savingStatusId === r.id}
                            onChange={(e) => void updateQuoteStatus(r.id, e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-300 focus:border-yellow-400/40 focus:outline-none"
                          >
                            {STATUS_VALUES.map((v) => (
                              <option key={v} value={v}>
                                {STATUS_LABELS[v]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-zinc-500 lg:table-cell">
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
                          className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-400 hover:text-yellow-300"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4 md:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Calculator className="h-4 w-4 text-yellow-400" />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-yellow-300">Calculadora de presupuesto</h2>
          </div>

          <div className="space-y-3">
            <FieldLabel>Servicio</FieldLabel>
            <select
              aria-label="Tipo de servicio"
              value={serviceKey}
              onChange={(e) => setServiceKey(e.target.value as keyof typeof SERVICE_RATES)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400/40"
            >
              {Object.entries(SERVICE_RATES).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>

            <FieldLabel>Superficie ({selectedService.unit})</FieldLabel>
            <input
              type="number"
              min={1}
              value={surface}
            aria-label="Superficie en metros cuadrados"
              onChange={(e) => setSurface(Number(e.target.value) || 1)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400/40"
            />

            <RangeControl
              label="Complejidad"
              value={complexity}
              min={0.8}
              max={1.6}
              step={0.05}
              onChange={setComplexity}
            />
            <RangeControl
              label="Urgencia"
              value={urgency}
              min={1}
              max={1.5}
              step={0.05}
              onChange={setUrgency}
            />
            <RangeControl
              label="Margen"
              value={margin}
              min={1.05}
              max={1.45}
              step={0.01}
              onChange={setMargin}
            />
            <RangeControl
              label="Descuento %"
              value={discountPct}
              min={0}
              max={20}
              step={1}
              onChange={setDiscountPct}
            />
          </div>

          <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-black/35 p-3">
            <PriceRow label="Base" value={formatCLP(base)} />
            <PriceRow label="Ajustado" value={formatCLP(Math.round(adjusted))} />
            <PriceRow label="Descuento" value={`-${formatCLP(Math.round(discountAmount))}`} muted />
            <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-white">Total recomendado</span>
              <span className="text-xl font-black text-yellow-300">{formatCLP(calcTotal)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void copyBudget()}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-200 transition hover:border-yellow-400/40 hover:text-yellow-200"
          >
            {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
            {copied ? 'Copiado' : 'Copiar presupuesto'}
          </button>
        </aside>
      </section>
    </main>
  );
}

function MetricCard({ label, value, highlighted = false }: { label: string; value: string; highlighted?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlighted
          ? 'border-yellow-400/30 bg-yellow-400/10'
          : 'border-white/10 bg-zinc-950/70'
      }`}
    >
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{label}</p>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{children}</p>;
}

function PriceRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-xs font-mono ${muted ? 'text-zinc-500' : 'text-zinc-300'}`}>{value}</span>
    </div>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-xs font-mono text-zinc-400">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
      aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-yellow-400"
      />
    </div>
  );
}
