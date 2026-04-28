import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import ServicePage, { type ServicePageContent } from '@/components/ServicePage';

export const dynamic = 'force-dynamic';

const content: ServicePageContent = {
  slug: 'seguridad',
  eyebrow: 'Seguridad',
  heroTitle: 'Seguridad Residencial e Inteligente en el Maule',
  heroDescription:
    'Instalación de sistemas CCTV, domótica, control de acceso biométrico y alarmas para viviendas en Linares, Talca, Longaví y la Región del Maule. Protección 24/7 con tecnología inteligente configurada por expertos.',
  icon: ShieldCheck,
  serviceType: 'Sistemas de seguridad residencial',
  priceFrom: '$290.000',
  overview:
    'La seguridad de tu hogar y familia es nuestra prioridad. Diseñamos e instalamos sistemas completos de vigilancia CCTV con cámaras HD/4K, alarmas perimetrales, controles de acceso con huella dactilar o tarjeta RFID, y sistemas domóticos para control inteligente desde tu smartphone. Todo instalado, configurado y con soporte post-venta.',
  scope: [
    'Cámaras CCTV IP HD (2MP, 4MP o 4K) interior y exterior con visión nocturna',
    'DVR/NVR con almacenamiento local y acceso remoto desde smartphone',
    'Alarma perimetral con sensores de movimiento, vibración y apertura',
    'Cerraduras biométricas (huella, tarjeta RFID, código) y control de acceso',
    'Portones y barreras automáticas con control remoto y cámara de video-portería',
    'Domótica básica: control de luces, clima y enchufes vía app',
  ],
  process: [
    { step: 'Diagnóstico de seguridad', detail: 'Evaluamos los puntos vulnerables del hogar, accesos, ángulos ciegos y necesidades específicas para diseñar la solución óptima.' },
    { step: 'Instalación y configuración', detail: 'Nuestro equipo instala todos los dispositivos, pasa el cableado de forma ordenada y configura el sistema con acceso remoto desde tu teléfono.' },
    { step: 'Capacitación y soporte', detail: 'Te enseñamos a usar el sistema completo y te dejamos con soporte técnico disponible. Garantía de equipos y mano de obra incluida.' },
  ],
  faqs: [
    {
      question: '¿Puedo ver las cámaras desde mi teléfono?',
      answer:
        'Sí. Todos nuestros sistemas CCTV incluyen configuración de acceso remoto vía app (Hik-Connect, iVMS-4500 u otras). Puedes ver en tiempo real, revisar grabaciones anteriores y recibir alertas desde cualquier lugar.',
    },
    {
      question: '¿Cuántas cámaras necesito para mi casa?',
      answer:
        'Para una vivienda estándar recomendamos mínimo 4 cámaras: frente, patio trasero, entrada principal y garaje. El diseño exacto lo definimos en la visita de diagnóstico gratuita según el layout de tu hogar.',
    },
    {
      question: '¿Qué es la domótica y para qué sirve?',
      answer:
        'La domótica conecta los dispositivos eléctricos de tu hogar (luces, enchufes, climatización, cámaras) a una aplicación en tu teléfono. Puedes apagar luces olvidadas, verificar si cerraste la puerta o encender la calefacción antes de llegar a casa.',
    },
    {
      question: '¿El sistema de alarma funciona sin internet?',
      answer:
        'Sí. Las alarmas perimetrales funcionan de forma local y autónoma. El internet solo es necesario para las funciones remotas (notificaciones al celular y acceso a cámaras desde fuera de la red local).',
    },
    {
      question: '¿Incluye instalación de cableado o solo los equipos?',
      answer:
        'Incluye todo: cableado estructurado, instalación de equipos, configuración completa y capacitación. Entregamos el sistema listo para usar, sin que tengas que contratar a nadie más.',
    },
  ],
  relatedSlugs: ['electricidad', 'metalcon', 'gasfiteria'],
};

export const metadata: Metadata = {
  title: 'Seguridad Residencial e Inteligente en Maule | Linares, Talca',
  description:
    'Sistemas CCTV, alarmas, control de acceso biométrico y domótica para viviendas en la Región del Maule. Instalación completa. Desde $290.000.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/servicios/seguridad' },
  keywords: ['seguridad residencial Maule', 'CCTV Linares', 'alarmas Talca', 'domótica Maule', 'cámaras de seguridad Maule'],
  openGraph: {
    title: 'Seguridad Residencial e Inteligente en el Maule | Soluciones Fabrick',
    description: 'CCTV, alarmas, biométrico y domótica instalados y configurados en tu hogar. Desde $290.000.',
    url: 'https://www.solucionesfabrick.com/servicios/seguridad',
    type: 'website',
  },
};

export default function SeguridadPage() {
  return <ServicePage content={content} />;
}
