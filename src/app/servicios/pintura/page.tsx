import type { Metadata } from 'next';
import { PaintRoller } from 'lucide-react';
import ServicePage, { type ServicePageContent } from '@/components/ServicePage';

export const dynamic = 'force-dynamic';

const content: ServicePageContent = {
  slug: 'pintura',
  eyebrow: 'Pintura',
  heroTitle: 'Pintura residencial con terminación limpia',
  heroDescription:
    'Calcula una referencia por m² y recibe orientación para escoger pintura, sellador y preparación según el estado real de tus muros.',
  icon: PaintRoller,
  serviceType: 'Pintura residencial profesional',
  priceFrom: '$180.000',
  overview:
    'La pintura no es solo aplicar color. Revisamos humedad, grietas, textura, color existente y uso del espacio para definir una terminación que dure y se vea bien.',
  scope: [
    'Revisión del estado de muros, cielos o exterior',
    'Preparación básica: limpieza, lija, masilla y sellado cuando aplique',
    'Aplicación de pintura interior o exterior según condición',
    'Protección de pisos, muebles y bordes durante el proceso',
    'Recomendación de colores, acabado y cantidad aproximada',
    'Materiales especiales o reparaciones profundas se cotizan aparte',
  ],
  process: [
    { step: 'Evaluamos', detail: 'Revisamos superficie, humedad, color actual y tipo de terminación que buscas.' },
    { step: 'Preparamos', detail: 'Definimos sellado, reparación básica y cantidad estimada de pintura.' },
    { step: 'Pintamos', detail: 'Aplicamos por etapas, protegemos el área y entregamos limpio.' },
  ],
  faqs: [
    {
      question: '¿Cuántas manos de pintura incluye?',
      answer:
        'Depende del color actual, la pintura elegida y el estado del muro. Normalmente se considera una base y manos de terminación según cobertura.',
    },
    {
      question: '¿Puedo comprar yo la pintura?',
      answer:
        'Sí. Podemos orientarte para escoger el tipo correcto antes de comprar y evitar gastar en una pintura que no sirva para tu superficie.',
    },
    {
      question: '¿Qué puede subir el precio?',
      answer:
        'Humedad, grietas, superficies muy porosas, colores difíciles, altura, exterior expuesto o reparación previa.',
    },
    {
      question: '¿Incluye protección del espacio?',
      answer:
        'Sí, se considera protección básica del área de trabajo. Protecciones especiales o movimiento de muebles grandes se revisan aparte.',
    },
  ],
  relatedSlugs: ['revestimiento', 'metalcon', 'ampliaciones'],
};

export const metadata: Metadata = {
  title: 'Pintura Residencial en Maule | Linares, Talca',
  description:
    'Pintura interior y exterior con preparación de superficies y orientación por m² en la Región del Maule. Desde $180.000.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/servicios/pintura' },
  keywords: ['pintura Maule', 'pintura residencial Linares', 'pintura exterior Talca', 'pintura profesional Maule'],
  openGraph: {
    title: 'Pintura residencial en el Maule | Soluciones Fabrick',
    description: 'Cálculo por m², preparación de superficie y orientación de materiales.',
    url: 'https://www.solucionesfabrick.com/servicios/pintura',
    type: 'website',
  },
};

export default function PinturaPage() {
  return <ServicePage content={content} />;
}
