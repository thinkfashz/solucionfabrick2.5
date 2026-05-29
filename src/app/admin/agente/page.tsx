'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Bot,
  Camera,
  ChevronDown,
  ChevronRight,
  Circle,
  ExternalLink,
  Globe,
  Loader2,
  Search,
  Send,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';

/* ──────────────────────────────────────────────────────────────────────
   Types
──────────────────────────────────────────────────────────────────────── */
type EventType = 'thinking' | 'tool_call' | 'tool_result' | 'screenshot' | 'text' | 'error' | 'done';

interface AgentEvent {
  type: EventType;
  content?: string;
  name?: string;
  input?: Record<string, string>;
  url?: string;
  data?: string; // base64 screenshot
}

interface Message {
  role: 'user' | 'agent';
  content: string;
  events?: AgentEvent[];
  loading?: boolean;
}

/* ──────────────────────────────────────────────────────────────────────
   Sales areas / capabilities data
──────────────────────────────────────────────────────────────────────── */
const AREAS = [
  {
    icon: TrendingUp,
    title: 'Precios de mercado',
    desc: 'Compara precios de materiales, MDF, fierro, pintura, madera en tiendas y proveedores de Chile en tiempo real.',
    example: '¿Cuánto cuesta la plancha de MDF 15mm en Easy y Sodimac hoy?',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: Search,
    title: 'Análisis de competencia',
    desc: 'Investiga empresas de construcción y mobiliario de tu zona: qué ofrecen, a qué precio, sus fortalezas y debilidades.',
    example: 'Busca las 5 mejores empresas de muebles a medida en Santiago y sus precios.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    icon: Globe,
    title: 'Búsqueda de proveedores',
    desc: 'Encuentra proveedores de materiales con mejores precios por volumen para tus proyectos de construcción.',
    example: 'Encuentra distribuidores de cerámicas para piso en Chile, con precio por m².',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
  },
  {
    icon: Sparkles,
    title: 'Datos para presupuestos',
    desc: 'Obtén datos actualizados de precios para generar presupuestos más competitivos y rentables.',
    example: 'Arma un desglose de costos para instalar deck de madera de 50m² en Santiago.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
  },
  {
    icon: TrendingUp,
    title: 'Tendencias del sector',
    desc: 'Descubre qué materiales y estilos están en tendencia en construcción y mobiliario en Chile este año.',
    example: '¿Cuáles son las tendencias en diseño de cocinas en Chile en 2025?',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
  },
  {
    icon: Globe,
    title: 'Info de clientes/empresas',
    desc: 'Investiga empresas antes de enviar un presupuesto: razón social, tamaño, proyectos recientes, potencial.',
    example: 'Busca información de la empresa Constructora Arauco S.A. en Chile.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
  },
];

const QUICK_PROMPTS = [
  '¿Cuánto cuesta instalar piso laminado en 80m²? Incluye materiales y mano de obra en Santiago',
  'Busca los 5 mejores proveedores de muebles de cocina en Chile y sus precios aproximados',
  'Compara precios de ventanas de PVC doble vidrio en Chile: Easy, Sodimac y empresas especializadas',
  'Tendencias 2025 en diseño de baños en Chile — materiales más solicitados y rangos de precio',
];

/* ──────────────────────────────────────────────────────────────────────
   Manual
──────────────────────────────────────────────────────────────────────── */
const MANUAL_SECTIONS = [
  {
    title: '¿Qué puede hacer el agente?',
    content: `El agente de Soluciones Fabrick es una IA que puede navegar internet en tiempo real usando un navegador Chromium integrado. Combina la inteligencia de Claude (Anthropic) o LLaMA (Groq) con capacidad real de búsqueda web.

Puede hacer tres cosas:
1. **Buscar en la web** con Google (vía Serper.dev si está configurado, o DuckDuckGo como respaldo)
2. **Navegar a URLs** y leer el contenido completo de cualquier página web
3. **Capturar pantallas** de sitios web para análisis visual`,
  },
  {
    title: 'Cómo escribir buenos prompts',
    content: `**Sé específico con lo que necesitas:**
- ❌ "busca precios"
- ✅ "¿Cuánto cuesta la pintura látex para exteriores en Easy Chile en 2025? Quiero precio por litro y por galón."

**Incluye contexto relevante:**
- La ciudad o región (Santiago, Valparaíso, etc.)
- El tipo de proyecto
- El volumen o cantidad si aplica

**Pide formatos específicos:**
- "Devuélveme los precios en una tabla"
- "Incluye links de fuente"
- "Resume en 3 puntos clave"`,
  },
  {
    title: 'Casos de uso para ventas',
    content: `**Antes de enviar un presupuesto:**
→ "Busca precios de [material] en tiendas de [ciudad] para saber si mi precio es competitivo"

**Para atraer clientes:**
→ "Analiza los sitios web de las 3 principales empresas de [servicio] en [ciudad] y dime qué ofrecen"

**Para optimizar compras:**
→ "Encuentra el proveedor más económico de [material] por mayor en Chile"

**Para argumentar valor:**
→ "Busca el precio promedio de mercado para [servicio] en Santiago y arma comparativa"`,
  },
  {
    title: 'Limitaciones y consideraciones',
    content: `**Lo que puede pasar:**
- Algunos sitios bloquean bots (Cloudflare, captchas) — el agente lo indicará
- Precios online pueden diferir de los precios de tienda física
- La búsqueda toma 10-30 segundos dependiendo de cuántos sitios visita

**Privacidad y seguridad:**
- El navegador corre en el servidor, no en tu computador
- No guarda cookies entre sesiones
- No accede a sitios que requieran login (a menos que des las credenciales en el prompt)

**Cuotas:**
- Si usas Serper.dev, cada búsqueda consume 1 crédito (~2.500 gratis)
- Sin Serper, usa DuckDuckGo (ilimitado, menos preciso)`,
  },
  {
    title: 'Configuración requerida',
    content: `Para usar el agente necesitas al menos una API key de IA:

**Recomendado: Groq (gratis)**
1. Ve a console.groq.com y crea una cuenta gratuita
2. Genera una API key (empieza con gsk_)
3. Ve a Admin → Centro de Integraciones → tarjeta Groq
4. Pega la key y guarda
5. Ve a Admin → Configuración IA → selecciona Groq como proveedor

**Alternativa: Anthropic (de pago)**
1. Ve a console.anthropic.com
2. Genera una API key (empieza con sk-ant-)
3. Admin → Centro de Integraciones → tarjeta Anthropic

**Opcional pero recomendado: Serper.dev**
Para búsquedas más precisas y rápidas, agrega una key de Serper en Admin → Centro de Integraciones → tarjeta Serper.dev (plan gratuito incluye ~2.500 búsquedas).`,
  },
];

/* ──────────────────────────────────────────────────────────────────────
   Sub-components
──────────────────────────────────────────────────────────────────────── */
function ToolCallBlock({ event }: { event: AgentEvent }) {
  const [open, setOpen] = useState(false);

  const icons: Record<string, React.ReactNode> = {
    buscar_web: <Search className="h-3.5 w-3.5" />,
    navegar_url: <Globe className="h-3.5 w-3.5" />,
    capturar_pantalla: <Camera className="h-3.5 w-3.5" />,
  };

  const labels: Record<string, string> = {
    buscar_web: 'Buscando en la web',
    navegar_url: 'Navegando',
    capturar_pantalla: 'Capturando pantalla',
  };

  return (
    <div className="my-1 rounded-xl border border-zinc-800 bg-zinc-900/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span className="text-zinc-500">{icons[event.name ?? ''] ?? <Circle className="h-3.5 w-3.5" />}</span>
        <span className="text-xs font-bold text-zinc-400">{labels[event.name ?? ''] ?? event.name}</span>
        {event.input?.query && <span className="truncate text-xs text-zinc-600">&ldquo;{event.input.query}&rdquo;</span>}
        {event.input?.url && <span className="truncate text-xs text-zinc-600">{event.input.url}</span>}
        <ChevronDown className={`ml-auto h-3 w-3 shrink-0 text-zinc-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && event.content && (
        <div className="border-t border-zinc-800 px-3 py-2">
          <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-zinc-500">{event.content.slice(0, 600)}</pre>
        </div>
      )}
    </div>
  );
}

function AgentMessage({ msg }: { msg: Message }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-yellow-400/15 border border-yellow-400/20 px-4 py-3 text-sm text-white">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700">
        {msg.loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
        ) : (
          <Bot className="h-4 w-4 text-yellow-400" />
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        {/* Tool calls */}
        {msg.events?.filter((e) => e.type === 'tool_call').map((e, i) => (
          <ToolCallBlock key={i} event={e} />
        ))}

        {/* Screenshots */}
        {msg.events?.filter((e) => e.type === 'screenshot' && e.data).map((e, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-zinc-800">
            <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-1.5">
              <Camera className="h-3 w-3 text-zinc-500" />
              <span className="truncate text-[11px] text-zinc-600">{e.url}</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={e.data} alt="Screenshot" className="w-full object-cover max-h-64" />
          </div>
        ))}

        {/* Text content */}
        {msg.loading && !msg.content && (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-600" style={{ animationDelay: '0ms' }} />
            <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-600" style={{ animationDelay: '150ms' }} />
            <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-600" style={{ animationDelay: '300ms' }} />
          </div>
        )}

        {msg.content && (
          <div className="text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap">
            {msg.content}
          </div>
        )}

        {/* Error */}
        {msg.events?.find((e) => e.type === 'error') && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{msg.events.find((e) => e.type === 'error')?.content}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ManualSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {MANUAL_SECTIONS.map((section, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-white/10">
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/5"
          >
            <span className="font-bold text-white">{section.title}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open === i ? 'rotate-180' : ''}`} />
          </button>
          {open === i && (
            <div className="border-t border-white/10 px-4 py-4">
              <div className="text-sm leading-relaxed text-zinc-400 whitespace-pre-line">
                {section.content.split('\n').map((line, j) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={j} className="font-bold text-white mt-3 first:mt-0">{line.slice(2, -2)}</p>;
                  }
                  if (line.includes('**')) {
                    const parts = line.split('**');
                    return (
                      <p key={j} className="mt-1">
                        {parts.map((part, k) => k % 2 === 1 ? <strong key={k} className="text-white">{part}</strong> : part)}
                      </p>
                    );
                  }
                  if (line.startsWith('→') || line.startsWith('-') || line.match(/^\d+\./)) {
                    return <p key={j} className="mt-1 ml-2 text-zinc-300">{line}</p>;
                  }
                  return line ? <p key={j} className="mt-1">{line}</p> : <br key={j} />;
                })}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Main page
──────────────────────────────────────────────────────────────────────── */
export default function AgentePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAreas, setShowAreas] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    setInput('');
    setShowAreas(false);
    setLoading(true);

    const userMsg: Message = { role: 'user', content };
    const agentMsg: Message = { role: 'agent', content: '', events: [], loading: true };

    setMessages((prev) => [...prev, userMsg, agentMsg]);

    // Build history for API
    const history = messages
      .filter((m) => m.role !== 'agent' || m.content)
      .map((m) => ({ role: m.role === 'agent' ? 'assistant' : 'user', content: m.content }));
    history.push({ role: 'user', content });

    try {
      const res = await fetch('/api/admin/agente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let agentText = '';
      const agentEvents: AgentEvent[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as AgentEvent;

            if (event.type === 'text') {
              agentText += event.content ?? '';
            } else if (event.type !== 'done') {
              if (event.type === 'tool_result') {
                // Merge result into the last tool_call event for display
                const last = agentEvents.filter(e => e.type === 'tool_call').at(-1);
                if (last) last.content = event.content;
              } else {
                agentEvents.push(event);
              }
            }

            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === 'agent') {
                updated[updated.length - 1] = {
                  ...last,
                  content: agentText,
                  events: [...agentEvents],
                  loading: event.type !== 'done',
                };
              }
              return updated;
            });
          } catch { /* skip malformed line */ }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado.';
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'agent') {
          updated[updated.length - 1] = {
            ...last,
            content: '',
            events: [{ type: 'error', content: msg }],
            loading: false,
          };
        }
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Soluciones Fabrick · IA"
        title="Agente de Investigación"
        description="Agente con navegador Chromium integrado. Busca precios, analiza competencia, encuentra proveedores y genera datos para tus presupuestos — en tiempo real."
        icon={Bot}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowManual((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white/5"
            >
              <BookOpen className="h-3.5 w-3.5" />
              {showManual ? 'Ocultar manual' : 'Ver manual'}
            </button>
            <a
              href="/admin/integraciones"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white/5"
            >
              <Zap className="h-3.5 w-3.5" />
              Configurar claves
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        }
      />

      <AdminMotion>
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">

          {/* ── Left: chat ────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Chat window */}
            <AdminCard className="flex flex-col" style={{ minHeight: 520 }}>
              {/* Messages */}
              <div className="flex-1 space-y-4 overflow-y-auto pb-2" style={{ maxHeight: 480 }}>
                {messages.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400/10 border border-yellow-400/20">
                      <Bot className="h-8 w-8 text-yellow-400" />
                    </div>
                    <div>
                      <p className="font-black text-white">Agente listo</p>
                      <p className="text-sm text-zinc-500 mt-1">Puedo buscar en internet en tiempo real.<br />Escríbeme lo que necesitas investigar.</p>
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <AgentMessage key={i} msg={msg} />
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="flex gap-2">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="¿Qué quieres investigar? (Enter para enviar, Shift+Enter para nueva línea)"
                    rows={2}
                    disabled={loading}
                    className="flex-1 resize-none rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-yellow-400/50 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={loading || !input.trim()}
                    className="flex h-full items-center justify-center rounded-2xl bg-yellow-400 px-4 font-black text-black disabled:opacity-40 hover:bg-yellow-300"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </button>
                </div>
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setMessages([]); setShowAreas(true); }}
                    className="mt-2 flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-400"
                  >
                    <X className="h-3 w-3" /> Limpiar conversación
                  </button>
                )}
              </div>
            </AdminCard>

            {/* Quick prompts */}
            {showAreas && (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-zinc-600">Prueba estos ejemplos</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {QUICK_PROMPTS.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => void sendMessage(p)}
                      className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-left text-xs text-zinc-400 hover:border-yellow-400/30 hover:text-zinc-200 transition"
                    >
                      <ChevronRight className="mr-1 inline h-3 w-3 text-yellow-400" />
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: areas + manual ──────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Sales areas */}
            <AdminCard>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-400" />
                <h2 className="font-black text-white">Áreas para generar ventas</h2>
              </div>
              <div className="space-y-2">
                {AREAS.map((area, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => void sendMessage(area.example)}
                    className={`w-full rounded-2xl border p-3 text-left transition hover:opacity-80 ${area.bg}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <area.icon className={`mt-0.5 h-4 w-4 shrink-0 ${area.color}`} />
                      <div className="min-w-0">
                        <p className={`text-xs font-black ${area.color}`}>{area.title}</p>
                        <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">{area.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </AdminCard>

            {/* Manual */}
            <AdminCard>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-400" />
                <h2 className="font-black text-white">Manual del agente</h2>
                <button
                  type="button"
                  onClick={() => setShowManual((v) => !v)}
                  className="ml-auto text-[11px] font-bold text-zinc-500 hover:text-zinc-300"
                >
                  {showManual ? 'Cerrar' : 'Abrir'}
                </button>
              </div>
              {showManual ? (
                <ManualSection />
              ) : (
                <div className="space-y-2">
                  {MANUAL_SECTIONS.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setShowManual(true)}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                    >
                      <ChevronRight className="h-3 w-3 shrink-0 text-yellow-400/50" />
                      {s.title}
                    </button>
                  ))}
                </div>
              )}
            </AdminCard>

          </div>
        </div>
      </AdminMotion>
    </AdminPage>
  );
}
