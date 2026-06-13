import type { EditableSection, SectionImproveRequest } from '../types/section.types';

export function buildImproveSectionPrompt(request: SectionImproveRequest, section: EditableSection) {
  return `Eres un diseñador frontend senior y copywriter comercial. Debes mejorar SÓLO una sección HTML seleccionada sin regenerar toda la página.

SECCIÓN SELECCIONADA
ID: ${section.id}
Tipo: ${section.type}
Selector: ${section.selector}
Texto actual: ${section.text}
HTML actual:
${section.html}

INSTRUCCIÓN DEL USUARIO
${request.instruction}

CONTEXTO DEL PROSPECTO
${JSON.stringify(request.prospectContext || {}, null, 2)}

REGLAS CRÍTICAS
1. Responde SOLO JSON válido, sin markdown.
2. Devuelve exactamente estas claves: improvedHtml, summary, warnings.
3. improvedHtml debe contener únicamente el HTML reemplazo de la sección seleccionada.
4. No devuelvas documento completo, no incluyas <html>, <head> ni <body>.
5. Mantén o mejora los atributos data-sf-block/data-sf-editable existentes.
6. No elimines enlaces de WhatsApp, Instagram, formularios o botones si ya existen, salvo que el usuario lo pida.
7. Si mejoras diseño inline, usa clases/estructura segura, pero no dependas de frameworks externos.
8. No inventes testimonios reales, números legales o datos de contacto que no estén en el contexto.
9. Si la instrucción pide diseño, puedes agregar clases y estilos inline moderados dentro de la sección.
10. Si no puedes cumplir algo, explica en warnings.

FORMA JSON
{
  "improvedHtml": "<section data-sf-block=\"hero\">...</section>",
  "summary": "Mejoré el texto principal y reforcé el CTA.",
  "warnings": []
}`;
}
