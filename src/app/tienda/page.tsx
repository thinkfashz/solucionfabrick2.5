import type { Metadata } from 'next';
import TiendaClientPage from '@/tienda/page';
import HomeDynamicSections from '@/components/HomeDynamicSections';
import { getPublicTiendaSections } from '@/lib/cms';

// Match root layout: per-request render so admin-edited sections show up
// immediately after a save (revalidatePath('/tienda') triggers re-render).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tienda para construir, renovar y equipar tu hogar',
  description:
    'Encuentra productos seleccionados para resolver iluminación, climatización, baño, cocina y terminaciones. Compra con información clara, despacho coordinado e instalación opcional.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/tienda' },
  openGraph: {
    title: 'Tienda Soluciones Fabrick | Todo para mejorar tu espacio',
    description: 'Productos útiles, precios claros y soporte humano para comprar, despachar e instalar.',
    url: 'https://www.solucionesfabrick.com/tienda',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Tienda Soluciones Fabrick' }],
  },
};

export default async function TiendaPage() {
  const sections = await getPublicTiendaSections();
  return (
    <>
      {sections.length > 0 && <HomeDynamicSections sections={sections} />}
      <TiendaClientPage />
    </>
  );
}
