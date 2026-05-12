'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity, AlertTriangle, BarChart3, BookOpen, Boxes, Cloud, Database,
  Eye, EyeOff, FileText, FlaskConical, Hammer, Image as ImageIcon, Inbox,
  KeyRound, LayoutGrid, Link2, LogOut, Megaphone, MessageCircle, Monitor,
  Newspaper, Package, Plug, Radio, Receipt, RefreshCw, Scan, Search, Send,
  Settings, ShieldCheck, ShoppingCart, Sparkles, Stethoscope, Store, Terminal,
  Telescope, TrendingDown, Truck, Users, Wallet, X, Zap,
} from 'lucide-react';

interface AdminContextMenuProps {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

/* ── ALL nav sections (mirrors AdminShell navSections fully) ─────────────── */
const ALL_SECTIONS = [
  {
    title: 'Visión general',
    color: 'sky',
    items: [
      { href: '/admin', label: 'Centro de control', icon: BarChart3, description: 'KPIs y salud operativa' },
    ],
  },
  {
    title: 'Operación',
    color: 'yellow',
    items: [
      { href: '/admin/productos', label: 'Productos', icon: Package, description: 'Catálogo y stock' },
      { href: '/admin/productos/importar', label: 'Importar de ML', icon: Link2, description: 'Vista previa desde URL de ML Chile' },
      { href: '/admin/materiales', label: 'Materiales (Cotizador)', icon: Package, description: 'Alimenta el cotizador en vivo' },
      { href: '/admin/proyectos', label: 'Proyectos', icon: Hammer, description: 'Obras terminadas visibles al cliente' },
      { href: '/admin/pedidos', label: 'Pedidos', icon: ShoppingCart, description: 'Cobros y estados' },
      { href: '/admin/pagos', label: 'Pagos · MercadoPago', icon: Wallet, description: 'Modo, latencia y KPIs de la pasarela', highlight: true },
      { href: '/admin/cotizaciones', label: 'Cotizaciones', icon: FileText, description: 'Solicitudes de servicios y diseños 3D' },
      { href: '/admin/presupuestos', label: 'Presupuestos · 5 días', icon: FileText, description: 'Generar link autodestruible', highlight: true },
      { href: '/admin/entregas', label: 'Entregas', icon: Truck, description: 'Seguimiento logístico' },
      { href: '/admin/clientes', label: 'Clientes', icon: Users, description: 'Historial y recurrencia' },
      { href: '/admin/facturas', label: 'Facturas DTE', icon: Receipt, description: 'Documentos tributarios y SII' },
      { href: '/admin/reportes', label: 'Reportes', icon: BarChart3, description: 'Ventas y métricas' },
    ],
  },
  {
    title: 'Contenido',
    color: 'purple',
    items: [
      { href: '/admin/home', label: 'Pantalla principal', icon: LayoutGrid, description: 'Banners, secciones y orden' },
      { href: '/admin/editor', label: 'Editor universal', icon: LayoutGrid, description: 'Navbar, footer, checkout e inyección de código', highlight: true },
      { href: '/admin/tienda', label: 'Tienda · Edición', icon: ShoppingCart, description: 'Portada, banners y secciones del catálogo' },
      { href: '/admin/blog', label: 'Blog', icon: Newspaper, description: 'Entradas, portadas y publicación' },
      { href: '/admin/medios', label: 'Medios', icon: ImageIcon, description: 'Imágenes y biblioteca' },
      { href: '/admin/medios?tab=cloudinary', label: 'Cloudinary', icon: Cloud, description: 'Subir, eliminar y estado en la nube', highlight: true },
    ],
  },
  {
    title: 'Marketing & IA',
    color: 'pink',
    items: [
      { href: '/admin/asistente-ia', label: 'Asistente IA', icon: Sparkles, description: 'Chat con IA + análisis del código', highlight: true },
      { href: '/admin/publicidad/coach', label: 'Coach de campañas', icon: Sparkles, description: 'IA: analizar, sugerir y optimizar', highlight: true },
      { href: '/admin/publicar', label: 'Publicar', icon: Send, description: 'Posts para redes sociales' },
      { href: '/admin/newsletter', label: 'Boletín', icon: Newspaper, description: 'Suscriptores y campañas', highlight: true },
      { href: '/admin/publicidad', label: 'Publicidad', icon: Megaphone, description: 'Meta Ads' },
      { href: '/admin/inteligencia-mercado', label: 'Inteligencia de mercado', icon: Telescope, description: 'Tendencias, SEO y productos ganadores', highlight: true },
      { href: '/admin/social/inbox', label: 'Inbox social', icon: Inbox, description: 'Instagram, FB, WhatsApp y ML', highlight: true },
    ],
  },
  {
    title: 'MercadoLibre',
    color: 'blue',
    items: [
      { href: '/admin/ml', label: 'MercadoLibre', icon: Store, description: 'Centro ML: publicaciones, pedidos y preguntas', highlight: true },
      { href: '/admin/ml/buscar', label: 'Buscador ML', icon: Search, description: 'Buscar en catálogo de ML Chile' },
      { href: '/admin/ml/publicaciones', label: 'Mis publicaciones ML', icon: Store, description: 'Gestión de listings propios' },
      { href: '/admin/ml/pedidos', label: 'Pedidos ML', icon: ShoppingCart, description: 'Sincronizar ventas de ML' },
      { href: '/admin/ml/preguntas', label: 'Preguntas ML', icon: MessageCircle, description: 'Responder preguntas de compradores' },
      { href: '/admin/ml/precios', label: 'Monitor de precios ML', icon: TrendingDown, description: 'Comparar precios vs. competencia' },
    ],
  },
  {
    title: 'Integraciones',
    color: 'emerald',
    items: [
      { href: '/admin/integraciones', label: 'Centro de integraciones', icon: Link2, description: 'Conectar, probar y desactivar APIs', highlight: true },
      { href: '/admin/integraciones/marketplace', label: 'Marketplace de extensiones', icon: Boxes, description: 'Apps, snippets, webhooks y OAuth', highlight: true },
      { href: '/admin/extensions', label: 'Extensiones y Webhooks', icon: Plug, description: 'Snippets, webhooks y signing keys', highlight: true },
      { href: '/admin/configuracion', label: 'Configuración', icon: Settings, description: 'Parámetros e integraciones' },
    ],
  },
  {
    title: 'Sistema',
    color: 'orange',
    items: [
      { href: '/admin/estado', label: 'Estado del sistema', icon: Stethoscope, description: 'Diagnóstico CMS, BD, env e integraciones' },
      { href: '/admin/errores', label: 'Monitor de Errores', icon: AlertTriangle, description: 'Fallos capturados de las rutas API' },
      { href: '/admin/monitor', label: 'Monitor en tiempo real', icon: Activity, description: 'CPU, RAM, latencia y health checks', highlight: true },
      { href: '/admin/vercel-logs', label: 'Logs de Vercel', icon: Terminal, description: 'Build + runtime logs del deployment' },
      { href: '/admin/observatory', label: 'Observatory', icon: Radio, description: 'Red en tiempo real 3D' },
      { href: '/admin/sql', label: 'Terminal SQL', icon: Database, description: 'Ejecutar SQL en InsForge' },
      { href: '/admin/inventario/scan', label: 'Escáner de inventario', icon: Scan, description: 'Lectura de códigos de barras y QR' },
      { href: '/admin/testing', label: 'Testing', icon: FlaskConical, description: 'Suite de pruebas y smoke tests' },
      { href: '/admin/manual', label: 'Manual técnico', icon: BookOpen, description: 'Guía técnica de la app', highlight: true },
      { href: '/admin/envios', label: 'Tarifas de Envío', icon: Truck, description: 'Costos por región y transportista' },
    ],
  },
  {
    title: 'Equipo & Acceso',
    color: 'red',
    items: [
      { href: '/admin/equipo', label: 'Equipo', icon: ShieldCheck, description: 'Roles, invitaciones y aprobaciones' },
      { href: '/admin/setup', label: 'Setup', icon: Database, description: 'Verificar y crear tablas InsForge' },
    ],
  },
] as const;

/* Color styles per section */
const SECTION_COLORS: Record<string, { header: string; hover: string; icon: string; iconActive: string; badge: string }> = {
  sky:     { header: 'text-sky-400', hover: 'hover:bg-sky-400/10 hover:border-sky-400/20', icon: 'text-zinc-400 group-hover:bg-sky-400/15 group-hover:text-sky-300', iconActive: 'bg-sky-400/15 text-sky-300', badge: 'border-sky-400/40 bg-sky-400/10 text-sky-300' },
  yellow:  { header: 'text-yellow-400', hover: 'hover:bg-yellow-300/8 hover:border-yellow-300/15', icon: 'text-zinc-400 group-hover:bg-yellow-300/15 group-hover:text-yellow-300', iconActive: 'bg-yellow-300/15 text-yellow-300', badge: 'border-yellow-300/40 bg-yellow-300/10 text-yellow-300' },
  purple:  { header: 'text-purple-400', hover: 'hover:bg-purple-400/8 hover:border-purple-400/15', icon: 'text-zinc-400 group-hover:bg-purple-400/15 group-hover:text-purple-300', iconActive: 'bg-purple-400/15 text-purple-300', badge: 'border-purple-400/40 bg-purple-400/10 text-purple-300' },
  pink:    { header: 'text-pink-400', hover: 'hover:bg-pink-400/8 hover:border-pink-400/15', icon: 'text-zinc-400 group-hover:bg-pink-400/15 group-hover:text-pink-300', iconActive: 'bg-pink-400/15 text-pink-300', badge: 'border-pink-400/40 bg-pink-400/10 text-pink-300' },
  blue:    { header: 'text-blue-400', hover: 'hover:bg-blue-400/8 hover:border-blue-400/15', icon: 'text-zinc-400 group-hover:bg-blue-400/15 group-hover:text-blue-300', iconActive: 'bg-blue-400/15 text-blue-300', badge: 'border-blue-400/40 bg-blue-400/10 text-blue-300' },
  emerald: { header: 'text-emerald-400', hover: 'hover:bg-emerald-400/8 hover:border-emerald-400/15', icon: 'text-zinc-400 group-hover:bg-emerald-400/15 group-hover:text-emerald-300', iconActive: 'bg-emerald-400/15 text-emerald-300', badge: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' },
  orange:  { header: 'text-orange-400', hover: 'hover:bg-orange-400/8 hover:border-orange-400/15', icon: 'text-zinc-400 group-hover:bg-orange-400/15 group-hover:text-orange-300', iconActive: 'bg-orange-400/15 text-orange-300', badge: 'border-orange-400/40 bg-orange-400/10 text-orange-300' },
  red:     { header: 'text-rose-400', hover: 'hover:bg-rose-400/8 hover:border-rose-400/15', icon: 'text-zinc-400 group-hover:bg-rose-400/15 group-hover:text-rose-300', iconActive: 'bg-rose-400/15 text-rose-300', badge: 'border-rose-400/40 bg-rose-400/10 text-rose-300' },
};

/* ── Encryption reveal widget ──────────────────────────────────────────────── */
const MOCK_KEYS = [
  { label: 'NEXT_PUBLIC_SUPABASE_URL', value: 'https://xxxx.supabase.co', masked: 'https://••••••••.supabase.co' },
  { label: 'SUPABASE_SERVICE_ROLE_KEY', value: 'eyJhbGc...', masked: 'eyJ••••••••••••' },
  { label: 'MERCADOPAGO_ACCESS_TOKEN', value: 'APP_USR-...', masked: 'APP_USR-••••••••••' },
  { label: 'CLOUDINARY_API_SECRET', value: 'xK9m2p...', masked: '••••••••••••' },
  { label: 'OPENROUTER_API_KEY', value: 'sk-or-...', masked: 'sk-or-••••••••••' },
];

function EncryptionWidget({ onClose }: { onClose: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Set<number>>(new Set());

  const toggleKey = (i: number) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      <div className="mt-1 rounded-xl border border-yellow-300/20 bg-yellow-300/5 p-3">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-3.5 w-3.5 text-yellow-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-yellow-300">Variables de entorno</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setRevealed((v) => !v); setRevealedKeys(new Set()); }}
              className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.2em] transition-all ${
                revealed
                  ? 'border-yellow-400/50 bg-yellow-400/15 text-yellow-300'
                  : 'border-white/15 bg-white/5 text-zinc-400 hover:border-yellow-400/40 hover:text-yellow-300'
              }`}
              title={revealed ? 'Ocultar todo' : 'Mostrar todo'}
            >
              {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {revealed ? 'Ocultar' : 'Mostrar'}
            </button>
            <Link
              href="/admin/center"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 transition-all hover:border-yellow-400/40 hover:text-yellow-300"
            >
              Gestionar →
            </Link>
          </div>
        </div>

        {/* Key rows */}
        <div className="space-y-1.5">
          {MOCK_KEYS.map((k, i) => {
            const isRevealed = revealed || revealedKeys.has(i);
            return (
              <div key={k.label} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/30 px-2.5 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">{k.label}</p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-zinc-300">
                    {isRevealed ? k.value : k.masked}
                  </p>
                </div>
                <button
                  onClick={() => toggleKey(i)}
                  className="flex-shrink-0 rounded-full p-1 text-zinc-600 transition-all hover:bg-white/10 hover:text-yellow-300"
                  title={isRevealed ? 'Ocultar' : 'Mostrar'}
                >
                  {isRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-2 text-[8.5px] text-zinc-600 leading-relaxed">
          Almacenadas cifradas en entorno seguro. Para editar credenciales de APIs externas ve a{' '}
          <Link href="/admin/center" onClick={onClose} className="text-yellow-400 hover:underline">Centro de integración</Link>.
        </p>
      </div>
    </motion.div>
  );
}

export default function AdminContextMenu({ open, onClose, onLogout }: AdminContextMenuProps) {
  const [query, setQuery] = useState('');
  const [showEncryption, setShowEncryption] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Visión general', 'Operación', 'Contenido']));

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  /* Reset state on close */
  useEffect(() => {
    if (!open) { setQuery(''); setShowEncryption(false); }
  }, [open]);

  /* Filtered sections based on search query */
  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_SECTIONS;
    return ALL_SECTIONS.map((s) => ({
      ...s,
      items: s.items.filter(
        (item) => item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
      ),
    })).filter((s) => s.items.length > 0);
  }, [query]);

  const totalItems = useMemo(() => ALL_SECTIONS.reduce((acc, s) => acc + s.items.length, 0), []);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title); else next.add(title);
      return next;
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="admin-context-menu"
          className="fixed inset-0 z-[300] flex items-start justify-center p-3 pt-[4vh] lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
          {/* Glow orbs */}
          <div className="pointer-events-none absolute left-0 top-0 h-64 w-64 rounded-full bg-sky-400/15 blur-[80px]" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-yellow-300/12 blur-[80px]" />

          {/* Menu card */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/12 bg-zinc-950/97 shadow-[0_40px_120px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
            style={{ maxHeight: '92vh' }}
          >
            {/* Ambient top glow */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />

            {/* ── HEADER ── */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-300 to-amber-500 shadow-[0_4px_16px_rgba(250,204,21,0.5)]">
                  <Zap className="h-4 w-4 text-black" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-yellow-300 leading-tight">Control room</p>
                  <p className="mt-px text-[9px] uppercase tracking-[0.2em] text-zinc-500">{totalItems} módulos disponibles</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-all hover:bg-white/10 hover:text-white active:scale-90"
                aria-label="Cerrar menú"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* ── SEARCH ── */}
            <div className="flex-shrink-0 border-b border-white/[0.06] px-3 py-2.5">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <Search className="h-3.5 w-3.5 flex-shrink-0 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar módulo…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-[12px] text-zinc-200 placeholder-zinc-600 outline-none"
                  autoFocus={false}
                />
                {query && (
                  <button onClick={() => setQuery('')} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* ── ENCRYPTION SECTION (pinned below search) ── */}
            <div className="flex-shrink-0 border-b border-white/[0.06] px-3 py-2">
              <button
                onClick={() => setShowEncryption((v) => !v)}
                className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-all hover:border-yellow-300/20 hover:bg-yellow-300/8"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-yellow-300/12 text-yellow-400 ring-1 ring-yellow-300/25 transition-all group-hover:bg-yellow-300/20">
                  <KeyRound className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-[12px] font-semibold text-yellow-200">Encriptación & Claves API</span>
                  <span className="block text-[10px] text-zinc-500 mt-0.5">Variables de entorno cifradas del sistema</span>
                </span>
                <span className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] transition-all ${
                  showEncryption
                    ? 'border-yellow-400/50 bg-yellow-400/15 text-yellow-300'
                    : 'border-white/10 bg-white/5 text-zinc-500'
                }`}>
                  {showEncryption ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {showEncryption ? 'Ocultar' : 'Mostrar'}
                </span>
              </button>
              <AnimatePresence>
                {showEncryption && <EncryptionWidget onClose={onClose} />}
              </AnimatePresence>
            </div>

            {/* ── SCROLLABLE NAV SECTIONS ── */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-2">

              {/* No results */}
              {filteredSections.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                  <Search className="h-6 w-6 text-zinc-700" />
                  <p className="text-sm font-medium text-zinc-500">Sin resultados para &quot;{query}&quot;</p>
                  <button onClick={() => setQuery('')} className="text-xs text-yellow-400 hover:underline">Limpiar búsqueda</button>
                </div>
              )}

              {filteredSections.map((section) => {
                const colors = SECTION_COLORS[section.color] ?? SECTION_COLORS.yellow;
                const isExpanded = !!query || expandedSections.has(section.title);
                const isExpandable = !query;

                return (
                  <div key={section.title} className="mb-1.5">
                    {/* Section header */}
                    <button
                      className={`flex w-full items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${isExpandable ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'}`}
                      onClick={() => isExpandable && toggleSection(section.title)}
                      disabled={!isExpandable}
                    >
                      <p className={`flex items-center gap-2 text-[9.5px] font-bold uppercase tracking-[0.32em] ${colors.header}`}>
                        <span className="h-px w-3 bg-current opacity-50" />
                        {section.title}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[8.5px] text-zinc-600">
                          {section.items.length}
                        </span>
                        {isExpandable && (
                          <span className={`text-zinc-600 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                        )}
                      </div>
                    </button>

                    {/* Section items */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="pb-1 pt-0.5">
                            {section.items.map((item) => {
                              const highlight = (item as { highlight?: boolean }).highlight ?? false;
                              return (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  onClick={onClose}
                                  className={`group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition-all ${colors.hover}`}
                                >
                                  <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.04] transition-all ${colors.icon}`}>
                                    <item.icon className="h-3.5 w-3.5" />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-1.5">
                                      <span className="block truncate text-[11.5px] font-semibold text-zinc-200 group-hover:text-white transition-colors">{item.label}</span>
                                      {highlight && (
                                        <span className={`inline-flex items-center rounded-full border px-1 py-px text-[7.5px] font-black uppercase tracking-[0.16em] flex-shrink-0 ${colors.badge}`}>
                                          Pro
                                        </span>
                                      )}
                                    </span>
                                    <span className="block truncate text-[9.5px] text-zinc-600 mt-px">{item.description}</span>
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* ── FOOTER: logout + version ── */}
            <div className="flex-shrink-0 border-t border-white/[0.08] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { onClose(); onLogout(); }}
                  className="group flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/40 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400 transition-all hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300"
                >
                  <LogOut className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                  Cerrar sesión
                </button>
                <Link
                  href="/tienda"
                  onClick={onClose}
                  className="flex items-center justify-center rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400 transition-all hover:border-yellow-400/40 hover:text-yellow-300"
                  title="Ver tienda pública"
                >
                  <Store className="h-3.5 w-3.5" />
                </Link>
              </div>
              <p className="mt-2 text-center font-mono text-[8px] text-zinc-700">
                Soluciones Fabrick SpA · Panel Admin
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
