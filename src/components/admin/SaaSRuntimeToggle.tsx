'use client';

import { useEffect, useState } from 'react';
import { Power, RotateCcw, ZapOff } from 'lucide-react';
import { clearSaaSRuntimeOverride, getDefaultSaaSRuntimeEnabled, isSaaSRuntimeEnabled, setSaaSRuntimeEnabled, SAAS_RUNTIME_CHANGE_EVENT } from '@/lib/saasFeatureFlag';

export function SaaSRuntimeToggle() {
  const [enabled, setEnabled] = useState(true);
  const [defaultEnabled, setDefaultEnabled] = useState(true);

  useEffect(() => {
    setEnabled(isSaaSRuntimeEnabled());
    setDefaultEnabled(getDefaultSaaSRuntimeEnabled());
    function sync() { setEnabled(isSaaSRuntimeEnabled()); }
    window.addEventListener(SAAS_RUNTIME_CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SAAS_RUNTIME_CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  function toggle(next: boolean) {
    setSaaSRuntimeEnabled(next);
    setEnabled(next);
  }

  function reset() {
    clearSaaSRuntimeOverride();
    setEnabled(isSaaSRuntimeEnabled());
  }

  return <section className={`rounded-[2rem] border p-5 ${enabled ? 'border-emerald-300/20 bg-emerald-400/10' : 'border-amber-300/25 bg-amber-400/10'}`}>
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[10px] font-black uppercase tracking-[.22em] text-white/70">
          {enabled ? <Power className="h-3.5 w-3.5 text-emerald-200" /> : <ZapOff className="h-3.5 w-3.5 text-amber-200" />}
          Runtime SaaS
        </p>
        <h2 className="mt-4 text-2xl font-black tracking-[-.04em] text-white">{enabled ? 'SaaS activado' : 'SaaS apagado para rendimiento'}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">
          {enabled
            ? 'Las páginas públicas pueden consultar branding tenant y aplicar paletas SaaS.'
            : 'Se detienen las llamadas públicas a branding tenant, la barra SaaS y los observers de texto tenant en este navegador.'}
        </p>
        <p className="mt-2 text-xs text-zinc-500">Valor por defecto del deploy: {defaultEnabled ? 'activo' : 'apagado'} · Control local del navegador.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => toggle(false)} className={`rounded-2xl px-4 py-3 text-sm font-black transition ${!enabled ? 'bg-amber-300 text-black' : 'border border-white/10 bg-white/10 text-white hover:bg-white/15'}`}>Desactivar SaaS</button>
        <button type="button" onClick={() => toggle(true)} className={`rounded-2xl px-4 py-3 text-sm font-black transition ${enabled ? 'bg-emerald-300 text-black' : 'border border-white/10 bg-white/10 text-white hover:bg-white/15'}`}>Activar SaaS</button>
        <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15"><RotateCcw className="h-4 w-4" /> Reset</button>
      </div>
    </div>
  </section>;
}
