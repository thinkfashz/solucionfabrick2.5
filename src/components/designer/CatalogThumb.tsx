'use client';

/**
 * CatalogThumb — miniatura 3D pre-renderizada por pieza ("loguito").
 *
 * Cada tarjeta del catálogo muestra un mini `<Canvas>` 3D que renderiza la
 * misma geometría paramétrica del elemento, escalada para encajar en la
 * tarjeta. Como el thumbnail vive en su propio Canvas (fuera del Canvas
 * principal del editor), no compite por el contexto WebGL del editor.
 *
 * Para no instanciar decenas de contextos WebGL al mismo tiempo (cada
 * Canvas R3F crea uno), usamos `frameloop="demand"` para que sólo
 * rendericen cuando es estrictamente necesario.
 */

import { Canvas } from '@react-three/fiber';
import { ParametricDoor } from './parametric/ParametricDoor';
import { ParametricWindow } from './parametric/ParametricWindow';
import { Beam, Floor, Wall } from './parametric/Solids';
import type { CatalogPiece } from './catalog';

interface CatalogThumbProps {
  piece: CatalogPiece;
}

export function CatalogThumb({ piece }: CatalogThumbProps) {
  const [w, h, l] = piece.dimensiones;
  // Escalamos la pieza para que entre en una caja unidad ~ 1.4
  const max = Math.max(w, h, l);
  const k = 1.4 / max;

  const body = (() => {
    switch (piece.tipo) {
      case 'puerta':
        return (
          <ParametricDoor
            ancho={w}
            alto={h}
            profundidad={l}
            material={piece.propiedadesMaterial}
            conCristal={piece.catalogId === 'puerta-vidriada'}
          />
        );
      case 'ventana':
        return (
          <ParametricWindow
            ancho={w}
            alto={h}
            profundidad={l}
            material={piece.propiedadesMaterial}
          />
        );
      case 'piso':
        return <Floor ancho={w} alto={h} largo={l} material={piece.propiedadesMaterial} />;
      case 'viga':
        return <Beam ancho={w} alto={h} largo={l} material={piece.propiedadesMaterial} />;
      case 'muro':
      default:
        return <Wall ancho={w} alto={h} largo={l} material={piece.propiedadesMaterial} />;
    }
  })();

  return (
    <Canvas
      frameloop="demand"
      camera={{ position: [2.2, 1.8, 2.6], fov: 35 }}
      dpr={[1, 1.5]}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 2]} intensity={0.8} />
      <directionalLight position={[-2, 1, -2]} intensity={0.25} />
      <group scale={[k, k, k]} position={[0, -0.3, 0]}>
        {body}
      </group>
    </Canvas>
  );
}
