import type { Metadata } from 'next';
import MercadoPagoPanelClient from './MercadoPagoPanelClient';

export const metadata: Metadata = {
  title: 'Mercado Pago protegido | Admin Fabrick',
  description: 'Panel de solo lectura conectado a Mercado Pago para pagos aprobados, pendientes, fallidos, transferencias y montos recibidos.',
};

export const dynamic = 'force-dynamic';

export default function AdminPagosPage() {
  return <MercadoPagoPanelClient />;
}
