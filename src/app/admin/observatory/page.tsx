'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import ObservatoryHUD from './ObservatoryHUD';
import { useObservatoryData } from './useObservatoryData';

const ObservatoryScene = dynamic(() => import('./ObservatoryScene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#010103]">
      <div
        style={{
          color: '#facc15',
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
  const [logs, setLogs] = useState<Array<{ msg: string; color: string }>>([]);
  const [vehicleCount, setVehicleCount] = useState(6);

  const handleLog = useCallback((msg: string, color: string) => {
    setLogs((prev) => [{ msg, color }, ...prev].slice(0, 30));
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#010103]">
      {/* Vista 3D solo en desktop */}
      <div className="hidden md:block absolute inset-0">
        <ObservatoryScene
          data={data}
          onLog={handleLog}
          onVehicleCount={setVehicleCount}
        />
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
      <ObservatoryHUD
        data={data}
        logs={logs}
        vehicleCount={vehicleCount}
      />
    </div>
  );
}
