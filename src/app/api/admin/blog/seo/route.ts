import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import { insforgeAdmin } from '@/lib/insforge';
import { extractDescription, extractKeywords } from '@/lib/blogSeo';
import { v, parse, validationError } from '@/lib/validate';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const seoSchema = {
  title: v.string({ required: true, min: 4, max: 200 }),
  body_md: v.string({ max: 50000 }),
};

const SYSTEM = [
  'Eres un especialista SEO chileno para un blog de construcción (Soluciones Fabrick).',
  'Devuelve SOLO un JSON con esta forma exacta, sin explicaciones ni markdown:',
  '{"title": "título optimizado máx 60 caracteres", "description": "descripción 120-155 caracteres con la palabra clave principal", "tags": ["palabra1", "palabra2", "...máx 8"]}',
  'REGLAS: español chileno claro; sin clichés de IA; el título promete solo lo que el contenido cumple;',
  'la descripción termina con un motivo para hacer clic; los tags son minúsculas sin tildes raras.',
].join('\n');

/**
 * Mejora el SEO de un borrador con IA (InsForge). Si la IA falla, devuelve
 * el SEO determinístico para que el flujo nunca se bloquee.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const raw = await request.json().catch(() => ({}));
    const result = parse(seoSchema, raw);
    if (!result.ok) return validationError(result.errors);
    const d = result.data as { title: string; body_md?: string };
    const body = d.body_md || '';

    const fallback = {
      title: d.title.slice(0, 60),
      description: extractDescription(body, d.title),
      tags: extractKeywords(body, d.title),
      source: 'deterministic' as const,
    };

    try {
      const model = process.env.BLOG_AI_MODEL || 'gpt-4o-mini';
      const completion = await insforgeAdmin.ai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Título actual: ${d.title}\nContenido:\n${body.slice(0, 6000)}` },
        ],
      });
      const text = completion?.choices?.[0]?.message?.content?.trim() || '';
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start < 0 || end <= start) return NextResponse.json({ ...fallback, model });
      const parsed = JSON.parse(text.slice(start, end + 1)) as { title?: unknown; description?: unknown; tags?: unknown };
      return NextResponse.json({
        title: String(parsed.title || fallback.title).slice(0, 60),
        description: String(parsed.description || fallback.description).slice(0, 160),
        tags: (Array.isArray(parsed.tags) ? parsed.tags.map(String) : fallback.tags).slice(0, 8),
        source: 'ai' as const,
        model,
      });
    } catch {
      return NextResponse.json(fallback);
    }
  } catch (err) {
    return adminError(err, 'BLOG_SEO_FAILED');
  }
}
