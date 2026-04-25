import { Suspense } from 'react';
import CheckoutApp from '@/components/CheckoutApp';

// Render at request time so the per-request CSP nonce emitted by
// `src/middleware.ts` can be attached to the bootstrap inline <script> tags
// that Next.js inlines to hydrate the <Suspense> boundary around
// `useSearchParams()` in CheckoutApp. If this page is prerendered statically,
// those inline scripts are baked in without nonces and the strict CSP
// (no `'unsafe-inline'` on script-src) blocks them, leaving the page blank.
export const dynamic = 'force-dynamic';

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutApp />
    </Suspense>
  );
}
