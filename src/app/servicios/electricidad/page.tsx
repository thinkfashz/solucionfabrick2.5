import type { Metadata } from 'next';
import { Zap } from 'lucide-react';
import ServicePage, { type ServicePageContent } from '@/components/ServicePage';

const content: ServicePageContent = {
  slug: 'electricidad',
  eyebrow: 'Electricidad',
  heroTitle: 'Instalaciones eléctricas certificadas SEC',
  heroDescription:
    'Instalaciones eléctricas residenciales con plano timbrado, tablero termomagnético con diferencial y certificación SEC TE1 obligatoria. Seguridad eléctrica sin compromisos.',
  icon: Zap,
  serviceType: 'Instalaciones eléctricas residenciales certificadas',
  priceFrom: '$290.000',
  overview:
    'Una instalación eléctrica mal calculada es causa directa de incendios y daños a equipos. Trabajamos con electricistas autorizados por la SEC, entregamos el TE1 obligatorio, tablero normalizado con protector diferencial y plano eléctrico actualizado para tu vivienda.',
  scope: [
    'Diseño del circuito y plano eléctrico timbrado por profesional autorizado',
    'Tablero modular con interruptores termomagnéticos y protector diferencial',
    'Circuitos dimensionados por consumo (iluminación, enchufes, cocina, clima)',
    'Cableado libre de halógenos (LSZH) en ductos EMT cuando corresponda',
    'Puesta a tierra certificada y medición con telurómetro',
    'Certificación SEC TE1 (obligatoria para conexión a la red)',
  ],
  process: [
    { step: 'Evaluación', detail: 'Visita técnica, levantamiento de cargas reales y proyección de crecimiento a 10 años.' },
    { step: 'Instalación normalizada', detail: 'Ejecución según NCh Elec. 4/2003, con materiales certificados y supervisión diaria.' },
    { step: 'Certificación SEC', detail: 'Entregamos TE1 timbrado para que la conexión o ampliación con CGE/Frontel sea inmediata.' },
  ],
  faqs: [
    {
      question: '¿La certificación SEC TE1 es obligatoria?',
      answer:
        'Sí. Toda instalación eléctrica domiciliaria nueva o modificada debe tener TE1 timbrado por un instalador autorizado SEC para poder conectarse a la red de CGE/Frontel y para que tu seguro incendio sea válido.',
    },
    {
      question: '¿Qué es un diferencial y por qué es obligatorio?',
      answer:
        'El protector diferencial (30 mA) corta la electricidad ante una fuga a tierra, protegiendo personas de electrocución. Es obligatorio por normativa desde 2004 en todas las viviendas y lo incluimos siempre en el tablero.',
    },
    {
      question: '¿Cuánto tarda una instalación completa en casa nueva?',
      answer:
        'Entre 5 y 10 días hábiles para una vivienda de 60–120 m², incluyendo cableado, tablero, certificación TE1 y coordinación con la distribuidora eléctrica.',
    },
    {
      question: '¿Hacen ampliación de instalación para cocina eléctrica o EV?',
      answer:
        'Sí. Recalculamos el empalme, refuerzo de alimentador y nuevo circuito dedicado con protecciones correctas. Incluye actualización del TE1 con la nueva carga.',
    },
    {
      question: '¿Dan garantía?',
      answer:
        'Garantía escrita de 2 años sobre mano de obra y materiales que proveemos. Para certificaciones SEC la responsabilidad del instalador es permanente por ley mientras la instalación no sea modificada por terceros.',
    },
  ],
  relatedSlugs: ['gasfiteria', 'metalcon', 'ampliaciones'],
};

export const metadata: Metadata = {
  title: 'Instalación Eléctrica Certificada SEC | Maule',
  description:
    'Instalaciones eléctricas residenciales con certificación SEC TE1, tablero diferencial y plano timbrado en el Maule. Desde $290.000.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/servicios/electricidad' },
  keywords: ['electricista Maule', 'electricista Linares', 'electricista Longaví', 'certificación SEC TE1', 'instalación eléctrica Talca'],
  openGraph: {
    title: 'Electricidad certificada SEC en el Maule | Soluciones Fabrick',
    description: 'Plano timbrado, tablero diferencial y TE1 incluido. Desde $290.000.',
    url: 'https://www.solucionesfabrick.com/servicios/electricidad',
    type: 'website',
  },
};

export default function ElectricidadPage() {
  return <ServicePage content={content} />;
}
