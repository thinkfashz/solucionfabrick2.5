import type { Metadata } from 'next';
import { MetalconCalculator } from '@/components/store/MetalconCalculator';
import StructuredData from '@/components/seo/StructuredData';
import TechnicalAuthoritySection from '@/components/seo/TechnicalAuthoritySection';
import { buildTechnicalToolJsonLd, SITE_URL } from '@/lib/seo';
import a11y from '../../mobile-accessibility.module.css';

const CANONICAL = `${SITE_URL}/herramientas/metalcon`;

export const metadata: Metadata = {
  title: 'Calculadora y editor Metalcon | Soluciones Fabrick',
  description: 'Edita paneles Metalcon, modulación de montantes, vanos, refuerzos, metros de perfil, piezas y planchas OSB antes de cotizar o abrir el simulador sísmico.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Calculadora y editor Metalcon | Soluciones Fabrick',
    description: 'Arma un panel, mueve vanos, revisa montantes, soleras, perfiles C/U, piezas y placas; después llévalo al laboratorio sísmico educativo.',
    url: CANONICAL,
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Editor Metalcon Soluciones Fabrick' }],
  },
};

export default function MetalconPage() {
  const jsonLd = buildTechnicalToolJsonLd({
    path: '/herramientas/metalcon',
    name: 'Calculadora y editor Metalcon',
    description: 'Herramienta gratuita para estimar modulación, montantes, soleras, perfiles, vanos y placas de un panel Metalcon.',
    category: 'DesignApplication',
    keywords: ['Metalcon', 'calculadora Metalcon', 'montantes 40 60 cm', 'Steel Frame Chile', 'panel estructural'],
  });

  return (
    <>
      <StructuredData data={jsonLd} />
      <div className={a11y.metalconScope}>
        <MetalconCalculator />
      </div>
      <TechnicalAuthoritySection
        compact
        eyebrow="Configuración Metalcon · explicación visible"
        title="Qué calcula el panel y cuándo deja de ser una simple cubicación"
        answer="El editor sirve para visualizar y estimar materiales de un panel: modulación, montantes, soleras, vanos, refuerzos, metros de perfil, piezas comerciales y placas. La herramienta diferencia tabiques de presets estructurales y muestra advertencias cuando la escala exige proyecto y memoria de cálculo."
        method={[
          'Los montantes base se obtienen desde el largo del panel y una modulación máxima seleccionada de 40 o 60 cm.',
          'Puertas y ventanas agregan refuerzos de referencia; su superficie se descuenta al estimar placas OSB y se valida que no salgan del panel ni se superpongan.',
          'Los metros de perfil suman montantes, refuerzos y piezas asociadas a vanos; las soleras se estiman sobre el largo superior e inferior.',
          'Los perfiles y pesos mostrados se contrastan con familias comerciales del Manual de Diseño Metalcon de Cintac; el dimensionamiento resistente sigue dependiendo del proyecto.',
        ]}
        limits={[
          'No dimensiona capacidad resistente, conexiones, anclajes, diafragmas ni fundaciones.',
          'Un vano mayor, segundo piso o estructura mayor requiere revisión específica; la geometría 3D no certifica cumplimiento.',
          'Los largos equivalentes de 6 m sirven para compra preliminar: el despiece final debe optimizar cortes, desperdicio y largos efectivamente disponibles.',
        ]}
        sources={[
          {
            label: 'Cintac · Manual de Diseño Metalcon',
            href: 'https://www.cintac.cl/wp-content/uploads/2020/09/Manual-de-Disen%CC%83o-Metalcon-2020.pdf',
            note: 'Series de perfiles, dimensiones, espesores, pesos, largos y criterios de diseño del sistema Metalcon.',
          },
          {
            label: 'Cintac · Manual de Construcción Metalcon',
            href: 'https://www.cintac.cl/wp-content/uploads/2015/01/Manual-Metalcon-OK.pdf',
            note: 'Detalles constructivos y componentes para ejecución en obra.',
          },
        ]}
        related={[
          { label: 'Abrir simulador sísmico 4D', href: '/herramientas/metalcon/monitoreo' },
          { label: 'Cotizar Metalcon', href: '/presupuesto?servicio=metalcon' },
        ]}
      />
    </>
  );
}
