import type { Metadata } from 'next';
import MercadoPagoPanelClient from './MercadoPagoPanelClient';

export const metadata: Metadata = {
  title: 'Centro de pagos | Admin Fabrick',
  description: 'Panel nativo de pagos, transferencias, aprobados, pendientes, fallidos y novedades financieras.',
};

export const dynamic = 'force-dynamic';

export default function AdminPagosPage() {
  return <MercadoPagoPanelClient />;
}
