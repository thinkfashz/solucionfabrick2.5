import type { Metadata } from 'next';
import { Layers } from 'lucide-react';
import ServicePage, { type ServicePageContent } from '@/components/ServicePage';

export const dynamic = 'force-dynamic';

const content: ServicePageContent = {
  slug: 'revestimiento',
  eyebrow: 'Revestimiento',
  heroTitle: 'Revestimientos y terminaciones para mejorar tu espacio',
  heroDescription:
    'Calcula una referencia por m² y recibe orientación para elegir placas, aislación, terminaciones o preparación de superficie según tu necesidad.',
  icon: Layers,
  serviceType: 'Revestimientos y aislación residencial',
  priceFrom: '$320.000',
  overview:
    'Un buen revestimiento mejora la apariencia, el confort y el uso diario del espacio. Revisamos superficie, humedad, aislación y terminación deseada para ordenar el presupuesto.',
  scope: [
    'Tabiques, cielos y revestimientos interiores según necesidad',
    'Aislación térmica o acústica cuando el proyecto lo requiere',
    'Preparación de superficie antes de pintar o terminar',
    'Revestimiento exterior según presupuesto y exposición al clima',
    'Molduras, cornisas y detalles se separan si el cliente los solicita',
    'Orientación para elegir materiales compatibles con el uso del espacio',
  ],
  process: [
    { step: 'Revisión', detail: 'Vemos el estado de muros, humedad, medidas y uso del espacio antes de recomendar materiales.' },
    { step: 'Propuesta', detail: 'Separamos material base, aislación, terminación y extras para que puedas decidir por etapas.' },
    { step: 'Terminación', detail: 'Ejecutamos con orden, cuidando juntas, niveles y preparación para la siguiente etapa.' },
  ],
  faqs: [
    {
      question: '¿El revestimiento incluye pintura?',
      answer:
        'No siempre. Podemos dejar la superficie lista para pintar o incluir pintura como partida separada.',
    },
    {
      question: '¿Qué puede cambiar el precio?',
      answer:
        'Humedad, altura, estado de la superficie, tipo de placa, aislación, molduras y terminaciones especiales.',
    },
    {
      question: '¿Puedo comprar los materiales?',
      answer:
        'Sí. También podemos orientarte para evitar comprar placas, aislantes o accesorios que no correspondan al uso del espacio.',
    },
    {
      question: '¿Se puede hacer por etapas?',
      answer:
        'Sí. Primero estructura o superficie base, luego aislación, placas, terminación y pintura si corresponde.',
    },
  ],
  relatedSlugs: ['metalcon', 'pintura', 'electricidad'],
};

export const metadata: Metadata = {
  title: 'Revestimientos y Aislación en Maule | Linares, Talca',
  description:
    'Revestimientos interiores y exteriores, aislación y preparación de superficies en la Región del Maule. Cálculo referencial por m².',
  alternates: { canonical: 'https://www.solucionesfabrick.com/servicios/revestimiento' },
  keywords: ['revestimiento Maule', 'Drywall Linares', 'aislación térmica Maule', 'fibrocemento Talca'],
  openGraph: {
    title: 'Revestimientos y Aislación en el Maule | Soluciones Fabrick',
    description: 'Orientación por m², materiales compatibles y ejecución por etapas.',
    url: 'https://www.solucionesfabrick.com/servicios/revestimiento',
    type: 'website',
  },
};

export default function RevestimientoPage() {
  return <ServicePage content={content} />;
}
