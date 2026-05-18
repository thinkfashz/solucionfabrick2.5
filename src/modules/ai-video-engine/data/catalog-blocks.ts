export interface CatalogBlock {
  id: string;
  name: string;
  description: string;
  /** keyword used in background_style — must match sceneGradient() / HyperFrameStrip bg() */
  styleKeyword: string;
  sample_screen_text: string;
  sample_voiceover: string;
  sample_visual_prompt: string;
  /** Tailwind gradient classes for thumbnail chip (2-stop, no via) */
  gradientClasses: string;
  /** Suggested search term for free stock image sites */
  unsplash_hint: string;
}

export const CATALOG_BLOCKS: CatalogBlock[] = [
  {
    id: 'blueprint',
    name: 'Blueprint',
    description: 'Técnico y arquitectónico — azul noche',
    styleKeyword: 'blueprint',
    sample_screen_text: 'Diseño con precisión',
    sample_voiceover: 'Cada proyecto comienza con un plano perfectamente trazado.',
    sample_visual_prompt: 'Technical blueprint overlay, architectural drawings, cool blue tones, dark background',
    gradientClasses: 'from-sky-950 to-zinc-950',
    unsplash_hint: 'architecture blueprint technical',
  },
  {
    id: 'metal',
    name: 'Metal',
    description: 'Industrial y moderno — gris acero',
    styleKeyword: 'metal',
    sample_screen_text: 'Construido para durar',
    sample_voiceover: 'Acero y metalcon de la más alta calidad para tu obra.',
    sample_visual_prompt: 'Steel structure, metallic textures, industrial gray tones, modern construction',
    gradientClasses: 'from-zinc-800 to-zinc-950',
    unsplash_hint: 'steel construction metal industrial',
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Lujo y exclusividad — dorado',
    styleKeyword: 'premium',
    sample_screen_text: 'Calidad sin igual',
    sample_voiceover: 'Una solución premium para quienes exigen lo mejor en construcción y diseño.',
    sample_visual_prompt: 'Luxury interior, gold accents, premium materials, warm lighting, elegant space',
    gradientClasses: 'from-yellow-950 to-zinc-950',
    unsplash_hint: 'luxury interior design gold',
  },
  {
    id: 'concrete',
    name: 'Concreto',
    description: 'Sólido y natural — piedra',
    styleKeyword: 'concrete',
    sample_screen_text: 'Solidez garantizada',
    sample_voiceover: 'La solidez del concreto combinada con el diseño moderno de Soluciones Fabrick.',
    sample_visual_prompt: 'Concrete texture, stone surfaces, raw materiality, natural tones, brutalist architecture',
    gradientClasses: 'from-stone-800 to-zinc-950',
    unsplash_hint: 'concrete architecture brutalist',
  },
  {
    id: 'cinematic',
    name: 'Cinemático',
    description: 'Dramático y emocional — ámbar',
    styleKeyword: 'cinematic',
    sample_screen_text: 'Una historia que inspira',
    sample_voiceover: 'Cada detalle cuenta una historia de transformación, calidad y visión.',
    sample_visual_prompt: 'Cinematic wide shot, dramatic lighting, amber film grain, professional photography',
    gradientClasses: 'from-amber-950 to-zinc-950',
    unsplash_hint: 'cinematic architecture dramatic lighting',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Limpio y elegante — zinc oscuro',
    styleKeyword: 'minimal',
    sample_screen_text: 'Menos es más',
    sample_voiceover: 'Diseño minimalista que resalta la esencia de tu espacio y estilo de vida.',
    sample_visual_prompt: 'Clean minimal space, dark background, simple geometry, negative space, modern design',
    gradientClasses: 'from-zinc-900 to-black',
    unsplash_hint: 'minimal modern interior clean',
  },
  {
    id: 'technical',
    name: 'Técnico',
    description: 'Datos y especificaciones — cian',
    styleKeyword: 'technical',
    sample_screen_text: 'Ingeniería de precisión',
    sample_voiceover: 'Los datos hablan por sí solos — especificaciones técnicas en cada detalle del proyecto.',
    sample_visual_prompt: 'Technical diagrams, engineering specifications, cyan data visualization, dark UI',
    gradientClasses: 'from-sky-950 to-zinc-950',
    unsplash_hint: 'engineering technical data visualization',
  },
];
