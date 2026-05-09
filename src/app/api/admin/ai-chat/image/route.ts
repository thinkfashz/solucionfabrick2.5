import { NextResponse, type NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { generateImage } from '@/lib/openrouter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HARD_MAX_PROMPT_CHARS = 4_000;

interface ImageBody {
  thread_id?: unknown;
  model?: unknown;
  prompt?: unknown;
  allow_paid?: unknown;
}

/**
 * POST /api/admin/ai-chat/image
 *
 * Genera una imagen vía OpenRouter (modelo image-out, modalities=
 * ['image','text']). Persiste el resultado como mensaje de assistant
 * con `attachments[*].type='image'`. El cliente se encarga de subirlo a
 * Cloudinary si así lo desea (POST /api/admin/cloudinary) — esta API
 * no se acopla a Cloudinary.
 */
export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  let body: ImageBody;
  try {
    body = (await request.json()) as ImageBody;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const threadId = typeof body.thread_id === 'string' ? body.thread_id : '';
  const model = typeof body.model === 'string' && body.model.trim().length > 0 ? body.model.trim() : undefined;
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!threadId) return NextResponse.json({ error: 'thread_id requerido' }, { status: 400 });
  if (!prompt) return NextResponse.json({ error: 'prompt requerido' }, { status: 400 });
  if (prompt.length > HARD_MAX_PROMPT_CHARS) {
    return NextResponse.json({ error: `prompt excede ${HARD_MAX_PROMPT_CHARS} caracteres` }, { status: 400 });
  }

  let result;
  try {
    result = await generateImage({
      preferredModel: model,
      prompt,
      allowPaid: body.allow_paid === true,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }

  // Persistimos el mensaje del usuario (prompt) y la respuesta como
  // mensajes en el hilo. Las imágenes se guardan dentro de
  // `attachments` como objetos {type:'image', dataUrl, mimeType}.
  const client = getAdminInsforge();
  try {
    await client.database.from('ai_chat_messages').insert([
      {
        thread_id: threadId,
        role: 'user',
        content: prompt,
        model: result.model,
      },
    ]);
  } catch { /* best-effort */ }

  const attachments = result.images.map((img) => ({
    type: 'image' as const,
    dataUrl: img.dataUrl,
    mimeType: img.mimeType,
  }));
  try {
    await client.database.from('ai_chat_messages').insert([
      {
        thread_id: threadId,
        role: 'assistant',
        content: result.text || `🖼️ Imagen generada con ${result.model}`,
        model: result.model,
        tokens_in: result.usage.prompt_tokens,
        tokens_out: result.usage.completion_tokens,
        attachments: attachments.length ? attachments : null,
      },
    ]);
  } catch (err) {
    return adminError((err as Error).message ?? 'Error al persistir', 'INTERNAL_ERROR', 500);
  }
  try {
    await client.database
      .from('ai_chat_threads')
      .update({ updated_at: new Date().toISOString(), model: result.model })
      .eq('id', threadId);
  } catch { /* best-effort */ }

  return NextResponse.json({
    ok: true,
    model: result.model,
    text: result.text,
    images: result.images,
    tried: result.tried,
    latency_ms: result.latency_ms,
    usage: result.usage,
  });
}
