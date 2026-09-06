import type { Metadata } from 'next';
import { Suspense } from 'react';
import CheckoutAppV2 from '@/components/checkout/CheckoutAppV2';
import CheckoutAirModelSync from '@/components/checkout/CheckoutAirModelSync';

export const dynamic = 'force-dynamic';

const checkoutTitle = 'Checkout seguro | Soluciones Fabrick';
const checkoutDescription = 'Finaliza tu compra en Soluciones Fabrick con validación de stock, despacho y pago seguro mediante Mercado Pago.';
const checkoutUrl = 'https://www.solucionesfabrick.com/checkout';

export const metadata: Metadata = {
  title: { absolute: checkoutTitle },
  description: checkoutDescription,
  keywords: null,
  alternates: { canonical: checkoutUrl },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  openGraph: {
    title: checkoutTitle,
    description: checkoutDescription,
    url: checkoutUrl,
    siteName: 'Soluciones Fabrick',
    locale: 'es_CL',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: checkoutTitle,
    description: checkoutDescription,
  },
};

export default function CheckoutPage() {
  return (
    <>
      <style>{`
        .checkout-hydration-boundary > main > div[class*="min-h-[60vh]"] {
          visibility: hidden;
        }
      `}</style>
      <div className="checkout-hydration-boundary">
        <CheckoutAirModelSync />
        <Suspense fallback={null}><CheckoutAppV2 /></Suspense>
      </div>
    </>
  );
}
