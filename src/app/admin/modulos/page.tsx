import Link from 'next/link';
import { Activity, Boxes, LayoutGrid, ShieldCheck, Sparkles } from 'lucide-react';
import { AdminModules } from '@/components/admin/AdminModules';
import { AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

const actionClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3.5 text-xs font-black text-[#5f594f] transition hover:bg-white';

export default function AdminModulosPage() {
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Sistema · Arquitectura"
        title="Mapa operativo de módulos"
        description="Vista consolidada de las áreas activas de Fabrick. Las herramientas retiradas ya no forman parte del mapa ni de la navegación administrativa."
        icon={LayoutGrid}
        actions={
          <>
            <Link href="/admin/intelligence" className={actionClass}><Sparkles className="h-4 w-4" /> Intelligence</Link>
            <Link href="/admin/integraciones" className={actionClass}><Boxes className="h-4 w-4" /> Integraciones</Link>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Arquitectura" value="Unificada" icon={LayoutGrid} hint="Una navegación canónica" />
        <AdminStat label="Datos" value="Reales" icon={Activity} accent="emerald" hint="Sin módulos demo para Root" />
        <AdminStat label="UI" value="Nativa" icon={Sparkles} accent="cyan" hint="Primitivas Fabrick compartidas" />
        <AdminStat label="Seguridad" value="Reducida" icon={ShieldCheck} accent="yellow" hint="Menos rutas y código legacy" />
      </section>

      <AdminModules />
    </AdminPage>
  );
}
