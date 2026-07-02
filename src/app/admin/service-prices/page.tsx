'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calculator, RefreshCw, Save, ShieldAlert } from 'lucide-react';
import type { ServicePriceSetting, ServiceUnit } from '@/lib/servicePricing';
import { DEFAULT_SERVICE_PRICES, unitLabel } from '@/lib/servicePricing';

const fmt = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const UNITS: ServiceUnit[] = ['m2', 'ml', 'm3', 'punto', 'unidad'];

function normalizePct(n: number) {
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function fromPct(n: number) {
  return Math.max(0, Number(n) || 0) / 100;
}

export default function AdminServicePricesPage() {
  const [prices, setPrices] = useState<ServicePriceSetting[]>(DEFAULT_SERVICE_PRICES);
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(() => [...prices].sort((a, b) => a.name.localeCompare(b.name)), [prices]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/service-prices', { cache: 'no-store' });
      const json = (await res.json()) as { prices?: ServicePriceSetting[]; error?: string };
      if (!res.ok) throw new Error(json.error || 'No se pudieron cargar precios.');
      setPrices(json.prices ?? DEFAULT_SERVICE_PRICES);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const update = (slug: string, patch: Partial<ServicePriceSetting>) => {
    setPrices((prev) => prev.map((p) => (p.slug === slug ? { ...p, ...patch } : p)));
  };

  async function save(price: ServicePriceSetting) {
    setSavingSlug(price.slug);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/service-prices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(price),
      });
      const json = (await res.json()) as { price?: ServicePriceSetting; error?: string };
      if (!res.ok) throw new Error(json.error || 'No se pudo guardar.');
      setMessage(`Precio actualizado: ${price.name}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido.');
    } finally {
      setSavingSlug(null);
    }
  }

  return (
    <div className="min-h-screen bg-black px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-yellow-300">Admin · Cotizadores</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Precios de servicios</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
              Controla los valores que usan las calculadoras públicas. Son aproximados, editables y deben revisarse según mercado, proveedor y alcance real.
            </p>
          </div>
          <button
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-yellow-300/30 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-yellow-300 transition hover:bg-yellow-300/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Recargar
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {message ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}
          {error ? <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
          <div className="rounded-2xl border border-yellow-300/20 bg-yellow-300/8 p-4 text-sm leading-7 text-zinc-300">
            <div className="mb-1 flex items-center gap-2 font-black uppercase tracking-[0.18em] text-yellow-300">
              <ShieldAlert className="h-4 w-4" /> Aviso comercial
            </div>
            No marques estos valores como precio final. En público se muestran como referencia para reducir incertidumbre y luego confirmar con evaluación real.
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {sorted.map((price) => {
            const totalPct = price.materialsPct + price.laborPct + price.logisticsPct + price.contingencyPct;
            return (
              <article key={price.slug} className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.25)] md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-yellow-300 text-black">
                      <Calculator className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">{price.slug}</p>
                      <input
                        value={price.name}
                        onChange={(e) => update(price.slug, { name: e.target.value })}
                        className="mt-1 w-full bg-transparent text-xl font-black text-white outline-none"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => save(price)}
                    disabled={savingSlug === price.slug}
                    className="inline-flex items-center gap-2 rounded-full bg-yellow-300 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-black transition hover:bg-white disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {savingSlug === price.slug ? 'Guardando' : 'Guardar'}
                  </button>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Precio base" value={price.basePrice} onChange={(v) => update(price.slug, { basePrice: v })} suffix={`/${unitLabel(price.unit)}`} />
                  <label className="block">
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Unidad</span>
                    <select
                      value={price.unit}
                      onChange={(e) => update(price.slug, { unit: e.target.value as ServiceUnit })}
                      className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-yellow-300/60"
                    >
                      {UNITS.map((unit) => (
                        <option key={unit} value={unit}>{unitLabel(unit)}</option>
                      ))}
                    </select>
                  </label>
                  <Field label="Mercado bajo" value={price.marketMin} onChange={(v) => update(price.slug, { marketMin: v })} suffix={`/${unitLabel(price.unit)}`} />
                  <Field label="Mercado alto" value={price.marketMax} onChange={(v) => update(price.slug, { marketMax: v })} suffix={`/${unitLabel(price.unit)}`} />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  <PercentField label="Materiales" value={normalizePct(price.materialsPct)} onChange={(v) => update(price.slug, { materialsPct: fromPct(v) })} />
                  <PercentField label="Mano obra" value={normalizePct(price.laborPct)} onChange={(v) => update(price.slug, { laborPct: fromPct(v) })} />
                  <PercentField label="Logística" value={normalizePct(price.logisticsPct)} onChange={(v) => update(price.slug, { logisticsPct: fromPct(v) })} />
                  <PercentField label="Imprevistos" value={normalizePct(price.contingencyPct)} onChange={(v) => update(price.slug, { contingencyPct: fromPct(v) })} />
                </div>
                <p className={`mt-2 text-xs ${Math.abs(totalPct - 1) < 0.02 ? 'text-zinc-500' : 'text-yellow-300'}`}>
                  Total distribución: {Math.round(totalPct * 100)}%. Si no suma 100%, el sistema normaliza la gráfica pública.
                </p>

                <label className="mt-5 block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Aviso público</span>
                  <textarea
                    value={price.disclaimer}
                    onChange={(e) => update(price.slug, { disclaimer: e.target.value })}
                    rows={3}
                    className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm leading-6 text-white outline-none focus:border-yellow-300/60"
                  />
                </label>

                <div className="mt-5 rounded-2xl border border-white/8 bg-black/45 p-4 text-sm text-zinc-400">
                  Vista previa: base {fmt.format(price.basePrice)} por {unitLabel(price.unit)} · rango {fmt.format(price.marketMin)}–{fmt.format(price.marketMax)}.
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, suffix }: { label: string; value: number; onChange: (n: number) => void; suffix: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">{label}</span>
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black px-4 py-3 focus-within:border-yellow-300/60">
        <input
          type="number"
          min="0"
          step="1000"
          value={value || ''}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full bg-transparent text-sm font-black text-white outline-none"
        />
        <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-300">{suffix}</span>
      </div>
    </label>
  );
}

function PercentField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</span>
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black px-3 py-3 focus-within:border-yellow-300/60">
        <input
          type="number"
          min="0"
          max="100"
          step="1"
          value={value || ''}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full bg-transparent text-sm font-black text-white outline-none"
        />
        <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-300">%</span>
      </div>
    </label>
  );
}
