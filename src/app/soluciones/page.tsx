import type { Metadata } from 'next';
import { SolucionesGuidePage } from '@/components/soluciones/SolucionesGuidePage';

export const metadata: Metadata = {
  title: 'Guía de soluciones de construcción | Soluciones Fabrick',
  description:
    'Explora una guía visual de trabajos de construcción, instalaciones, terminaciones y exterior. Entiende cómo se mide cada solución, qué suele incluir y pasa directo a la calculadora de presupuesto.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/soluciones' },
  openGraph: {
    title: 'Guía de soluciones | Soluciones Fabrick',
    description:
      'Una guía premium para entender cada trabajo antes de presupuestarlo: alcance, medición, referencias visuales y rangos orientativos.',
    url: 'https://www.solucionesfabrick.com/soluciones',
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Guía de soluciones Soluciones Fabrick' }],
  },
};

export default function SolucionesPage() {
  return <SolucionesGuidePage />;
}
