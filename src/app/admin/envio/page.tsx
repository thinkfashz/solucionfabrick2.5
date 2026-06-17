'use client';

import { useEffect, useMemo, useState } from 'react';
import { Database, Package, RefreshCw, Save, ToggleLeft, ToggleRight, Truck } from 'lucide-react';
import { AdminPage, AdminPageHeader } from '@/components/admin/ui';
import { DEFAULT_SHIPPING_CONFIG, normalizeShippingConfig, type ShippingConfig, type ShippingRegionRate } from '@/lib/shipping';
import ProductShippingOverrides from './ProductShippingOverrides';

type Notice = { type: 'success' | 'error'; message: string } | null;

function clp(value: number) { return '$' + Math.round(value || 0).toLocaleString('es-CL'); }
function parseMoney(value: string) { return Math.max(0, Math.round(Number(value.replace(/\D/g, '')) || 0)); }

export default function AdminEnvioPage() {
  const [config, setConfig] = useState<ShippingConfig>(DEFAULT_SHIPPING_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  async function loadConfig() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/envio', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo cargar configuración.');
      setConfig(normalizeShippingConfig(json));
    } catch (err) {
      setNotice({ type: 'error', message: err instanceof Error ? err.message : 'Error cargando tarifas.' });
      setConfig(DEFAULT_SHIPPING_CONFIG);
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadConfig(); }, []);

  async function saveConfig(next = config) {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/envio', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo guardar.');
      setConfig(normalizeShippingConfig(json));
      setNotice({ type: 'success', message: 'Tarifas de envío guardadas.' });
    } catch (err) { setNotice({ type: 'error', message: err instanceof Error ? err.message : 'Error guardando tarifas.' }); }
    finally { setSaving(false); }
  }

  async function resetReference(mode: 'test' | 'production') {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/envio?mode=${mode}`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo cargar referencia.');
      setConfig(normalizeShippingConfig(json));
      setNotice({ type: 'success', message: mode === 'test' ? 'Modo prueba activado con tarifas referenciales.' : 'Modo producción activado con tarifas editables.' });
    } catch (err) { setNotice({ type: 'error', message: err instanceof Error ? err.message : 'Error actualizando modo.' }); }
    finally { setSaving(false); }
  }

  function updateRate(region: string, patch: Partial<ShippingRegionRate>) {
    setConfig((current) => ({ ...current, rates: current.rates.map((rate) => rate.region === region ? { ...rate, ...patch, source: 'manual', updatedAt: new Date().toISOString().slice(0, 10) } : rate) }));
  }

  const activeRates = useMemo(() => config.rates.map((rate) => ({ ...rate, activeFee: config.mode === 'production' ? rate.productionFee : rate.testFee })), [config]);

  return (
    <AdminPage className="px-1 md:px-2">
      <AdminPageHeader
        eyebrow="Despacho"
        icon={Truck}
        title={<>Tarifas de <span className="text-yellow-300">Envío</span></>}
        description="Controla el costo de despacho por región. En modo prueba usa referencias editables; en producción usa tus tarifas finales para el checkout."
        meta={<span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-yellow-300"><Database className="h-3 w-3" /> /admin/envio</span>}
        actions={<><button onClick={loadConfig} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200"><RefreshCw className="h-3.5 w-3.5" /> Actualizar</button><button onClick={() => void saveConfig()} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-yellow-300 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-black disabled:opacity-60"><Save className="h-3.5 w-3.5" /> {saving ? 'Guardando…' : 'Guardar'}</button></>}
      />

      <div className="space-y-5">
        {notice && <div className={`rounded-3xl border p-4 text-sm ${notice.type === 'success' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-red-500/40 bg-red-500/10 text-red-200'}`}>{notice.message}</div>}
        <section className="grid gap-4 lg:grid-cols-[1fr_360px]"><div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5"><p className="text-[10px] font-black uppercase tracking-[0.26em] text-zinc-500">Modo global</p><h2 className="mt-2 text-2xl font-black text-white">Prueba / Producción</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Prueba carga valores referenciales por región para cotizar rápido. Producción usa tus valores finales guardados para calcular el despacho en checkout.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><button onClick={() => void resetReference('test')} className={`rounded-3xl border p-5 text-left transition ${config.mode === 'test' ? 'border-yellow-300 bg-yellow-300 text-black' : 'border-white/10 bg-white/[0.04] text-zinc-300 hover:border-yellow-300/40'}`}><ToggleLeft className="mb-3 h-6 w-6" /><b>Modo prueba</b><p className={`mt-1 text-sm ${config.mode === 'test' ? 'text-black/70' : 'text-zinc-500'}`}>Tarifas referenciales editables por región.</p></button><button onClick={() => void resetReference('production')} className={`rounded-3xl border p-5 text-left transition ${config.mode === 'production' ? 'border-yellow-300 bg-yellow-300 text-black' : 'border-white/10 bg-white/[0.04] text-zinc-300 hover:border-yellow-300/40'}`}><ToggleRight className="mb-3 h-6 w-6" /><b>Modo producción</b><p className={`mt-1 text-sm ${config.mode === 'production' ? 'text-black/70' : 'text-zinc-500'}`}>Tarifas finales para cobrar en la compra.</p></button></div></div><aside className="rounded-3xl border border-yellow-300/20 bg-yellow-300/10 p-5"><Package className="h-7 w-7 text-yellow-300" /><h3 className="mt-3 text-xl font-black text-white">Integración por producto</h3><p className="mt-2 text-sm leading-6 text-yellow-50/70">En cada producto puedes heredar la tarifa global, forzar prueba, producción, envío fijo o envío gratis.</p><a href="/admin/productos" className="mt-5 inline-flex rounded-full bg-yellow-300 px-5 py-3 text-sm font-black text-black">Ir a productos</a></aside></section>
        <section className="overflow-x-auto rounded-3xl border border-white/10 bg-zinc-950/70"><table className="w-full min-w-[900px] text-sm"><thead><tr className="border-b border-white/10 bg-black/30">{['Región', 'Tarifa prueba', 'Tarifa producción', 'ETA', 'Activa ahora'].map((h) => <th key={h} className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-zinc-500">{h}</th>)}</tr></thead><tbody className="divide-y divide-white/5">{loading ? <tr><td className="px-4 py-8 text-zinc-500" colSpan={5}>Cargando tarifas…</td></tr> : activeRates.map((rate) => <tr key={rate.region} className="hover:bg-white/[0.03]"><td className="px-4 py-4"><b className="text-white">{rate.label}</b><p className="text-xs text-zinc-500">{rate.region} · {rate.source}</p></td><td className="px-4 py-4"><MoneyInput value={rate.testFee} onChange={(value) => updateRate(rate.region, { testFee: value })} /></td><td className="px-4 py-4"><MoneyInput value={rate.productionFee} onChange={(value) => updateRate(rate.region, { productionFee: value })} /></td><td className="px-4 py-4"><input value={rate.eta} onChange={(e) => updateRate(rate.region, { eta: e.target.value })} className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-zinc-200 outline-none focus:border-yellow-300/40" /></td><td className="px-4 py-4 font-black text-yellow-300">{clp(rate.activeFee)}</td></tr>)}</tbody></table></section>
        <ProductShippingOverrides onNotice={setNotice} />
      </div>
    </AdminPage>
  );
}

function MoneyInput({ value, onChange }: { value: number; onChange: (value: number) => void }) { return <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">$</span><input value={value.toLocaleString('es-CL')} onChange={(e) => onChange(parseMoney(e.target.value))} inputMode="numeric" className="w-36 rounded-xl border border-white/10 bg-black/35 py-2 pl-7 pr-3 font-bold text-white outline-none focus:border-yellow-300/40" /></div>; }
