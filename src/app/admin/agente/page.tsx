'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Bot,
  Brain,
  Camera,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Database,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  Mail,
  MessageCircle,
  Package,
  Plus,
  Power,
  RefreshCw,
  Search,
  Send,
  ShoppingCart,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';

/* ──────────────────────────────────────────────────────────────────────
   Types
──────────────────────────────────────────────────────────────────────── */
type EventType = 'thinking' | 'tool_call' | 'tool_result' | 'screenshot' | 'frame' | 'text' | 'error' | 'done';
type TabId = 'agente' | 'catalogo' | 'memoria';

interface AgentEvent {
  type: EventType;
  content?: string;
  name?: string;
  input?: Record<string, unknown>;
  url?: string;
  data?: string; // base64 screenshot or frame
  action?: string; // browser action label for frame events
  final?: boolean;
}

interface Message {
  role: 'user' | 'agent';
  content: string;
  events?: AgentEvent[];
  loading?: boolean;
}

interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  precio_base: string | null;
  unidad: string | null;
  activo: boolean;
  created_at: string;
}

interface MemoriaEntry {
  id: number;
  tipo: string;
  titulo: string;
  contenido: string;
  fuente: string | null;
  created_at: string;
}

interface IntegrationFieldStatus {
  set: boolean;
  preview: string;
  source?: 'db' | 'env';
  envVar?: string;
}

interface IntegrationEntry {
  credentials: Record<string, IntegrationFieldStatus>;
  updated_at?: string;
  encrypted?: boolean;
  envManaged?: boolean;
}

interface IntegrationsResponse {
  providers?: Record<string, IntegrationEntry>;
}

/* ──────────────────────────────────────────────────────────────────────
   Constants
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
    icon: Package,
    title: 'Gestión de catálogo',
    desc: 'Crea productos y servicios en el catálogo directamente desde el chat.',
    example: 'Crea un producto "Instalación piso laminado" en categoría Pisos, precio $15.000/m²',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
  },
  {
    icon: Brain,
    title: 'Memoria e inteligencia',
    desc: 'Guarda hallazgos de mercado, precios y datos útiles en la memoria persistente del agente.',
    example: 'Busca el precio del acero estructural hoy y guárdalo en memoria',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
  },
];

const QUICK_PROMPTS = [
  '¿Cuánto cuesta instalar piso laminado en 80m²? Incluye materiales y mano de obra en Santiago',
  'Busca los 5 mejores proveedores de muebles de cocina en Chile y sus precios aproximados',
  'Busca en MercadoLibre: cocina empotrada Chile y dime los 5 mejores resultados',
  'Tendencias 2025 en diseño de baños en Chile — materiales más solicitados y rangos de precio',
];

const MANUAL_SECTIONS = [
  {
    title: '¿Qué puede hacer el agente?',
    content: `El agente de Soluciones Fabrick es una IA con capacidades completas:

1. **Navegar internet** con un navegador Chromium real
2. **Base de datos** — consultar y modificar InsForge directamente
3. **Catálogo** — crear y listar productos/servicios
4. **Memoria** — guardar hallazgos, precios y datos de mercado
5. **WhatsApp** — enviar mensajes vía WhatsApp Business API
6. **Email** — enviar emails transaccionales vía Resend
7. **MercadoLibre** — buscar productos y precios en MLC
8. **Test de integraciones** — verificar que las conexiones funcionan`,
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

**Para el catálogo y memoria:**
- "Crea un producto X con precio Y en categoría Z"
- "Busca el precio del acero en MercadoLibre y guárdalo en memoria"
- "Lista todos los productos del catálogo"`,
  },
  {
    title: 'Configuración requerida',
    content: `Para usar el agente necesitas al menos una API key de IA:

**Recomendado: Groq (gratis)**
1. Ve a console.groq.com y crea una cuenta gratuita
2. Genera una API key (empieza con gsk_)
3. Ve a Admin → Centro de Integraciones → tarjeta Groq
4. Pega la key y guarda

**Alternativa: Anthropic (de pago)**
1. Ve a console.anthropic.com
2. Genera una API key (empieza con sk-ant-)
3. Admin → Centro de Integraciones → tarjeta Anthropic

**Para WhatsApp y Email:**
- Configura WhatsApp Business API en la tarjeta WhatsApp
- Configura Resend en la tarjeta Resend (plan gratuito disponible)`,
  },
];

/* ──────────────────────────────────────────────────────────────────────
   Platform integrations sidebar config
──────────────────────────────────────────────────────────────────────── */
interface PlatformDef {
  provider: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  capabilities: string[];
  isPublic?: boolean;
}

const PLATFORMS: PlatformDef[] = [
  { provider: 'anthropic', label: 'Anthropic', icon: Bot, color: 'text-orange-400', capabilities: ['Motor IA claude-*', 'Análisis avanzado'] },
  { provider: 'groq', label: 'Groq', icon: Zap, color: 'text-yellow-400', capabilities: ['Motor IA LLaMA', 'Respuestas rápidas'] },
  { provider: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-green-400', capabilities: ['Enviar mensajes', 'Notificaciones clientes'] },
  { provider: 'resend', label: 'Resend Email', icon: Mail, color: 'text-blue-400', capabilities: ['Emails transaccionales', 'Notificaciones'] },
  { provider: 'mercadolibre', label: 'MercadoLibre', icon: ShoppingCart, color: 'text-yellow-300', capabilities: ['Búsqueda pública', 'Gestión publicaciones'] },
  { provider: 'mercadopago', label: 'MercadoPago', icon: Database, color: 'text-sky-400', capabilities: ['Pagos online', 'Checkout'] },
  { provider: 'stripe', label: 'Stripe', icon: Database, color: 'text-violet-400', capabilities: ['Pagos internacionales', 'Suscripciones'] },
  { provider: 'openrouter', label: 'OpenRouter', icon: Globe, color: 'text-pink-400', capabilities: ['Múltiples modelos IA', 'Fallback'] },
  { provider: 'serper', label: 'Serper.dev', icon: Search, color: 'text-emerald-400', capabilities: ['Búsqueda Google real', '2.500 gratis/mes'] },
];

/* ──────────────────────────────────────────────────────────────────────
   Helper: tool icon/label
──────────────────────────────────────────────────────────────────────── */
const TOOL_ICONS: Record<string, React.ReactNode> = {
  buscar_web: <Search className="h-3.5 w-3.5" />,
  navegar_url: <Globe className="h-3.5 w-3.5" />,
  capturar_pantalla: <Camera className="h-3.5 w-3.5" />,
  consultar_bd: <Database className="h-3.5 w-3.5" />,
  modificar_bd: <Database className="h-3.5 w-3.5" />,
  crear_producto: <Package className="h-3.5 w-3.5" />,
  listar_productos: <Package className="h-3.5 w-3.5" />,
  guardar_hallazgo: <Brain className="h-3.5 w-3.5" />,
  leer_memoria: <Brain className="h-3.5 w-3.5" />,
  enviar_whatsapp: <MessageCircle className="h-3.5 w-3.5" />,
  enviar_email: <Mail className="h-3.5 w-3.5" />,
  buscar_ml: <ShoppingCart className="h-3.5 w-3.5" />,
  probar_integracion: <Zap className="h-3.5 w-3.5" />,
};

const TOOL_LABELS: Record<string, string> = {
  buscar_web: 'Buscando en la web',
  navegar_url: 'Navegando',
  capturar_pantalla: 'Capturando pantalla',
  consultar_bd: 'Consultando BD',
  modificar_bd: 'Modificando BD',
  crear_producto: 'Creando producto',
  listar_productos: 'Listando productos',
  guardar_hallazgo: 'Guardando hallazgo',
  leer_memoria: 'Leyendo memoria',
  enviar_whatsapp: 'Enviando WhatsApp',
  enviar_email: 'Enviando email',
  buscar_ml: 'Buscando en ML',
  probar_integracion: 'Probando integración',
};

/* ──────────────────────────────────────────────────────────────────────
   Sub-components
──────────────────────────────────────────────────────────────────────── */
function ToolCallBlock({ event }: { event: AgentEvent }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="my-1 rounded-xl border border-zinc-800 bg-zinc-900/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span className="text-zinc-500">{TOOL_ICONS[event.name ?? ''] ?? <FileText className="h-3.5 w-3.5" />}</span>
        <span className="text-xs font-bold text-zinc-400">{TOOL_LABELS[event.name ?? ''] ?? event.name}</span>
        {event.input && 'query' in event.input && typeof event.input.query === 'string' && (
          <span className="truncate text-xs text-zinc-600">&ldquo;{event.input.query}&rdquo;</span>
        )}
        {event.input && 'url' in event.input && typeof event.input.url === 'string' && (
          <span className="truncate text-xs text-zinc-600">{event.input.url}</span>
        )}
        {event.input && 'nombre' in event.input && typeof event.input.nombre === 'string' && (
          <span className="truncate text-xs text-zinc-600">{event.input.nombre}</span>
        )}
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
        {msg.events?.filter((e) => e.type === 'tool_call').map((e, i) => (
          <ToolCallBlock key={i} event={e} />
        ))}

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
   Live Browser Viewer
──────────────────────────────────────────────────────────────────────── */
function LiveBrowserViewer({
  frameData,
  frameUrl,
  frameAction,
  isLive,
  navHistory,
  agentActive,
}: {
  frameData: string | null;
  frameUrl: string;
  frameAction: string;
  isLive: boolean;
  navHistory: string[];
  agentActive: boolean;
}) {
  const [copied, setCopied] = useState(false);

  function copyUrl() {
    if (!frameUrl) return;
    void navigator.clipboard.writeText(frameUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <AdminCard className="overflow-hidden !p-0">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-white/10 bg-zinc-900 px-3 py-2">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
        </div>
        <div className="flex flex-1 items-center gap-2 overflow-hidden rounded-md bg-black/40 px-2.5 py-1">
          <Globe className="h-3 w-3 shrink-0 text-zinc-600" />
          <span className="flex-1 truncate text-[10px] text-zinc-500 font-mono">{frameUrl || 'about:blank'}</span>
          {frameUrl && (
            <button onClick={copyUrl} title="Copiar URL" className="shrink-0 text-zinc-600 hover:text-zinc-400 transition-colors">
              <Copy className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
        {isLive ? (
          <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
            </span>
            LIVE
          </span>
        ) : agentActive ? (
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">activo</span>
        ) : (
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-600">inactivo</span>
        )}
      </div>

      {/* Frame or placeholder */}
      <div className="relative bg-black min-h-[180px]">
        {frameData ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={frameData} alt="Browser live view" className="w-full object-cover" />
            {frameAction && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                <p className="truncate text-[10px] text-zinc-300">{frameAction}</p>
              </div>
            )}
            {frameUrl && (
              <a
                href={frameUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] text-zinc-300 hover:text-white transition-colors"
              >
                <ExternalLink className="h-2.5 w-2.5" />
                Abrir
              </a>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-zinc-700">
            <Globe className="h-8 w-8 opacity-30" />
            <p className="text-[11px] text-center px-4">
              {agentActive
                ? 'El agente mostrará páginas web aquí'
                : 'Activa el agente para navegar la web'}
            </p>
          </div>
        )}
      </div>

      {/* Nav history */}
      {navHistory.length > 0 && (
        <div className="border-t border-white/10 px-3 py-2">
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-700">Historial</p>
          <div className="flex flex-col gap-1">
            {navHistory.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 truncate text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <Globe className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{url}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </AdminCard>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Platforms sidebar
──────────────────────────────────────────────────────────────────────── */
function PlatformsSidebar() {
  const [integrations, setIntegrations] = useState<Record<string, IntegrationEntry>>({});
  const [loading, setLoading] = useState(true);

  const loadIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/integrations');
      if (res.ok) {
        const data = await res.json() as IntegrationsResponse;
        setIntegrations(data.providers ?? {});
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIntegrations();
  }, [loadIntegrations]);

  function isConfigured(provider: string): boolean {
    const entry = integrations[provider];
    if (!entry) return false;
    const creds = entry.credentials ?? {};
    return Object.values(creds).some((v) => v.set);
  }

  // MercadoLibre search is always available (public API)
  function isAvailable(provider: string): boolean {
    if (provider === 'mercadolibre') return true;
    return isConfigured(provider);
  }

  return (
    <AdminCard>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-yellow-400" />
          <h2 className="font-black text-white text-sm">Plataformas MCP</h2>
        </div>
        <button
          type="button"
          onClick={() => void loadIntegrations()}
          className="text-zinc-600 hover:text-zinc-400"
          title="Actualizar"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="space-y-1.5">
        {PLATFORMS.map((p) => {
          const configured = isAvailable(p.provider);
          return (
            <div key={p.provider} className="rounded-xl border border-white/8 px-3 py-2">
              <div className="flex items-center gap-2">
                <p.icon className={`h-3.5 w-3.5 shrink-0 ${p.color}`} />
                <span className="flex-1 text-xs font-bold text-zinc-300">{p.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    configured
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  {configured ? 'OK' : 'Sin configurar'}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1 pl-5">
                {p.capabilities.map((cap) => (
                  <span key={cap} className="text-[10px] text-zinc-600">{cap}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-white/10">
        <a
          href="/admin/integraciones"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2 text-xs font-bold text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition"
        >
          <Zap className="h-3.5 w-3.5" />
          Configurar integraciones
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </AdminCard>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Tab: Catálogo
──────────────────────────────────────────────────────────────────────── */
function CatalogoTab({ onSendMessage }: { onSendMessage: (text: string) => void }) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const loadProductos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/agente/data?tipo=productos');
      if (res.ok) {
        const json = await res.json() as { data: Producto[] };
        setProductos(json.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProductos();
  }, [loadProductos]);

  async function deleteProducto(id: number) {
    setDeleting(id);
    try {
      await fetch(`/api/admin/agente/data?tipo=producto&id=${id}`, { method: 'DELETE' });
      setProductos((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // silent
    } finally {
      setDeleting(null);
    }
  }

  function formatPrice(val: string | null): string {
    if (!val) return '—';
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return `$${num.toLocaleString('es-CL')}`;
  }

  return (
    <div className="space-y-4">
      <AdminCard>
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-yellow-400" />
            <h2 className="font-black text-white">Catálogo de Productos</h2>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{productos.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSendMessage('Lista todos los productos del catálogo')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-3 py-1.5 text-xs font-bold text-yellow-400 hover:bg-yellow-400/20"
            >
              <Plus className="h-3.5 w-3.5" />
              Crear vía agente
            </button>
            <button
              type="button"
              onClick={() => void loadProductos()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Actualizar
            </button>
          </div>
        </div>

        {loading && productos.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-zinc-600">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : productos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Package className="h-10 w-10 text-zinc-700" />
            <p className="text-sm text-zinc-500">No hay productos en el catálogo.</p>
            <p className="text-xs text-zinc-600">Dile al agente: &ldquo;Crea un producto X con precio Y en categoría Z&rdquo;</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="pb-2 text-xs font-bold uppercase tracking-wider text-zinc-600">Nombre</th>
                  <th className="pb-2 text-xs font-bold uppercase tracking-wider text-zinc-600">Categoría</th>
                  <th className="pb-2 text-xs font-bold uppercase tracking-wider text-zinc-600">Precio base</th>
                  <th className="pb-2 text-xs font-bold uppercase tracking-wider text-zinc-600">Unidad</th>
                  <th className="pb-2 text-xs font-bold uppercase tracking-wider text-zinc-600">Estado</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {productos.map((p) => (
                  <tr key={p.id} className="group">
                    <td className="py-2.5 pr-4">
                      <span className="font-medium text-white">{p.nombre}</span>
                      {p.descripcion && (
                        <p className="mt-0.5 text-xs text-zinc-600 truncate max-w-[200px]">{p.descripcion}</p>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      {p.categoria ? (
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">{p.categoria}</span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-zinc-200">{formatPrice(p.precio_base)}</td>
                    <td className="py-2.5 pr-4 text-zinc-400">{p.unidad ?? '—'}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${p.activo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-500'}`}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <button
                        type="button"
                        onClick={() => void deleteProducto(p.id)}
                        disabled={deleting === p.id}
                        className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-zinc-600 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50 transition"
                        title="Eliminar"
                      >
                        {deleting === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Tab: Memoria
──────────────────────────────────────────────────────────────────────── */
const TIPO_COLORS: Record<string, string> = {
  hallazgo: 'bg-blue-500/20 text-blue-300',
  sugerencia: 'bg-yellow-500/20 text-yellow-300',
  precio: 'bg-emerald-500/20 text-emerald-300',
  dato_mercado: 'bg-purple-500/20 text-purple-300',
};

function MemoriaTab({ onSendMessage }: { onSendMessage: (text: string) => void }) {
  const [entries, setEntries] = useState<MemoriaEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);

  const loadMemoria = useCallback(async () => {
    setLoading(true);
    try {
      const url = filtro
        ? `/api/admin/agente/data?tipo=memoria&filtro=${encodeURIComponent(filtro)}`
        : '/api/admin/agente/data?tipo=memoria';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json() as { data: MemoriaEntry[] };
        setEntries(json.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => {
    void loadMemoria();
  }, [loadMemoria]);

  async function deleteEntry(id: number) {
    setDeleting(id);
    try {
      await fetch(`/api/admin/agente/data?tipo=memoria&id=${id}`, { method: 'DELETE' });
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      // silent
    } finally {
      setDeleting(null);
    }
  }

  function formatDate(dt: string): string {
    try {
      return new Date(dt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dt;
    }
  }

  return (
    <div className="space-y-4">
      <AdminCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-yellow-400" />
            <h2 className="font-black text-white">Memoria del Agente</h2>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{entries.length}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter buttons */}
            {['', 'hallazgo', 'precio', 'dato_mercado', 'sugerencia'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFiltro(f)}
                className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
                  filtro === f
                    ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
                    : 'border border-white/10 text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                {f === '' ? 'Todos' : f}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onSendMessage('Lee los últimos 10 hallazgos de la memoria')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-3 py-1.5 text-xs font-bold text-yellow-400 hover:bg-yellow-400/20"
            >
              <Brain className="h-3.5 w-3.5" />
              Ver con agente
            </button>
            <button
              type="button"
              onClick={() => void loadMemoria()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {loading && entries.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-zinc-600">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Brain className="h-10 w-10 text-zinc-700" />
            <p className="text-sm text-zinc-500">No hay entradas en la memoria.</p>
            <p className="text-xs text-zinc-600">El agente guardará automáticamente hallazgos importantes.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {entries.map((entry) => (
              <div key={entry.id} className="group relative rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TIPO_COLORS[entry.tipo] ?? 'bg-zinc-700 text-zinc-400'}`}>
                    {entry.tipo}
                  </span>
                  <button
                    type="button"
                    onClick={() => void deleteEntry(entry.id)}
                    disabled={deleting === entry.id}
                    className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-zinc-600 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50 transition"
                    title="Eliminar"
                  >
                    {deleting === entry.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <h3 className="mt-2 font-bold text-white text-sm leading-snug">{entry.titulo}</h3>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed line-clamp-3">{entry.contenido}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  {entry.fuente ? (
                    <a
                      href={entry.fuente.startsWith('http') ? entry.fuente : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 truncate max-w-[150px]"
                    >
                      <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                      {entry.fuente}
                    </a>
                  ) : (
                    <span />
                  )}
                  <span className="shrink-0 text-[10px] text-zinc-700">{formatDate(entry.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Main page
──────────────────────────────────────────────────────────────────────── */
export default function AgentePage() {
  const [activeTab, setActiveTab] = useState<TabId>('agente');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAreas, setShowAreas] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const [browserUrl, setBrowserUrl] = useState('');
  const [browserAction, setBrowserAction] = useState('');
  const [agentActive, setAgentActive] = useState(false);
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showJsInput, setShowJsInput] = useState(false);
  const [quickUrl, setQuickUrl] = useState('');
  const [quickJs, setQuickJs] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading || !agentActive) return;

    setInput('');
    setShowAreas(false);
    setLoading(true);
    setActiveTab('agente');
    setCurrentFrame(null);
    setBrowserUrl('');
    setBrowserAction('');

    const userMsg: Message = { role: 'user', content };
    const agentMsg: Message = { role: 'agent', content: '', events: [], loading: true };

    setMessages((prev) => [...prev, userMsg, agentMsg]);

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
            } else if (event.type === 'frame') {
              if (event.data) setCurrentFrame(event.data);
              if (event.url) {
                setBrowserUrl(event.url);
                setNavHistory((prev) => {
                  const url = event.url!;
                  return [url, ...prev.filter((u) => u !== url)].slice(0, 5);
                });
              }
              if (event.action) setBrowserAction(event.action);
            } else if (event.type !== 'done') {
              if (event.type === 'tool_result') {
                const last = agentEvents.filter((e) => e.type === 'tool_call').at(-1);
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
  }, [input, loading, messages]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'agente', label: 'Agente', icon: Bot },
    { id: 'catalogo', label: 'Catálogo', icon: Package },
    { id: 'memoria', label: 'Memoria', icon: Brain },
  ];

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Soluciones Fabrick · IA"
        title="Agente Inteligente"
        description="Agente con navegador real, base de datos, catálogo, memoria persistente, WhatsApp, Email, MercadoLibre y más."
        icon={Bot}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAgentActive((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                agentActive
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              {agentActive ? 'Agente ON' : 'Agente OFF'}
            </button>
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
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">

          {/* ── Left: tabs + content ───────────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Tab bar */}
            <div className="flex gap-1 rounded-2xl border border-white/10 bg-zinc-900/50 p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${
                    activeTab === tab.id
                      ? 'bg-yellow-400/15 text-yellow-400 border border-yellow-400/20'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Agente */}
            {activeTab === 'agente' && (
              <div className="flex flex-col gap-4">
                <AdminCard className="flex flex-col min-h-[520px]">
                  <div className="flex-1 space-y-4 overflow-y-auto pb-2 max-h-[480px]">
                    {messages.length === 0 && (
                      <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400/10 border border-yellow-400/20">
                          <Bot className="h-8 w-8 text-yellow-400" />
                        </div>
                        <div>
                          <p className="font-black text-white">Agente listo</p>
                          <p className="text-sm text-zinc-500 mt-1">
                            Navego internet, gestiono tu catálogo, envío WhatsApp y emails,<br />busco en MercadoLibre y recuerdo todo lo importante.
                          </p>
                        </div>
                        <div className="mt-2 flex flex-wrap justify-center gap-2">
                          {['buscar_web', 'consultar_bd', 'crear_producto', 'enviar_whatsapp', 'buscar_ml', 'guardar_hallazgo'].map((tool) => (
                            <span key={tool} className="flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-zinc-500">
                              {TOOL_ICONS[tool]}
                              {TOOL_LABELS[tool]}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {messages.map((msg, i) => (
                      <AgentMessage key={i} msg={msg} />
                    ))}
                    <div ref={bottomRef} />
                  </div>

                  <div className="mt-4 border-t border-white/10 pt-4">
                    <div className="flex gap-2">
                      <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="¿Qué quieres hacer? (Enter para enviar, Shift+Enter para nueva línea)"
                        rows={2}
                        disabled={loading || !agentActive}
                        className="flex-1 resize-none rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-yellow-400/50 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => void sendMessage()}
                        disabled={loading || !input.trim() || !agentActive}
                        className="flex h-full items-center justify-center rounded-2xl bg-yellow-400 px-4 font-black text-black disabled:opacity-40 hover:bg-yellow-300"
                      >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                      </button>
                    </div>
                    {messages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => { setMessages([]); setShowAreas(true); setCurrentFrame(null); setBrowserUrl(''); setBrowserAction(''); setBrowserUrl(''); setNavHistory([]); }}
                        className="mt-2 flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-400"
                      >
                        <X className="h-3 w-3" /> Limpiar conversación
                      </button>
                    )}

                    {/* Quick actions */}
                    {agentActive && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void sendMessage('Toma una captura de la pantalla actual del agente')}
                          disabled={loading}
                          className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-zinc-400 hover:text-white hover:border-white/20 disabled:opacity-50 transition-colors"
                        >
                          <Camera className="h-3 w-3" />
                          Captura
                        </button>
                        <button
                          type="button"
                          onClick={() => void sendMessage('Muéstrame el DOM simplificado de la página actual')}
                          disabled={loading}
                          className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-zinc-400 hover:text-white hover:border-white/20 disabled:opacity-50 transition-colors"
                        >
                          <FileText className="h-3 w-3" />
                          Ver DOM
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowUrlInput((v) => !v); setShowJsInput(false); }}
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-colors ${showUrlInput ? 'border-yellow-400/30 bg-yellow-400/10 text-yellow-400' : 'border-white/10 text-zinc-400 hover:text-white hover:border-white/20'}`}
                        >
                          <Globe className="h-3 w-3" />
                          Navegar URL
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowJsInput((v) => !v); setShowUrlInput(false); }}
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-colors ${showJsInput ? 'border-yellow-400/30 bg-yellow-400/10 text-yellow-400' : 'border-white/10 text-zinc-400 hover:text-white hover:border-white/20'}`}
                        >
                          <Zap className="h-3 w-3" />
                          Ejecutar JS
                        </button>
                      </div>
                    )}

                    {agentActive && showUrlInput && (
                      <div className="mt-2 flex gap-2">
                        <input
                          value={quickUrl}
                          onChange={(e) => setQuickUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && quickUrl.trim()) {
                              void sendMessage(`Navega a esta URL: ${quickUrl}`);
                              setQuickUrl('');
                              setShowUrlInput(false);
                            }
                          }}
                          placeholder="https://..."
                          className="flex-1 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-yellow-400/50 focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            if (quickUrl.trim()) {
                              void sendMessage(`Navega a esta URL: ${quickUrl}`);
                              setQuickUrl('');
                              setShowUrlInput(false);
                            }
                          }}
                          disabled={!quickUrl.trim()}
                          className="rounded-xl bg-yellow-400 px-3 py-2 text-xs font-bold text-black disabled:opacity-40 hover:bg-yellow-300"
                        >
                          Ir
                        </button>
                      </div>
                    )}

                    {agentActive && showJsInput && (
                      <div className="mt-2 flex gap-2">
                        <textarea
                          value={quickJs}
                          onChange={(e) => setQuickJs(e.target.value)}
                          placeholder="document.title"
                          rows={2}
                          className="flex-1 resize-none rounded-xl border border-white/10 bg-black/50 px-3 py-2 font-mono text-xs text-white placeholder:text-zinc-600 focus:border-yellow-400/50 focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            if (quickJs.trim()) {
                              void sendMessage(`Ejecuta este JavaScript en la página: ${quickJs}`);
                              setQuickJs('');
                              setShowJsInput(false);
                            }
                          }}
                          disabled={!quickJs.trim()}
                          className="rounded-xl bg-yellow-400 px-3 py-2 text-xs font-bold text-black disabled:opacity-40 hover:bg-yellow-300"
                        >
                          Ejecutar
                        </button>
                      </div>
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

                {/* Areas */}
                <AdminCard>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-yellow-400" />
                    <h2 className="font-black text-white">Capacidades del agente</h2>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {AREAS.map((area, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => void sendMessage(area.example)}
                        className={`rounded-2xl border p-3 text-left transition hover:opacity-80 ${area.bg}`}
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
                    <div className="space-y-1">
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
            )}

            {/* Tab: Catálogo */}
            {activeTab === 'catalogo' && (
              <CatalogoTab onSendMessage={(text) => void sendMessage(text)} />
            )}

            {/* Tab: Memoria */}
            {activeTab === 'memoria' && (
              <MemoriaTab onSendMessage={(text) => void sendMessage(text)} />
            )}
          </div>

          {/* ── Right: platforms sidebar ───────────────────────────────── */}
          <div className="space-y-4">
            <LiveBrowserViewer
              frameData={currentFrame}
              frameUrl={browserUrl}
              frameAction={browserAction}
              isLive={loading}
              navHistory={navHistory}
              agentActive={agentActive}
            />
            <PlatformsSidebar />

            {/* CheckCircle summary */}
            <AdminCard>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-400" />
                <h2 className="font-black text-white text-sm">Herramientas activas</h2>
              </div>
              <div className="space-y-1.5 text-xs text-zinc-400">
                {[
                  { label: 'Búsqueda web (DuckDuckGo)', always: true },
                  { label: 'Navegador Chromium', always: true },
                  { label: 'Base de datos InsForge', always: true },
                  { label: 'Catálogo de productos', always: true },
                  { label: 'Memoria persistente', always: true },
                  { label: 'MercadoLibre (público)', always: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 shrink-0 text-emerald-400" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </AdminCard>
          </div>
        </div>
      </AdminMotion>
    </AdminPage>
  );
}
