import { NextResponse, type NextRequest } from 'next/server';
import { chatCompletionWithFallback, type ChatMessage } from '@/lib/openrouter';
import { getClientIp } from '@/lib/adminAuth';
import { checkPersistentRateLimit } from '@/lib/adminRateLimitStore';
import { campaignBusyHeaders, getCampaignMode, publicAiChatEnabled } from '@/lib/campaignMode';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/agent/chat — endpoint público del asistente IA del sitio.
 *
 * Característica clave: usa `chatCompletionWithFallback` para que si el
 * modelo gratuito preferido falla / está caído / responde 429, se prueben
 * automáticamente otros modelos gratuitos sin que el usuario lo note.
 * El frontend sólo recibe la respuesta final.
 *
 * Restricciones:
 *  - Sin auth: pensado para visitantes anónimos del sitio público.
 *  - Rate limit persistente por IP: máx. 20 mensajes / 5 minutos.
 *    Reusa el store existente para evitar instalar Redis/KV en esta fase.
 *    Para límites estrictos globales a escala enterprise, migrar este bucket
 *    a Redis/KV administrado en el módulo de infraestructura.
 *  - Modo campaña: FABRICK_CAMPAIGN_MODE=limited/catalog pausa el chat IA.
 *  - Cuerpo máximo: 32 KB para evitar payloads abusivos.
 *  - Ventana de contexto acotada: últimos 12 mensajes del cliente
 *    (≈6 turnos completos user→assistant).
 *  - Mensajes máximo 2.000 caracteres.
 */

interface AgentBody {
  messages?: unknown;
}

interface ClientMsg { role: 'user' | 'assistant'; content: string }

/** Máximo de MENSAJES (no turnos) que se reenvían al modelo. 12 ≈ 6 turnos. */
const MAX_MESSAGES_TO_AI = 12;
const MAX_USER_CHARS = 2_000;
const MAX_BODY_BYTES = 32 * 1024;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

const SYSTEM_PROMPT = `Eres "Fabri", el asistente virtual de Soluciones Fabrick — empresa chilena de construcción y remodelación residencial con sede en Linares, Región del Maule. Llevas 9 años acompañando familias en sus proyectos.

Tu rol: responder consultas de visitantes del sitio sobre construcción, remodelación, Metalcón, permisos y todo lo que ayude a un cliente a decidir si trabajar con Soluciones Fabrick.

Tono:
- Cercano, claro, profesional. Tutea (chileno neutro), sin tecnicismos innecesarios.
- Respuestas BREVES (4–8 líneas máx por defecto) y accionables.
- Si la pregunta es muy general, da una respuesta concisa y ofrece profundizar.
- NUNCA inventes precios exactos. Si te piden cotización, deriva a /contacto o WhatsApp.
- Si no sabes algo específico de la empresa, dilo y sugiere contactar al equipo.

Conocimiento clave de Soluciones Fabrick:
- 9 años de experiencia, 100% sin subcontratistas (equipo propio).
- Construcción llave en mano, remodelaciones, ampliaciones.
- Especialidad: estructura Metalcón (perfiles de acero galvanizado).
- Servicios complementarios: gasfitería, electricidad, pintura, revestimientos, cimientos, seguridad.
- Atendemos toda la Región del Maule (Linares, Longaví, Talca, Parral) y proyectos puntuales en Santiago.
- Anticipo claro y sin sorpresas; respuesta a consultas en menos de 24 h.

Por qué Metalcón (estructura de acero galvanizado tipo "steel frame"):
- No se pudre como la madera ni se triza como el hormigón.
- Vida útil estimada +60 años con mantención mínima.
- Antisísmica: cumple normativa chilena (NCh433).
- Construcción 30–50% más rápida que albañilería tradicional.
- Mejor aislación térmica y acústica con paneles adecuados (lana mineral + placa).
- Más liviana → menor exigencia de fundaciones, ideal para terrenos complicados.

Permisos de construcción en Chile (general):
- Para obra nueva o ampliación >5 m² normalmente se requiere permiso de edificación en la DOM (Dirección de Obras Municipales).
- Documentos típicos: planos arquitectura/estructural, especificaciones técnicas, cálculo, certificado de informaciones previas.
- Tiempos: la DOM tiene 30 días hábiles para revisar (ley 19.880); sumando ajustes y Recepción Final, en la práctica son 2–4 meses.
- Soluciones Fabrick coordina con arquitecto y revisor independiente cuando aplica.

Tiempos típicos de obra (orientativos, dependen de m² y terreno):
- Ampliación 30–60 m² Metalcón: 6–10 semanas.
- Casa 90–120 m² Metalcón llave en mano: 4–6 meses (incluyendo terminaciones).
- Remodelación interior: 3–8 semanas según alcance.

Cuando convenga, sugiere acciones concretas:
- "¿Quieres que te enviemos un presupuesto sin compromiso? Escríbenos en /contacto."
- "Si quieres conversar al tiro, escríbenos por WhatsApp desde el botón del sitio."

Si la pregunta no tiene relación con construcción / la empresa, contesta amablemente y reorienta la conversación al tema.`;

async function readJsonBody(request: NextRequest): Promise<AgentBody | null> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return null;

  const text = await request.text();
  if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) return null;
  return JSON.parse(text) as AgentBody;
}

function sanitizeMessages(raw: unknown): ClientMsg[] | null {
  if (!Array.isArray(raw)) return null;
  const out: ClientMsg[] = [];
  for (const m of raw) {
    if (!m || typeof m !== 'object') continue;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if (role !== 'user' && role !== 'assistant') continue;
    if (typeof content !== 'string') continue;
    const trimmed = content.trim();
    if (!trimmed) continue;
    out.push({ role, content: trimmed.slice(0, MAX_USER_CHARS) });
  }
  // Mantener sólo los últimos N mensajes para no quemar tokens si el cliente
  // (p.ej. otra pestaña con un historial gigante) reenvía mucho contexto.
  return out.slice(-MAX_MESSAGES_TO_AI);
}

export async function POST(request: NextRequest) {
  if (!publicAiChatEnabled()) {
    return NextResponse.json(
      {
        error: 'El asistente IA está pausado temporalmente por modo campaña. Escríbenos por WhatsApp o desde contacto.',
        campaignMode: getCampaignMode(),
      },
      { status: 503, headers: campaignBusyHeaders() },
    );
  }

  const ip = getClientIp(request);
  const rl = await checkPersistentRateLimit({
    namespace: 'public:agent-chat',
    identity: ip,
    max: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: 'Estamos recibiendo muchas consultas desde tu conexión. Intenta de nuevo en un momento.',
        retry_after: rl.retryAfterSec,
      },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  let body: AgentBody | null;
  try {
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  if (!body) {
    return NextResponse.json({ error: 'Solicitud demasiado grande' }, { status: 413 });
  }

  const conversation = sanitizeMessages(body.messages);
  if (!conversation || conversation.length === 0) {
    return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });
  }
  const lastMsg = conversation[conversation.length - 1];
  if (lastMsg.role !== 'user') {
    return NextResponse.json({ error: 'El último mensaje debe ser del usuario' }, { status: 400 });
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversation.map<ChatMessage>((m) => ({ role: m.role, content: m.content })),
  ];

  // Modelo preferido: Llama 3.2 3B free (rápido + barato). Si falla,
  // chatCompletionWithFallback prueba el resto de RECOMMENDED_FREE_MODELS.
  const PREFERRED = 'meta-llama/llama-3.2-3b-instruct:free';

  try {
    const result = await chatCompletionWithFallback({
      preferredModel: PREFERRED,
      messages,
      temperature: 0.5,
      maxTokens: 600,
      allowPaid: false,
    });
    return NextResponse.json({
      ok: true,
      answer: result.text,
      // No exponemos qué modelo respondió: el usuario no debe notar el cambio.
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    // Mensaje genérico para el cliente; dejamos el detalle en el log.
    console.error('[agent/chat] fallback exhausted:', msg);
    return NextResponse.json(
      {
        error:
          'El asistente está temporalmente fuera de línea. Por favor escríbenos por WhatsApp o desde la página de contacto.',
      },
      { status: 503 },
    );
  }
}
