import type { GeneratedVideoPlan } from '../types/video-engine.types';

export const fallbackVideoPlan: GeneratedVideoPlan = {
  title: 'Construye con confianza',
  description: 'Pieza visual base para Soluciones Fabrick cuando la IA no entrega una respuesta valida.',
  duration: 30,
  format: '9:16',
  voiceover:
    'En Soluciones Fabrick transformamos tus ideas en espacios reales, modernos y funcionales.',
  scenes: [
    {
      id: 1,
      start: 0,
      end: 5,
      visual_prompt: 'Estructura metalcon moderna sobre fondo oscuro con lineas tecnicas.',
      screen_text: 'Construye seguro',
      voiceover: 'Todo gran proyecto empieza con una estructura bien pensada.',
      transition: 'fade-up',
      background_style: 'dark-grid',
    },
    {
      id: 2,
      start: 5,
      end: 11,
      visual_prompt: 'Detalle tactil de perfiles metalicos y plano arquitectonico.',
      screen_text: 'Metalcon + precision',
      voiceover: 'Trabajamos con soluciones modernas para ampliar y remodelar mejor.',
      transition: 'slide-left',
      background_style: 'blueprint',
    },
    {
      id: 3,
      start: 11,
      end: 18,
      visual_prompt: 'Casa moderna con ampliacion limpia y terminaciones premium.',
      screen_text: 'Espacios que crecen contigo',
      voiceover: 'Creamos espacios funcionales para que tu hogar se adapte a tu vida.',
      transition: 'zoom-in',
      background_style: 'premium-gradient',
    },
    {
      id: 4,
      start: 18,
      end: 30,
      visual_prompt: 'Marca Soluciones Fabrick con llamado a cotizar proyecto.',
      screen_text: 'Cotiza tu proyecto',
      voiceover: 'Hablemos de tu idea y llevemos tu proyecto al siguiente nivel.',
      transition: 'fade-up',
      background_style: 'metal-texture',
    },
  ],
  cta: 'Cotiza con Soluciones Fabrick',
  hashtags: ['#SolucionesFabrick', '#Metalcon', '#ConstruccionChile', '#Remodelaciones'],
};
