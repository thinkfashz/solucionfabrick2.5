import type { Metadata } from 'next';
import EvolucionClient from './EvolucionClient';

export const metadata: Metadata = {
  title: 'Evolución | Fabrick',
  description:
    'El camino técnico de Soluciones Fabrick: de ayudante general a ecosistema integral. Cada etapa con su historia, sus aprendizajes y el sello de aprobación que la cerró.',
};

export default function EvolucionPage() {
  return <EvolucionClient />;
}

