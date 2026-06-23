'use client';

import ThreeAirRoomViewer from '@/components/presupuestos/ThreeAirRoomViewer';
import ThreeRadierViewer from '@/components/presupuestos/ThreeRadierViewer';

type SceneKind = 'radier' | 'aire' | 'default';

type BudgetScene360Props = {
  kind?: SceneKind;
  title?: string;
  subtitle?: string;
  data?: Record<string, unknown>;
  compact?: boolean;
};

function readNumber(data: Record<string, unknown> | undefined, key: string, fallback = 0) {
  const value = data?.[key];
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readString(data: Record<string, unknown> | undefined, key: string, fallback = '') {
  const value = data?.[key];
  return typeof value === 'string' ? value : fallback;
}

export default function BudgetScene360({ kind = 'default', title, data, compact = false }: BudgetScene360Props) {
  if (kind === 'radier') {
    return <ThreeRadierViewer
      title={title || 'Radier 3D interactivo'}
      compact={compact}
      shape={readString(data, 'shape', readString(data, 'forma', 'rect'))}
      largo={readNumber(data, 'largo', 6)}
      ancho={readNumber(data, 'ancho', 4)}
      brazoX={readNumber(data, 'brazoX', 3)}
      brazoY={readNumber(data, 'brazoY', 2)}
      vanoW={readNumber(data, 'vanoW', 2)}
      vanoD={readNumber(data, 'vanoD', 2)}
      almaW={readNumber(data, 'almaW', 1.4)}
      almaD={readNumber(data, 'almaD', 2.2)}
      espesor={readNumber(data, 'espesor', readNumber(data, 'espesorCm', 10))}
      base={readNumber(data, 'base', readNumber(data, 'estabilizadoCm', 10))}
      gravillaBase={readNumber(data, 'gravillaBase', readNumber(data, 'gravillaCm', 5))}
      area={readNumber(data, 'area', 24)}
      hormigon={readNumber(data, 'hormigon', 2.4)}
      sacos={readNumber(data, 'sacos', 17)}
    />;
  }

  if (kind === 'aire') {
    return <ThreeAirRoomViewer
      title={title || 'Habitación 360 + aire acondicionado'}
      compact={compact}
      area={readNumber(data, 'area', 14.7)}
      btu={readNumber(data, 'btu', 12895)}
      seleccionado={readNumber(data, 'seleccionado', 13000)}
      largo={readNumber(data, 'largo', 4.2)}
      ancho={readNumber(data, 'ancho', 3.5)}
      alto={readNumber(data, 'alto', 2.5)}
    />;
  }

  return <section className="overflow-hidden rounded-[2rem] border border-amber-300/20 bg-[#050505] p-6 text-white shadow-2xl"><p className="text-[10px] font-black uppercase tracking-[.32em] text-amber-300">Visor 3D</p><h2 className="mt-2 text-3xl font-black">{title || 'Escena técnica'}</h2><p className="mt-2 text-sm text-zinc-400">Selecciona un motor para cargar una escena interactiva.</p></section>;
}
