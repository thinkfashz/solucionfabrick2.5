import { LayoutGrid } from 'lucide-react';
import { BrandMark } from '@/components/admin/ui/BrandMark';

export default function AdminLoading() {
  return (
    <main className="admin-module-loader">
      <div className="admin-module-loader-card">
        <div className="admin-module-loader-inner">
          <div className="flex items-center gap-4">
            <div className="admin-loader-orb">
              <BrandMark size="lg" animated />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#facc15]">Admin Fabrick</p>
              <h1 className="mt-2 text-2xl font-black tracking-[-0.05em] text-[#fff1d6]">Cargando módulo</h1>
              <p className="mt-1 text-sm leading-6 text-[#fff1d6]/55">Preparando datos, interfaz y controles del panel.</p>
            </div>
            <LayoutGrid className="h-6 w-6 shrink-0 text-[#ff8a1f]" />
          </div>
          <div className="mt-6 admin-loader-bar"><span /></div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-[#fff1d6]/42">
            <span>Datos</span>
            <span className="text-center">Módulos</span>
            <span className="text-right">UI</span>
          </div>
        </div>
      </div>
    </main>
  );
}
