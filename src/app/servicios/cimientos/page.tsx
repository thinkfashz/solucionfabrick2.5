import type { Metadata } from 'next';
import { Hammer } from 'lucide-react';
import ServicePage, { type ServicePageContent } from '@/components/ServicePage';

export const dynamic = 'force-dynamic';

const content: ServicePageContent = {
  slug: 'cimientos',
  eyebrow: 'Cimientos',
  heroTitle: 'Cimientos y radieres para avanzar con seguridad',
  heroDescription:
    'Te ayudamos a calcular, preparar y ejecutar la base de tu proyecto paso a paso, con una referencia clara por m³ y opciones según el tipo de hormigón.',
  icon: Hammer,
  serviceType: 'Cimientos, fundaciones y radieres residenciales',
  priceFrom: '$480.000',
  overview:
    'La base de una obra debe hacerse con orden. Revisamos medidas, acceso, tipo de terreno y forma de preparación para darte una orientación realista antes de cerrar el presupuesto.',
  scope: [
    'Revisión de medidas, ubicación y acceso al punto de trabajo',
    'Preparación de terreno, niveles y trazado base',
    'Excavación, moldaje y preparación para vaciado',
    'Opción de preparación con trompo para trabajos pequeños o accesos difíciles',
    'Opción de camión premezclado cuando el volumen y acceso lo permiten',
    'Malla, refuerzos, bombeo o despacho especial se consideran aparte si el proyecto lo necesita',
  ],
  process: [
    { step: 'Revisión inicial', detail: 'Tomamos medidas, fotos o visita para entender qué necesitas construir y qué condiciones tiene el terreno.' },
    { step: 'Cálculo y opciones', detail: 'Comparamos preparación con trompo o premezclado y te explicamos qué conviene según volumen, acceso y presupuesto.' },
    { step: 'Ejecución ordenada', detail: 'Coordinamos materiales, tiempos y avance para que sepas qué se hará en cada etapa.' },
  ],
  faqs: [
    {
      question: '¿La malla va incluida en el cálculo?',
      answer:
        'No necesariamente. La malla o refuerzo se calcula aparte porque depende del uso, espesor, carga y tipo de base. Así evitamos inflar el precio inicial o prometer algo que no siempre aplica.',
    },
    {
      question: '¿Qué conviene más: trompo o camión premezclado?',
      answer:
        'Para trabajos pequeños o con mal acceso puede convenir trompo. Para mayor volumen, el premezclado suele ser más rápido, pero puede sumar despacho, espera o cantidad mínima.',
    },
    {
      question: '¿El precio de la calculadora es definitivo?',
      answer:
        'No. Es una referencia para orientar. El precio final se confirma revisando medidas reales, acceso, profundidad, refuerzos y forma de preparación.',
    },
    {
      question: '¿Pueden hacer solo un radier?',
      answer:
        'Sí. Podemos orientar el cálculo por m³ y revisar si conviene hacerlo por etapas, con trompo o con premezclado.',
    },
  ],
  relatedSlugs: ['metalcon', 'ampliaciones', 'gasfiteria'],
};

export const metadata: Metadata = {
  title: 'Cimientos y Radieres en Maule | Linares, Talca, Longaví',
  description:
    'Cálculo y ejecución de cimientos, fundaciones y radieres en la Región del Maule. Comparativa entre trompo y camión premezclado. Desde $480.000.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/servicios/cimientos' },
  keywords: ['cimientos Maule', 'fundaciones Linares', 'radier Maule', 'cimientos residenciales'],
  openGraph: {
    title: 'Cimientos y Radieres en el Maule | Soluciones Fabrick',
    description: 'Cálculo por m³, comparativa de preparación y orientación clara antes de cotizar.',
    url: 'https://www.solucionesfabrick.com/servicios/cimientos',
    type: 'website',
  },
};

export default function CimientosPage() {
  return <ServicePage content={content} />;
}
