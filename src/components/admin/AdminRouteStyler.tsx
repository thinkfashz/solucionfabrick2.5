'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function resolveAdminArea(pathname: string) {
  if (/^\/admin\/(pedidos|cotizaciones|clientes|entregas)(\/|$)/.test(pathname)) return 'sales';
  if (/^\/admin\/(productos|inventario|materiales)(\/|$)/.test(pathname)) return 'catalog';
  if (/^\/admin\/(f29|contabilidad|analytics|facturas|pagos|reportes)(\/|$)/.test(pathname)) return 'finance';
  if (/^\/admin\/(editor|paginas|blog|medios|proyectos)(\/|$)/.test(pathname)) return 'content';
  if (/^\/admin\/intelligence(\/|$)/.test(pathname)) return 'intelligence';
  if (/^\/admin\/(publicidad|newsletter|seo|redes|social|campanas)(\/|$)/.test(pathname)) return 'marketing';
  if (/^\/admin\/(integraciones|estado|diagnostico|errores|vercel-logs|sql|setup|configuracion|modulos|health)(\/|$)/.test(pathname)) return 'system';
  if (/^\/admin\/(service-prices|envios)(\/|$)/.test(pathname)) return 'operations';
  if (/^\/admin\/(equipo|sesiones|invitaciones|seguridad|perfil|acceso-demo|unirse)(\/|$)/.test(pathname)) return 'access';
  if (pathname === '/admin') return 'overview';
  return 'general';
}

export default function AdminRouteStyler() {
  const pathname = usePathname();

  useEffect(() => {
    const body = document.body;
    body.dataset.adminArea = resolveAdminArea(pathname || '/admin');
    body.dataset.adminPath = pathname || '/admin';
    return () => {
      delete body.dataset.adminArea;
      delete body.dataset.adminPath;
    };
  }, [pathname]);

  return null;
}
