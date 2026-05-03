'use client';

/**
 * SceneElements — renderiza todos los elementos del store dentro del
 * `<Canvas>` (sea 2D u 3D). Cada elemento recibe `position`, `rotation` y
 * un componente paramétrico según su `tipo`.
 *
 * Click sobre un elemento ⇒ `setSelected`. Al estar seleccionado se le
 * dibuja un wireframe dorado por encima.
 */

import { useDesignStore, type ElementoDiseno } from '@/store/useDesignStore';
import { ParametricDoor } from './parametric/ParametricDoor';
import { ParametricWindow } from './parametric/ParametricWindow';
import { Beam, Floor, Wall } from './parametric/Solids';
import type { ThreeEvent } from '@react-three/fiber';

function ElementBody({ el }: { el: ElementoDiseno }) {
  const [ancho, alto, largo] = el.dimensiones;
  switch (el.tipo) {
    case 'puerta':
      return (
        <ParametricDoor
          ancho={ancho}
          alto={alto}
          profundidad={largo}
          material={el.propiedadesMaterial}
        />
      );
    case 'ventana':
      return (
        <ParametricWindow
          ancho={ancho}
          alto={alto}
          profundidad={largo}
          material={el.propiedadesMaterial}
        />
      );
    case 'piso':
      return <Floor ancho={ancho} alto={alto} largo={largo} material={el.propiedadesMaterial} />;
    case 'viga':
      return <Beam ancho={ancho} alto={alto} largo={largo} material={el.propiedadesMaterial} />;
    case 'muro':
    default:
      return <Wall ancho={ancho} alto={alto} largo={largo} material={el.propiedadesMaterial} />;
  }
}

export function SceneElements() {
  const elementos = useDesignStore((s) => s.elementos);
  const selectedId = useDesignStore((s) => s.selectedId);
  const setSelected = useDesignStore((s) => s.setSelected);

  return (
    <>
      {elementos.map((el) => {
        const onPick = (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          setSelected(el.id);
        };
        const isSelected = el.id === selectedId;
        // Para puertas/ventanas, el componente ya se centra alrededor de su
        // origen local. Para muros/pisos/vigas, los componentes ya empujan
        // su geometría hacia y=alto/2 para que apoyen en el suelo cuando
        // posicion[1] = 0. Por tanto, podemos usar `el.posicion` tal cual.
        return (
          <group
            key={el.id}
            position={el.posicion}
            rotation={[0, el.rotacionY, 0]}
            onClick={onPick}
            onPointerDown={onPick}
          >
            <ElementBody el={el} />
            {isSelected && (
              <mesh position={[0, el.dimensiones[1] / 2, 0]} renderOrder={999}>
                <boxGeometry args={el.dimensiones} />
                <meshBasicMaterial
                  color="#facc15"
                  wireframe
                  transparent
                  opacity={0.85}
                  depthTest={false}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}
