import type { VideoEngineInput } from '../types/video-engine.types';

const kindLabels: Record<VideoEngineInput['kind'], string> = {
  promotional:   'video promocional',
  educational:   'video educativo',
  before_after:  'video de antes y después',
  testimonial:   'video testimonial',
  offer:         'video de oferta comercial',
  institutional: 'video institucional',
};

const styleLabels: Record<VideoEngineInput['visualStyle'], string> = {
  premium:        'premium, elegante y confiable',
  technical:      'técnico, claro y profesional',
  realistic:      'realista, con sensación de escena real',
  minimal:        'minimalista, limpio y moderno',
  cinematic:      'cinematográfico y emocional',
  dark_editorial: 'editorial oscuro, sofisticado y táctil',
};

const JSON_SCHEMA = [
  'Devuelve SOLO el JSON, sin markdown, sin texto adicional. Estructura exacta:',
  '{"title":"","description":"","duration":0,"format":"9:16","voiceover":"","scenes":[{"id":1,"start":0,"end":5,"visual_prompt":"","screen_text":"","voiceover":"","transition":"fade-up","background_style":"dark-grid"}],"cta":"","hashtags":[]}',
  'background_style válidos: dark-grid, blueprint, metal, premium, concrete, cinematic, minimal, technical',
  'transition válidos: fade-up, fade-down, slide-left, slide-right, zoom-in, zoom-out, cut, dissolve',
].join('\n');

export function buildVideoPrompt(input: VideoEngineInput): string {
  const sceneRule = input.sceneCount
    ? `Divide en EXACTAMENTE ${input.sceneCount} escenas distribuyendo los ${input.duration} segundos de forma pareja.`
    : 'Divide el tiempo en escenas de 3 a 6 segundos cada una.';

  // Free-form mode: user controls the entire prompt
  if (input.freePrompt?.trim()) {
    return [
      input.freePrompt.trim(),
      '',
      `Formato de video: ${input.format}`,
      `Duración total: ${input.duration} segundos`,
      sceneRule,
      '',
      JSON_SCHEMA,
    ].join('\n');
  }

  // Structured mode
  const audience = input.audience || 'personas interesadas en el tema';
  const cta      = input.cta      || 'Contacta para más información';

  return [
    `Crea un ${kindLabels[input.kind]} para redes sociales.`,
    `Tema: ${input.topic}`,
    ...(input.pageUrl ? [`Referencia de página web: ${input.pageUrl}`] : []),
    `Formato: ${input.format}`,
    `Duración total: ${input.duration} segundos`,
    `Público objetivo: ${audience}`,
    `Estilo visual: ${styleLabels[input.visualStyle]}`,
    `CTA: ${cta}`,
    sceneRule,
    'Texto en pantalla: máximo 6 palabras por escena. Voz cercana y directa.',
    '',
    JSON_SCHEMA,
  ].join('\n');
}
