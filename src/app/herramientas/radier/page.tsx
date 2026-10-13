import type { Metadata } from 'next';
import { Suspense } from 'react';
import StructuredData from '@/components/seo/StructuredData';
import TechnicalAuthoritySection from '@/components/seo/TechnicalAuthoritySection';
import CollapsibleMeasureControls from '@/components/tools/CollapsibleMeasureControls';
import ImmersiveLabEntry from '@/components/tools/ImmersiveLabEntry';
import RadierStudio from '@/components/radier/RadierStudio';
import RadierComments from '@/components/radier/RadierComments';
import RadierSocial from '@/components/radier/RadierSocial';
import RadierMobileBar from '@/components/radier/RadierMobileBar';
import { buildTechnicalToolJsonLd, SITE_URL } from '@/lib/seo';
import { getCmsSettings } from '@/lib/cms';
import a11y from '../../mobile-accessibility.module.css';

const CANONICAL = `${SITE_URL}/herramientas/radier`;

export const metadata: Metadata = {
  title: 'Calculadora de radier | m², materiales y referencia de costo',
  description: 'Calcula superficie, perímetro, espesores, hormigón, capas, mallas, moldaje, estacas de 43 cm y referencias de costo para distintos alcances de radier.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Calculadora de radier | Soluciones Fabrick',
    description: 'Mide largo, ancho, forma y espesor. Revisa capas, cubicación, materiales, estacas de 43 cm y tres referencias de alcance antes de cotizar.',
    url: CANONICAL,
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Calculadora de radier Soluciones Fabrick' }],
  },
};

export default async function Page() {
  const jsonLd = buildTechnicalToolJsonLd({
    path: '/herramientas/radier',
    name: 'Calculadora de radier',
    description: 'Herramienta gratuita para cubicación de radier, capas, materiales, moldaje y referencias de costo.',
    category: 'UtilitiesApplication',
    keywords: ['calculadora radier', 'cubicación hormigón', 'materiales radier', 'precio radier Chile'],
  });

  let settings: Awaited<ReturnType<typeof getCmsSettings>> | null = null;
  try {
    settings = await getCmsSettings();
  } catch { settings = null; }
  const socialLinks = {
    facebook: settings?.social_facebook || 'https://www.facebook.com/FabrickSoluciones',
    instagram: settings?.social_instagram || 'https://www.instagram.com/solucionesfabrick/',
    tiktok: settings?.social_tiktok,
  };

  return (
    <>
      <StructuredData data={jsonLd} />
      <div className={`${a11y.radierScope} pb-24 md:pb-0`}>
        {/* Medidas, visor 4D, presupuesto, guía y puerta: una sola experiencia conectada por la URL. */}
        <div className="mx-auto w-full max-w-[880px] px-3 pt-4 sm:px-5 sm:pt-6">
          <Suspense fallback={null}>
            <RadierStudio />
          </Suspense>
        </div>

        <div className="mx-auto w-full max-w-[880px] space-y-4 px-3 pt-4 sm:space-y-5 sm:px-5">
          <CollapsibleMeasureControls
            targetText="Pon las medidas de tu radier"
            ancestorDepth={3}
            label="Medidas del radier"
            summary="Forma, largo, ancho, espesor, base compactada, gravilla, uso y terminación"
          />
          <ImmersiveLabEntry href="/herramientas/radier/lab" label="Lab Radier 4D" />
          <RadierComments />
          <RadierSocial socialLinks={socialLinks} contactEmail={settings?.email_contacto} />
        </div>
      </div>
      <TechnicalAuthoritySection
        compact
        eyebrow="Metodología de cubicación · explicación visible"
        title="Cómo se calculan el hormigón, las capas y los materiales"
        answer="La herramienta transforma las medidas del proyecto en una cubicación reproducible: primero estima área y perímetro, luego convierte cada espesor a volumen y finalmente aplica márgenes de trabajo y unidades comerciales para entregar materiales y rangos de costo."
        method={[
          'Área = largo × ancho × factor de forma. Las formas L, U, T, H e I usan factores de aproximación para una estimación rápida; una geometría irregular real debe medirse por paños.',
          'Hormigón = área × espesor en metros × 1,05. El 5% adicional por pérdida (sobreconsumo, derrame, sobre-espesor) sigue la recomendación publicada por Polpaico en su Cubicador.',
          'Base estabilizada y gravilla se calculan como área × profundidad. La barrera de humedad incorpora 10% de traslape y las estacas se estiman desde el perímetro.',
          'Los planes comerciales separan materiales, mano de obra, preparación/extras, transporte e IVA para comparar alcances antes de cotizar.',
        ]}
        limits={[
          'No reemplaza estudio de suelo, proyecto de fundaciones, cálculo estructural ni especificaciones particulares de una obra.',
          'Los factores de formas irregulares son aproximaciones: para compra final conviene medir cada paño y descontar o añadir geometrías reales.',
          'Las exigencias MINVU citadas sirven como referencia técnica para ciertos programas habitacionales y no deben interpretarse como una receta única para todo radier.',
        ]}
        sources={[
          {
            label: 'MINVU / LeyChile · requisitos técnicos de radieres',
            href: 'https://www.bcn.cl/leychile/navegar?idNorma=1095820',
            note: 'Incluye referencias de compactación, cama de ripio, hormigón y espesores en el ámbito regulado por esa resolución.',
          },
          {
            label: 'Ordenanza General de Urbanismo y Construcciones',
            href: 'https://www.bcn.cl/leychile/navegar?idNorma=8201',
            note: 'Marco general de edificación en Chile; el proyecto específico puede exigir antecedentes adicionales.',
          },
        ]}
        related={[
          { label: 'Abrir laboratorio de radier 4D', href: '/herramientas/radier/lab' },
          { label: 'Productos para radier', href: '/tienda/catalogo' },
          { label: 'Cotizar radier', href: '/presupuesto?servicio=radier' },
        ]}
      />
      <RadierMobileBar />
    </>
  );
}
