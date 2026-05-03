import type { Metadata } from 'next';
import MercadoPagoPanelClient from './MercadoPagoPanelClient';

export const metadata: Metadata = {
  title: 'Pagos · MercadoPago | Admin Fabrick',
  description:
    'Estado de la pasarela MercadoPago, modo (producción/demo), latencia en tiempo real y KPIs de pagos.',
};

export const dynamic = 'force-dynamic';

export default function AdminPagosPage() {
  return <MercadoPagoPanelClient />;
}
