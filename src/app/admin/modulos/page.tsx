import { AdminModules } from '@/components/admin/AdminModules';
import { AdminPage, AdminPageHeader } from '@/components/admin/ui';

export default function AdminModulosPage() {
  return (
    <AdminPage>
      <AdminPageHeader
        title="Módulos de seguridad y operación"
        description="Centro organizado para continuar la construcción por módulos sin perder el foco técnico."
      />

      <div className="mb-6 rounded-3xl border border-yellow-300/20 bg-yellow-300/5 p-5">
        <p className="text-sm leading-relaxed text-zinc-300">
          Esta vista reúne los módulos 1–7 que estamos cerrando para llevar la app a producción con seguridad real:
          entorno, sesión, rate limit, validación, passkeys, base de datos y deploy estable.
        </p>
      </div>

      <AdminModules />
    </AdminPage>
  );
}
