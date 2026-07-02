import type { Metadata } from 'next';
import { Zap } from 'lucide-react';
import ServicePage, { type ServicePageContent } from '@/components/ServicePage';

export const dynamic = 'force-dynamic';

const content: ServicePageContent = {
  slug: 'electricidad',
  eyebrow: 'Electricidad',
  heroTitle: 'Instalaciones eléctricas ordenadas y seguras',
  heroDescription:
    'Te ayudamos a calcular puntos, revisar cargas básicas y organizar una instalación clara según el uso real de tu vivienda.',
  icon: Zap,
  serviceType: 'Instalaciones eléctricas residenciales',
  priceFrom: '$290.000',
  overview:
    'La electricidad debe planificarse antes de instalar. Revisamos qué necesitas conectar, dónde irán los puntos y qué conviene dejar preparado para evitar cambios caros después.',
  scope: [
    'Revisión de puntos de iluminación, enchufes y usos principales',
    'Ordenamiento de circuitos por zona o tipo de consumo',
    'Instalación de canalización, cableado y accesorios según alcance',
    'Tablero, protecciones y puesta en marcha según necesidad del proyecto',
    'Separación de presupuesto por puntos, tablero y canalizaciones complejas',
    'Orientación para comprar luminarias, enchufes o accesorios compatibles',
  ],
  process: [
    { step: 'Levantamiento', detail: 'Definimos cantidad de puntos, ubicación, consumo esperado y posibles ampliaciones futuras.' },
    { step: 'Orden de trabajo', detail: 'Separamos puntos simples, tablero, canalizaciones y accesorios para que el presupuesto sea fácil de entender.' },
    { step: 'Instalación', detail: 'Ejecutamos por zonas, probamos funcionamiento y dejamos recomendaciones de uso.' },
  ],
  faqs: [
    {
      question: '¿La calculadora funciona por punto?',
      answer:
        'Sí. Sirve para estimar enchufes, interruptores o puntos de luz simples. Tableros, canalizaciones largas o muros complejos se revisan aparte.',
    },
    {
      question: '¿Puedo comprar mis propias luminarias?',
      answer:
        'Sí. Podemos orientarte para que elijas productos compatibles con el espacio y con la instalación disponible.',
    },
    {
      question: '¿Qué puede subir el precio?',
      answer:
        'Distancia, canalización difícil, necesidad de tablero, aumento de carga, muros duros o cambios de ubicación durante la obra.',
    },
    {
      question: '¿Trabajan por etapas?',
      answer:
        'Sí. Podemos partir con lo esencial y dejar preparado lo que se instalará después.',
    },
  ],
  relatedSlugs: ['gasfiteria', 'metalcon', 'ampliaciones'],
};

export const metadata: Metadata = {
  title: 'Instalaciones Eléctricas Residenciales | Maule',
  description:
    'Instalaciones eléctricas residenciales en el Maule: puntos, iluminación, enchufes, tablero y orientación por etapas. Cálculo referencial por punto.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/servicios/electricidad' },
  keywords: ['electricista Maule', 'electricista Linares', 'electricista Longaví', 'instalación eléctrica Talca'],
  openGraph: {
    title: 'Electricidad residencial en el Maule | Soluciones Fabrick',
    description: 'Cálculo por punto, orientación clara y ejecución por etapas.',
    url: 'https://www.solucionesfabrick.com/servicios/electricidad',
    type: 'website',
  },
};

export default function ElectricidadPage() {
  return <ServicePage content={content} />;
}
