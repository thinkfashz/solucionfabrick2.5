import type { Metadata } from 'next';
import StructuredData from '@/components/seo/StructuredData';
import TechnicalAuthoritySection from '@/components/seo/TechnicalAuthoritySection';
import StructuralMonitoringGameShell from '@/components/store/StructuralMonitoringGameShell';
import { buildTechnicalToolJsonLd, SITE_URL } from '@/lib/seo';

const CANONICAL = `${SITE_URL}/herramientas/metalcon/monitoreo`;

export const metadata: Metadata = {
  title: 'Simulador sísmico 4D Metalcon | Soluciones Fabrick',
  description: 'Explora una estructura Metalcon en un visor sísmico 4D inmersivo, ajusta magnitud, profundidad, distancia, suelo y dirección, y revisa analíticas y zonas a inspeccionar. Herramienta educativa, no cálculo estructural.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Simulador sísmico 4D Metalcon | Soluciones Fabrick',
    description: 'Recorre la estructura, inicia un escenario sísmico y revisa demanda visual, paneles más exigidos y acciones de inspección sin confundir el resultado con ingeniería sísmica.',
    url: CANONICAL,
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Simulador sísmico 4D Metalcon Soluciones Fabrick' }],
  },
};

export default function MonitoringPage() {
  const jsonLd = buildTechnicalToolJsonLd({
    path: '/herramientas/metalcon/monitoreo',
    name: 'Simulador sísmico 4D Metalcon',
    description: 'Simulador educativo e inmersivo para comparar magnitud, intensidad estimada, profundidad, suelo, dirección y demanda relativa por panel.',
    category: 'EducationalApplication',
    keywords: ['simulador terremoto', 'Metalcon sismo', 'intensidad Mercalli', 'magnitud sísmica', 'respuesta estructural educativa'],
  });

  return (
    <>
      <StructuredData data={jsonLd} />
      <StructuralMonitoringGameShell />
      <TechnicalAuthoritySection
        eyebrow="Simulación sísmica · metodología y límites"
        title="Qué representa el terremoto 4D y qué no representa"
        answer="El laboratorio convierte variables sísmicas y geométricas en índices visuales para comparar escenarios. Magnitud, intensidad estimada, profundidad, distancia, suelo, duración y dirección modifican una demanda relativa; después cada panel recibe un factor por orientación, vanos y arriostramiento para priorizar dónde mirar."
        method={[
          'La intensidad MMI se estima desde magnitud, distancia hipocentral, profundidad y suelo mediante una heurística visual de Fabrick.',
          'La demanda combina intensidad, magnitud, cercanía, poca profundidad, duración y amplificación del suelo; de ella salen proxies de PGA y deriva.',
          'Cada muro recibe un factor por orientación respecto de la excitación, proporción de vanos y presencia de arriostramiento; los paneles se ordenan por demanda relativa.',
          'La animación representa propagación, llegada a superficie y respuesta de la malla para explicar el fenómeno; no calcula tiempos de viaje geofísicos reales.',
        ]}
        limits={[
          'No es un análisis modal, espectral, pushover ni no lineal; no entrega capacidad resistente real.',
          'PGA proxy, deriva proxy, daño, soporte y reparación son índices educativos/comerciales, no resultados de una memoria de cálculo.',
          'No debe usarse para decidir habitabilidad después de un sismo ni para declarar una estructura segura.',
        ]}
        sources={[
          {
            label: 'Centro Sismológico Nacional · glosario',
            href: 'https://www.csn.uchile.cl/sismologia/glosario/',
            note: 'Define magnitud, intensidad, distancia epicentral y factores que influyen en los efectos observados de un sismo.',
          },
          {
            label: 'MINVU · D.S. 61 diseño sísmico de edificios',
            href: 'https://www.minvu.gob.cl/wp-content/uploads/2019/05/DECRETO-61-2011-DISEN%CC%83O-SISMICO-DE-EDIFICIOS.pdf',
            note: 'Marco reglamentario chileno para diseño sísmico de edificios junto con NCh433 en lo que corresponda.',
          },
          {
            label: 'Cintac · Manual de Diseño Metalcon',
            href: 'https://www.cintac.cl/wp-content/uploads/2020/09/Manual-de-Disen%CC%83o-Metalcon-2020-LW.pdf',
            note: 'Referencia técnica sobre perfiles, paneles y componentes del sistema; no valida la heurística sísmica de Fabrick.',
          },
        ]}
        related={[
          { label: 'Configurar panel Metalcon', href: '/herramientas/metalcon' },
          { label: 'Pasar a presupuesto', href: '/presupuesto?servicio=metalcon' },
        ]}
      />
    </>
  );
}
