'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

import { AdminBottomNav } from '@/components/AdminBottomNav';
import { StudioSidebar, StudioSidebarContent } from './StudioSidebar';
import { StudioHeader } from './StudioHeader';

const PATH_LABELS: Record<string, string> = {
  '/admin': 'Centro de control',
  '/admin/perfil': 'Perfil administrador',
  '/admin/interfaz': 'Selector de interfaz',
  '/admin/equipo/demo': 'Links demo 24h',
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
};

const LS_COLLAPSED_KEY = 'studio-sidebar-collapsed';
const LS_DARK_KEY = 'studio-dark-mode';

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(LS_COLLAPSED_KEY) === 'true') setCollapsed(true);
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
      setDark(saved === null ? true : saved === 'true');
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

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen]);

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

  const isObservatory = pathname?.startsWith('/admin/observatory');
  const isLogin = pathname === '/admin/login';
  if (isObservatory || isLogin) return <>{children}</>;

  const sidebarWidth = collapsed ? 'lg:pl-14' : 'lg:pl-[272px]';

  return (
    <div data-studio-mode={dark ? 'dark' : 'light'} className={['relative min-h-screen', dark ? 'bg-[#09090b] text-zinc-100' : 'bg-white text-zinc-900'].join(' ')}>
      <StudioSidebar collapsed={collapsed} role={role} onLogout={handleLogout} />

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div key="studio-mobile-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
            <motion.div key="studio-mobile-drawer" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }} className={['fixed left-0 top-0 z-50 flex h-full w-[272px] flex-col lg:hidden', 'border-r border-white/[0.08]', dark ? 'bg-[#18181b]' : 'bg-[#fafafa]'].join(' ')}>
              <button type="button" onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-white/5 hover:text-zinc-200" aria-label="Cerrar menú"><X className="h-4 w-4" /></button>
              <StudioSidebarContent collapsed={false} role={role} onNavigate={() => setMobileOpen(false)} onLogout={handleLogout} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <StudioHeader collapsed={collapsed} onToggleCollapse={toggleCollapsed} onOpenMobile={() => setMobileOpen(true)} onOpenPalette={() => {}} breadcrumb={breadcrumb} darkMode={dark} onToggleDarkMode={toggleDark} onLogout={handleLogout} />

      <div className={['min-h-screen pt-12 pb-20 transition-[padding] duration-200 ease-in-out lg:pb-0', sidebarWidth].join(' ')}>
        <main className={['min-h-[calc(100vh-3rem)] p-4 md:p-6', dark ? 'bg-[#09090b]' : 'bg-white'].join(' ')}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={pathname} initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AdminBottomNav onOpenMore={() => setMobileOpen(true)} />
    </div>
  );
}
