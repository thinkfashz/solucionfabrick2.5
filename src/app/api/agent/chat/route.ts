import { NextResponse, type NextRequest } from 'next/server';
import { chatCompletionWithFallback, type ChatMessage } from '@/lib/openrouter';
import { getClientIp } from '@/lib/adminAuth';
import { checkPersistentRateLimit } from '@/lib/adminRateLimitStore';
import { campaignBusyHeaders, getCampaignMode, publicAiChatEnabled } from '@/lib/campaignMode';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface AgentBody { messages?: unknown }
interface ClientMsg { role: 'user' | 'assistant'; content: string }

const MAX_MESSAGES_TO_AI = 12;
const MAX_USER_CHARS = 2_000;
const MAX_BODY_BYTES = 32 * 1024;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

const SYSTEM_PROMPT = `Eres "Fabri", el asistente virtual de Soluciones Fabrick, empresa chilena de construcción, remodelación y soluciones para el hogar con atención principal en la Región del Maule y proyectos seleccionados en Santiago.

Tu función:
- Ayudar al visitante a entender servicios, calculadoras, materiales, permisos, etapas y preguntas necesarias antes de cotizar.
- Organizar la información entregada por el usuario, sin reemplazar la inspección, el cálculo profesional ni la cotización final.
- Guiar hacia /presupuesto, /proyectos, /contacto o WhatsApp cuando corresponda.

Tono:
- Cercano, claro, profesional y chileno neutro. Tutea.
- Responde normalmente en 4–8 líneas. Cuando recibas un cálculo estructurado puedes usar hasta 12 líneas breves.
- Evita tecnicismos innecesarios; explica cualquier concepto importante.
- No inventes experiencia, certificaciones, tiempos, cobertura, materiales, medidas ni características que no estén expresamente informadas.

Reglas de precios y presupuestos:
- Nunca presentes un rango de calculadora como precio cerrado, promesa contractual o valor garantizado.
- No reemplaces el rango recibido por otro sin explicar claramente el supuesto y la limitación.
- Si el usuario envía servicio, fórmula, medidas, cantidad y rango, organiza la respuesta en este orden:
  1. Lectura del cálculo.
  2. Partidas o alcance probable.
  3. Exclusiones, riesgos y variables que pueden cambiar el precio.
  4. Preguntas pendientes.
  5. Próximo paso recomendado.
- Recuerda que ubicación, acceso, estado existente, permisos, especificación, materiales, retiro de escombros y terminaciones pueden cambiar el valor.

Servicios disponibles:
- Construcción llave en mano, kits prefabricados, ampliaciones, radier, fundaciones, techumbre y estructuras Metalcon.
- Gasfitería, electricidad, climatización, pintura, revestimientos, pisos, baños, cierres, seguridad y muebles a medida.
- La página /presupuesto permite calcular cada especialidad y reunir varias partidas en un carrito de servicios.
- /proyectos funciona como biblioteca de Inspiraciones: sus imágenes son referencias visuales y no deben presentarse automáticamente como obras ejecutadas por la empresa.

Metalcon y contexto sísmico chileno:
- Metalcon es un sistema de perfiles de acero galvanizado conformados en frío.
- Una estructura más liviana y dúctil puede ofrecer ventajas dentro de un diseño sismorresistente bien resuelto.
- Nunca digas que es indestructible, "a prueba de terremotos" o seguro por sí solo.
- El desempeño depende del proyecto estructural, fundaciones, anclajes, arriostramientos, uniones, protección frente a humedad/corrosión, calidad de materiales y correcta ejecución.
- Recomienda revisión profesional y cumplimiento de las normas chilenas aplicables al proyecto.
- Puedes compararlo con sistemas tradicionales de forma equilibrada: rapidez de montaje, obra seca, control dimensional y menor masa son ventajas posibles; acústica, fuego, humedad, puentes térmicos y detalles de unión deben resolverse con el sistema completo.

Permisos en Chile:
- No entregues asesoría legal definitiva. Explica que obra nueva, ampliaciones y cambios estructurales suelen requerir revisión en la DOM y profesionales competentes.
- Los requisitos y plazos dependen de comuna, tipo de obra, antecedentes y observaciones.

Acciones útiles:
- Para un cálculo inicial: /presupuesto.
- Para explorar referencias: /proyectos.
- Para evaluación humana: /contacto o WhatsApp.

Si la pregunta no se relaciona con construcción, hogar, servicios o productos de Fabrick, responde con amabilidad y reorienta.`;

async function readJsonBody(request: NextRequest): Promise<AgentBody | null> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return null;
  const text = await request.text();
  if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) return null;
  return JSON.parse(text) as AgentBody;
}

function sanitizeMessages(raw: unknown): ClientMsg[] | null {
  if (!Array.isArray(raw)) return null;
  const output: ClientMsg[] = [];
  for (const message of raw) {
    if (!message || typeof message !== 'object') continue;
    const role = (message as { role?: unknown }).role;
    const content = (message as { content?: unknown }).content;
    if (role !== 'user' && role !== 'assistant') continue;
    if (typeof content !== 'string') continue;
    const trimmed = content.trim();
    if (!trimmed) continue;
    output.push({ role, content: trimmed.slice(0, MAX_USER_CHARS) });
  }
  return output.slice(-MAX_MESSAGES_TO_AI);
}

export async function POST(request: NextRequest) {
  if (!publicAiChatEnabled()) {
    return NextResponse.json({ error: 'El asistente IA está pausado temporalmente por modo campaña. Escríbenos por WhatsApp o desde contacto.', campaignMode: getCampaignMode() }, { status: 503, headers: campaignBusyHeaders() });
  }

  const ip = getClientIp(request);
  const rateLimit = await checkPersistentRateLimit({ namespace: 'public:agent-chat', identity: ip, max: RATE_LIMIT_MAX, windowMs: RATE_LIMIT_WINDOW_MS });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: 'Estamos recibiendo muchas consultas desde tu conexión. Intenta de nuevo en un momento.', retry_after: rateLimit.retryAfterSec }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } });
  }

  let body: AgentBody | null;
  try {
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  if (!body) return NextResponse.json({ error: 'Solicitud demasiado grande' }, { status: 413 });

  const conversation = sanitizeMessages(body.messages);
  if (!conversation || conversation.length === 0) return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });
  const lastMessage = conversation[conversation.length - 1];
  if (lastMessage.role !== 'user') return NextResponse.json({ error: 'El último mensaje debe ser del usuario' }, { status: 400 });

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversation.map<ChatMessage>((message) => ({ role: message.role, content: message.content })),
  ];

  try {
    const result = await chatCompletionWithFallback({
      preferredModel: 'meta-llama/llama-3.2-3b-instruct:free',
      messages,
      temperature: 0.4,
      maxTokens: 800,
      allowPaid: false,
    });
    return NextResponse.json({ ok: true, answer: result.text });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[agent/chat] fallback exhausted:', message);
    return NextResponse.json({ error: 'El asistente está temporalmente fuera de línea. Por favor escríbenos por WhatsApp o desde la página de contacto.' }, { status: 503 });
  }
}
