'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import ObservatoryHUD from './ObservatoryHUD';
import MobileObservatory from './MobileObservatory';
import { useObservatoryData, type ServiceId } from './useObservatoryData';

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
  const [logs, setLogs] = useState<Array<{ msg: string; color: string; service?: ServiceId }>>([]);
  const [vehicleCount, setVehicleCount] = useState(6);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedService, setSelectedService] = useState<ServiceId | null>(null);
  const [logFilter, setLogFilter] = useState<ServiceId | 'all'>('all');

  const handleLog = useCallback((msg: string, color: string, service?: ServiceId) => {
    setLogs((prev) => [{ msg, color, service }, ...prev].slice(0, 60));
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#010103]">
      {/* Vista 3D solo en desktop */}
      <div className="hidden md:block absolute inset-0">
        <ObservatoryScene
          data={data}
          onLog={handleLog}
          onVehicleCount={setVehicleCount}
          paused={paused}
          speed={speed}
          selectedService={selectedService}
          onSelectService={setSelectedService}
        />
      </div>

      {/* Fallback móvil: dashboard completo */}
      <div className="md:hidden absolute inset-0">
        <MobileObservatory data={data} />
      </div>

      {/* HUD superpuesto solo en escritorio */}
      <div className="hidden md:block absolute inset-0 pointer-events-none">
        <ObservatoryHUD
          data={data}
          logs={logs}
          vehicleCount={vehicleCount}
          paused={paused}
          onPausedChange={setPaused}
          speed={speed}
          onSpeedChange={setSpeed}
          selectedService={selectedService}
          onSelectService={setSelectedService}
          logFilter={logFilter}
          onLogFilterChange={setLogFilter}
        />
      </div>
    </div>
  );
}
