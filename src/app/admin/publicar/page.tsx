import type { Metadata } from 'next';
import PublishStudio from '@/components/admin/publicar/PublishStudio';

export const metadata: Metadata = {
  title: 'Publicar en redes · Admin Fabrick',
  robots: { index: false, follow: false },
};

export default function PublicarPage() {
  return <PublishStudio />;
}
