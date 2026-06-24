import type { Metadata } from 'next';
import MercadoPagoLabClient from './MercadoPagoLabClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'MercadoPago Lab | Admin Fabrick',
  description: 'Laboratorio aislado para probar credenciales demo, Checkout Pro y webhooks de Mercado Pago sin tocar la pasarela real.',
};

export default function MercadoPagoLabPage() {
  return <MercadoPagoLabClient />;
}
