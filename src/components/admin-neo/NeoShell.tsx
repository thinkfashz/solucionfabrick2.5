'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, Menu, Search, LogOut, BarChart3, Package, ShoppingCart, Bot,
  Settings, Palette, ChevronDown, ExternalLink, Sun, Moon,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { FabrickPeakIcon } from '@/components/FabrickBrandIcon';
import { navSections } from '@/components/admin-studio/StudioSidebar';

/* ── PATH_LABELS (copied from StudioShell.tsx lines 12-82) ─────── */
const PATH_LABELS: Record<string, string> = {
  '/admin': 'Centro de control',
  '/admin/modulos': 'Centro de módulos',
  '/admin/saas': 'Mi SaaS',
  '/admin/activar': 'Activar plataforma',
  '/admin/productos': 'Productos',
  '/admin/productos/nuevo': 'Nuevo producto',
  '/admin/productos/importar': 'Importar de Mercado Libre',
  '/admin/materiales': 'Materiales (Cotizador)',
  '/admin/proyectos': 'Proyectos',
  '/admin/pedidos': 'Pedidos',
  '/admin/pagos': 'Pagos · MercadoPago',
  '/admin/cotizaciones': 'Cotizaciones',
  '/admin/presupuestos': 'Presupuestos',
  '/admin/newsletter': 'Boletín',
  '/admin/asistente-ia': 'Asistente IA',
  '/admin/ai-developer': 'Fabrick AI Developer',
  '/admin/entregas': 'Entregas',
  '/admin/clientes': 'Clientes',
  '/admin/cupones': 'Cupones y Descuentos',
  '/admin/reviews': 'Reseñas de Clientes',
  '/admin/reportes': 'Reportes',
  '/admin/publicidad': 'Publicidad',
  '/admin/publicidad/nuevo': 'Nueva campaña',
  '/admin/publicidad/coach': 'Coach de campañas',
  '/admin/video-engine': 'Fabrick Studio IA',
  '/admin/publicar': 'Publicar',
  '/admin/ml': 'MercadoLibre',
  '/admin/ml/buscar': 'Buscador ML',
  '/admin/ml/publicaciones': 'Mis publicaciones ML',
  '/admin/ml/pedidos': 'Pedidos ML',
  '/admin/ml/preguntas': 'Preguntas ML',
  '/admin/ml/precios': 'Monitor de precios ML',
  '/admin/inteligencia-mercado': 'Inteligencia de mercado',
  '/admin/social': 'Social',
  '/admin/social/inbox': 'Inbox social',
  '/admin/inventario': 'Inventario',
  '/admin/inventario/scan': 'Escáner de inventario',
  '/admin/integraciones': 'Centro de integraciones',
  '/admin/integraciones/marketplace': 'Marketplace de extensiones',
  '/admin/configuracion': 'Configuración',
  '/admin/observatory': 'Observatory',
  '/admin/envios': 'Tarifas de Envío',
  '/admin/sql': 'Terminal SQL',
  '/admin/setup': 'Setup',
  '/admin/equipo': 'Equipo',
  '/admin/blog': 'Blog',
  '/admin/blog/nuevo': 'Nueva entrada',
  '/admin/home': 'Pantalla principal',
  '/admin/editor': 'Editor universal',
  '/admin/tienda': 'Tienda · Edición',
  '/admin/medios': 'Medios',
  '/admin/estado': 'Estado del sistema',
  '/admin/diagnostico': 'Diagnóstico de APIs',
  '/admin/manual': 'Manual',
  '/admin/errores': 'Monitor de Errores',
  '/admin/vercel-logs': 'Logs de Vercel',
  '/admin/monitor': 'Monitor del sistema',
  '/admin/testing': 'Testing',
  '/admin/seguridad': 'Seguridad · Passkeys',
  '/admin/center': 'Centro de integración',
  '/admin/extensions': 'Extensiones y Webhooks',
  '/admin/facturas': 'Facturas DTE',
  '/admin/correo': 'Correo · Resend',
  '/admin/scrapegraph': 'ScrapeGraph IA',
  '/admin/agente': 'Agente IA · Playwright',
  '/admin/ia-config': 'Configuración IA',
  '/admin/modelos-ia': 'Prueba de IAs gratuitas',
  '/admin/perfil': 'Perfil administrador',
  '/admin/sesiones': 'Sesiones y dispositivos',
};

/* ── Rail quick-links ──────────────────────────────────────────── */
const RAIL_LINKS = [
  { href: '/admin',              icon: BarChart3,    label: 'Centro de control' },
  { href: '/admin/productos',    icon: Package,      label: 'Productos' },
  { href: '/admin/pedidos',      icon: ShoppingCart, label: 'Pedidos' },
  { href: '/admin/asistente-ia', icon: Bot,          label: 'Asistente IA' },
] as const;

const LS_DARK_KEY = 'neo-dark-mode';

function useDarkMode() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_DARK_KEY);
      setDark(saved === null ? true : saved === 'true');
    } catch { /* ignore */ }
  }, []);
  function toggle() {
    setDark((prev) => {
      const next = !prev;
      try { localStorage.setItem(LS_DARK_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }
  return [dark, toggle] as const;
}

function handleSwitchTheme() {
  const themes = ['neo', 'studio', ''] as const;
  type ThemeVal = (typeof themes)[number];
  const current = (localStorage.getItem('admin-ui-theme') ?? '') as ThemeVal;
  const idx = (themes as readonly string[]).indexOf(current);
  const next = themes[(idx + 1) % themes.length] as ThemeVal;
  if (next) {
    localStorage.setItem('admin-ui-theme', next);
  } else {
    localStorage.removeItem('admin-ui-theme');
  }
  if (next === 'neo') document.body.dataset.adminTheme = 'neo';
  else if (next === 'studio') document.body.dataset.adminTheme = 'studio';
  else delete document.body.dataset.adminTheme;
  window.dispatchEvent(new Event('admin-theme-changed'));
}

/* ── Main shell ────────────────────────────────────────────────── */
export function NeoShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [dark, toggleDark] = useDarkMode();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    navSections.forEach((s, i) => { init[s.title] = i === 0; });
    return init;
  });
  const [role, setRole] = useState<string | null>(null);

  /* close drawer on route change */
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  /* lock body scroll when drawer open on mobile */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [drawerOpen]);

  /* fetch role */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/me', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { rol?: string };
        if (!cancelled) setRole(json.rol ?? null);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  /* breadcrumb */
  const breadcrumb = useMemo(() => {
    if (!pathname) return 'Panel';
    if (PATH_LABELS[pathname]) return PATH_LABELS[pathname];
    const segs = pathname.split('/').filter(Boolean);
    for (let i = segs.length; i > 0; i--) {
      const candidate = '/' + segs.slice(0, i).join('/');
      if (PATH_LABELS[candidate]) return PATH_LABELS[candidate];
    }
    return 'Panel';
  }, [pathname]);

  async function handleLogout() {
    try { await fetch('/api/admin/logout', { method: 'POST' }); } catch { /* ignore */ }
    router.replace('/admin/login');
  }

  function toggleSection(title: string) {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  }

  /* skip for observatory and login */
  const isObservatory = pathname?.startsWith('/admin/observatory');
  const isLogin = pathname === '/admin/login';
  if (isObservatory || isLogin) return <>{children}</>;

  /* filtered nav sections */
  const q = search.toLowerCase().trim();
  const filteredSections = navSections
    .map((s) => ({
      ...s,
      links: s.links.filter(
        (l) =>
          (!l.superadminOnly || role === 'superadmin') &&
          (!q || l.label.toLowerCase().includes(q)),
      ),
    }))
    .filter((s) => s.links.length > 0);

  /* Design tokens */
  const borderColor = 'rgba(255,246,230,.10)';
  const railBg = 'linear-gradient(180deg, rgba(17,11,6,.94), rgba(5,4,3,.97))';
  const drawerBg = 'linear-gradient(180deg, rgba(19,13,8,.96), rgba(7,5,4,.98))';
  const topbarBg = 'rgba(7,5,4,0.88)';

  return (
    <div className="relative min-h-screen text-[#fff1d6]">
      {/* Ambient overlay */}
      <div className="neo-ambient" aria-hidden="true" />

      {/* ── Icon Rail (desktop) ─────────────────────────────────── */}
      <aside
        className="fixed left-0 top-0 z-30 hidden h-screen w-16 flex-col items-center py-4 gap-2 lg:flex"
        style={{ background: railBg, borderRight: `1px solid ${borderColor}` }}
      >
        {/* Brand mark */}
        <Link
          href="/admin"
          className="mb-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border"
          style={{
            background: 'linear-gradient(135deg, #FFE566, #ff8a1f)',
            borderColor: 'rgba(255,213,74,.35)',
            boxShadow: '0 0 18px rgba(255,138,31,.40)',
          }}
          title="Inicio"
        >
          <FabrickPeakIcon size={20} />
        </Link>

        {/* Rail links */}
        {RAIL_LINKS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className="flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-150"
              style={{
                background: isActive ? 'rgba(255,138,31,.12)' : 'transparent',
                color: isActive ? '#ffd54a' : '#9f8d74',
              }}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}

        <div className="flex-1" />

        {/* Settings */}
        <Link
          href="/admin/configuracion"
          title="Configuración"
          className="flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-150"
          style={{ color: '#9f8d74' }}
        >
          <Settings className="h-5 w-5" />
        </Link>
      </aside>

      {/* ── Sliding Drawer ──────────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Mobile overlay */}
            <motion.div
              key="neo-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setDrawerOpen(false)}
            />

            {/* Drawer panel */}
            <motion.div
              key="neo-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
              className="fixed top-0 z-50 flex h-screen w-80 flex-col"
              style={{
                left: 0,
                background: drawerBg,
                borderRight: `1px solid ${borderColor}`,
              }}
            >
              {/* Drawer header */}
              <div
                className="flex flex-shrink-0 items-center gap-3 px-4 py-3"
                style={{ borderBottom: `1px solid ${borderColor}` }}
              >
                <div
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border"
                  style={{
                    background: 'linear-gradient(135deg, #FFE566, #ff8a1f)',
                    borderColor: 'rgba(255,213,74,.35)',
                  }}
                >
                  <FabrickPeakIcon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ffd54a]">
                    SOLUCIONES FABRICK
                  </p>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-[#9f8d74]">
                    Neo Admin
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[rgba(255,138,31,.09)]"
                  style={{ color: '#9f8d74' }}
                  aria-label="Cerrar menú"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Search input */}
              <div className="flex-shrink-0 px-3 py-2.5" style={{ borderBottom: `1px solid ${borderColor}` }}>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9f8d74]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar módulo…"
                    className="w-full rounded-lg bg-[rgba(255,246,230,.06)] py-2 pl-8 pr-3 text-[12px] text-[#fff1d6] placeholder-[#9f8d74] outline-none focus:ring-1 focus:ring-[rgba(255,138,31,.35)]"
                    style={{ border: `1px solid ${borderColor}` }}
                  />
                </div>
              </div>

              {/* Accordion nav */}
              <nav className="min-h-0 flex-1 overflow-y-auto py-2 scrollbar-hide">
                {filteredSections.map((section) => {
                  const isOpen = openSections[section.title] ?? false;
                  return (
                    <div key={section.title} className="mb-0.5">
                      {/* Section header */}
                      <button
                        type="button"
                        onClick={() => toggleSection(section.title)}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-[rgba(255,138,31,.06)]"
                      >
                        <span className="flex-1 text-[10px] font-semibold uppercase tracking-widest text-[#9f8d74]">
                          {section.title}
                        </span>
                        <ChevronDown
                          className="h-3 w-3 flex-shrink-0 text-[#9f8d74] transition-transform duration-200"
                          style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                        />
                      </button>

                      {/* Section links */}
                      {isOpen && (
                        <div className="pb-1">
                          {section.links.map((link) => {
                            const hrefPath = link.href.split('?')[0];
                            const isActive = pathname === hrefPath;
                            const Icon = link.icon;
                            return (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setDrawerOpen(false)}
                                className="flex items-center gap-3 rounded-lg mx-2 px-3 py-2 transition-all duration-150"
                                style={{
                                  background: isActive ? 'rgba(255,138,31,.12)' : 'transparent',
                                  color: isActive ? '#ffd54a' : '#9f8d74',
                                }}
                              >
                                <Icon className="h-4 w-4 flex-shrink-0" />
                                <span className="min-w-0 flex-1 truncate text-[12px]">
                                  {link.label}
                                </span>
                                {link.highlight && !link.comingSoon && (
                                  <span className="flex-shrink-0 rounded-full bg-[rgba(255,138,31,.15)] px-1.5 py-px text-[9px] text-[#ff8a1f]">
                                    Nuevo
                                  </span>
                                )}
                                {link.comingSoon && (
                                  <span className="flex-shrink-0 rounded-full bg-[rgba(255,255,255,.06)] px-1.5 py-px text-[9px] text-[#9f8d74]">
                                    Próximo
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>

              {/* Drawer footer: logout */}
              <div className="flex-shrink-0 p-3" style={{ borderTop: `1px solid ${borderColor}` }}>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] text-[#9f8d74] transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Topbar ──────────────────────────────────────────────── */}
      <header
        className="fixed top-0 right-0 z-30 flex h-14 items-center gap-3 px-4 backdrop-blur-md"
        style={{
          left: 0,
          background: topbarBg,
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        {/* Mobile hamburger / Desktop drawer toggle */}
        <button
          type="button"
          onClick={() => setDrawerOpen((p) => !p)}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-[rgba(255,138,31,.09)]"
          style={{ color: '#9f8d74' }}
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb */}
        <div className="min-w-0 flex-1">
          <span className="truncate text-[13px] font-semibold text-[#fff1d6]">
            {breadcrumb}
          </span>
        </div>

        {/* Right actions */}
        <div className="flex flex-shrink-0 items-center gap-1">
          {/* Search (cosmetic button) */}
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-[rgba(255,138,31,.09)]"
            style={{ color: '#9f8d74' }}
            aria-label="Buscar"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Dark/Light toggle */}
          <button
            type="button"
            onClick={toggleDark}
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-[rgba(255,138,31,.09)]"
            style={{ color: '#9f8d74' }}
            aria-label={dark ? 'Modo claro' : 'Modo oscuro'}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Switch theme */}
          <button
            type="button"
            onClick={handleSwitchTheme}
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-[rgba(255,138,31,.09)]"
            style={{ color: '#9f8d74' }}
            aria-label="Cambiar tema"
            title="Cambiar tema del admin"
          >
            <Palette className="h-4 w-4" />
          </button>

          {/* Tienda link */}
          <Link
            href="/tienda"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-colors hover:bg-[rgba(255,138,31,.09)] sm:flex"
            style={{ color: '#9f8d74' }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Tienda</span>
          </Link>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="hidden h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-red-500/10 hover:text-red-400 sm:flex"
            style={{ color: '#9f8d74' }}
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────── */}
      <div className="relative z-10 min-h-screen pt-14 lg:pl-16">
        <main className="min-h-[calc(100vh-3.5rem)] p-4 md:p-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
