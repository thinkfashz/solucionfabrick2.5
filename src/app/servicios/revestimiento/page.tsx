import type { Metadata } from 'next';
import { Layers } from 'lucide-react';
import ServicePage, { type ServicePageContent } from '@/components/ServicePage';

export const dynamic = 'force-dynamic';

const content: ServicePageContent = {
  slug: 'revestimiento',
  eyebrow: 'Revestimiento',
  heroTitle: 'Revestimientos y Aislación en el Maule',
  heroDescription:
    'Instalación de revestimientos interiores y exteriores, aislación térmica, acústica y preparación de superficies para viviendas en Linares, Talca, Longaví y la Región del Maule. Placas de yeso, fibrocemento, lana mineral y sistemas EIFS certificados.',
  icon: Layers,
  serviceType: 'Revestimientos y aislación residencial',
  priceFrom: '$320.000',
  overview:
    'El revestimiento define el confort, la eficiencia energética y la estética de tu hogar. Instalamos sistemas completos de tabiques de yeso-cartón (Drywall), placas de fibrocemento, aislación en lana de vidrio o roca, y terminaciones exteriores EIFS o vinyl-siding. Todo con materiales de primera línea y mano de obra especializada.',
  scope: [
    'Tabiques y cielos de yeso-cartón (Drywall) con perfilería galvanizada',
    'Aislación térmica con lana de vidrio o lana de roca (RT 2.0 o superior)',
    'Barrera de vapor y membrana impermeabilizante en zonas húmedas',
    'Revestimiento exterior en fibrocemento, EIFS o vinyl-siding',
    'Estuco fino y tratamiento de superficie lista para pintura',
    'Instalación de molduras, cornisas y terminaciones arquitectónicas',
  ],
  process: [
    { step: 'Diagnóstico y diseño', detail: 'Evaluamos la estructura existente, definimos el sistema de revestimiento más adecuado según clima, uso y presupuesto.' },
    { step: 'Instalación técnica', detail: 'Equipo especializado instala perfilería, aislación y placas con tolerancias milimétricas y sellado correcto de juntas.' },
    { step: 'Terminación y entrega', detail: 'Masillado, lija y sellado final. Entregamos superficie plana, uniforme y lista para pintura o revestimiento decorativo.' },
  ],
  faqs: [
    {
      question: '¿Qué diferencia hay entre yeso-cartón y fibrocemento?',
      answer:
        'El yeso-cartón (Drywall) es ideal para interiores: liviano, fácil de trabajar y con buena aislación acústica. El fibrocemento es más resistente a la humedad y al impacto, ideal para zonas húmedas y exteriores. Usamos el material correcto según la zona de aplicación.',
    },
    {
      question: '¿Puedo mejorar la aislación térmica de una casa existente?',
      answer:
        'Sí. Instalamos aislación dentro de la perfilería existente o creamos nuevos tabiques con cámara de aire rellena de lana mineral. Es una de las mejores inversiones para reducir calefacción hasta en un 40%.',
    },
    {
      question: '¿Qué sistemas de revestimiento exterior ofrecen?',
      answer:
        'Trabajamos con fibrocemento (Superboard, Eterboard), vinyl-siding, EIFS (estuco sobre poliestireno) y madera tratada. Cada sistema tiene distintas propiedades de aislación, durabilidad y estética.',
    },
    {
      question: '¿Cuánto demora revestir una vivienda completa?',
      answer:
        'Una vivienda estándar de 80 m² toma entre 2 y 4 semanas para revestimiento interior completo, dependiendo de la complejidad de los espacios y el sistema utilizado.',
    },
    {
      question: '¿El revestimiento incluye pintura?',
      answer:
        'El servicio de revestimiento entrega la superficie lista para pintura. Si también requieres pintura, lo coordinamos dentro del mismo proyecto con nuestro equipo de terminaciones.',
    },
  ],
  relatedSlugs: ['metalcon', 'pintura', 'electricidad'],
};

export const metadata: Metadata = {
  title: 'Revestimientos y Aislación en Maule | Linares, Talca',
  description:
    'Instalación de revestimientos interiores y exteriores, Drywall, fibrocemento y aislación térmica en la Región del Maule. Desde $320.000.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/servicios/revestimiento' },
  keywords: ['revestimiento Maule', 'Drywall Linares', 'aislación térmica Maule', 'fibrocemento Talca'],
  openGraph: {
    title: 'Revestimientos y Aislación en el Maule | Soluciones Fabrick',
    description: 'Sistemas de revestimiento interior y exterior con aislación térmica certificada. Desde $320.000.',
    url: 'https://www.solucionesfabrick.com/servicios/revestimiento',
    type: 'website',
  },
};

export default function RevestimientoPage() {
  return <ServicePage content={content} />;
}
