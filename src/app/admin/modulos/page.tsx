import { AdminModules } from '@/components/admin/AdminModules';
import { AdminBaseBadge, AdminBaseButton, AdminBaseCard, AdminBaseHeader, AdminBasePage } from '@/components/admin/AdminBaseUI';

export default function AdminModulosPage() {
  return (
    <AdminBasePage className="p-4 sm:p-6">
      <AdminBaseHeader
        eyebrow="Admin OS"
        title="Módulos de seguridad, operación e IA"
        description="Centro organizado para continuar la construcción del admin por módulos, con diseño oscuro moderno, datos reales y rutas existentes."
        action={<AdminBaseButton href="/admin/ai-developer">Abrir Fabrick AI</AdminBaseButton>}
      />

      <AdminBaseCard className="mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <AdminBaseBadge tone="success">Producción seria</AdminBaseBadge>
              <AdminBaseBadge tone="warning">DB primero</AdminBaseBadge>
              <AdminBaseBadge tone="info">Modular</AdminBaseBadge>
            </div>
            <p className="mt-4 max-w-4xl text-sm leading-relaxed text-zinc-300">
              Esta vista reúne los módulos activos del admin: entorno, acceso, bloqueos, pruebas, passkeys, base de datos, deploy y Fabrick AI Developer. La migración visual usa una base tipo shadcn/baseui, pero conserva tus rutas, permisos y datos reales.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-zinc-400">
            Sin datos fake · sin demo externa · rutas reales del admin
          </div>
        </div>
      </AdminBaseCard>

      <AdminModules />
    </AdminBasePage>
  );
}
