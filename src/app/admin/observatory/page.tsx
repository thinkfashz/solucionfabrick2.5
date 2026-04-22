'use client';

import dynamic from 'next/dynamic';
import ObservatoryHUD from './ObservatoryHUD';
import { useObservatoryData } from './useObservatoryData';

const ObservatoryScene = dynamic(() => import('./ObservatoryScene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#060a12]">
      <div
        style={{
          color: '#4f8ef7',
          fontSize: 11,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        }}
        className="animate-pulse"
      >
        Inicializando ciudad digital…
      </div>
    </div>
  ),
});

export default function ObservatoryPage() {
  const data = useObservatoryData();

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#060a12]">
      {/* Vista 3D solo en desktop */}
      <div className="hidden md:block absolute inset-0">
        <ObservatoryScene data={data} />
      </div>

      {/* Fallback móvil */}
      <div className="md:hidden flex h-full items-center justify-center flex-col gap-4 p-8">
        <p className="text-yellow-400 text-sm font-bold uppercase tracking-widest">
          Vista 3D disponible en escritorio
        </p>
        <p className="text-zinc-500 text-xs text-center">
          Abre el Observatory desde un monitor o laptop para ver la ciudad
          interactiva.
        </p>
      </div>

      {/* HUD superpuesto en todos los dispositivos */}
      <ObservatoryHUD data={data} />
    </div>
  );
}
