'use client';

import { Html } from '@react-three/drei';
import { useMemo } from 'react';
import { DoubleSide, MeshStandardMaterial } from 'three';

type Props = {
  /** Línea de alero (heightM + 0.08), la misma que usa WoodRoofV2. */
  eaveY: number;
  /** Media vuelta del faldón: depthM/2 + alero (misma cota que WoodRoofV2). */
  run: number;
  /** Ancho total de la cubierta, incluidos los aleros laterales. */
  panelWidth: number;
  showLabel?: boolean;
};

/**
 * Canaleta (gutter) + bajantes (downspouts) de la casa de madera.
 *
 * - 2 canaletas semicirculares a lo largo del alero frontal (z = +run) y
 *   trasero (z = −run), Ø0,11 m, colgadas justo bajo el canto de la cubierta.
 * - 2 bajantes Ø0,075 m en esquinas opuestas (delantera derecha y trasera
 *   izquierda), desde la canaleta hasta el radier.
 * - Acabado galvanizado/lacado; un único material compartido (4 meshes →
 *   4 draw calls, sin sombras propias: la casa ya recibe sombra del entorno).
 */
export default function WoodGutterDetails({ eaveY, run, panelWidth, showLabel = true }: Props) {
  const material = useMemo<MeshStandardMaterial>(() => {
    // Galvanizado/lacado: gris claro con algo de brillo metálico.
    const m = new MeshStandardMaterial({
      color: '#9aa4a9',
      metalness: 0.72,
      roughness: 0.32,
      envMapIntensity: 0.85,
      side: DoubleSide, // la canaleta es media tubería abierta hacia arriba
    });
    return m;
  }, []);

  const gutterRadius = 0.055; // Ø0,11 m real de canaleta
  const downspoutRadius = 0.0375; // Ø0,075 m real de bajante
  const gutterY = eaveY + 0.02; // rim superior de la canaleta, pegado al canto del alero
  const gutterZ = run + 0.04;
  const endX = panelWidth / 2 - 0.1;
  const downspoutTop = eaveY;
  const downspoutBottom = 0.03;
  const downspoutH = downspoutTop - downspoutBottom;

  return (
    <group>
      {/* Canaletas: media tubería (thetaStart=π → mitad inferior) abierta hacia
          arriba, eje a lo largo de X. */}
      {[1, -1].map((side) => (
        <mesh
          key={`gutter-${side}`}
          position={[0, gutterY, side * gutterZ]}
          rotation={[0, 0, Math.PI / 2]}
          material={material}
        >
          <cylinderGeometry args={[gutterRadius, gutterRadius, panelWidth - 0.06, 14, 1, true, Math.PI, Math.PI]} />
        </mesh>
      ))}

      {/* Bajantes en esquinas opuestas: frontal derecha (+x,+z), trasera izquierda (−x,−z). */}
      {[
        [endX, gutterZ],
        [-endX, -gutterZ],
      ].map(([x, z]) => (
        <mesh key={`downspout-${x}`} position={[x, downspoutBottom + downspoutH / 2, z]} material={material}>
          <cylinderGeometry args={[downspoutRadius, downspoutRadius, downspoutH, 10]} />
        </mesh>
      ))}

      {showLabel ? (
        <Html center distanceFactor={11} position={[0, eaveY - 0.55, run + 0.3]}>
          <div className="w-max whitespace-nowrap rounded-full border border-amber-200/30 bg-black/80 px-3 py-1.5 text-center text-[8px] font-black uppercase tracking-[.12em] text-amber-100">
            Canaleta · bajante
          </div>
        </Html>
      ) : null}
    </group>
  );
}
