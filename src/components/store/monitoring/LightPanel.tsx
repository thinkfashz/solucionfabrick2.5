'use client';
import { LIGHT_PRESETS, applyLightPreset, sunDistance, sunPositionFrom, type LightConfig, type LightPresetId } from './LightingRig';

function Range({ label, value, n, min, max, step, onChange }: { label: string; value: string; n: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex justify-between text-[8px] uppercase text-white/38">
        <b>{label}</b>
        <b className="text-[#F6C64A]">{value}</b>
      </span>
      <input type="range" value={n} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-[#F6C64A]" />
    </label>
  );
}

export default function LightPanel({ light, setLight }: { light: LightConfig; setLight: (u: (v: LightConfig) => LightConfig) => void }) {
  const r = sunDistance(light.sunPosition);
  return (
    <div className="mt-4 space-y-3" data-testid="light-panel">
      <div className="grid grid-cols-3 gap-1">
        {(Object.keys(LIGHT_PRESETS) as LightPresetId[]).map((id) => {
          const active = light.preset === id;
          return (
            <button
              key={id}
              onClick={() => setLight((v) => applyLightPreset(id, v.shadows))}
              className={`rounded-xl py-2 text-[8px] font-black transition-colors ${active ? 'bg-[#F6C64A] text-black' : 'bg-white/[.05] text-white/50 hover:bg-white/[.08]'}`}
            >
              {LIGHT_PRESETS[id].label}
            </button>
          );
        })}
      </div>
      <Range
        label="Azimut solar"
        value={`${Math.round(light.azimuthDeg)}°`}
        n={light.azimuthDeg}
        min={-180}
        max={180}
        step={1}
        onChange={(azimuthDeg) => setLight((v) => ({ ...v, preset: v.preset, azimuthDeg, sunPosition: sunPositionFrom(azimuthDeg, v.elevationDeg, r) }))}
      />
      <Range
        label="Altura del sol"
        value={`${Math.round(light.elevationDeg)}°`}
        n={light.elevationDeg}
        min={2}
        max={85}
        step={1}
        onChange={(elevationDeg) => setLight((v) => ({ ...v, preset: v.preset, elevationDeg, sunPosition: sunPositionFrom(v.azimuthDeg, elevationDeg, r) }))}
      />
      <Range
        label="Intensidad ambiental"
        value={light.ambientIntensity.toFixed(2)}
        n={light.ambientIntensity}
        min={0.05}
        max={1.2}
        step={0.01}
        onChange={(ambientIntensity) => setLight((v) => ({ ...v, ambientIntensity }))}
      />
      <Range
        label="Intensidad del sol"
        value={light.sunIntensity.toFixed(2)}
        n={light.sunIntensity}
        min={0}
        max={3.5}
        step={0.05}
        onChange={(sunIntensity) => setLight((v) => ({ ...v, sunIntensity }))}
      />
      <Range
        label="Luz cálida (punto)"
        value={light.pointIntensity.toFixed(2)}
        n={light.pointIntensity}
        min={0}
        max={4}
        step={0.05}
        onChange={(pointIntensity) => setLight((v) => ({ ...v, pointIntensity }))}
      />
      <button
        onClick={() => setLight((v) => ({ ...v, shadows: !v.shadows }))}
        className={`w-full rounded-xl border p-3 text-left transition-colors ${light.shadows ? 'border-[#F6C64A]/30 bg-[#F6C64A]/[.07]' : 'border-white/8 bg-white/[.025]'}`}
      >
        <span className="flex items-center justify-between gap-3">
          <b className="text-[9px]">Sombras del sol</b>
          <span className={`rounded-full px-2 py-1 text-[7px] font-black ${light.shadows ? 'bg-[#F6C64A] text-black' : 'bg-white/10 text-white/40'}`}>{light.shadows ? 'ON' : 'OFF'}</span>
        </span>
        <small className="mt-1 block text-[7px] leading-3 text-white/35">Proyecta sombras de las dos viviendas sobre el terreno. Desactivar mejora el rendimiento en móviles.</small>
      </button>
      <p className="rounded-xl border border-white/8 bg-white/[.025] p-3 text-[8px] leading-4 text-white/40">
        El preset sitúa el sol, la ambiental y la luz puntual; azimut, altura e intensidades permiten afinar el ambiente de la escena.
      </p>
    </div>
  );
}
