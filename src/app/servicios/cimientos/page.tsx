import type { Metadata } from 'next';
import { Hammer } from 'lucide-react';
import ServicePage, { type ServicePageContent } from '@/components/ServicePage';

export const dynamic = 'force-dynamic';

const content: ServicePageContent = {
  slug: 'cimientos',
  eyebrow: 'Cimientos',
  heroTitle: 'Fundaciones y Cimientos Residenciales en el Maule',
  heroDescription:
    'Diseño y construcción de fundaciones sólidas para viviendas, ampliaciones y construcciones en altura en Linares, Talca, Longaví y toda la Región del Maule. Hormigón certificado, nivelación milimétrica y respaldo estructural de 5 años.',
  icon: Hammer,
  serviceType: 'Fundaciones y cimientos residenciales',
  priceFrom: '$480.000',
  overview:
    'La fundación es el alma de cualquier construcción. En Soluciones Fabrick ejecutamos fundaciones continuas, aisladas y radier con hormigón de resistencia certificada (H25/H30), respetando la normativa NCh 1508 y NCh 433 sísmica. Cada proyecto incluye cálculo de cargas, diseño en terreno y supervisión técnica en todas las etapas.',
  scope: [
    'Estudio de terreno y análisis de suelo con ensayos de laboratorio',
    'Diseño de fundación según carga estructural y tipo de suelo (continua, aislada o radier)',
    'Hormigón H25 o H30 con aditivos certificados y fierro corrugado A63-42H',
    'Excavación, enfierradura, moldaje y vaciado con vibrador de inmersión',
    'Impermeabilización de fundaciones y sistema de drenaje perimetral',
    'Nivelación topográfica y entrega con acta de recepción técnica firmada',
  ],
  process: [
    { step: 'Visita y estudio de suelo', detail: 'Evaluación del terreno, calicata o ensayo de resistencia del suelo para definir el tipo de fundación adecuado.' },
    { step: 'Diseño y propuesta cerrada', detail: 'Plano de fundación timbrado por profesional, presupuesto detallado sin sorpresas y cronograma de obra.' },
    { step: 'Ejecución y recepción', detail: 'Vaciado de hormigón con supervisión continua, curado correcto y entrega con checklist técnico firmado.' },
  ],
  faqs: [
    {
      question: '¿Qué tipo de fundación necesito para mi terreno?',
      answer:
        'Depende del tipo de suelo, las cargas de la estructura y la normativa sísmica local. En la Región del Maule trabajamos principalmente con fundaciones continuas para muros y zapatas aisladas para pilares. Lo determinamos en la visita técnica gratuita.',
    },
    {
      question: '¿Cuánto tiempo demora la construcción de la fundación?',
      answer:
        'Una fundación para vivienda de 60–100 m² demora entre 5 y 12 días hábiles, contando excavación, enfierradura, vaciado y curado mínimo del hormigón (28 días de resistencia garantizada).',
    },
    {
      question: '¿Qué resistencia de hormigón usan?',
      answer:
        'Utilizamos hormigón H25 como mínimo y H30 para estructuras de mayor carga o terrenos comprometidos. Todo el hormigón proviene de plantas certificadas con guías de despacho y ensayos de probeta.',
    },
    {
      question: '¿Puedo construir sobre una losa de radier existente?',
      answer:
        'Sí, previa evaluación del estado y resistencia del radier existente. Si el radier está en buen estado, puede servir como fundación para una ampliación liviana en Metalcon. Lo evaluamos en terreno sin costo.',
    },
    {
      question: '¿Trabajan en zonas con suelo arcilloso o expansivo?',
      answer:
        'Sí. En suelos de baja capacidad portante o expansivos, diseñamos fundaciones especiales con mejoramiento de suelo, geotextiles y drenajes. La solución adecuada se define tras el estudio de suelo.',
    },
  ],
  relatedSlugs: ['metalcon', 'ampliaciones', 'gasfiteria'],
};

export const metadata: Metadata = {
  title: 'Cimientos y Fundaciones en Maule | Linares, Talca, Longaví',
  description:
    'Construcción de fundaciones continuas, aisladas y radier en la Región del Maule. Hormigón certificado H25/H30, diseño estructural incluido. Desde $480.000.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/servicios/cimientos' },
  keywords: ['cimientos Maule', 'fundaciones Linares', 'fundaciones Talca', 'radier Maule', 'fundaciones residenciales'],
  openGraph: {
    title: 'Cimientos y Fundaciones en el Maule | Soluciones Fabrick',
    description: 'Fundaciones con hormigón certificado, diseño estructural y garantía de 5 años. Desde $480.000.',
    url: 'https://www.solucionesfabrick.com/servicios/cimientos',
    type: 'website',
  },
};

export default function CimientosPage() {
  return <ServicePage content={content} />;
}
