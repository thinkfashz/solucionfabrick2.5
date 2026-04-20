import type { Metadata } from 'next';
import { Home } from 'lucide-react';
import ServicePage, { type ServicePageContent } from '@/components/ServicePage';

const content: ServicePageContent = {
  slug: 'metalcon',
  eyebrow: 'Metalcon',
  heroTitle: 'Estructuras Metalcon en el Maule',
  heroDescription:
    'Montaje de estructuras Metalcon para viviendas, ampliaciones y segundos pisos en Linares, Longaví, Talca y toda la Región del Maule. Perfiles galvanizados certificados, montaje técnico y garantía estructural de 5 años.',
  icon: Home,
  serviceType: 'Estructuras Metalcon residenciales',
  priceFrom: '$1.200.000',
  overview:
    'El sistema Metalcon es la solución estructural más eficiente para obra liviana residencial en Chile: sismoresistente, rápido de montar y compatible con cualquier terminación. Nuestro equipo entrega plano estructural incluido, supervisión en terreno y garantía real escrita sobre la estructura.',
  scope: [
    'Cálculo estructural y plano ejecutado por profesional competente',
    'Perfiles Metalcon galvanizados de primera calidad (espesores según cálculo)',
    'Fijaciones mecánicas y anclajes sismoresistentes según NCh 2369',
    'Muros perimetrales, tabiques interiores, entrepisos y cerchas de techumbre',
    'Aislación térmica (lana de vidrio o roca) y barrera de humedad incluidas',
    'Garantía estructural escrita de 5 años',
  ],
  process: [
    { step: 'Visita técnica', detail: 'Medición en terreno, levantamiento del sitio y análisis de la base existente en 48 h.' },
    { step: 'Cálculo y plano', detail: 'Entregamos plano estructural timbrado, cronograma con hitos semanales y propuesta cerrada.' },
    { step: 'Montaje supervisado', detail: 'Ejecución con equipo propio, inspección diaria y recepción final con checklist firmado.' },
  ],
  faqs: [
    {
      question: '¿Cuánto demora el montaje de una vivienda Metalcon?',
      answer:
        'Una vivienda nueva de 60–90 m² toma entre 6 y 10 semanas desde el inicio de obra gruesa, dependiendo de terminaciones. Ampliaciones y segundos pisos, 3 a 6 semanas.',
    },
    {
      question: '¿Metalcon resiste sismos?',
      answer:
        'Sí. Diseñado y anclado según NCh 433 y NCh 2369, Metalcon es un sistema sismoresistente certificado. El peso liviano de la estructura reduce las fuerzas inerciales en un evento sísmico.',
    },
    {
      question: '¿Puedo construir un segundo piso en Metalcon sobre albañilería existente?',
      answer:
        'En la mayoría de los casos sí, previa evaluación estructural de la base y refuerzo de fundaciones si es necesario. Incluimos esa evaluación en la visita técnica.',
    },
    {
      question: '¿Qué terminaciones exteriores acepta Metalcon?',
      answer:
        'Fibrocemento, siding, vinyl-siding, madera, EIFS, estuco acrílico o placas de cerámica. Coordinamos la terminación final según tu presupuesto y estética deseada.',
    },
    {
      question: '¿Trabajan en toda la Región del Maule?',
      answer:
        'Sí. Operamos en Linares, Longaví, Talca, Curicó, Parral, Constitución, San Javier, Retiro y comunas aledañas sin costo adicional de traslado.',
    },
  ],
  relatedSlugs: ['ampliaciones', 'electricidad', 'gasfiteria'],
};

export const metadata: Metadata = {
  title: 'Estructuras Metalcon en Maule | Linares, Longaví, Talca',
  description:
    'Montaje de estructuras Metalcon para viviendas, ampliaciones y segundos pisos en la Región del Maule. Plano estructural incluido, garantía 5 años. Desde $1.200.000.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/servicios/metalcon' },
  keywords: ['Metalcon Maule', 'Metalcon Linares', 'Metalcon Longaví', 'Metalcon Talca', 'estructura Metalcon', 'segundo piso Metalcon'],
  openGraph: {
    title: 'Estructuras Metalcon en el Maule | Soluciones Fabrick',
    description: 'Montaje Metalcon certificado con garantía estructural de 5 años. Desde $1.200.000.',
    url: 'https://www.solucionesfabrick.com/servicios/metalcon',
    type: 'website',
  },
};

export default function MetalconPage() {
  return <ServicePage content={content} />;
}
