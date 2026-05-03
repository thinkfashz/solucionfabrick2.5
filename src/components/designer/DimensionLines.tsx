'use client';

/**
 * DimensionLines — Líneas de cota dinámicas para la pieza seleccionada.
 *
 * Dibuja segmentos punteados dorados a lo largo de los 3 ejes con etiquetas
 * "ancho × alto × largo" (en metros, dos decimales) flotando sobre el
 * elemento. Se actualizan en tiempo real conforme el usuario edita las
 * dimensiones desde el inspector.
 */

import { Html, Line } from '@react-three/drei';
import { useSelectedElement } from '@/store/useDesignStore';

const DIM_COLOR = '#facc15';

function fmt(m: number): string {
  return `${m.toFixed(2)} m`;
}

export function DimensionLines() {
  const el = useSelectedElement();
  if (!el) return null;
  const [w, h, l] = el.dimensiones;
  const [px, py, pz] = el.posicion;

  // Líneas de cota: las dibujamos en world space alrededor del elemento, con
  // un pequeño offset para que no choquen con la geometría.
  const offset = 0.15;
  const xLine: [number, number, number][] = [
    [px - w / 2, py - offset, pz - l / 2 - offset],
    [px + w / 2, py - offset, pz - l / 2 - offset],
  ];
  const zLine: [number, number, number][] = [
    [px + w / 2 + offset, py - offset, pz - l / 2],
    [px + w / 2 + offset, py - offset, pz + l / 2],
  ];
  const yLine: [number, number, number][] = [
    [px - w / 2 - offset, py, pz - l / 2 - offset],
    [px - w / 2 - offset, py + h, pz - l / 2 - offset],
  ];

  return (
    <group>
      <Line points={xLine} color={DIM_COLOR} lineWidth={1.5} dashed dashScale={20} />
      <Line points={zLine} color={DIM_COLOR} lineWidth={1.5} dashed dashScale={20} />
      <Line points={yLine} color={DIM_COLOR} lineWidth={1.5} dashed dashScale={20} />

      <Html position={[px, py - offset - 0.05, pz - l / 2 - offset]} center distanceFactor={8}>
        <span className="rounded bg-zinc-900/90 px-1.5 py-0.5 text-[10px] font-medium text-yellow-400 ring-1 ring-yellow-400/40">
          {fmt(w)}
        </span>
      </Html>
      <Html
        position={[px + w / 2 + offset + 0.05, py - offset, pz]}
        center
        distanceFactor={8}
      >
        <span className="rounded bg-zinc-900/90 px-1.5 py-0.5 text-[10px] font-medium text-yellow-400 ring-1 ring-yellow-400/40">
          {fmt(l)}
        </span>
      </Html>
      <Html
        position={[px - w / 2 - offset - 0.05, py + h / 2, pz - l / 2 - offset]}
        center
        distanceFactor={8}
      >
        <span className="rounded bg-zinc-900/90 px-1.5 py-0.5 text-[10px] font-medium text-yellow-400 ring-1 ring-yellow-400/40">
          {fmt(h)}
        </span>
      </Html>
    </group>
  );
}
