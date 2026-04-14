'use client';

import { Suspense } from 'react';
import CheckoutApp from '@/components/CheckoutApp';

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutApp />
    </Suspense>
  );
}
