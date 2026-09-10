import type { Metadata } from 'next';
import SeismicSimulator from '@/components/simulador-sismico/SeismicSimulator';

export const metadata: Metadata = {
  title: 'Simulador sísmico 3D | Soluciones Fabrick',
  description: 'Simulación educativa 3D de movimiento telúrico y daño potencial relativo en una vivienda.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/herramientas/simulador-sismico' },
};

export default function Page() {
  return (
    <div className="sismo-page">
      <style>{`
        .sismo-page [class*="min-h-[620px]"] {
          height: clamp(520px, 72svh, 760px);
          min-height: 520px;
        }
        .sismo-page [class*="min-h-[620px]"] > div,
        .sismo-page [class*="min-h-[620px]"] canvas {
          width: 100% !important;
          height: 100% !important;
          min-height: 100% !important;
        }
        @media (max-width: 640px) {
          .sismo-page [class*="min-h-[620px]"] {
            height: 62svh;
            min-height: 500px;
          }
        }
      `}</style>
      <SeismicSimulator />
    </div>
  );
}
