import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import { insforgeAdmin } from '@/lib/insforge';
import { v, parse, validationError } from '@/lib/validate';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const draftSchema = {
  title: v.string({ required: true, min: 4, max: 200 }),
  focus: v.string({ max: 1000 }),
  length: v.string({ max: 20 }),
};

const SYSTEM = [
  'Eres un redactor técnico chileno de construcción (Soluciones Fabrick, Linares).',
  'Escribes borradores de blog en Markdown con estructura: ## subtítulos cada 150-250 palabras,',
  'párrafos de 2-4 líneas, una lista donde aporte, y cierre con invitación a cotizar.',
  'REGLAS DURAS:',
  '- No inventes precios, medidas, pesos, dosificaciones ni normativas. Si no tienes el dato, escribe "[verificar]" en su lugar.',
  '- No uses clichés de IA (elevar, seamless, unleash, next-gen, game-changer, delve, tapestry).',
  '- Español chileno claro, sin modismos forzados. Sin emojis en el cuerpo.',
  '- Título H1 solo si se pide; por defecto entrega desde el primer ##.',
  '- Longitud: corto ~350 palabras, medio ~700, largo ~1200.',
].join('\n');

/**
 * Genera un borrador con IA (InsForge, sin credenciales nuevas). Solo admin.
 * El borrador siempre es punto de partida: la skill de calidad del blog
 * (`blog-quality`) define la verificación obligatoria antes de publicar.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const raw = await request.json().catch(() => ({}));
    const result = parse(draftSchema, raw);
    if (!result.ok) return validationError(result.errors);
    const d = result.data as { title: string; focus?: string; length?: string };
    const length = ['corto', 'medio', 'largo'].includes((d.length || '').toLowerCase())
      ? (d.length as string).toLowerCase()
      : 'medio';

    const model = process.env.BLOG_AI_MODEL || 'gpt-4o-mini';
    const completion = await insforgeAdmin.ai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `Título de trabajo: ${d.title}\nEnfoque: ${d.focus || 'guía práctica para un dueño de casa en Chile'}\nLongitud: ${length}.\nDevuelve SOLO el Markdown del artículo, sin explicaciones.`,
        },
      ],
    });
    const content = completion?.choices?.[0]?.message?.content?.trim() || '';
    if (!content) {
      return NextResponse.json(
        { error: 'La IA no devolvió contenido. Revisa el modelo configurado (BLOG_AI_MODEL) e intenta de nuevo.', code: 'AI_EMPTY' },
        { status: 502 },
      );
    }
    return NextResponse.json({ draft: content, model });
  } catch (err) {
    return adminError(err, 'BLOG_DRAFT_FAILED');
  }
}
