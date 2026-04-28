import type { Metadata } from 'next';
import HouseDesigner from './HouseDesigner';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Diseñador 3D de Casa',
  description:
    'Arma el plano de tu casa en 3D, sube paneles hasta 6 metros y cotiza tu diseño. Experiencia interactiva 4D, controles táctiles para móvil.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/juego' },
};

export default function JuegoPage() {
  return <HouseDesigner />;
}
