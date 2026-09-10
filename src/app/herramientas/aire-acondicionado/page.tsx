import type { Metadata } from 'next';
import AirSimulatorFunnelV9 from '@/components/store/AirSimulatorFunnelV9';
import StructuredData from '@/components/seo/StructuredData';
import TechnicalAuthoritySection from '@/components/seo/TechnicalAuthoritySection';
import { preloadAirCatalogProducts } from '@/lib/airCatalogServer';
import { buildTechnicalToolJsonLd, SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CANONICAL = `${SITE_URL}/herramientas/aire-acondicionado`;

export const metadata: Metadata = {
  title: { absolute: 'Calculadora BTU y simulador de aire acondicionado | Soluciones Fabrick' },
  description: 'Calcula la capacidad BTU por tipo de ambiente, simula temperatura, consumo y costo eléctrico, y compara equipos disponibles con stock sincronizado.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Calculadora BTU, consumo y recomendador de aire acondicionado | Soluciones Fabrick',
    description: 'Simula tu habitación, living, oficina o cocina, calcula BTU y consumo estimado, y elige equipos compatibles del catálogo.',
    url: CANONICAL,
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Calculadora BTU Soluciones Fabrick' }],
  },
};

export default async function Page() {
  const initialProducts = await preloadAirCatalogProducts();
  const jsonLd = buildTechnicalToolJsonLd({
    path: '/herramientas/aire-acondicionado',
    name: 'Calculadora BTU y simulador de aire acondicionado',
    description: 'Herramienta gratuita para estimar capacidad BTU, consumo y equipos compatibles según las condiciones del espacio.',
    category: 'UtilitiesApplication',
    keywords: ['calculadora BTU', 'aire acondicionado Chile', 'consumo aire acondicionado', 'capacidad climatización'],
  });

  return (
    <>
      <StructuredData data={jsonLd} />
      <AirSimulatorFunnelV9 initialProducts={initialProducts} />
      <TechnicalAuthoritySection
        eyebrow="Metodología BTU · explicación visible"
        title="Cómo calcula Fabrick la capacidad de aire acondicionado"
        answer="El resultado es una recomendación comercial conservadora para vivienda u oficina en Chile. No usa solo los metros cuadrados: combina superficie, altura, personas, ventanas, tipo de ambiente, asoleamiento, aislación y zona climática antes de elegir la capacidad inmediatamente superior disponible."
        method={[
          'Calcula área y volumen. La base parte de 600 BTU/h por m² a 2,5 m de altura y corrige la altura dentro de un rango controlado.',
          'Añade carga por ocupantes sobre dos personas, superficie de ventanas y carga interna del uso: dormitorio, living, oficina o cocina.',
          'Aplica factores por exposición solar, nivel de aislación y zona climática; después redondea la demanda y evita recomendar capacidad inferior.',
          'Si la demanda supera 24.000 BTU, la herramienta pasa a una solución de múltiples unidades en vez de forzar un solo equipo insuficiente.',
        ]}
        limits={[
          'No reemplaza un cálculo de carga térmica HVAC realizado por un profesional.',
          'La tarifa eléctrica y el consumo mensual son estimaciones: dependen del equipo real, uso, clima, eficiencia, mantención y precio vigente de energía.',
          'La SEC regula certificación y eficiencia de equipos; la heurística de dimensionamiento mostrada es una metodología comercial propia de Fabrick, no una fórmula oficial de la SEC.',
        ]}
        sources={[
          {
            label: 'SEC · Protocolo de eficiencia para acondicionadores de aire',
            href: 'https://wlhttp.sec.cl/PublicacionProductos/adjunto?ac=verDocProt&id=462',
            note: 'Referencia regulatoria para certificación y eficiencia de equipos de aire acondicionado.',
          },
          {
            label: 'Centro técnico Fabrick',
            href: `${SITE_URL}/centro-tecnico`,
            note: 'Metodología, variables, límites y relación con productos y presupuesto.',
          },
        ]}
        related={[
          { label: 'Ver productos de climatización', href: '/tienda/catalogo' },
          { label: 'Pasar a presupuesto', href: '/presupuesto?servicio=aire-acondicionado' },
        ]}
      />
    </>
  );
}
