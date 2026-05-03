'use client';

/**
 * PropertyInspector — Sidebar derecha que aparece al seleccionar una pieza.
 *
 * Permite editar dimensiones (ancho / alto / largo) y posición (X / Z) y la
 * profundidad del marco con sliders + inputs sincronizados. Incluye control
 * de rotación, snap (5 cm / 10 cm / off) y botón eliminar.
 *
 * Todos los cambios se aplican vía `setDimensiones` / `setPosicion` /
 * `updateElemento`, lo que dispara automáticamente el re-render en 2D y 3D
 * sin latencia (al ser el mismo store).
 */

import { Trash2, RotateCw, Magnet } from 'lucide-react';
import {
  useDesignStore,
  useSelectedElement,
  type Dimensiones,
  type Posicion,
  type SnapStep,
} from '@/store/useDesignStore';

interface NumFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}

function NumField({ label, value, min, max, step, unit = 'm', onChange }: NumFieldProps) {
  return (
    <label className="mb-3 block">
      <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-zinc-400">
        <span>{label}</span>
        <span className="font-mono text-yellow-400">
          {value.toFixed(2)} {unit}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-yellow-400"
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number(value.toFixed(2))}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
          className="w-16 rounded border border-zinc-700 bg-zinc-950/60 px-1.5 py-1 text-right font-mono text-[11px] text-zinc-100 outline-none focus:border-yellow-400/60"
        />
      </div>
    </label>
  );
}

export function PropertyInspector() {
  const el = useSelectedElement();
  const setDimensiones = useDesignStore((s) => s.setDimensiones);
  const setPosicion = useDesignStore((s) => s.setPosicion);
  const updateElemento = useDesignStore((s) => s.updateElemento);
  const removeElemento = useDesignStore((s) => s.removeElemento);
  const snapStep = useDesignStore((s) => s.snapStep);
  const setSnapStep = useDesignStore((s) => s.setSnapStep);

  if (!el) {
    return (
      <aside className="pointer-events-auto flex h-full w-72 flex-col border-l border-yellow-400/10 bg-zinc-900/95 text-zinc-300 backdrop-blur-md">
        <header className="border-b border-yellow-400/20 px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.25em] text-yellow-400">Inspector</p>
          <h2 className="mt-1 font-serif text-lg tracking-wide text-zinc-50">Sin selección</h2>
        </header>
        <div className="flex-1 px-5 py-6 text-xs text-zinc-500">
          Selecciona una pieza en el plano o en el modelo 3D para editar sus dimensiones,
          materiales y posición con precisión milimétrica.
        </div>
      </aside>
    );
  }

  const [w, h, l] = el.dimensiones;
  const [px, , pz] = el.posicion;

  const updDim = (idx: 0 | 1 | 2, v: number) => {
    const next: Dimensiones = [...el.dimensiones] as Dimensiones;
    next[idx] = v;
    setDimensiones(el.id, next);
  };
  const updPos = (idx: 0 | 2, v: number) => {
    const next: Posicion = [...el.posicion] as Posicion;
    next[idx] = v;
    setPosicion(el.id, next);
  };

  return (
    <aside className="pointer-events-auto flex h-full w-72 flex-col border-l border-yellow-400/10 bg-zinc-900/95 text-zinc-200 backdrop-blur-md">
      <header className="border-b border-yellow-400/20 px-5 py-4">
        <p className="text-[10px] uppercase tracking-[0.25em] text-yellow-400">Inspector</p>
        <h2 className="mt-1 font-serif text-lg tracking-wide text-zinc-50">{el.nombre}</h2>
        <p className="mt-0.5 text-[11px] text-zinc-500">
          {el.categoria} · {el.tipo}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <h3 className="mb-2 text-[10px] uppercase tracking-widest text-yellow-400">
          Dimensiones
        </h3>
        <NumField
          label="Ancho"
          value={w}
          min={0.1}
          max={10}
          step={0.05}
          onChange={(v) => updDim(0, v)}
        />
        <NumField
          label="Alto"
          value={h}
          min={0.1}
          max={6}
          step={0.05}
          onChange={(v) => updDim(1, v)}
        />
        <NumField
          label="Largo / Profundidad"
          value={l}
          min={0.04}
          max={10}
          step={0.05}
          onChange={(v) => updDim(2, v)}
        />

        <h3 className="mb-2 mt-4 text-[10px] uppercase tracking-widest text-yellow-400">
          Posición en planta
        </h3>
        <NumField
          label="X"
          value={px}
          min={-15}
          max={15}
          step={0.05}
          onChange={(v) => updPos(0, v)}
        />
        <NumField
          label="Z"
          value={pz}
          min={-15}
          max={15}
          step={0.05}
          onChange={(v) => updPos(2, v)}
        />

        <div className="mb-3 mt-4">
          <button
            type="button"
            onClick={() =>
              updateElemento(el.id, { rotacionY: (el.rotacionY + Math.PI / 2) % (Math.PI * 2) })
            }
            className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-xs font-medium text-zinc-100 transition hover:border-yellow-400/60 hover:text-yellow-400"
          >
            <RotateCw className="h-3.5 w-3.5" /> Rotar 90°
          </button>
        </div>

        <h3 className="mb-2 mt-4 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-yellow-400">
          <Magnet className="h-3 w-3" /> Snap
        </h3>
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { v: 0 as SnapStep, l: 'Off' },
              { v: 0.05 as SnapStep, l: '5 cm' },
              { v: 0.1 as SnapStep, l: '10 cm' },
            ]
          ).map((opt) => (
            <button
              key={opt.l}
              type="button"
              onClick={() => setSnapStep(opt.v)}
              className={`rounded-md border px-2 py-1.5 text-[11px] font-medium transition ${
                snapStep === opt.v
                  ? 'border-yellow-400/60 bg-yellow-400/10 text-yellow-400'
                  : 'border-zinc-700 bg-zinc-950/60 text-zinc-300 hover:border-yellow-400/40'
              }`}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      <footer className="border-t border-yellow-400/10 px-5 py-3">
        <button
          type="button"
          onClick={() => removeElemento(el.id)}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-rose-700/50 bg-rose-900/20 px-3 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-900/40"
        >
          <Trash2 className="h-3.5 w-3.5" /> Eliminar pieza
        </button>
      </footer>
    </aside>
  );
}
