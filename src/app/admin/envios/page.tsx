'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  Truck,
} from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';
import type { ShippingConfig, ShippingRegionRate } from '@/lib/shipping';

type CarrierInfo = {
  configured: boolean;
  label: string;
  required: string[];
  optional: string[];
  docs: string | null;
};

type Message = { type: 'success' | 'error'; text: string } | null;

const inputClass = 'w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-semibold text-[#171612] outline-none transition focus:border-[#c77a00]/45 focus:ring-2 focus:ring-[#ffb000]/10';
const secondaryButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3.5 text-xs font-black text-[#5f594f] transition hover:bg-white disabled:opacity-50';
const primaryButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white transition hover:bg-[#2b2924] disabled:opacity-50';

function money(value: number) {
  return `$${Math.max(0, Number(value || 0)).toLocaleString('es-CL')}`;
}

function newRate(): ShippingRegionRate {
  const now = new Date().toISOString();
  return {
    region: 'NUEVA',
    label: 'Nueva región',
    testFee: 7_990,
    productionFee: 9_990,
    eta: '2 a 5 días hábiles',
    updatedAt: now,
    source: 'manual',
  };
}

export default function EnviosPage() {
  const [config, setConfig] = useState<ShippingConfig | null>(null);
  const [carriers, setCarriers] = useState<Record<string, CarrierInfo>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [configRes, carriersRes] = await Promise.all([
        fetch('/api/admin/envio', { cache: 'no-store' }),
        fetch('/api/admin/shipping/carriers-status', { cache: 'no-store' }),
      ]);
      const configJson = await configRes.json().catch(() => ({}));
      if (!configRes.ok) throw new Error(configJson.error ?? `HTTP ${configRes.status}`);
      setConfig(configJson as ShippingConfig);
      if (carriersRes.ok) {
        const carriersJson = await carriersRes.json().catch(() => ({}));
        setCarriers(carriersJson as Record<string, CarrierInfo>);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo cargar la configuración de envíos.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const carrierEntries = useMemo(() => Object.entries(carriers), [carriers]);
  const configuredCarriers = carrierEntries.filter(([, carrier]) => carrier.configured).length;

  function patchConfig(patch: Partial<ShippingConfig>) {
    setConfig((current) => current ? { ...current, ...patch } : current);
  }

  function patchRate(index: number, patch: Partial<ShippingRegionRate>) {
    setConfig((current) => {
      if (!current) return current;
      return {
        ...current,
        rates: current.rates.map((rate, position) => position === index ? { ...rate, ...patch, source: 'manual', updatedAt: new Date().toISOString() } : rate),
      };
    });
  }

  function addRate() {
    setConfig((current) => current ? { ...current, rates: [...current.rates, newRate()] } : current);
  }

  function removeRate(index: number) {
    setConfig((current) => current ? { ...current, rates: current.rates.filter((_, position) => position !== index) } : current);
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/envio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setConfig(json as ShippingConfig);
      setMessage({ type: 'success', text: 'Configuración de envío guardada y aplicada al cálculo real del checkout.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo guardar.' });
    } finally {
      setSaving(false);
    }
  }

  async function resetDefaults() {
    if (!config || !confirm('¿Restablecer las tarifas de referencia?')) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/envio?mode=${config.mode}`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setConfig(json as ShippingConfig);
      setMessage({ type: 'success', text: 'Tarifas de referencia restauradas.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo restablecer.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !config) {
    return (
      <AdminPage>
        <AdminPageHeader eyebrow="Operaciones" title="Envíos" description="Cargando configuración de despacho…" icon={Truck} />
        <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-[#817a6f]"><RefreshCw className="h-4 w-4 animate-spin" /> Cargando tarifas…</div>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Operaciones · Logística"
        title="Tarifas de envío"
        description="Edita la misma configuración que utiliza el checkout. Se eliminaron los valores paralelos de site_config para evitar que el panel muestre precios que la tienda no usa."
        icon={Truck}
        meta={
          <>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[.14em] ${config.mode === 'production' ? 'bg-emerald-500/10 text-emerald-800' : 'bg-[#ffb000]/10 text-[#8e5c00]'}`}>{config.mode === 'production' ? 'Producción' : 'Pruebas'}</span>
            <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.14em] text-[#817a6f]">{configuredCarriers}/{carrierEntries.length || 3} carriers</span>
          </>
        }
        actions={
          <>
            <button type="button" onClick={() => void load()} disabled={saving} className={secondaryButton}><RefreshCw className="h-4 w-4" /> Actualizar</button>
            <button type="button" onClick={() => void save()} disabled={saving} className={primaryButton}>{saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar</button>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Regiones" value={config.rates.length} icon={Truck} hint="Tarifas activas en checkout" />
        <AdminStat label="Carriers" value={`${configuredCarriers}/${carrierEntries.length || 3}`} icon={CheckCircle2} accent={configuredCarriers > 0 ? 'emerald' : 'rose'} hint="Credenciales detectadas" />
        <AdminStat label="Umbral bajo" value={money(config.lowValueThreshold)} icon={AlertTriangle} accent="yellow" hint={`Recargo ${money(config.lowValueSurcharge)}`} />
        <AdminStat label="Unidad extra" value={money(config.extraUnitFee)} icon={Plus} accent="cyan" hint="Por unidad adicional" />
      </section>

      {message ? <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${message.type === 'success' ? 'border-emerald-600/15 bg-emerald-500/8 text-emerald-900' : 'border-rose-600/15 bg-rose-500/8 text-rose-900'}`}>{message.text}</div> : null}

      <AdminCard className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Motor de cálculo</p>
            <h2 className="mt-1 text-xl font-black text-[#171612]">Reglas globales</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#817a6f]">El modo controla qué columna de tarifa usa el checkout. Los recargos se aplican desde el motor central de shipping.</p>
          </div>
          <button type="button" onClick={() => void resetDefaults()} disabled={saving} className={secondaryButton}><RotateCcw className="h-4 w-4" /> Restaurar referencia</button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">Modo</span><select value={config.mode} onChange={(e) => patchConfig({ mode: e.target.value === 'production' ? 'production' : 'test' })} className={inputClass}><option value="test">Pruebas</option><option value="production">Producción</option></select></label>
          <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">Umbral compra baja</span><input type="number" min={0} value={config.lowValueThreshold} onChange={(e) => patchConfig({ lowValueThreshold: Number(e.target.value) })} className={inputClass} /></label>
          <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">Recargo compra baja</span><input type="number" min={0} value={config.lowValueSurcharge} onChange={(e) => patchConfig({ lowValueSurcharge: Number(e.target.value) })} className={inputClass} /></label>
          <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">Cargo unidad extra</span><input type="number" min={0} value={config.extraUnitFee} onChange={(e) => patchConfig({ extraUnitFee: Number(e.target.value) })} className={inputClass} /></label>
        </div>
      </AdminCard>

      <AdminCard className="p-0 sm:p-0">
        <div className="flex flex-col gap-3 border-b border-black/8 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Tarifas regionales</p><h2 className="mt-1 text-xl font-black text-[#171612]">Valores reales del checkout</h2></div>
          <button type="button" onClick={addRate} className={secondaryButton}><Plus className="h-4 w-4" /> Agregar región</button>
        </div>
        <div className="divide-y divide-black/8">
          {config.rates.map((rate, index) => (
            <article key={`${rate.region}-${index}`} className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[90px_minmax(180px,1fr)_130px_130px_minmax(160px,1fr)_42px] lg:items-end">
              <label><span className="mb-1.5 block text-[9px] font-black uppercase tracking-[.13em] text-[#9a9388]">Código</span><input value={rate.region} onChange={(e) => patchRate(index, { region: e.target.value.toUpperCase() })} className={inputClass} /></label>
              <label><span className="mb-1.5 block text-[9px] font-black uppercase tracking-[.13em] text-[#9a9388]">Región</span><input value={rate.label} onChange={(e) => patchRate(index, { label: e.target.value })} className={inputClass} /></label>
              <label><span className="mb-1.5 block text-[9px] font-black uppercase tracking-[.13em] text-[#9a9388]">Pruebas</span><input type="number" min={0} value={rate.testFee} onChange={(e) => patchRate(index, { testFee: Number(e.target.value) })} className={inputClass} /></label>
              <label><span className="mb-1.5 block text-[9px] font-black uppercase tracking-[.13em] text-[#9a9388]">Producción</span><input type="number" min={0} value={rate.productionFee} onChange={(e) => patchRate(index, { productionFee: Number(e.target.value) })} className={inputClass} /></label>
              <label><span className="mb-1.5 block text-[9px] font-black uppercase tracking-[.13em] text-[#9a9388]">Entrega estimada</span><input value={rate.eta} onChange={(e) => patchRate(index, { eta: e.target.value })} className={inputClass} /></label>
              <button type="button" onClick={() => removeRate(index)} disabled={config.rates.length <= 1} aria-label={`Eliminar ${rate.label}`} className="grid h-10 w-10 place-items-center rounded-xl border border-rose-600/15 bg-rose-500/8 text-rose-800 transition hover:bg-rose-500/12 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
            </article>
          ))}
        </div>
      </AdminCard>

      <AdminCard className="space-y-4">
        <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Conectividad</p><h2 className="mt-1 text-xl font-black text-[#171612]">Carriers externos</h2><p className="mt-1 text-xs leading-5 text-[#817a6f]">Estas credenciales viven en el servidor. El panel solo indica si cada driver está listo; nunca muestra valores secretos.</p></div>
        <div className="divide-y divide-black/8">
          {carrierEntries.length === 0 ? <p className="py-5 text-sm text-[#817a6f]">No se pudo leer el estado de los carriers.</p> : carrierEntries.map(([id, carrier]) => (
            <div key={id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0"><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${carrier.configured ? 'bg-emerald-500' : 'bg-amber-500'}`} /><p className="font-black text-[#171612]">{carrier.label}</p></div><p className="mt-1 text-xs text-[#817a6f]">{carrier.configured ? 'Driver configurado para consultas reales.' : `Faltan: ${carrier.required.join(', ')}`}</p></div>
              {carrier.docs ? <a href={carrier.docs} target="_blank" rel="noreferrer" className={secondaryButton}>Documentación <ExternalLink className="h-3.5 w-3.5" /></a> : null}
            </div>
          ))}
        </div>
      </AdminCard>
    </AdminPage>
  );
}
