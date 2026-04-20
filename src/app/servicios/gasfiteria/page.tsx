import type { Metadata } from 'next';
import { Droplet } from 'lucide-react';
import ServicePage, { type ServicePageContent } from '@/components/ServicePage';

const content: ServicePageContent = {
  slug: 'gasfiteria',
  eyebrow: 'Gasfitería',
  heroTitle: 'Gasfitería certificada en el Maule',
  heroDescription:
    'Instalaciones de agua potable, alcantarillado y gas con certificación SEC y ESSBIO. Trabajos prolijos, materiales de primera marca y prueba de presión post-instalación.',
  icon: Droplet,
  serviceType: 'Gasfitería residencial certificada',
  priceFrom: '$320.000',
  overview:
    'Las fugas no se perdonan: una mala gasfitería arruina pisos, muros y presupuestos. Nuestro equipo certificado SEC ejecuta instalaciones y reparaciones de agua, gas y alcantarillado con prueba de presión documentada y garantía escrita sobre cada tramo intervenido.',
  scope: [
    'Instalación y reparación de redes de agua fría y caliente (PPR o cobre)',
    'Conexiones y redes de gas natural y licuado con certificación SEC',
    'Alcantarillado domiciliario y fosas sépticas según normativa ESSBIO',
    'Instalación de artefactos: WC, lavamanos, tinas, duchas, calefones y termos',
    'Detección y reparación de fugas con equipo especializado',
    'Prueba de presión documentada con informe técnico firmado',
  ],
  process: [
    { step: 'Diagnóstico', detail: 'Visita técnica con equipo de detección, informe escrito y cotización cerrada en 24–48 h.' },
    { step: 'Ejecución limpia', detail: 'Trabajo ordenado con protección de pisos y muros. Dejamos la obra más limpia de como la encontramos.' },
    { step: 'Certificación', detail: 'Entrega con prueba de presión, certificación SEC cuando aplica y garantía escrita por cada tramo.' },
  ],
  faqs: [
    {
      question: '¿Tienen certificación SEC para gas?',
      answer:
        'Sí. Todos nuestros gasfíteres para instalaciones de gas cuentan con licencia SEC vigente (clase 1, 2 o 3 según el trabajo) y entregamos el certificado correspondiente al finalizar la obra.',
    },
    {
      question: '¿Cuánto demora detectar una fuga oculta?',
      answer:
        'Entre 30 minutos y 2 horas dependiendo de la complejidad. Usamos equipos de geófono, gas trazador y cámara termográfica para localizar la fuga sin picar muros al azar.',
    },
    {
      question: '¿Trabajan con calefones y termos solares?',
      answer:
        'Sí. Instalamos y reparamos calefones Splendid, Junkers, Bosch, Albin Trotter, y sistemas termosolares. También modernizamos termos eléctricos a gas o viceversa.',
    },
    {
      question: '¿Qué garantía dan en la gasfitería?',
      answer:
        'Garantía escrita de 1 año sobre mano de obra en cada tramo intervenido, y garantía directa del fabricante sobre los artefactos (2 a 5 años según modelo).',
    },
    {
      question: '¿Atienden emergencias?',
      answer:
        'Sí. Tenemos servicio de emergencia para fugas de gas, inundaciones y tapones graves en el Maule, con cobertura en Linares, Longaví, Talca y alrededores.',
    },
  ],
  relatedSlugs: ['electricidad', 'metalcon', 'ampliaciones'],
};

export const metadata: Metadata = {
  title: 'Gasfitería en Maule | Certificación SEC | Linares, Longaví',
  description:
    'Gasfitería certificada SEC en la Región del Maule: agua, gas y alcantarillado. Prueba de presión, garantía escrita. Desde $320.000.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/servicios/gasfiteria' },
  keywords: ['gasfitería Maule', 'gasfíter Linares', 'gasfíter Longaví', 'gasfíter Talca', 'certificación SEC gas', 'detección fuga agua'],
  openGraph: {
    title: 'Gasfitería certificada en el Maule | Soluciones Fabrick',
    description: 'Agua, gas y alcantarillado con certificación SEC. Prueba de presión documentada. Desde $320.000.',
    url: 'https://www.solucionesfabrick.com/servicios/gasfiteria',
    type: 'website',
  },
};

export default function GasfiteriaPage() {
  return <ServicePage content={content} />;
}
