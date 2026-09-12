import type { Metadata } from 'next';
import { MetalconCalculator } from '@/components/store/MetalconCalculator';
import StructuredData from '@/components/seo/StructuredData';
import TechnicalAuthoritySection from '@/components/seo/TechnicalAuthoritySection';
import CollapsibleMeasureControls from '@/components/tools/CollapsibleMeasureControls';
import { buildTechnicalToolJsonLd, SITE_URL } from '@/lib/seo';
import a11y from '../../mobile-accessibility.module.css';

const CANONICAL = `${SITE_URL}/herramientas/metalcon`;

export const metadata: Metadata = {
  title: 'Calculadora y editor Metalcon | Soluciones Fabrick',
  description: 'Configura la edificación Metalcon, modulación de montantes, vanos, refuerzos, metros de perfil y planchas OSB sin perder el visor 3D/4D ni el simulador sísmico.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Calculadora, visor y editor Metalcon | Soluciones Fabrick',
    description: 'Conserva la edificación 3D, configura paneles y perfiles con criterios de instalación Cintac y accede al laboratorio sísmico educativo.',
    url: CANONICAL,
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Configurador Metalcon Soluciones Fabrick' }],
  },
};

export default function MetalconPage() {
  const jsonLd = buildTechnicalToolJsonLd({
    path: '/herramientas/metalcon',
    name: 'Calculadora, visor y editor Metalcon',
    description: 'Herramienta gratuita para estimar modulación, montantes, soleras, perfiles, vanos y placas de una solución Metalcon, conservando la visualización 3D/4D y acceso al simulador sísmico.',
    category: 'DesignApplication',
    keywords: ['Metalcon', 'calculadora Metalcon', 'montantes 40 60 cm', 'Steel Frame Chile', 'panel estructural'],
  });

  return (
    <>
      <StructuredData data={jsonLd} />
      <div className={a11y.metalconScope}>
        <MetalconCalculator />
        <CollapsibleMeasureControls
          targetText="Define la estructura"
          ancestorDepth={1}
          label="Medidas, perfiles y vanos"
          summary="Largo, alto, modulación 40/60 cm, OSB, perfil C, espesor, puerta y ventana"
        />
      </div>
      <TechnicalAuthoritySection
        compact
        eyebrow="Metalcon · instalación, perfiles y vida útil"
        title="Cómo se arma el sistema y cómo interpretar su durabilidad"
        answer="El visor mantiene la edificación, sus paneles y el acceso al laboratorio sísmico. Los controles se basan en una cubicación de referencia: para tabiques, Cintac indica solera superior e inferior, montantes dispuestos a 40 o 60 cm según revestimiento, fijación específica en vanos y extremos, y luego aislación y revestimientos. Una vivienda estructural requiere además proyecto, uniones, anclajes y memoria de cálculo."
        method={[
          'Primero se instalan las soleras o canales superior e inferior y se fijan al soporte correspondiente; después se incorporan los montantes.',
          'En tabiques Metalcon, Cintac indica montantes a 40 o 60 cm según el revestimiento. La herramienta conserva esas dos modulaciones en vez de permitir posiciones estructurales arbitrarias.',
          'En vanos y extremos de muro deben fijarse los montantes a las soleras. Puertas y ventanas cambian la modulación y requieren jambas, dinteles y detalles compatibles con las cargas.',
          'Para tabiques no estructurales, el manual citado muestra perfiles de 0,50 mm, largos de 2,40 y 3,00 m, altura de tabique de hasta 3,00 m y desaconseja empalmar pies derechos.',
          'Cintac publica como referencia que el sistema Metalcon puede superar 100 años de vida útil. Es una referencia del fabricante, no una garantía universal: ambiente, corrosión, agua, diseño, ejecución y mantención siguen siendo determinantes.',
        ]}
        limits={[
          'Mover un elemento en el visor no convierte la configuración en diseño estructural. Los montantes deben respetar modulación, cargas, revestimientos y detalles del proyecto.',
          'No dimensiona capacidad resistente, conexiones, anclajes, diafragmas ni fundaciones; segundo piso y estructuras mayores requieren ingeniería.',
          'No existe un número único de años aplicable a todas las casas. En madera, INN regula durabilidad mediante NCh789/1:2023 y cálculo mediante NCh1198:2024; USDA señala que una estructura de madera bien protegida de la humedad puede alcanzar o superar 100 años. Para ladrillo cocido existen referencias internacionales de más de 100 años, pero eso no sustituye diseño sísmico chileno, morteros, refuerzos ni mantención.',
        ]}
        sources={[
          {
            label: 'Cintac · Manual de Instalación Metalcon',
            href: 'https://www.cintac.cl/wp-content/uploads/2022/05/Manual-Instalacion-Metalcon.pdf',
            note: 'Secuencia de montaje, soleras, montantes a 40/60 cm, vanos, alturas y perfiles para tabiques.',
          },
          {
            label: 'Cintac · Manual de Diseño Metalcon',
            href: 'https://www.cintac.cl/wp-content/uploads/2023/08/Manual-de-Diseno-Metalcon.pdf',
            note: 'Criterios de diseño, perfiles y soluciones estructurales del sistema.',
          },
          {
            label: 'Cintac · características y durabilidad Metalcon',
            href: 'https://www.asistente.cintac.cl/las-caracteristicas-del-metalcon/',
            note: 'Referencia del fabricante que indica una vida útil potencial superior a 100 años.',
          },
          {
            label: 'INN · normas chilenas para construcción en madera',
            href: 'https://www.inn.cl/contenedor-de-noticias/calidad-y-sostenibilidad-para-edificaciones-y-construccion-en-material-madera-y-productos-derivados-de-la-madera-a-traves-de-normas-chilenas/',
            note: 'NCh1198:2024 para cálculo y NCh789/1:2023 para durabilidad de la madera.',
          },
          {
            label: 'USDA Forest Products Laboratory · durabilidad de la madera',
            href: 'https://research.fs.usda.gov/treesearch/41469',
            note: 'La humedad y el detalle constructivo gobiernan la durabilidad; construcciones de madera bien protegidas pueden durar más de un siglo.',
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
