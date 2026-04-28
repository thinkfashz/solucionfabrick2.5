import type { Metadata } from 'next';
import { PaintRoller } from 'lucide-react';
import ServicePage, { type ServicePageContent } from '@/components/ServicePage';

export const dynamic = 'force-dynamic';

const content: ServicePageContent = {
  slug: 'pintura',
  eyebrow: 'Pintura',
  heroTitle: 'Pintura Profesional Residencial en el Maule',
  heroDescription:
    'Terminaciones de pintura de alta durabilidad para interiores y exteriores en Linares, Talca, Longaví y la Región del Maule. Preparación de superficies, sellado, pintura base y acabados finos con paletas premium de marcas certificadas.',
  icon: PaintRoller,
  serviceType: 'Pintura residencial profesional',
  priceFrom: '$180.000',
  overview:
    'Una buena terminación de pintura transforma completamente un espacio. Trabajamos con pinturas de alta cobertura y durabilidad de marcas como Sherwin-Williams, Sipa y ConstruColor. Nuestro proceso incluye preparación profunda de superficies, sellado de imperfecciones, pintura base y mínimo dos capas de acabado para un resultado perfecto y duradero.',
  scope: [
    'Preparación de superficie: masillado, lija y sellado de grietas e imperfecciones',
    'Aplicación de sello fijador en superficies nuevas o porosas',
    'Pintura base de alta adherencia en todos los paños',
    'Mínimo 2 capas de pintura de acabado (interior o exterior según condición)',
    'Pintura exterior especial con protección UV y resistencia a la humedad',
    'Protección de pisos, muebles y carpintería durante el proceso',
  ],
  process: [
    { step: 'Asesoría de color y superficie', detail: 'Evaluamos el estado de las superficies y te asesoramos en la selección de colores, acabados y tipo de pintura adecuado.' },
    { step: 'Preparación y base', detail: 'Preparamos cada superficie con masillado, sellado y pintura base para garantizar adherencia perfecta y cobertura uniforme.' },
    { step: 'Acabado y entrega', detail: 'Aplicamos las capas de acabado con rodillo o pistola de presión, retiramos protecciones y entregamos el espacio limpio y terminado.' },
  ],
  faqs: [
    {
      question: '¿Cuántas capas de pintura aplican?',
      answer:
        'Siempre aplicamos mínimo dos capas de pintura de acabado, precedidas de sello base. En superficies porosas o en colores de alto impacto, podemos aplicar hasta 3 capas para lograr cobertura perfecta.',
    },
    {
      question: '¿Qué marcas de pintura usan?',
      answer:
        'Trabajamos con Sherwin-Williams, Sipa, ConstruColor y otras marcas de grado profesional con certificación de durabilidad. Evitamos pinturas económicas que pierden color y se agrietan en 1–2 años.',
    },
    {
      question: '¿Cuánto tiempo tarda en secar la pintura?',
      answer:
        'La pintura al agua seca al tacto en 1–2 horas y en 24 horas para segunda capa. Para uso normal del espacio, recomendamos 48–72 horas. La pintura exterior cura completamente en 7 días.',
    },
    {
      question: '¿Pueden pintar solo el exterior de la casa?',
      answer:
        'Sí. Ofrecemos el servicio de pintura exterior de forma independiente. La pintura exterior requiere preparación especial con sello impermeabilizante y pintura con protección UV para resistir el clima del Maule.',
    },
    {
      question: '¿Incluye el servicio la preparación de superficies?',
      answer:
        'Sí, siempre. La preparación de superficie es parte fundamental de nuestro servicio: masillamos, lijamos y sellamos antes de pintar. Una pintura bien preparada dura de 5 a 8 años sin perder calidad.',
    },
  ],
  relatedSlugs: ['revestimiento', 'metalcon', 'ampliaciones'],
};

export const metadata: Metadata = {
  title: 'Pintura Profesional Residencial en Maule | Linares, Talca',
  description:
    'Pintura de interiores y exteriores con preparación de superficie, sellado y pinturas de alta durabilidad en la Región del Maule. Desde $180.000.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/servicios/pintura' },
  keywords: ['pintura Maule', 'pintura residencial Linares', 'pintura exterior Talca', 'pintura profesional Maule'],
  openGraph: {
    title: 'Pintura Profesional Residencial en el Maule | Soluciones Fabrick',
    description: 'Terminaciones de pintura de alta durabilidad con preparación de superficie incluida. Desde $180.000.',
    url: 'https://www.solucionesfabrick.com/servicios/pintura',
    type: 'website',
  },
};

export default function PinturaPage() {
  return <ServicePage content={content} />;
}
