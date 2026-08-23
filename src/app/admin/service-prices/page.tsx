'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calculator, RefreshCw, Save, ShieldAlert } from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';
import type { ServicePriceSetting, ServiceUnit } from '@/lib/servicePricing';
import { DEFAULT_SERVICE_PRICES, unitLabel } from '@/lib/servicePricing';

const fmt = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const UNITS: ServiceUnit[] = ['m2', 'ml', 'm3', 'punto', 'unidad'];
const inputClass = 'w-full rounded-xl border border-black/10 bg-white/75 px-3.5 py-3 text-sm font-semibold text-[#171612] outline-none transition focus:border-[#c77a00]/40 focus:bg-white';
const labelClass = 'mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]';

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
    <AdminPage>
      <AdminPageHeader
        eyebrow="Operaciones · Cotizadores"
        title="Precios de servicios"
        description="Administra los valores de referencia que alimentan las calculadoras públicas sin mezclar la edición con capas visuales innecesarias."
        icon={Calculator}
        actions={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/70 px-4 text-xs font-bold text-[#5f584d] transition hover:bg-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Recargar
          </button>
        }
      />

      <AdminMotion className="grid gap-3">
        {message ? <div className="rounded-xl border border-emerald-600/15 bg-emerald-500/8 px-4 py-3 text-sm font-medium text-emerald-800">{message}</div> : null}
        {error ? <div className="rounded-xl border border-rose-600/15 bg-rose-500/8 px-4 py-3 text-sm font-medium text-rose-800">{error}</div> : null}
        <div className="flex items-start gap-3 border-y border-[#c77a00]/12 bg-[#ffb000]/6 px-1 py-4 text-sm leading-6 text-[#6d5a34]">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#a56600]" />
          <div>
            <strong className="font-black text-[#66450b]">Valores referenciales.</strong>{' '}
            En público deben mostrarse como orientación y confirmarse después de la evaluación real del servicio.
          </div>
        </div>
      </AdminMotion>

      <section className="grid gap-4 xl:grid-cols-2">
        {sorted.map((price) => {
          const totalPct = price.materialsPct + price.laborPct + price.logisticsPct + price.contingencyPct;
          const distributionOk = Math.abs(totalPct - 1) < 0.02;

          return (
            <AdminCard key={price.slug} as="article" className="p-0 sm:p-0">
              <div className="flex flex-col gap-4 border-b border-black/8 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ffb000]/12 text-[#a56600]">
                    <Calculator className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9a9286]">{price.slug}</p>
                    <input
                      value={price.name}
                      onChange={(e) => update(price.slug, { name: e.target.value })}
                      className="mt-0.5 w-full bg-transparent text-xl font-black tracking-[-.025em] text-[#171612] outline-none"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void save(price)}
                  disabled={savingSlug === price.slug}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white transition hover:bg-[#2a2823] disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {savingSlug === price.slug ? 'Guardando…' : 'Guardar'}
                </button>
              </div>

              <div className="space-y-5 p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Precio base" value={price.basePrice} onChange={(v) => update(price.slug, { basePrice: v })} suffix={`/${unitLabel(price.unit)}`} />
                  <label className="block">
                    <span className={labelClass}>Unidad</span>
                    <select
                      value={price.unit}
                      onChange={(e) => update(price.slug, { unit: e.target.value as ServiceUnit })}
                      className={inputClass}
                    >
                      {UNITS.map((unit) => <option key={unit} value={unit}>{unitLabel(unit)}</option>)}
                    </select>
                  </label>
                  <Field label="Mercado bajo" value={price.marketMin} onChange={(v) => update(price.slug, { marketMin: v })} suffix={`/${unitLabel(price.unit)}`} />
                  <Field label="Mercado alto" value={price.marketMax} onChange={(v) => update(price.slug, { marketMax: v })} suffix={`/${unitLabel(price.unit)}`} />
                </div>

                <div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <PercentField label="Materiales" value={normalizePct(price.materialsPct)} onChange={(v) => update(price.slug, { materialsPct: fromPct(v) })} />
                    <PercentField label="Mano obra" value={normalizePct(price.laborPct)} onChange={(v) => update(price.slug, { laborPct: fromPct(v) })} />
                    <PercentField label="Logística" value={normalizePct(price.logisticsPct)} onChange={(v) => update(price.slug, { logisticsPct: fromPct(v) })} />
                    <PercentField label="Imprevistos" value={normalizePct(price.contingencyPct)} onChange={(v) => update(price.slug, { contingencyPct: fromPct(v) })} />
                  </div>
                  <p className={`mt-2 text-xs leading-5 ${distributionOk ? 'text-[#8f887c]' : 'font-semibold text-[#9b6a12]'}`}>
                    Distribución: {Math.round(totalPct * 100)}%. {distributionOk ? 'La composición suma correctamente.' : 'El sistema normalizará la gráfica pública.'}
                  </p>
                </div>

                <label className="block">
                  <span className={labelClass}>Aviso público</span>
                  <textarea
                    value={price.disclaimer}
                    onChange={(e) => update(price.slug, { disclaimer: e.target.value })}
                    rows={3}
                    className={`${inputClass} resize-y leading-6`}
                  />
                </label>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/8 pt-4 text-xs text-[#817a6f]">
                  <span>Vista previa comercial</span>
                  <strong className="font-black text-[#171612]">{fmt.format(price.basePrice)} / {unitLabel(price.unit)}</strong>
                  <span>{fmt.format(price.marketMin)}–{fmt.format(price.marketMax)}</span>
                </div>
              </div>
            </AdminCard>
          );
        })}
      </section>
    </AdminPage>
  );
}

function Field({ label, value, onChange, suffix }: { label: string; value: number; onChange: (n: number) => void; suffix: string }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-white/75 px-3.5 py-3 transition focus-within:border-[#c77a00]/40 focus-within:bg-white">
        <input type="number" min="0" step="1000" value={value || ''} onChange={(e) => onChange(Number(e.target.value) || 0)} className="min-w-0 flex-1 bg-transparent text-sm font-black text-[#171612] outline-none" />
        <span className="text-[10px] font-black uppercase tracking-wider text-[#9b6a12]">{suffix}</span>
      </div>
    </label>
  );
}

function PercentField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-white/65 px-3 py-2.5 transition focus-within:border-[#c77a00]/40 focus-within:bg-white">
        <input type="number" min="0" max="100" step="1" value={value || ''} onChange={(e) => onChange(Number(e.target.value) || 0)} className="min-w-0 flex-1 bg-transparent text-sm font-black text-[#171612] outline-none" />
        <span className="text-[10px] font-black text-[#9b6a12]">%</span>
      </div>
    </label>
  );
}
