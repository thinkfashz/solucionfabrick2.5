import type { Metadata } from 'next';
import { Building2 } from 'lucide-react';
import ServicePage, { type ServicePageContent } from '@/components/ServicePage';

export const dynamic = 'force-dynamic';

const content: ServicePageContent = {
  slug: 'ampliaciones',
  eyebrow: 'Ampliaciones',
  heroTitle: 'Ampliaciones por etapas y con presupuesto claro',
  heroDescription:
    'Te guiamos para ordenar una ampliación según medidas, uso, materiales y presupuesto disponible antes de comprometer un valor final.',
  icon: Building2,
  serviceType: 'Ampliaciones residenciales por etapas',
  priceFrom: '$2.500.000',
  overview:
    'Ampliar una casa se vuelve difícil cuando no se separan las etapas. Organizamos estructura, instalaciones y terminaciones para que puedas decidir qué hacer primero y qué dejar para después.',
  scope: [
    'Revisión de medidas, fotos, acceso y uso del nuevo espacio',
    'Separación de partidas: base, estructura, instalaciones y terminaciones',
    'Orientación sobre materialidad según presupuesto y objetivo',
    'Coordinación de electricidad, gasfitería o revestimientos si aplica',
    'Presupuesto por etapas para evitar sorpresas',
    'Acompañamiento para priorizar lo esencial antes de los detalles',
  ],
  process: [
    { step: 'Definir objetivo', detail: 'Vemos qué quieres lograr: dormitorio, baño, logia, quincho, bodega o segundo nivel.' },
    { step: 'Ordenar etapas', detail: 'Separamos lo urgente, lo estructural y las terminaciones para ajustar el presupuesto.' },
    { step: 'Ejecutar y revisar', detail: 'Avanzamos por tramos claros, revisando cambios antes de seguir gastando.' },
  ],
  faqs: [
    {
      question: '¿Puedo hacer una ampliación por etapas?',
      answer:
        'Sí. De hecho, suele ser mejor partir por base, estructura y cierres principales antes de entrar a terminaciones más caras.',
    },
    {
      question: '¿La calculadora sirve para saber el total final?',
      answer:
        'Sirve como referencia inicial por m². El valor final depende de base, estructura, instalaciones, terminaciones, acceso y cambios durante la obra.',
    },
    {
      question: '¿Qué debo definir antes de cotizar?',
      answer:
        'Medidas aproximadas, uso del espacio, nivel de terminación deseado y si tendrá agua, electricidad, baño o cocina.',
    },
    {
      question: '¿Puedo comprar algunos productos aparte?',
      answer:
        'Sí. Podemos separar productos, artefactos o terminaciones para que decidas qué compras tú y qué gestiona el equipo.',
    },
  ],
  relatedSlugs: ['metalcon', 'gasfiteria', 'electricidad'],
};

export const metadata: Metadata = {
  title: 'Ampliaciones de Casa en el Maule | Por Etapas',
  description:
    'Ampliaciones residenciales por etapas en Linares, Longaví y Talca. Cálculo referencial por m² y presupuesto separado por partidas.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/servicios/ampliaciones' },
  keywords: ['ampliación casa Maule', 'ampliación Linares', 'ampliación Longaví', 'segundo piso Chile', 'ampliar casa por etapas'],
  openGraph: {
    title: 'Ampliaciones por etapas en el Maule | Soluciones Fabrick',
    description: 'Ordenamos base, estructura, instalaciones y terminaciones para cotizar mejor.',
    url: 'https://www.solucionesfabrick.com/servicios/ampliaciones',
    type: 'website',
  },
};

export default function AmpliacionesPage() {
  return <ServicePage content={content} />;
}
