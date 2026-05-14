import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, adminUnauthorized, getAdminInsforge } from '@/lib/adminApi';
import { MAX_SOCIAL_IMAGES } from '@/lib/social';

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
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10) || 30, 100);

  try {
    const client = getAdminInsforge();
    const { data, error } = await client.database
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
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

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

  const imagenes = Array.isArray(body.imagenes) ? body.imagenes.slice(0, MAX_SOCIAL_IMAGES) : [];
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
    const client = getAdminInsforge();
    const { data, error } = await client.database
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
