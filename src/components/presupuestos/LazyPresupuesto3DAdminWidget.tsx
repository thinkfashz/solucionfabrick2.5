'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const Presupuesto3DAdminWidget = dynamic(() => import('@/components/presupuestos/Presupuesto3DAdminWidget'), {
  ssr: false,
  loading: () => null,
});

export default function LazyPresupuesto3DAdminWidget() {
  const pathname = usePathname();
  const visibleInPath = pathname === '/admin/presupuestos' || Boolean(pathname?.startsWith('/admin/presupuestos/'));

  if (!visibleInPath) return null;
  return <Presupuesto3DAdminWidget />;
}
