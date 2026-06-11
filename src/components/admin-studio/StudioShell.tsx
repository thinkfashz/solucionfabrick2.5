'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

import { StudioSidebar, StudioSidebarContent } from './StudioSidebar';
import { StudioHeader } from './StudioHeader';

/* ── PATH_LABELS (kept in sync with AdminShell) ───────────────── */
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

const LS_COLLAPSED_KEY = 'studio-sidebar-collapsed';
const LS_DARK_KEY = 'studio-dark-mode';

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_COLLAPSED_KEY);
      if (saved === 'true') setCollapsed(true);
    } catch {}
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(LS_COLLAPSED_KEY, String(next)); } catch {}
      return next;
    });
  }

  return [collapsed, toggle] as const;
}

function useDarkMode() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_DARK_KEY);
      // default to dark if not set
      const isDark = saved === null ? true : saved === 'true';
      setDark(isDark);
    } catch {}
  }, []);

  function toggle() {
    setDark((prev) => {
      const next = !prev;
      try { localStorage.setItem(LS_DARK_KEY, String(next)); } catch {}
      return next;
    });
  }

  return [dark, toggle] as const;
}

export function StudioShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const [dark, toggleDark] = useDarkMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  /* close mobile drawer on route change */
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  /* lock body scroll when mobile drawer is open */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [mobileOpen]);

  /* fetch current user role */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/me', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { rol?: string };
        if (!cancelled) setRole(json.rol ?? null);
      } catch {}
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
    try { await fetch('/api/admin/logout', { method: 'POST' }); } catch {}
    router.replace('/admin/login');
  }

  function handleSwitchToFabrick() {
    localStorage.removeItem('admin-ui-theme');
    delete document.body.dataset.adminTheme;
    window.dispatchEvent(new Event('admin-theme-changed'));
  }

  /* skip for observatory and login */
  const isObservatory = pathname?.startsWith('/admin/observatory');
  const isLogin = pathname === '/admin/login';
  if (isObservatory || isLogin) return <>{children}</>;

  /* sidebar offset for the main content area */
  const sidebarWidth = collapsed ? 'lg:pl-14' : 'lg:pl-[272px]';

  return (
    <div
      data-studio-mode={dark ? 'dark' : 'light'}
      className={['relative min-h-screen', dark ? 'text-[#fff1d6]' : 'bg-white text-zinc-900'].join(' ')}
      style={dark ? {
        background: 'radial-gradient(circle at 16% 15%,rgba(255,241,214,.10),transparent 23%), radial-gradient(circle at 88% 10%,rgba(255,106,0,.24),transparent 25%), radial-gradient(circle at 82% 86%,rgba(255,213,74,.14),transparent 24%), linear-gradient(140deg,#050403 0%,#090604 36%,#120a05 100%)',
      } : {}}
    >
      {/* Animated ambient grid + blob overlay (dark only) */}
      {dark && <div aria-hidden="true" className="sa-ambient pointer-events-none fixed inset-0 z-0" />}

      {/* ── Fixed sidebar (desktop) ─────────────────────────── */}
      <StudioSidebar collapsed={collapsed} role={role} onLogout={handleLogout} />

      {/* ── Mobile drawer ──────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* backdrop */}
            <motion.div
              key="studio-mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            {/* drawer panel */}
            <motion.div
              key="studio-mobile-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className={[
                'fixed left-0 top-0 z-50 flex h-full w-[272px] flex-col lg:hidden',
                'border-r border-[rgba(255,246,230,.10)]',
                dark ? 'bg-[rgba(19,13,8,0.98)] backdrop-blur-xl' : 'bg-[#fafafa]',
              ].join(' ')}
            >
              {/* close button */}
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md text-[#9f8d74] hover:bg-[rgba(255,138,31,.10)] hover:text-[#fff1d6]"
                aria-label="Cerrar menú"
              >
                <X className="h-4 w-4" />
              </button>
              <StudioSidebarContent
                collapsed={false}
                role={role}
                onNavigate={() => setMobileOpen(false)}
                onLogout={handleLogout}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Sticky header ──────────────────────────────────── */}
      <StudioHeader
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
        onOpenMobile={() => setMobileOpen(true)}
        onOpenPalette={() => {/* TODO: wire up command palette */}}
        breadcrumb={breadcrumb}
        darkMode={dark}
        onToggleDarkMode={toggleDark}
        onLogout={handleLogout}
        onSwitchToFabrick={handleSwitchToFabrick}
      />

      {/* ── Main content ───────────────────────────────────── */}
      <div
        className={[
          'relative z-10 min-h-screen pt-12 transition-[padding] duration-200 ease-in-out',
          sidebarWidth,
        ].join(' ')}
      >
        <main className={['min-h-[calc(100vh-3rem)] p-4 md:p-6', dark ? 'bg-transparent' : 'bg-white'].join(' ')}>
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
