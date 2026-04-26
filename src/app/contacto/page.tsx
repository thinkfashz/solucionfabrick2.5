import type { Metadata } from 'next';
import ContactoClient from './ContactoClient';

// `ContactoClient` wraps a `<Suspense>` boundary around `useSearchParams()`.
// Routes that ship inline <script> tags (Next.js bakes streaming RSC chunks
// when Suspense is present) must render per-request so the CSP nonce from
// `middleware.ts` matches; otherwise the inline scripts are blocked and the
// page is delivered blank.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contacto | Fabrick',
  description: 'Contáctanos para cotizar tu proyecto de remodelación, construcción o instalaciones. Respondemos en menos de 24 horas hábiles.',
};

export default function ContactoPage() {
  return <ContactoClient />;
}
