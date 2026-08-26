import { Suspense } from 'react';
import CheckoutAppV2 from '@/components/checkout/CheckoutAppV2';

export const dynamic = 'force-dynamic';

export default function CheckoutPage() {
  return <Suspense fallback={null}><CheckoutAppV2 /></Suspense>;
}
