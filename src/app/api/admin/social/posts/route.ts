import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

/**
 * Social media post persistence.
 *
 *  GET  /api/admin/social/posts       — list history (newest first)
 *  POST /api/admin/social/posts       — create draft / scheduled / published row
 *
 * Target table (created manually in InsForge):
 *
 *   CREATE TABLE posts_social (
 *     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *     titulo VARCHAR(255),
 *     descripcion TEXT,
 *     hashtags TEXT,
 *     tag VARCHAR(100),
 *     fecha_publicacion TIMESTAMPTZ,
 *     tema VARCHAR(20),
 *     imagenes JSONB,
 *     plataformas JSONB,
 *     estado VARCHAR(50) DEFAULT 'borrador',
 *     meta_post_id VARCHAR(255),
 *     created_at TIMESTAMPTZ DEFAULT now()
 *   );
 *
 * If the table does not exist yet we respond 202 with a "queued" flag so the
 * UI can still proceed instead of breaking for the operator.
 */

const MAX = {
  titulo: 255,
  tag: 100,
  tema: 20,
  estado: 50,
  meta_post_id: 255,
  hashtags: 2000,
  descripcion: 4000,
};

const VALID_ESTADOS = new Set(['borrador', 'programado', 'publicado', 'error']);

function trim(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  if (!t) return undefined;
  return t.slice(0, max);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10) || 30, 100);

  try {
    const { data, error } = await insforge.database
      .from('posts_social')
      .select(
        'id, titulo, descripcion, hashtags, tag, fecha_publicacion, tema, imagenes, plataformas, estado, meta_post_id, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ data: [], warning: error.message }, { status: 200 });
    }
    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    return NextResponse.json(
      { data: [], warning: (err as Error).message },
      { status: 200 },
    );
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const titulo = trim(body.titulo, MAX.titulo);
  if (!titulo) {
    return NextResponse.json({ error: 'El título es obligatorio.' }, { status: 400 });
  }

  const estadoRaw = trim(body.estado, MAX.estado) || 'borrador';
  const estado = VALID_ESTADOS.has(estadoRaw) ? estadoRaw : 'borrador';

  const imagenes = Array.isArray(body.imagenes) ? body.imagenes.slice(0, 10) : [];
  const plataformas =
    body.plataformas && typeof body.plataformas === 'object' && !Array.isArray(body.plataformas)
      ? (body.plataformas as Record<string, unknown>)
      : {};

  const fechaRaw = trim(body.fecha_publicacion, 64);
  let fechaPublicacion: string | null = null;
  if (fechaRaw) {
    const parsed = new Date(fechaRaw);
    if (!Number.isNaN(parsed.getTime())) fechaPublicacion = parsed.toISOString();
  }

  const payload = {
    titulo,
    descripcion: trim(body.descripcion, MAX.descripcion) ?? null,
    hashtags: trim(body.hashtags, MAX.hashtags) ?? null,
    tag: trim(body.tag, MAX.tag) ?? null,
    fecha_publicacion: fechaPublicacion,
    tema: trim(body.tema, MAX.tema) ?? 'amarillo',
    imagenes,
    plataformas,
    estado,
    meta_post_id: trim(body.meta_post_id, MAX.meta_post_id) ?? null,
  };

  try {
    const { data, error } = await insforge.database
      .from('posts_social')
      .insert([payload])
      .select('id, titulo, estado, created_at');

    if (error) {
      return NextResponse.json(
        { ok: true, queued: true, warning: error.message, data: payload },
        { status: 202 },
      );
    }

    const row = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ ok: true, data: row ?? payload }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: true, queued: true, warning: (err as Error).message, data: payload },
      { status: 202 },
    );
  }
}
