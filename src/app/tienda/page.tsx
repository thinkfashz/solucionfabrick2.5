import type { Metadata } from 'next';
import TiendaClientPage from '@/tienda/page';
import HomeDynamicSections from '@/components/HomeDynamicSections';
import { getPublicTiendaSections } from '@/lib/cms';

const STORE_URL = 'https://www.solucionesfabrick.com/tienda';
const STORE_TITLE = 'Tienda Soluciones Fabrick | Productos, servicios e instalación';
const STORE_DESCRIPTION =
  'Explora productos, materiales y servicios seleccionados por Soluciones Fabrick. Compra directo, pide asesoría, cotiza instalación y comparte fichas con precio, disponibilidad e imagen.';
const STORE_OG_IMAGE = 'https://res.cloudinary.com/disghf6xc/image/upload/f_auto,q_auto,c_fill,g_auto,w_1200,h_630/v1781844764/Contemporary_design_advertisement._A_close-up_202606030147_oeelof.jpg';

// Match root layout: per-request render so admin-edited sections show up
// immediately after a save (revalidatePath('/tienda') triggers re-render).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: STORE_TITLE,
  description: STORE_DESCRIPTION,
  keywords: [
    'Soluciones Fabrick',
    'tienda construcción Chile',
    'materiales de construcción',
    'productos para obra',
    'instalación profesional',
    'cotizar instalación',
    'Linares',
    'Maule',
  ],
  alternates: { canonical: STORE_URL },
  openGraph: {
    type: 'website',
    url: STORE_URL,
    siteName: 'Soluciones Fabrick',
    locale: 'es_CL',
    title: STORE_TITLE,
    description: STORE_DESCRIPTION,
    images: [
      {
        url: STORE_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Tienda Soluciones Fabrick: productos, servicios e instalación',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: STORE_TITLE,
    description: STORE_DESCRIPTION,
    images: [STORE_OG_IMAGE],
  },
};

export default async function TiendaPage() {
  const sections = await getPublicTiendaSections();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: 'Soluciones Fabrick',
    url: STORE_URL,
    image: STORE_OG_IMAGE,
    description: STORE_DESCRIPTION,
    areaServed: ['Chile', 'Región del Maule', 'Linares', 'Santiago'],
    makesOffer: ['Productos para obra', 'Materiales', 'Servicios de instalación', 'Asesoría técnica'],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {sections.length > 0 && <HomeDynamicSections sections={sections} />}
      <TiendaClientPage />
    </>
  );
}
