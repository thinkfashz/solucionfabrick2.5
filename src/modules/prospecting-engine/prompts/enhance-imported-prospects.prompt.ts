import type { LocalDetectedProspect } from '../types/import.types';

export function buildEnhanceImportedProspectsPrompt(params: {
  sourceName?: string;
  rawText?: string;
  localProspects: LocalDetectedProspect[];
}) {
  const local = params.localProspects.slice(0, 80).map((prospect, index) => ({
    index,
    brand: prospect.brand,
    industry: prospect.industry,
    city: prospect.city,
    instagram: prospect.instagram,
    facebook: prospect.facebook,
    website: prospect.website,
    whatsapp: prospect.whatsapp,
    email: prospect.email,
    followers: prospect.followers,
    problem_detected: prospect.problem_detected,
    opportunity: prospect.opportunity,
    probability_level: prospect.probability_level,
    score: prospect.score,
    notes: prospect.notes,
    confidence: prospect.confidence,
    raw_block: prospect.raw_block?.slice(0, 1400),
  }));

  return `Eres un normalizador comercial para un motor de prospección. Recibirás prospectos detectados localmente desde un archivo HTML/JSON/TXT. Tu trabajo es limpiar, separar y mejorar los datos SIN inventar hechos que no estén soportados por el texto.

ARCHIVO FUENTE
${params.sourceName || 'archivo local'}

PROSPECTOS DETECTADOS LOCALMENTE
${JSON.stringify(local, null, 2)}

TEXTO FUENTE RECORTADO
${(params.rawText || '').slice(0, 12000)}

REGLAS
1. Responde SOLO JSON válido, sin markdown.
2. Devuelve un objeto con la clave prospects.
3. Mantén el mismo orden cuando sea posible.
4. No inventes teléfonos, emails, webs o seguidores si no aparecen.
5. Sí puedes mejorar redacción de problem_detected y opportunity.
6. Calcula probability_level como alta, media o baja según señales comerciales.
7. Calcula score entre 0 y 100.
8. Cada prospecto debe tener: brand, industry, city, instagram, facebook, website, whatsapp, email, followers, problem_detected, opportunity, probability_level, score, status, notes.
9. status debe ser nuevo salvo que el texto indique otro estado.
10. Si hay beneficios/ventajas/desventajas en el texto, inclúyelos dentro de notes y metadata.

FORMA ESPERADA
{
  "prospects": [
    {
      "brand": "...",
      "industry": "...",
      "city": "...",
      "instagram": "...",
      "facebook": "...",
      "website": "...",
      "whatsapp": "...",
      "email": "...",
      "followers": "...",
      "problem_detected": "...",
      "opportunity": "...",
      "probability_level": "alta",
      "score": 85,
      "status": "nuevo",
      "notes": "...",
      "metadata": {"ai_enhanced": true}
    }
  ]
}`;
}
