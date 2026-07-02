import type { Metadata } from 'next';
import { Droplet } from 'lucide-react';
import ServicePage, { type ServicePageContent } from '@/components/ServicePage';

export const dynamic = 'force-dynamic';

const content: ServicePageContent = {
  slug: 'gasfiteria',
  eyebrow: 'Gasfitería',
  heroTitle: 'Gasfitería para resolver sin romper de más',
  heroDescription:
    'Revisamos tu necesidad, medimos el tramo y te orientamos con una referencia por metro lineal o por punto antes de cerrar la cotización.',
  icon: Droplet,
  serviceType: 'Gasfitería residencial',
  priceFrom: '$320.000',
  overview:
    'Una fuga o una mala conexión puede terminar saliendo cara. La idea es revisar bien, explicar opciones y ejecutar de forma ordenada para evitar trabajos innecesarios.',
  scope: [
    'Revisión de fugas, presión, ubicación y acceso al tramo',
    'Instalación o reparación de redes de agua fría y caliente',
    'Conexión de lavamanos, WC, lavaplatos, ducha, termo o calefón',
    'Revisión de alcantarillado y desagüe domiciliario',
    'Presupuesto separado si hay que picar, reponer cerámica o cambiar artefactos',
    'Orientación para escoger grifería, sanitarios o accesorios compatibles',
  ],
  process: [
    { step: 'Diagnóstico', detail: 'Revisamos el problema, la distancia, los accesos y si se puede resolver sin romper de más.' },
    { step: 'Cotización clara', detail: 'Separamos tramo, materiales, artefactos y reposiciones para que entiendas qué estás pagando.' },
    { step: 'Ejecución limpia', detail: 'Trabajamos con protección del área y dejamos indicado qué se hizo y qué debes revisar después.' },
  ],
  faqs: [
    {
      question: '¿Puedo comprar yo la grifería o sanitario?',
      answer:
        'Sí. También podemos orientarte para elegir un producto compatible antes de comprarlo y evitar medidas incorrectas.',
    },
    {
      question: '¿La calculadora sirve para una fuga?',
      answer:
        'Sirve como referencia inicial. Las fugas pueden cambiar según acceso, daño oculto, necesidad de picar o reposición de terminaciones.',
    },
    {
      question: '¿Incluye reposición de cerámica o muro?',
      answer:
        'No siempre. Si hay que romper y reponer, lo separamos en otra partida para que el presupuesto sea más transparente.',
    },
    {
      question: '¿Atienden emergencias?',
      answer:
        'Podemos revisar disponibilidad según comuna, horario y urgencia. Para emergencias reales es mejor enviar fotos y ubicación por WhatsApp.',
    },
  ],
  relatedSlugs: ['electricidad', 'metalcon', 'ampliaciones'],
};

export const metadata: Metadata = {
  title: 'Gasfitería en Maule | Linares, Longaví, Talca',
  description:
    'Gasfitería residencial en la Región del Maule: agua, desagüe, artefactos y reparación de fugas. Cálculo referencial por metro lineal o punto.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/servicios/gasfiteria' },
  keywords: ['gasfitería Maule', 'gasfíter Linares', 'gasfíter Longaví', 'gasfíter Talca', 'fuga agua'],
  openGraph: {
    title: 'Gasfitería residencial en el Maule | Soluciones Fabrick',
    description: 'Revisión, orientación y cotización clara para agua, desagüe y artefactos.',
    url: 'https://www.solucionesfabrick.com/servicios/gasfiteria',
    type: 'website',
  },
};

export default function GasfiteriaPage() {
  return <ServicePage content={content} />;
}
