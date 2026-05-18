import type { VideoEngineInput } from '../types/video-engine.types';

const kindLabels: Record<VideoEngineInput['kind'], string> = {
  promotional: 'video promocional',
  educational: 'video educativo',
  before_after: 'video de antes y despues',
  testimonial: 'video testimonial',
  offer: 'video de oferta comercial',
  institutional: 'video institucional',
};

const styleLabels: Record<VideoEngineInput['visualStyle'], string> = {
  premium: 'premium, elegante y confiable',
  technical: 'tecnico, claro y profesional',
  realistic: 'realista, con sensacion de obra real',
  minimal: 'minimalista, limpio y moderno',
  cinematic: 'cinematografico y emocional',
  dark_editorial: 'editorial oscuro, blanco y negro, tactil y sofisticado',
};

export function buildVideoPrompt(input: VideoEngineInput) {
  const audience = input.audience || 'personas que quieren construir, ampliar o remodelar con confianza';
  const cta = input.cta || 'Cotiza tu proyecto con Soluciones Fabrick';

  return [
    'Actua como director creativo y guionista para Soluciones Fabrick.',
    'La marca trabaja construccion, metalcon, ampliaciones, remodelaciones y estructuras.',
    `Crea un ${kindLabels[input.kind]} para redes sociales.`,
    `Tema: ${input.topic}`,
    ...(input.pageUrl ? [`Referencia de pagina web: ${input.pageUrl}`] : []),
    `Formato: ${input.format}`,
    `Duracion total: ${input.duration} segundos`,
    `Publico objetivo: ${audience}`,
    `Estilo visual: ${styleLabels[input.visualStyle]}`,
    `CTA: ${cta}`,
    'Reglas: divide en escenas de 3 a 6 segundos, usa texto corto en pantalla y voz cercana.',
    'Evita promesas tecnicas absolutas sin evaluacion profesional.',
    'Devuelve solo JSON valido con title, description, duration, format, voiceover, scenes, cta y hashtags.',
    'Cada escena debe tener id, start, end, visual_prompt, screen_text, voiceover, transition y background_style.',
  ].join('\n');
}
