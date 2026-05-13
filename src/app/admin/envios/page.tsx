'use client';

import { useCallback, useEffect, useState } from 'react';
import { Truck, Save, Plus, Trash2, RefreshCw, AlertTriangle, CheckCircle2, ExternalLink, KeyRound } from 'lucide-react';
import { insforge } from '@/lib/insforge';

interface ShippingRate {
  region: string;
  carrier: string;
  days: string;
  price: number;
}

interface CarrierInfo {
  configured: boolean;
  label: string;
  required: string[];
  optional: string[];
  docs: string | null;
}

const DEFAULT_RATES: ShippingRate[] = [
  { region: 'Maule',                    carrier: 'Starken',     days: '1-2',  price: 3500  },
  { region: 'Región Metropolitana',     carrier: 'Chilexpress', days: '2-3',  price: 4500  },
  { region: 'Biobío',                   carrier: 'Chilexpress', days: '2-3',  price: 4500  },
  { region: 'Valparaíso',              carrier: 'Chilexpress', days: '2-4',  price: 5000  },
  { region: 'O\'Higgins',              carrier: 'Starken',     days: '2-3',  price: 4000  },
  { region: 'Araucanía',               carrier: 'Correos',     days: '3-5',  price: 5500  },
  { region: 'Los Lagos',               carrier: 'Correos',     days: '3-5',  price: 6000  },
  { region: 'Atacama',                 carrier: 'Correos',     days: '4-6',  price: 6500  },
  { region: 'Antofagasta',             carrier: 'Correos',     days: '5-7',  price: 7000  },
  { region: 'Magallanes',              carrier: 'Correos',     days: '7-10', price: 9500  },
  { region: 'Todo Chile (por defecto)', carrier: 'Correos',    days: '5-7',  price: 5900  },
];

const CARRIERS = ['Chilexpress', 'Starken', 'Correos de Chile', 'Blue Express', 'DHL', 'Retiro en tienda'];

function formatCLP(n: number) { return '$' + n.toLocaleString('es-CL'); }

export default function EnviosPage() {
  const [rates, setRates]     = useState<ShippingRate[]>(DEFAULT_RATES);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [freeThreshold, setFreeThreshold] = useState(50000);
  const [loading, setLoading] = useState(true);
  const [carrierStatus, setCarrierStatus] = useState<Record<string, CarrierInfo> | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      const { data } = await insforge.database
        .from('site_config')
        .select('clave, valor')
        .in('clave', ['shipping_rates', 'shipping_free_threshold']);

      if (data && Array.isArray(data)) {
        for (const row of data as { clave: string; valor: string }[]) {
          if (row.clave === 'shipping_rates') {
            try { setRates(JSON.parse(row.valor)); } catch { /* keep defaults */ }
          }
          if (row.clave === 'shipping_free_threshold') {
            setFreeThreshold(Number(row.valor) || 50000);
          }
        }
      }
    } catch { /* use defaults */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    fetch('/api/admin/shipping/carriers-status')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setCarrierStatus(data); })
      .catch(() => {});
  }, [loadConfig]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      await insforge.database.from('site_config').upsert(
        [
          { clave: 'shipping_rates',          valor: JSON.stringify(rates),  tipo: 'json' },
          { clave: 'shipping_free_threshold', valor: String(freeThreshold), tipo: 'number' },
        ],
        { onConflict: 'clave' },
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  const updateRate = (i: number, field: keyof ShippingRate, value: string | number) => {
    setRates((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const removeRate = (i: number) => setRates((prev) => prev.filter((_, idx) => idx !== i));
  const addRate = () => setRates((prev) => [...prev, { region: '', carrier: 'Chilexpress', days: '3-5', price: 5000 }]);

  const unconfigured = carrierStatus
    ? Object.entries(carrierStatus).filter(([, v]) => !v.configured)
    : [];
  const allConfigured = carrierStatus !== null && unconfigured.length === 0;

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Cargando…</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="border-b border-white/5 bg-zinc-950 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="w-5 h-5 text-[#facc15]" />
          <div>
            <h1 className="font-bold text-lg">Tarifas de Envío</h1>
            <p className="text-zinc-500 text-xs">Configura costos por región y transportista</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadConfig} className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: '#facc15', color: '#000' }}
          >
            <Save className="w-4 h-4" />
            {saved ? '¡Guardado!' : saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-4xl mx-auto">

        {/* ── Banner de estado de carriers ── */}
        {carrierStatus !== null && (
          allConfigured ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-3.5">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
              <p className="text-sm text-emerald-300">
                <strong>¡Carriers activos!</strong> Chilexpress, Starken y Correos de Chile están configurados con credenciales reales.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 px-5 py-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-amber-300 text-sm">
                    {unconfigured.length === 3
                      ? 'Ningún carrier real está conectado — el checkout usa precios estimados'
                      : `${unconfigured.length} carrier${unconfigured.length > 1 ? 's' : ''} sin credenciales`}
                  </p>
                  <p className="mt-1 text-xs text-amber-300/70 leading-relaxed">
                    Los drivers ya están implementados. Solo falta agregar las variables de entorno en{' '}
                    <strong className="text-amber-200">Vercel → Settings → Environment Variables</strong> (o en tu <code className="rounded bg-amber-400/10 px-1">.env.local</code>):
                  </p>

                  <div className="mt-3 space-y-3">
                    {unconfigured.map(([id, info]) => (
                      <div key={id} className="rounded-xl border border-amber-400/20 bg-black/30 px-4 py-3">
                        <div className="flex items-center gap-2 mb-2">
                          <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                          <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">{info.label}</span>
                          {info.docs && (
                            <a
                              href={info.docs}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto flex items-center gap-1 text-[10px] text-amber-400/60 hover:text-amber-400 transition-colors"
                            >
                              Docs <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {info.required.map((v) => (
                            <code key={v} className="rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 font-mono text-[11px] text-amber-200">
                              {v}
                            </code>
                          ))}
                          {info.optional.map((v) => (
                            <code key={v} className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-zinc-400">
                              {v} <span className="text-zinc-600">(opcional)</span>
                            </code>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <a
                      href="/admin/integraciones"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition-all hover:bg-amber-400/20 hover:border-amber-400/50"
                    >
                      <KeyRound className="h-3 w-3" />
                      Ir a Integraciones
                    </a>
                    <a
                      href="/admin/manual#envio-carriers"
                      className="text-xs text-amber-400/50 hover:text-amber-400 transition-colors"
                    >
                      Ver guía de configuración →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {/* Free shipping threshold */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
          <h2 className="font-semibold mb-1 text-sm text-zinc-300">Envío gratis desde</h2>
          <p className="text-xs text-zinc-500 mb-4">Los pedidos sobre este monto no pagan despacho</p>
          <div className="flex items-center gap-3">
            <span className="text-zinc-400 text-sm">$</span>
            <input
              type="number"
              value={freeThreshold}
              onChange={(e) => setFreeThreshold(Number(e.target.value))}
              className="bg-zinc-800 border border-white/10 rounded-xl px-4 py-2 text-white text-sm w-40 focus:outline-none focus:border-[#facc15]/50"
            />
            <span className="text-zinc-400 text-sm">CLP</span>
            <span className="text-zinc-500 text-xs ml-2">= {formatCLP(freeThreshold)}</span>
          </div>
        </div>

        {/* Rates table */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm text-zinc-300">Tarifas por región</h2>
              <p className="text-[11px] text-zinc-600 mt-0.5">
                Usadas como fallback manual. Cuando los carriers tienen credenciales, las tarifas son en tiempo real.
              </p>
            </div>
            <button
              onClick={addRate}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 border border-white/10"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar
            </button>
          </div>

          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-5 py-2 text-xs text-zinc-500 border-b border-white/5">
            <div className="col-span-4">Región</div>
            <div className="col-span-3">Transportista</div>
            <div className="col-span-2">Días</div>
            <div className="col-span-2">Precio</div>
            <div className="col-span-1" />
          </div>

          {rates.map((rate, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 px-5 py-2.5 border-b border-white/5 last:border-0 items-center hover:bg-white/[0.02]">
              <div className="col-span-4">
                <input
                  value={rate.region}
                  onChange={(e) => updateRate(i, 'region', e.target.value)}
                  placeholder="Nombre región"
                  className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#facc15]/50"
                />
              </div>
              <div className="col-span-3">
                <select
                  value={rate.carrier}
                  onChange={(e) => updateRate(i, 'carrier', e.target.value)}
                  className="w-full bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-[#facc15]/50"
                >
                  {CARRIERS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <input
                  value={rate.days}
                  onChange={(e) => updateRate(i, 'days', e.target.value)}
                  placeholder="2-3"
                  className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#facc15]/50"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  value={rate.price}
                  onChange={(e) => updateRate(i, 'price', Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#facc15]/50"
                />
              </div>
              <div className="col-span-1 flex justify-end">
                <button onClick={() => removeRate(i)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-zinc-600 text-center">
          Las tarifas manuales se usan en el checkout como respaldo cuando los carriers no están configurados.
        </p>
      </div>
    </div>
  );
}
