'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import ObservatoryHUD from './ObservatoryHUD';
import MobileObservatory from './MobileObservatory';
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

      {/* Fallback móvil: dashboard completo */}
      <div className="md:hidden absolute inset-0">
        <MobileObservatory data={data} logs={logs} />
      </div>

      {/* HUD superpuesto solo en escritorio (el móvil tiene su propio dashboard) */}
      <div className="hidden md:block absolute inset-0 pointer-events-none">
        <ObservatoryHUD
          data={data}
          logs={logs}
          vehicleCount={vehicleCount}
        />
      </div>
    </div>
  );
}
