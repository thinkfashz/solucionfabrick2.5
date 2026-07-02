import type { Metadata } from 'next';
import { Home } from 'lucide-react';
import ServicePage, { type ServicePageContent } from '@/components/ServicePage';

export const dynamic = 'force-dynamic';

const content: ServicePageContent = {
  slug: 'metalcon',
  eyebrow: 'Metalcon',
  heroTitle: 'Estructuras Metalcon para ampliar o construir mejor',
  heroDescription:
    'Te guiamos para definir medidas, materialidad, etapas y presupuesto de tu estructura liviana sin prometer más de lo que aún no se ha revisado en terreno.',
  icon: Home,
  serviceType: 'Estructuras Metalcon residenciales',
  priceFrom: '$1.200.000',
  overview:
    'Metalcon es una alternativa rápida y ordenada para ampliaciones, segundos pisos y tabiquería. Primero entendemos el espacio, el uso y el presupuesto; luego definimos una propuesta por etapas.',
  scope: [
    'Revisión de espacio, medidas y objetivo del proyecto',
    'Orientación sobre perfiles, tabiques, cielos y estructura liviana',
    'Recomendación de aislación y terminaciones según uso del espacio',
    'Coordinación con electricidad, gasfitería o revestimientos cuando aplique',
    'Presupuesto separado por partidas para decidir mejor',
    'Acompañamiento para avanzar paso a paso sin improvisar',
  ],
  process: [
    { step: 'Medimos', detail: 'Revisamos medidas, fotos o visita para entender el espacio real y detectar puntos críticos.' },
    { step: 'Ordenamos', detail: 'Separamos estructura, revestimiento, aislación y terminaciones para que el presupuesto sea claro.' },
    { step: 'Ejecutamos', detail: 'Coordinamos avance, materiales y etapas para mantener control del tiempo y del gasto.' },
  ],
  faqs: [
    {
      question: '¿Sirve para ampliaciones y segundos pisos?',
      answer:
        'Sí, puede ser una buena opción por ser liviano y rápido. Antes de cotizar se debe revisar la base existente, medidas y objetivo del proyecto.',
    },
    {
      question: '¿Incluye terminaciones?',
      answer:
        'Puede incluirlas, pero es mejor separarlas por partida: estructura, aislación, revestimiento, pintura e instalaciones. Así decides qué hacer primero.',
    },
    {
      question: '¿La calculadora entrega precio final?',
      answer:
        'No. Te da una referencia inicial por m². El precio final depende de altura, accesos, base existente, terminaciones y cambios solicitados.',
    },
    {
      question: '¿Trabajan por etapas?',
      answer:
        'Sí. Podemos partir por estructura y luego avanzar con cerramiento, instalaciones y terminaciones según presupuesto.',
    },
  ],
  relatedSlugs: ['ampliaciones', 'electricidad', 'gasfiteria'],
};

export const metadata: Metadata = {
  title: 'Estructuras Metalcon en Maule | Linares, Longaví, Talca',
  description:
    'Estructuras Metalcon para ampliaciones, tabiquería y segundos pisos en la Región del Maule. Cálculo referencial por m² y orientación por etapas.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/servicios/metalcon' },
  keywords: ['Metalcon Maule', 'Metalcon Linares', 'Metalcon Longaví', 'Metalcon Talca', 'estructura Metalcon', 'segundo piso Metalcon'],
  openGraph: {
    title: 'Estructuras Metalcon en el Maule | Soluciones Fabrick',
    description: 'Orientación por etapas, cálculo por m² y ejecución ordenada para ampliaciones.',
    url: 'https://www.solucionesfabrick.com/servicios/metalcon',
    type: 'website',
  },
};

export default function MetalconPage() {
  return <ServicePage content={content} />;
}
