'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function resolveAdminArea(pathname: string) {
  if (/^\/admin\/(pedidos|cotizaciones|clientes|entregas)(\/|$)/.test(pathname)) return 'sales';
  if (/^\/admin\/(productos|inventario|materiales)(\/|$)/.test(pathname)) return 'catalog';
  if (/^\/admin\/(f29|contabilidad|analytics|facturas|pagos|reportes)(\/|$)/.test(pathname)) return 'finance';
  if (/^\/admin\/(editor|paginas|blog|medios|proyectos)(\/|$)/.test(pathname)) return 'content';
  if (/^\/admin\/intelligence(\/|$)/.test(pathname)) return 'intelligence';
  if (/^\/admin\/(publicidad|newsletter|seo|redes|social|campanas|ml)(\/|$)/.test(pathname)) return 'marketing';
  if (/^\/admin\/(integraciones|estado|diagnostico|errores|vercel-logs|sql|setup|configuracion|modulos|health)(\/|$)/.test(pathname)) return 'system';
  if (/^\/admin\/(service-prices|envios)(\/|$)/.test(pathname)) return 'operations';
  if (/^\/admin\/(equipo|sesiones|invitaciones|seguridad|perfil|acceso-demo|unirse)(\/|$)/.test(pathname)) return 'access';
  if (pathname === '/admin') return 'overview';
  return 'general';
}

const NATIVE_DESIGN_PATHS = new Set([
  '/admin/publicidad',
  '/admin/publicidad/coach',
  '/admin/service-prices',
  '/admin/envios',
  '/admin/errores',
  '/admin/diagnostico',
  '/admin/estado',
  '/admin/vercel-logs',
  '/admin/seguridad',
  '/admin/perfil',
  '/admin/sesiones',
  '/admin/equipo',
  '/admin/configuracion',
  '/admin/integraciones',
  '/admin/modulos',
  '/admin/sql',
  '/admin/setup',
  '/admin/ml',
]);

function resolveAdminDesign(pathname: string) {
  return NATIVE_DESIGN_PATHS.has(pathname) ? 'native' : 'legacy';
}

export default function AdminRouteStyler() {
  const pathname = usePathname();

  useEffect(() => {
    const body = document.body;
    const resolvedPath = pathname || '/admin';
    body.dataset.adminArea = resolveAdminArea(resolvedPath);
    body.dataset.adminPath = resolvedPath;
    body.dataset.adminDesign = resolveAdminDesign(resolvedPath);
    return () => {
      delete body.dataset.adminArea;
      delete body.dataset.adminPath;
      delete body.dataset.adminDesign;
    };
  }, [pathname]);

  return null;
}
