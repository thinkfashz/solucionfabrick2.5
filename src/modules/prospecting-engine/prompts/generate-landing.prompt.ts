import { getNichePreset } from '../config/niches';
import type { LandingGenerationRequest } from '../types/page.types';
import type { ProspectRecord } from '../types/prospect.types';

function clean(value: unknown) {
  return String(value ?? '').trim();
}

export function buildGenerateLandingPrompt(input: LandingGenerationRequest, prospect: Partial<ProspectRecord>) {
  const niche = getNichePreset(input.niche || prospect.industry || undefined);
  const tone = clean(input.tone || 'premium');
  const goal = clean(input.goal || niche.goal);
  const images = Array.isArray(input.images) ? input.images.filter(Boolean).slice(0, 12) : [];
  const prompt = clean(input.prompt);

  return `Eres un diseñador senior, copywriter comercial y desarrollador frontend experto en landing pages de prospección.

OBJETIVO
Crear una landing page HTML completa para mostrarle una demo comercial a un prospecto. La página debe ser premium, mobile-first, clara, rápida de entender y orientada a que el prospecto quiera responder por WhatsApp o agendar una reunión.

DATOS DEL PROSPECTO
- Marca: ${clean(prospect.brand)}
- Cliente/contacto: ${clean(prospect.client_name)}
- Rubro: ${clean(prospect.industry || niche.label)}
- Ciudad: ${clean(prospect.city)}
- Instagram: ${clean(prospect.instagram)}
- Facebook: ${clean(prospect.facebook)}
- Web: ${clean(prospect.website)}
- WhatsApp: ${clean(prospect.whatsapp)}
- Seguidores: ${clean(prospect.followers)}
- Problema detectado: ${clean(prospect.problem_detected)}
- Oportunidad: ${clean(prospect.opportunity)}
- Probabilidad: ${clean(prospect.probability_level)}
- Score: ${clean(prospect.score)}
- Notas: ${clean(prospect.notes)}

NICHO Y TONO
- Nicho preset: ${niche.label}
- Objetivo: ${goal}
- Tono visual: ${tone}
- Dirección visual: ${niche.visualDirection}
- Secciones sugeridas: ${niche.sections.join(', ')}

IMÁGENES DISPONIBLES
${images.length ? images.map((url, i) => `${i + 1}. ${url}`).join('\n') : 'No hay imágenes disponibles. Usa placeholders remotos seguros de Unsplash o placehold.co.'}

INSTRUCCIÓN EXTRA DEL USUARIO
${prompt || 'Generar una demo comercial lista para publicar.'}

REGLAS TÉCNICAS
1. Responde SOLO JSON válido, sin markdown, sin comentarios y sin texto fuera del JSON.
2. El JSON debe tener exactamente estas claves: title, html, css, js, shareTitle, shareDescription, whatsappMessage, emailSubject, emailBody, sections, reasoning.
3. html debe ser un fragmento de body o una estructura completa semántica, sin incluir scripts externos peligrosos.
4. css debe ser completo, responsive, elegante, sin depender de frameworks externos.
5. js debe ser seguro y útil: menú, agenda, tabs, modales, scroll suave o botones; si no hace falta, puede ser string vacío.
6. Debe incluir atributos data-sf-block y data-sf-editable en secciones importantes para el futuro editor por selección.
7. Debe incluir CTA a WhatsApp si hay número disponible, y a Instagram si hay Instagram.
8. No inventes datos legales ni testimonios reales. Usa textos comerciales honestos.
9. El diseño debe estar centrado, sin overflow horizontal, y funcionar en móvil.
10. sections debe ser array de objetos con id, name, purpose.

FORMA JSON ESPERADA
{
  "title": "...",
  "html": "...",
  "css": "...",
  "js": "...",
  "shareTitle": "...",
  "shareDescription": "...",
  "whatsappMessage": "...",
  "emailSubject": "...",
  "emailBody": "...",
  "sections": [{"id":"hero","name":"Hero","purpose":"Captar atención"}],
  "reasoning": "Resumen corto de la estrategia comercial y visual."
}`;
}
