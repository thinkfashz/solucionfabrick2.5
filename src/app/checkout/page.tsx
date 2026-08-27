import type { Metadata } from 'next';
import { Suspense } from 'react';
import CheckoutAppV2 from '@/components/checkout/CheckoutAppV2';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'Checkout seguro | Soluciones Fabrick' },
  description: 'Finaliza tu compra en Soluciones Fabrick con validación de stock, despacho y pago seguro mediante Mercado Pago.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function CheckoutPage() {
  return <Suspense fallback={null}><CheckoutAppV2 /></Suspense>;
}
