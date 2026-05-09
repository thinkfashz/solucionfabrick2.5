import { NextResponse, type NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { chatCompletionWithFallback, type ChatMessage } from '@/lib/openrouter';
import { formatSnippetsForPrompt, readRepoFiles, UnsafePathError } from '@/lib/repoCodeContext';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ChatBody {
  thread_id?: unknown;
  model?: unknown;
  user_message?: unknown;
  system_prompt?: unknown;
  /** Archivos del repo a incluir como contexto. */
  attachments?: unknown;
  temperature?: unknown;
  max_tokens?: unknown;
  /** Si true, permite que el fallback considere modelos de pago baratos. */
  allow_paid?: unknown;
}

const HARD_MAX_USER_CHARS = 12_000;
const HARD_MAX_TOTAL_TOKENS = 4096;

/**
 * POST /api/admin/ai-chat
 *
 * Envía un mensaje al asistente IA del admin (proxy a OpenRouter).
 * Persiste tanto el mensaje del usuario como la respuesta en
 * `ai_chat_messages`. Si se especifica `attachments` (rutas del repo
 * dentro de la whitelist), las inyecta en el prompt como contexto.
 */
export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const threadId = typeof body.thread_id === 'string' ? body.thread_id : '';
  const model = typeof body.model === 'string' ? body.model.trim() : '';
  const userText = typeof body.user_message === 'string' ? body.user_message.trim() : '';
  const systemPrompt = typeof body.system_prompt === 'string' ? body.system_prompt.trim() : '';
  const temperature = typeof body.temperature === 'number' ? Math.max(0, Math.min(2, body.temperature)) : 0.6;
  const maxTokens = typeof body.max_tokens === 'number'
    ? Math.max(64, Math.min(HARD_MAX_TOTAL_TOKENS, Math.floor(body.max_tokens)))
    : 1024;

  if (!threadId) return NextResponse.json({ error: 'thread_id requerido' }, { status: 400 });
  if (!model) return NextResponse.json({ error: 'model requerido' }, { status: 400 });
  if (!userText) return NextResponse.json({ error: 'user_message requerido' }, { status: 400 });
  if (userText.length > HARD_MAX_USER_CHARS) {
    return NextResponse.json({ error: `Mensaje excede ${HARD_MAX_USER_CHARS} caracteres` }, { status: 400 });
  }

  // Cargar historial existente del hilo
  const client = getAdminInsforge();
  const { data: history } = await client.database
    .from('ai_chat_messages')
    .select('role,content')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(40);

  const messages: ChatMessage[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  for (const m of (history ?? []) as ChatMessage[]) {
    if (m.role === 'system' || m.role === 'user' || m.role === 'assistant') {
      messages.push({ role: m.role, content: m.content });
    }
  }

  // Adjuntos: leer archivos del repo y agregar al final del user message.
  let userMessageWithContext = userText;
  let attachments: Array<{ path: string; bytes: number; truncated: boolean }> = [];
  if (Array.isArray(body.attachments) && body.attachments.length > 0) {
    const paths = body.attachments.filter((p): p is string => typeof p === 'string');
    try {
      const snippets = await readRepoFiles(paths);
      attachments = snippets.map(({ path: p, bytes, truncated }) => ({ path: p, bytes, truncated }));
      const block = formatSnippetsForPrompt(snippets);
      if (block) userMessageWithContext = `${userText}\n\n---\n${block}`;
    } catch (err) {
      if (err instanceof UnsafePathError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      return adminError((err as Error).message ?? 'Error leyendo archivos', 'INTERNAL_ERROR', 500);
    }
  }

  messages.push({ role: 'user', content: userMessageWithContext });

  // Persistir mensaje del usuario antes de llamar al modelo (para
  // recuperarlo si la llamada falla).
  try {
    await client.database
      .from('ai_chat_messages')
      .insert([
        {
          thread_id: threadId,
          role: 'user',
          content: userText,
          model,
          attachments: attachments.length ? attachments : null,
        },
      ]);
  } catch { /* best-effort */ }

  let result;
  try {
    result = await chatCompletionWithFallback({
      preferredModel: model,
      messages,
      temperature,
      maxTokens,
      allowPaid: body.allow_paid === true,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }

  // Persistir respuesta
  try {
    await client.database
      .from('ai_chat_messages')
      .insert([
        {
          thread_id: threadId,
          role: 'assistant',
          content: result.text,
          model: result.model,
          tokens_in: result.usage.prompt_tokens,
          tokens_out: result.usage.completion_tokens,
        },
      ]);
  } catch { /* best-effort */ }

  // Refrescar timestamp del hilo (para ordenarlo arriba)
  try {
    await client.database
      .from('ai_chat_threads')
      .update({ updated_at: new Date().toISOString(), model })
      .eq('id', threadId);
  } catch { /* best-effort */ }

  return NextResponse.json({
    ok: true,
    answer: result.text,
    model: result.model,
    usage: result.usage,
    attachments,
    tried: result.tried,
    latency_ms: result.latency_ms,
  });
}
