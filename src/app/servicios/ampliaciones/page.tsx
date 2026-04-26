import type { Metadata } from 'next';
import { Building2 } from 'lucide-react';
import ServicePage, { type ServicePageContent } from '@/components/ServicePage';

// See src/app/servicios/metalcon/page.tsx for the full rationale: ServicePage
// renders inline nonce'd <script> tags so this route must be dynamic for the
// CSP nonce from middleware.ts to match at runtime.
export const dynamic = 'force-dynamic';

const content: ServicePageContent = {
  slug: 'ampliaciones',
  eyebrow: 'Ampliaciones',
  heroTitle: 'Ampliaciones residenciales llave en mano',
  heroDescription:
    'Segundos pisos, logias, terrazas techadas, quinchos y dormitorios nuevos en Linares, Longaví, Talca y la Región del Maule. Un solo contrato, un solo equipo, fecha de entrega garantizada.',
  icon: Building2,
  serviceType: 'Ampliaciones residenciales llave en mano',
  priceFrom: '$2.500.000',
  overview:
    'Ampliar tu casa no tiene por qué ser un dolor de cabeza. Coordinamos arquitectura, permisos (si aplica), estructura, instalaciones y terminaciones con un único responsable a cargo. Cronograma con hitos semanales y penalidades por atraso escritas en el contrato.',
  scope: [
    'Diseño arquitectónico y renders 3D previos al inicio de obra',
    'Gestión de permiso de edificación / DOM cuando es necesario',
    'Estructura en Metalcon u hormigón según proyecto',
    'Instalaciones de agua, gas y electricidad integradas con la vivienda existente',
    'Terminaciones premium: pisos, pintura, cielos, puertas, ventanas termopanel',
    'Limpieza final de obra y entrega con checklist firmado',
  ],
  process: [
    { step: 'Proyecto', detail: 'Visita, levantamiento, propuesta con render 3D y presupuesto cerrado en 5 a 7 días hábiles.' },
    { step: 'Ejecución coordinada', detail: 'Un jefe de obra dedicado, cronograma semanal público y reuniones de avance cada lunes.' },
    { step: 'Entrega garantizada', detail: 'Recepción con checklist, garantía escrita por partida y soporte post-entrega durante 12 meses.' },
  ],
  faqs: [
    {
      question: '¿Necesito permiso de edificación para ampliar?',
      answer:
        'Depende de la superficie y la comuna. Ampliaciones menores a 25 m² en vivienda social generalmente no lo requieren, pero sí obras mayores. Evaluamos tu caso en la DOM correspondiente antes de iniciar obra.',
    },
    {
      question: '¿Cuánto demora una ampliación tipo dormitorio + baño (25 m²)?',
      answer:
        'Entre 5 y 8 semanas desde el inicio, incluyendo estructura, instalaciones y terminaciones. Las obras de mayor tamaño (segundo piso completo) toman 10 a 16 semanas.',
    },
    {
      question: '¿Cuánto cuesta el m² de ampliación?',
      answer:
        'Para terminaciones estándar, entre $850.000 y $1.200.000 por m² construido, según materialidad (Metalcon vs. albañilería) y nivel de terminación. Te entregamos valor cerrado antes de firmar.',
    },
    {
      question: '¿Cobran por la visita técnica?',
      answer:
        'No. La visita técnica, el levantamiento y la propuesta con render son gratuitas y sin compromiso en todo el Maule.',
    },
    {
      question: '¿Qué pasa si el proyecto se atrasa?',
      answer:
        'El contrato incluye penalidades por día de atraso imputable a nosotros, descontables de la factura final. Si el atraso es por causas del cliente (cambios de diseño, permisos) se recalendariza con tu aprobación.',
    },
  ],
  relatedSlugs: ['metalcon', 'gasfiteria', 'electricidad'],
};

export const metadata: Metadata = {
  title: 'Ampliaciones de Casa en el Maule | Llave en Mano',
  description:
    'Ampliaciones llave en mano en Linares, Longaví y Talca: segundos pisos, logias, dormitorios y quinchos. Render 3D incluido, entrega garantizada. Desde $2.500.000.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/servicios/ampliaciones' },
  keywords: ['ampliación casa Maule', 'ampliación Linares', 'ampliación Longaví', 'segundo piso Chile', 'ampliar casa llave en mano'],
  openGraph: {
    title: 'Ampliaciones llave en mano en el Maule | Soluciones Fabrick',
    description: 'Segundos pisos, dormitorios, quinchos y logias. Render 3D, cronograma y entrega garantizada.',
    url: 'https://www.solucionesfabrick.com/servicios/ampliaciones',
    type: 'website',
  },
};

export default function AmpliacionesPage() {
  return <ServicePage content={content} />;
}
