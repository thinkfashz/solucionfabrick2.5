import type { Metadata } from 'next';
import EnviarClient from './EnviarClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Solicitar Cotización',
  description:
    'Envía tu cotización personalizada de servicios y materiales al equipo de Soluciones Fabrick. Respuesta en menos de 24 horas.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/cotizaciones/enviar' },
};

export default function EnviarPage() {
  return <EnviarClient />;
}
